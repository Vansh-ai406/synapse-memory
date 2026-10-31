"""Detect and resolve conflicts between a new memory and existing ones.

The resolver decides one of:
- "duplicate": the new info is already stored, skip it.
- "supersede": replace the targeted (most similar) existing memory outright.
- "unrelated": keep both, no conflict.
- "needs_clarification": ask the user (conservative default).

The primary signal is an embedding-similarity match for the target memory,
then an LLM judgement for the relation. When the LLM is unavailable, token
overlap resolves duplicates conservatively and everything else stores as new.
"""

from app.core.logging import logger
from app.schemas.memory import RetrievedMemory, MemoryOut
from app.services import llm_service
from app.services.embedding_service import embed


def _cosine(a: list[float], b: list[float]) -> float:
    if not a or not b or len(a) != len(b):
        return 0.0
    num = sum(x * y for x, y in zip(a, b))
    den = (sum(x * x for x in a) * sum(y * y for y in b)) ** 0.5
    return num / den if den else 0.0


def _target_memory(
    new_content: str, new_emb: list[float], existing_memories: list[dict]
) -> tuple[dict | None, float]:
    """Pick the existing memory most likely to be affected by the new one.

    Uses embedding cosine similarity over active memories first (this is the
    same similarity the retriever uses), falling back to token overlap when
    embeddings are missing.
    """
    best: tuple[dict | None, float] = (None, 0.0)
    for mem in existing_memories:
        if mem.get("status") == "deleted":
            continue
        mem_emb = mem.get("embedding")
        sim = _cosine(new_emb, mem_emb) if mem_emb else 0.0
        if sim > best[1]:
            best = (mem, sim)
    if best[0] is None:
        # Embedding-free fallback: most recent non-deleted memory.
        text = new_content.lower()
        import re

        new_tokens = set(re.findall(r"[a-z0-9]{3,}", text))
        for mem in existing_memories:
            if mem.get("status") == "deleted":
                continue
            old_tokens = set(re.findall(r"[a-z0-9]{3,}", mem.get("content", "").lower()))
            overlap = len(new_tokens & old_tokens)
            if overlap > best[1]:
                best = (mem, overlap / 10.0)
    return best


def _token_judgement(new_content: str, target: dict) -> dict:
    """Local fallback when the LLM can't judge: conservative and predictable.

    Heuristic on token sets:
    - new is a (near-)subset of the old wording → duplicate / paraphrase
    - both sides carry tokens the other lacks → the value changed → supersede
    """
    import re

    new_tokens = set(re.findall(r"[a-z0-9]{3,}", new_content.lower()))
    old_tokens = set(re.findall(r"[a-z0-9]{3,}", target.get("content", "").lower()))
    if not old_tokens:
        return {"relation": "unrelated", "reason": "Target memory has no content."}
    added = new_tokens - old_tokens
    removed = old_tokens - new_tokens
    if len(new_tokens & old_tokens) >= 3 and (not removed or len(removed) <= 1):
        return {
            "relation": "duplicate",
            "reason": "Same memory already exists (token overlap, local mode).",
        }
    if len(new_tokens & old_tokens) >= 2 and added and removed:
        return {
            "relation": "supersede",
            "reason": "Same topic, different value — old memory superseded (local mode).",
        }
    return {
        "relation": "unrelated",
        "reason": "New memory is not a duplicate or an update of existing ones (local mode).",
    }


async def resolve_conflict(
    new_content: str,
    existing_memories: list[dict],
    new_embedding: list[float] | None = None,
) -> dict:
    """Return a decision dict:
    - action: "duplicate" | "supersede" | "unrelated" | "needs_clarification"
    - previous: the targeted existing memory doc (or None)
    - reason: short explanation for the UI/history
    """
    if new_embedding is None:
        new_embedding = await embed(new_content)
    prior, similarity = _target_memory(new_content, new_embedding, existing_memories)

    if prior is None or similarity < 0.30:
        return {
            "action": "unrelated",
            "previous": None,
            "reason": "No existing memory overlaps this statement.",
        }

    if not get_llm_enabled():
        judgement = _token_judgement(new_content, prior)
    else:
        judgement = await llm_service.judge_conflict(new_content, prior.get("content", ""))
        if judgement is None:
            judgement = _token_judgement(new_content, prior)
            judgement["reason"] += " (LLM undecided — local fallback)"

    relation = judgement.get("relation", "unrelated")
    reason = judgement.get("reason", "")

    result = {
        "action": relation if relation in ("duplicate", "supersede") else "unrelated",
        "previous": _to_memory_out(prior),
        "reason": reason or "Memory relation resolved.",
    }
    logger.info(
        "conflict action=%s similarity=%.2f target=%s",
        result["action"], similarity, prior.get("_id"),
    )
    return result


def get_llm_enabled() -> bool:
    from app.core.config import get_settings

    return get_settings().llm_enabled


def _to_memory_out(doc: dict) -> MemoryOut:
    from app.schemas.memory import MemoryOut as _MO

    return _MO(
        id=str(doc.get("_id", "")),
        memory_type=doc.get("memory_type", "FACT"),
        content=doc.get("content", ""),
        context=doc.get("context"),
        importance=doc.get("importance", 0.5),
        confidence=doc.get("confidence", 0.5),
        status=doc.get("status", "active"),
        pinned=doc.get("pinned", False),
        is_sensitive=doc.get("is_sensitive", False),
        reason=doc.get("reason"),
        source=doc.get("source", {}),
        created_at=doc.get("created_at"),
        updated_at=doc.get("updated_at"),
        last_accessed_at=doc.get("last_accessed_at"),
        expires_at=doc.get("expires_at"),
        access_count=doc.get("access_count", 0),
        superseded_by=doc.get("superseded_by"),
        supersedes=doc.get("supersedes"),
    )
