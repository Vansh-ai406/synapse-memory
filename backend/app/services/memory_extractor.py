"""Memory extraction from a single message.

Wraps the LLM service's extract_memories and adds the
"already-known / sensitive / temporary" checks. When the Gemini key is unset
the extractor falls back to a keyword-based classifier so the rest of the
pipeline (storage, retrieval, ranking) still runs offline — and the replies
are flagged accordingly by the chat layer.
"""

import re

from app.core.config import get_settings
from app.core.logging import logger
from app.services.llm_service import extract_memories, detect_intent

_SENSITIVE_RE = re.compile(
    r"(?:password|api\.key|secret|token|credential)\s*[:=]\s*[^\s]{5,}",
    re.I,
)

# Messages that only ever ask for something are NOT memories. Correction
# markers re-enable extraction ("actually I now prefer evening…").
_REQUEST_INTENTS = {"plan", "explain", "recommend", "forget"}
_CORRECTION_RE = re.compile(
    r"\b(?:actually|instead|no longer|changed my mind|update|correction)\b",
    re.I,
)


def is_storable(message: str) -> bool:
    """Gate extraction: plans/questions/suggestions aren't memories, but
    corrections and first-person statements are."""
    intent = detect_intent(message)
    if intent in _REQUEST_INTENTS:
        return bool(_CORRECTION_RE.search(message))
    return True


def is_sensitive(content: str) -> bool:
    """Heuristic: reject passwords, API keys, tokens from storage."""
    return bool(_SENSITIVE_RE.search(content))


_CORRECTION_HINT_RE = re.compile(r"\b(?:now|changed my mind|actually|instead)\b")


def _has_duplicate(content: str, known_contents: list[str]) -> bool:
    """Very simple token-overlap check — only used when no key is set."""
    if not known_contents:
        return False
    c = set(re.findall(r"[a-z0-9]{3,}", content.lower()))
    for known in known_contents:
        k = set(re.findall(r"[a-z0-9]{3,}", known.lower()))
        if len(c & k) >= 3:  # 3+ shared tokens = likely duplicate
            return True
    return False


def _classify_content(content: str) -> dict | None:
    """When Gemini is unavailable, return a synthetic memory that at least
    fills the schema so the API/UI still has data to display."""
    c = content.lower().strip()
    if not c:
        return None

    # very lightweight keyword-based classifier
    if _CORRECTION_HINT_RE.search(c) and any(k in c for k in ["prefer", "session", "morning", "evening", "night"]):
        return {
            "type": "PREFERENCE",
            "content": content.strip(),
            "importance": 0.8,
            "confidence": 0.8,
            "context": None,
            "expires_at": None,
            "reason": "keyword-based extraction of an updated preference (no Gemini)",
        }
    if any(k in c for k in ["i prefer", "i like", "my favorite", "i tend to", "i study best"]):
        return {
            "type": "PREFERENCE",
            "content": content.strip(),
            "importance": 0.8,
            "confidence": 0.85,
            "context": None,
            "expires_at": None,
            "reason": "keyword-based extraction (no Gemini)",
        }
    if any(k in c for k in ["my goal", "i want to", "i'm aiming", "i aim to"]):
        return {
            "type": "GOAL",
            "content": content.strip(),
            "importance": 0.8,
            "confidence": 0.9,
            "context": None,
            "expires_at": None,
            "reason": "keyword-based extraction (no Gemini)",
        }
    if any(k in c for k in ["i am learning", "i studied", "i experienced", "i tried"]):
        return {
            "type": "EXPERIENCE",
            "content": content.strip(),
            "importance": 0.6,
            "confidence": 0.75,
            "context": None,
            "expires_at": None,
            "reason": "keyword-based extraction (no Gemini)",
        }
    if any(k in c for k in ["i need", "constraint", "requirement", "i must"]):
        return {
            "type": "CONSTRAINT",
            "content": content.strip(),
            "importance": 0.75,
            "confidence": 0.8,
            "context": None,
            "expires_at": None,
            "reason": "keyword-based extraction (no Gemini)",
        }
    # fallback: treat as a FACT (stable personal info)
    return {
        "type": "FACT",
        "content": content.strip(),
        "importance": 0.5,
        "confidence": 0.7,
        "context": None,
        "expires_at": None,
        "reason": "keyword-based extraction (no Gemini)",
    }


def _should_ask_user(message: str) -> bool:
    """Prompt user when the message sounds equivocal (two preferences that
    look equally valid) — conservative default."""
    lowered = message.lower()
    return bool(
        re.search(r"\b(?:maybe|not sure|either|perhaps)\b", lowered)
        or "keep both" in lowered
    )


async def extract(message: str, known_contents: list[str]) -> tuple[list[dict], bool]:
    """Return (memories, ask_user).

    memories: list of dicts the caller may persist.
    ask_user: True when the caller should offer the user a choice.
    """

    if not get_settings().llm_enabled:
        # No Gemini key → keyword-based fallback keeps the pipeline alive.
        result = _classify_content(message)
        if result is None or is_sensitive(result["content"]):
            return [], False
        if _has_duplicate(result["content"], known_contents):
            logger.info("Duplicate known memory, skipping.")
            return [], False
        return [result], _should_ask_user(message)

    if not is_storable(message):
        logger.info("Message is a request/correction target, not stored: intent gate")
        return [], False

    llm_memories = await extract_memories(message, known_contents)
    if llm_memories is None:
        # LLM unavailable → keyword fallback so the demo still stores something.
        result = _classify_content(message)
        if result is None or is_sensitive(result["content"]):
            return [], False
        return [result], _should_ask_user(message)

    clean: list[dict] = []
    for m in llm_memories:
        if not isinstance(m, dict):
            continue
        # ignore empty / null content
        content = m.get("content")
        if not content or not str(content).strip():
            continue
        # never store sensitive info automatically
        if is_sensitive(str(content)):
            logger.warning("Extracted memory marked sensitive, suppressing automatically.")
            continue
        clean.append(
            {
                "type": m.get("type", "FACT"),
                "content": str(content).strip(),
                "importance": float(m.get("importance", 0.7)),
                "confidence": float(m.get("confidence", 0.8)),
                "context": m.get("context"),
                "expires_at": m.get("expires_at"),
                "reason": m.get("reason", ""),
            }
        )

    return clean, _should_ask_user(message)
