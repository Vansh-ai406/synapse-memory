"""LLM calls: chat replies, memory extraction, conflict judgement, intent.

Every call goes through _generate(), so the model id and transport live in one
place. With no API key, deterministic fallbacks keep the pipeline working so
the memory behaviour can be demoed offline. Fallbacks are conservative: they
extract nothing they are not sure about.
"""

import asyncio
import json
import re

import httpx

from app.core.config import get_settings
from app.core.logging import logger

_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"

_JSON_BLOCK = re.compile(r"\{.*\}|\[.*\]", re.DOTALL)

# Circuit breaker: when quota is gone (429s), stop hammering the API and let
# the deterministic fallbacks answer immediately. Resets after cooldown.
_COOLDOWN_SECONDS = 90.0
_last_429_at: float = 0.0
_consecutive_429: int = 0


# Circuit breaker: when quota is gone (429s), stop hammering the API and let
# the deterministic fallbacks answer immediately. Resets after cooldown.
_COOLDOWN_SECONDS = 90.0
_last_429_at: float = 0.0
_consecutive_429: int = 0


class LLMError(RuntimeError):
    pass


def _generate_sync(
    system: str,
    user: str,
    temperature: float = 0.4,
    max_retries: int = 1,
    json_mime: bool = False,
) -> str:
    global _last_429_at, _consecutive_429
    import time as _time

    settings = get_settings()
    if not settings.llm_enabled:
        raise LLMError("No GEMINI_API_KEY configured")
    # Circuit breaker open → fail fast so the fallback path answers instantly.
    if _consecutive_429 >= 3 and _time.time() - _last_429_at < _COOLDOWN_SECONDS:
        raise LLMError("Quota circuit open (recent 429s) — using fallback")
    url = _ENDPOINT.format(model=settings.gemini_chat_model)
    generation_config: dict = {"temperature": temperature, "maxOutputTokens": 4096}
    if json_mime:
        generation_config["responseMimeType"] = "application/json"
    # gemini-2.5 models are "thinking" models: token budget is consumed by
    # thoughts before text. Disable thinking for these short judging calls.
    if "2.5" in settings.gemini_chat_model:
        generation_config["thinkingConfig"] = {"thinkingBudget": 0}
    body = {
        "systemInstruction": {"parts": [{"text": system}]},
        "contents": [{"role": "user", "parts": [{"text": user}]}],
        "generationConfig": generation_config,
    }
    last_exc: Exception | None = None
    for attempt in range(max_retries + 1):
        try:
            # Key goes in a header, never the URL, so access logs can't leak it.
            response = httpx.post(
                url,
                headers={"x-goog-api-key": settings.gemini_api_key or ""},
                json=body,
                timeout=60,
            )
        except httpx.HTTPError as exc:
            raise LLMError(f"LLM request failed: {exc}") from exc
        if response.status_code == 429 and attempt < max_retries:
            # Free-tier quota resets quickly; a short in-call retry. Beyond
            # that, the circuit breaker skips further calls entirely.
            _consecutive_429 += 1
            _last_429_at = _time.time()
            logger.warning("Gemini 429 — retrying in 5s (breaker: %d/3)", _consecutive_429)
            _time.sleep(5.0)
            continue
        if response.status_code != 200:
            logger.error("gemini generate status=%s", response.status_code)
            raise LLMError(f"Gemini returned {response.status_code}")
        parts = response.json().get("candidates", [{}])[0].get("content", {}).get("parts", [])
        text = "".join(part.get("text", "") for part in parts).strip()
        if text:
            # Healthy call — close the circuit breaker.
            _consecutive_429 = 0
            return text
        # Empty output: retry once (e.g. safety or serialization hiccup).
        last_exc = LLMError("Gemini returned an empty response")
    raise last_exc


async def generate(
    system: str,
    user: str,
    temperature: float = 0.4,
    json_mime: bool = False,
) -> str:
    return await asyncio.to_thread(
        _generate_sync, system, user, temperature=temperature, json_mime=json_mime
    )


def _parse_json(text: str):
    match = _JSON_BLOCK.search(text)
    if not match:
        raise LLMError("Model did not return JSON")
    return json.loads(match.group(0))


async def parse_json_async(text: str):
    return _parse_json(text)


# ---------------------------------------------------------------- extraction

_EXTRACT_SYSTEM = """You extract long-term memories about a user from one message.
Return ONLY JSON: {"memories": [ ... ]}.
Each memory: {"type", "content", "importance", "confidence", "context", "expires_at", "reason"}.
type is one of FACT, PREFERENCE, GOAL, DECISION, EXPERIENCE, CONSTRAINT, FEEDBACK, TASK, STRATEGY.
importance and confidence are 0..1.
context is a short scope such as "for DSA" or null.
expires_at is an ISO date for information that becomes irrelevant after a date
(an exam, a deadline, a trip), otherwise null.
content is one concise sentence in the third person ("User prefers...").

Store only what would change a future answer: preferences, goals, constraints,
decisions and their reasons, outcomes of past attempts, standing feedback.
Skip greetings, questions, one-off requests, and anything already implied by
the memories listed as known. Return {"memories": []} when nothing qualifies.
Never extract passwords, API keys, tokens, card numbers, or government ids."""


async def extract_memories(message: str, known: list[str]) -> list[dict] | None:
    """Returns None when the LLM is unavailable so the caller can fall back."""
    if not get_settings().llm_enabled:
        return None
    known_text = "\n".join(f"- {item}" for item in known) or "(none)"
    try:
        raw = await generate(
            _EXTRACT_SYSTEM,
            f"Known memories:\n{known_text}\n\nNew message:\n{message}",
            temperature=0.1,
            json_mime=True,
        )
        data = _parse_json(raw)
    except LLMError as exc:
        logger.warning("LLM extraction failed: %s", exc)
        return None
    return data.get("memories", []) if isinstance(data, dict) else []


# ------------------------------------------------------------------- conflict

_CONFLICT_SYSTEM = """You decide how a new memory relates to one existing memory.
Return ONLY JSON: {"relation", "reason"}.
relation is one of:
- "duplicate": same fact, nothing new.
- "supersede": the new memory replaces the old one outright (the user changed
  their preference or decision).
- "contextual": both are true in different contexts and should coexist.
- "unrelated": they are about different things.
Be conservative. Prefer "contextual" over "supersede" when the new statement
adds a scope (for example DSA versus ML) instead of retracting the old one."""


async def judge_conflict(new_content: str, existing_content: str) -> dict | None:
    """Return {"relation", "reason"} or None when the LLM can't decide."""
    if not get_settings().llm_enabled:
        return None
    try:
        raw = await generate(
            _CONFLICT_SYSTEM,
            f"Existing: {existing_content}\nNew: {new_content}",
            temperature=0.0,
            json_mime=True,
        )
        data = _parse_json(raw)
    except LLMError as exc:
        logger.warning("Conflict judgement failed: %s", exc)
        return None
    if not isinstance(data, dict) or "relation" not in data:
        return None
    return data


# ----------------------------------------------------------------------- chat

_CHAT_SYSTEM = """You are RecallOS, a personal assistant with a persistent memory.
You are given memories retrieved for this user. Use them to shape your answer:
match their level, their stated preferences, their goals, and their constraints.
When memories visibly changed your answer, say briefly which memory drove it
(for example "(because you prefer short morning sessions)").
Do not recite the memories back unless asked. Do not invent memories.
If no memories are relevant, answer normally and do not mention memory.
Keep answers concrete and skimmable."""


async def chat(message: str, memories: list[dict], history: list[dict]) -> str | None:
    if not get_settings().llm_enabled:
        return None
    lines = []
    for item in memories:
        scope = f" ({item['context']})" if item.get("context") else ""
        lines.append(f"- [{item.get('memory_type', 'FACT')}] {item.get('content', '')}{scope}")
    memory_text = "\n".join(lines) or "(no relevant memories)"
    turns = "\n".join(f"{t['role']}: {t['content']}" for t in history[-8:])
    try:
        return await generate(
            _CHAT_SYSTEM,
            f"Memories:\n{memory_text}\n\nRecent conversation:\n{turns}\n\nUser: {message}",
        )
    except LLMError as exc:
        logger.warning("LLM chat failed: %s", exc)
        return None


# ---------------------------------------------------------------------- intent

def detect_intent(message: str) -> str:
    """Coarse intent, used to bias retrieval. Heuristic on purpose: it must work
    with no API key and it only nudges behaviour, it never gates safety."""
    text = message.lower()
    if re.search(r"\b(forget|delete|remove|erase)\b", text):
        return "forget"
    if re.search(r"\b(plan|schedule|revise|revision|study plan)\b", text):
        return "plan"
    if re.search(r"\b(explain|how does|what is|teach)\b", text):
        return "explain"
    if re.search(r"\b(suggest|recommend|idea|project)\b", text):
        return "recommend"
    if re.search(r"\b(i prefer|i like|i am|i'm|my goal|i want|i study best|i focus)\b", text):
        return "inform"
    return "general"
