"""Detect and resolve conflicts between a new memory and existing ones.

The resolver decides one of:
- "supersede": replace the old memory entirely.
- "contextual": keep both, but with different contexts/scope.
- "duplicate": the new info is already stored, skip it.
- "needs_clarification": ask the user (conservative default).

The model's judgement is the primary signal, but a conservative fallback
is used when the model can't decide.
"""

import json
import re

from app.core.config import get_settings
from app.core.logging import logger
from app.services.llm_service import _generate, _parse_json, _CONFLICT_SYSTEM

_CONFLICT_SYSTEM = """You decide how a new memory relates to one existing memory.
Return ONLY JSON: {"relation", "reason"}.
relation is one of:
- "duplicate": same fact, nothing new.
- "supersede": the new memory replaces the old one outright.
- "contextual": both are true in different contexts and should coexist.
- "unrelated": they are about different things.
Be conservative. Prefer "contextual" over "supersede" when the new statement
adds a scope (for example DSA versus ML) instead of retracting the old one.
"""


def _model_judge(new_content: str, existing_content: str) -> dict | None:
    """Ask the LLM for a relation decision. Returns None when the key is absent."""
    if not get_settings().llm_enabled:
        return None
    try:
        raw = _generate(_CONFLICT_SYSTEM, f"Existing: {existing_content}\nNew: {new_content}", temperature=0.0)
        data = _parse_json(raw)
        if not isinstance(data, dict) or "relation" not in data:
            raise LLMError("Missing relation")
        return data
    except (LLMError, Exception) as exc:
        logger.warning("Conflict model failed: %s", exc)
        return None


def resolve_conflict(
    new_content: str,
    existing_memories: list[dict],
) -> dict:
    """Return a decision dict with keys:
    - action: one of "supersede", "contextual", "duplicate", "needs_clarification"
    - previous: the existing memory doc that was compared (or None)
    - reason: short explanation
    - new_memory: the cleaned‑up new‑memory dict (may be omitted if "duplicate")
    """

    # 1. Quick duplicate check (token overlap) when no Gemini
    if not get_settings().llm_enabled:
        new_tokens = set(re.findall(r"[a-z0-9]{3,}", new_content.lower()))
        for mem in existing_memories:
            old_tokens = set(re.findall(r"[a-z0-9]{3,}", mem.get("content", "").lower()))
            if new_tokens & old_tokens >= 3:
                return {
                    "action": "duplicate",
                    "previous": mem,
                    "reason": "Token‑overlap duplicate detected (no Gemini key).",
                    "new_memory": None,
                }

    # 2. Model‑based judgement
    judgement = _model_judge(new_content, existing_memories[0].get("content", "") if existing_memories else "")
    if judgement is not None:
        rel = judgement["relation"]
        if rel == "duplicate":
            return {
                "action": "duplicate",
                "previous": existing_memories[0] if existing_memories else None,
                "reason": judgement.get("reason", "Model says duplicate."),
                "new_memory": None,
            }
        if rel == "supersede":
            return {
                "action": "supersede",
                "previous": existing_memories[0] if existing_memories else None,
                "reason": judgement.get("reason", "Model says supersede."),
                "new_memory": None,
            }
        if rel == "contextual":
            return {
                "action": "contextual",
                "previous": existing_memories[0] if existing_memories else None,
                "reason": judgement.get("reason", "Contextual preference preserved."),
                "new_memory": None,
            }
        if rel == "unrelated":
            # keep both, no conflict
            return {
                "action": "unrelated",
                "previous": existing_memories[0] if existing_memories else None,
                "reason": "Unrelated memories, both retained.",
                "new_memory": None,
            }

    # 3. Fallback when model can't decide
    # If the new statement adds a clear scope (e.g. "for DSA" vs "for ML"),
    # treat it as contextual; otherwise ask the user.
    new_lower = new_content.lower()
    if any(kw in new_lower for kw in ["for dsa", "for ml", "for python", "for c++", "instead", "but"]):
        return {
            "action": "contextual",
            "previous": existing_memories[0] if existing_memories else None,
            "reason": "Scope qualifier detected, keeping both preferences.",
            "new_memory": None,
        }

    # Last resort: ask the user
    return {
        "action": "needs_clarification",
        "previous": existing_memories[0] if existing_memories else None,
        "reason": "Model undecided — asking user for clarification.",
        "new_memory": None,
    }