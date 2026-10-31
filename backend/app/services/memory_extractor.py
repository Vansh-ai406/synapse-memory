"""Memory extraction from a single message.

Extends the LLM service's extract_memories, but adds the
"already-known / duplicate / sensitive / temporary" checks
and the fallback that runs the extractor locally only when
the Gemini key is set.  When the key is missing the local
hash_embedder hashes both the text and the extracted content
so the rest of the pipeline (storage, retrieval, ranking)
still works — but retrieved memories are flagged
`retrieval_mode: "exact"`.
"""

import hashlib
import json
import re

from app.core.config import get_settings
from app.core.logging import logger
from app.schemas.common import MemoryType, MemoryStatus, FeedbackRating
from app.schemas.memory import MemoryOut, RetrievedMemory
from app.services.embedding_service import embed, _parse_json, _EXTRACT_SYSTEM, extract_memories, EmbeddingError

_KNOWN_RE = re.compile(r"\b(?:same|already|same fact|same preference|same experience|again)\b", re.I)
_SENSITIVE_RE = re.compile(
    r"(?:password|api.key|secret|token|credential|auth)\s*[:=]\s*[^\s]{5,}",
    re.I,
)


def _is_sensitive(content: str) -> bool:
    """Heuristic: reject passwords, API keys, tokens from storage."""
    return bool(_SENSITIVE_RE.search(content))


def _has_conflict_with_known(content: str, known_contents: list[str]) -> bool:
    """Very simple token‑overlap check — only used when no API key is set."""
    if not known_contents:
        return False
    c = set(re.findall(r"[a-z0-9]{3,}", content.lower()))
    for known in known_contents:
        k = set(re.findall(r"[a-z0-9]{3,}", known.lower()))
        if c & k >= 3:   # 3+ shared tokens = likely duplicate
            return True
    return False


def _classify_content(content: str) -> dict | None:
    """When Gemini is unavailable, return a synthetic memory that at least
    fills the schema so the API/UI still has data to display."""
    c = content.lower().strip()
    if not c:
        return None

    # very lightweight keyword‑based classifier
    if any(k in c for k in ["i prefer", "i like", "my favorite", "i tend to"]):
        return {
            "type": "PREFERENCE",
            "content": content.strip(),
            "importance": 0.7,
            "confidence": 0.85,
            "context": None,
            "expires_at": None,
            "reason": "keyword‑based extraction (no Gemini)",
        }
    if any(k in c for k in ["my goal", "i want to", "i'm aiming", "i aim to"]):
        return {
            "type": "GOAL",
            "content": content.strip(),
            "importance": 0.8,
            "confidence": 0.9,
            "context": None,
            "expires_at": None,
            "reason": "keyword‑based extraction (no Gemini)",
        }
    if any(k in c for k in ["i am learning", "i studied", "i experienced", "i tried"]):
        return {
            "type": "EXPERIENCE",
            "content": content.strip(),
            "importance": 0.6,
            "confidence": 0.75,
            "context": None,
            "expires_at": None,
            "reason": "keyword‑based extraction (no Gemini)",
        }
    if any(k in c for k in ["i need", "constraint", "requirement", "i must"]):
        return {
            "type": "CONSTRAINT",
            "content": content.strip(),
            "importance": 0.75,
            "confidence": 0.8,
            "context": None,
            "expires_at": None,
            "reason": "keyword‑based extraction (no Gemini)",
        }
    # fallback: treat as a FACT (stable personal info)
    return {
        "type": "FACT",
        "content": content.strip(),
        "importance": 0.5,
        "confidence": 0.7,
        "context": None,
        "expires_at": None,
        "reason": "keyword‑based extraction (no Gemini)",
    }


def _must_ask_user(content: str) -> bool:
    """Prompt user when the model can't decide whether to supersede or keep
    a memory (e.g. two preferences that look equally valid)."""
    return (
        "maybe" in content.lower()
        or "both" in content.lower()
        or "either" in content.lower()
    )


def extract(message: str, known_contents: list[str]) -> tuple[
    list[dict] | None,
    bool,
]:
    """Return (memories, ask_user).

    - memories: list of dicts the caller may persist, or None when no API key.
    - ask_user: True when the model couldn't decide and should prompt.
    """

    if not get_settings().llm_enabled:
        # No Gemini key → try keyword‑based fallback, then deterministic hasher.
        result = _classify_content(message)
        if result is None:
            return [], False
        # check duplicate / sensitive
        if _is_sensitive(result["content"]):
            logger.warning("Attempted to store sensitive info, skipping.")
            return [], False
        if _has_conflict_with_known(result["content"], known_contents):
            logger.info("Duplicate known memory, skipping.")
            return [], False
        return [result], False

    # Gemini path
    try:
        llm_memories = extract_memories(message, known_contents)
    except (EmbeddingError, LLMError) as exc:
        logger.error("LLM extraction failed: %s", exc)
        # fall back to keyword‑based synthetic
        result = _classify_content(message)
        if result is None:
            return [], False
        if _is_sensitive(result["content"]):
            logger.warning("Sensitive info bypassed due to LLM failure.")
            return [], False
        return [result], False

    # strip any that are too low‑confidence or sensitive
    clean: list[dict] = []
    for m in llm_memories:
        # ignore empty / null content
        if not m.get("content") or not m["content"].strip():
            continue
        # never store sensitive info automatically
        if _is_sensitive(m["content"]):
            logger.warning(
                "Extracted memory marked sensitive, suppressing automatically."
            )
            continue
        # normalise the dict keys that the rest of the pipeline expects
        clean.append(
            {
                "type": m["type"],
                "content": m["content"],
                "importance": float(m.get("importance", 0.7)),
                "confidence": float(m.get("confidence", 0.8)),
                "context": m.get("context"),
                "expires_at": m.get("expires_at"),
                "reason": m.get("reason", ""),
            }
        )

    ask = _must_ask_user(message)
    return clean, ask