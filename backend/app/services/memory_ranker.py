"""Rank retrieved memories with a configurable scoring formula.

Score = w_sim * similarity + w_imp * importance + w_conf * confidence + w_rec * recency_score

Weights are configurable in `config.py` and must sum to 1.0.
"""

from typing import List, Dict, Any

from app.core.config import get_settings
from app.core.logging import logger


def _recency_score(created_at, last_accessed_at) -> float:
    """Return a 0–1 recency factor based on how recently the memory was
    created/accessed.  The exact implementation will depend on the date type
    stored in MongoDB; this simple version just returns 1.0 for demo purposes."""
    # In a real app we would compute e.g. exp(-age_days / tau).
    return 1.0


def rank_memories(
    memories: List[Dict[str, Any]],
    query_embedding: List[float],
    stored_embeddings: List[List[float]],
) -> List[RetrievedMemory]:
    """Rank a list of memories against a query embedding.

    Returns a list of RetrievedMemory, each with:
    - memory: the MemoryOut schema
    - similarity: cosine similarity (0–1)
    - score: final weighted score
    - why: short human‑readable rationale
    """
    if not memories:
        return []

    settings = get_settings()
    w_sim = settings.rank_weight_similarity
    w_imp = settings.rank_weight_importance
    w_conf = settings.rank_weight_confidence
    w_rec = settings.rank_weight_recency

    results: list[tuple[RetrievedMemory, float, str]] = []

    for mem_doc, stored_emb in zip(memories, stored_embeddings):
        # cosine similarity
        sim = _cosine(query_embedding, stored_emb)

        # importance, confidence from the document
        imp = mem_doc.get("importance", 0.5)
        conf = mem_doc.get("confidence", 0.5)

        # recency score (1.0 for demo)
        rec = _recency_score(mem_doc.get("created_at"), mem_doc.get("last_accessed_at"))

        # final weighted score
        final = round(w_sim * sim + w_imp * imp + w_conf * conf + w_rec * rec, 4)

        # simple rationale
        why_parts: list[str] = []
        if sim >= 0.6:
            why_parts.append("high similarity")
        if imp >= 0.8:
            why_parts.append("high importance")
        if conf >= 0.8:
            why_parts.append("high confidence")
        if not why_parts:
            why_parts.append("matches query")
        why = "; ".join(why_parts)

        mem_out = MemoryOut(
            id=str(mem_doc.get("_id", "")),
            memory_type=mem_doc.get("memory_type", "FACT"),
            content=mem_doc.get("content", ""),
            context=mem_doc.get("context"),
            importance=imp,
            confidence=conf,
            status=mem_doc.get("status", "active"),
            pinned=mem_doc.get("pinned", False),
            is_sensitive=mem_doc.get("is_sensitive", False),
            reason=mem_doc.get("reason"),
            source=mem_doc.get("source", {}),
            created_at=mem_doc.get("created_at"),
            updated_at=mem_doc.get("updated_at"),
            last_accessed_at=mem_doc.get("last_accessed_at"),
            expires_at=mem_doc.get("expires_at"),
            access_count=mem_doc.get("access_count", 0),
            superseded_by=mem_doc.get("superseded_by"),
            supersedes=mem_doc.get("supersedes"),
        )

        results.append(
            (
                RetrievedMemory(
                    similarity=sim,
                    score=final,
                    why=why,
                ),
                final,
                why,
            )
        )

    # sort descending by score
    results.sort(key=lambda x: x[1], reverse=True)

    # return top K configured in settings
    top_k = settings.retrieval_max_memories
    return [
        RetrievedMemory(
            memory=mem_out,
            similarity=r[0].similarity,
            score=r[0].score,
            why=r[0].why,
        )
        for r in results[:top_k]


def _cosine(a: List[float], b: List[float]) -> float:
    if len(a) != len(b):
        return 0.0
    num = sum(x * y for x, y in zip(a, b))
    den = (sum(x * x for x in a) * sum(y * y for y in b)) ** 0.5
    return num / den if den else 0.0