"""LLM calls: chat replies, memory extraction, conflict judgement, intent.

Every call goes through _generate(), so the model id and transport live in one
place. With no API key, deterministic fallbacks keep the pipeline working so
the memory behaviour can be demoed offline. Fallbacks are conservative: they
extract nothing they are not sure about.
"""

import json
import re

import httpx

from app.core.config import get_settings
from app.core.logging import logger

_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"

_JSON_BLOCK = re.compile(r"\{.*\}|\[.*\]", re.DOTALL)


class LLMError(RuntimeError):
    pass


def _generate(system: str, user: str, temperature: float = 0.4) -> str:
    settings = get_settings()
    if not settings.llm_enabled:
        raise LLMError("No GEMINI_API_KEY configured")
    url = _ENDPOINT.format(model=settings.gemini_chat_model)
    body = {
        "systemInstruction": {"parts": [{"text": system}]},
        "contents": [{"role": "user", "parts": [{"text": user}]}],
        "generationConfig": {"temperature": temperature, "maxOutputTokens": 2048},
    }
    try:
        response = httpx.post(url, params={"key": settings.gemini_api_key}, json=body, timeout=60)
    except httpx.HTTPError as exc:
        raise LLMError(f"LLM request failed: {exc}") from exc
    if response.status_code != 200:
        logger.error("gemini generate status=%s", response.status_code)
        raise LLMError(f"Gemini returned {response.status_code}")
    parts = response.json().get("candidates", [{}])[0].get("content", {}).get("parts", [])
    text = "".join(part.get("text", "") for part in parts).strip()
    if not text:
        raise LLMError("Gemini returned an empty response")
    return text


def _parse_json(text: str):
    match = _JSON_BLOCK.search(text)
    if not match:
        raise LLMError("Model did not return JSON")
    return json.loads(match.group(0))


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


def extract_memories(message: str, known: list[str]) -> list[dict] | None:
    """Returns None when the LLM is unavailable so the caller can fall back."""
    if not get_settings().llm_enabled:
        return None
    known_text = "\n".join(f"- {item}" for item in known) or "(none)"
    raw = _generate(
        _EXTRACT_SYSTEM,
        f"Known memories:\n{known_text}\n\nNew message:\n{message}",
        temperature=0.1,
    )
    data = _parse_json(raw)
    return data.get("memories", []) if isinstance(data, dict) else []


# ------------------------------------------------------------------- conflict

_CONFLICT_SYSTEM = """You decide how a new memory relates to one existing memory.
Return ONLY JSON: {"relation", "reason"}.
relation is one of:
- "duplicate": same fact, nothing new.
- "supersede": the new memory replaces the old one outright.
- "contextual": both are true in different contexts and should coexist.
- "unrelated": they are about different things.
Be conservative. Prefer "contextual" over "supersede" when the new statement
adds a scope (for example DSA versus ML) instead of retracting the old one."""


def judge_conflict(new_content: str, existing_content: str) -> dict | None:
    if not get_settings().llm_enabled:
        return None
    raw = _generate(
        _CONFLICT_SYSTEM,
        f"Existing: {existing_content}\nNew: {new_content}",
        temperature=0.0,
    )
    data = _parse_json(raw)
    if not isinstance(data, dict) or "relation" not in data:
        raise LLMError("Conflict judgement missing relation")
    return data


# ----------------------------------------------------------------------- chat

_CHAT_SYSTEM = """You are RecallOS, a personal assistant with a persistent memory.
You are given memories retrieved for this user. Use them to shape your answer:
match their level, their stated preferences, their goals, and their constraints.
Do not recite the memories back unless asked. Do not invent memories.
When a memory changes your recommendation, say briefly which preference or goal
drove it. If no memories are relevant, answer normally.
Keep answers concrete and skimmable."""


def chat(message: str, memories: list[dict], history: list[dict]) -> str | None:
    if not get_settings().llm_enabled:
        return None
    lines = []
    for item in memories:
        scope = f" ({item['context']})" if item.get("context") else ""
        lines.append(f"- [{item['memory_type']}] {item['content']}{scope}")
    memory_text = "\n".join(lines) or "(no relevant memories)"
    turns = "\n".join(f"{t['role']}: {t['content']}" for t in history[-8:])
    return _generate(
        _CHAT_SYSTEM,
        f"Memories:\n{memory_text}\n\nRecent conversation:\n{turns}\n\nUser: {message}",
    )


# ---------------------------------------------------------------------- intent

def detect_intent(message: str) -> str:
    """Coarse intent, used to bias retrieval. Heuristic on purpose: it must work
    with no API key and it only nudges ranking, it never gates behaviour."""
    text = message.lower()
    if re.search(r"\b(forget|delete|remove|erase)\b", text):
        return "forget"
    if re.search(r"\b(explain|how does|what is|teach)\b", text):
        return "explain"
    if re.search(r"\b(suggest|recommend|idea|project)\b", text):
        return "recommend"
    if re.search(r"\b(i prefer|i like|i am|i'm|my goal|i want)\b", text):
        return "inform"
    return "general"
