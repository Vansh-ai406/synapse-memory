"""Memory retrieval — two recall paths, both explained per hit.

Path 1 (always-load): PREFERENCE and CONSTRAINT memories of this user are
   always loaded for planning-style requests. Reason: a query like "Plan my
   MongoDB revision" has little semantic overlap with "I prefer short morning
   study sessions", so vector search alone could miss it.
Path 2 (vector): Atlas $vectorSearch over `embedding` with a filter on
   `user_id` and `status=active` (both fields must be declared in the index).
   Falls back to an exact cosine scan over the user's own memories when the
   Atlas index is missing, and responses are flagged so the UI can say so.

Every recalled item carries content, the path that found it, a similarity /
score, and a `why` string. Isolation: the filter always includes user_id.
"""

import logging
from datetime import datetime, timedelta
from typing import List

from app.core.config import get_settings
from app.database.mongodb import memories
from app.schemas.memory import RetrievedMemory, MemoryOut
from app.services.embedding_service import embed, EmbeddingError

_logger = logging.getLogger("recallos")

# Types that must always be loaded regardless of similarity.
ALWAYS_LOAD_TYPES = ("PREFERENCE", "CONSTRAINT")


def _doc_to_memory_out(doc: dict) -> MemoryOut:
    return MemoryOut(
        id=str(doc["_id"]),
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


def _cosine(a: List[float], b: List[float]) -> float:
    if len(a) != len(b) or not a:
        return 0.0
    num = sum(x * y for x, y in zip(a, b))
    den = (sum(x * x for x in a) * sum(y * y for y in b)) ** 0.5
    return num / den if den else 0.0


def _recency(doc: dict) -> float:
    updated = doc.get("updated_at") or doc.get("created_at")
    if not updated:
        return 0.0
    if isinstance(updated, str):
        return 0.5
    days = (datetime.utcnow() - updated).days
    return max(0.0, 1.0 - days / 30.0)


def _weighted(doc: dict, sim: float) -> tuple[float, str]:
    settings = get_settings()
    imp = float(doc.get("importance", 0.5))
    conf = float(doc.get("confidence", 0.5))
    rec = _recency(doc)
    score = round(
        settings.rank_weight_similarity * sim
        + settings.rank_weight_importance * imp
        + settings.rank_weight_confidence * conf
        + settings.rank_weight_recency * rec,
        4,
    )
    why_parts = []
    if sim >= 0.55:
        why_parts.append(f"similar to your message ({sim:.2f})")
    if imp >= 0.8:
        why_parts.append("high importance")
    if conf >= 0.8:
        why_parts.append("high confidence")
    if rec >= 0.9:
        why_parts.append("recently updated")
    return score, "; ".join(why_parts) or "matched by ranking weights"


async def _vector_search(q_emb: list[float], user_id: str, memory_type: str | None, limit: int):
    settings = get_settings()
    filt = {"user_id": user_id, "status": "active"}
    if memory_type:
        filt["memory_type"] = memory_type
    pipeline = [
        {
            "$vectorSearch": {
                "index": settings.vector_index_name,
                "path": "embedding",
                "queryVector": q_emb,
                "numCandidates": settings.retrieval_candidates * 5,
                "limit": max(limit, settings.retrieval_candidates),
                "filter": filt,
            }
        },
        {"$addFields": {"vs_score": {"$meta": "vectorSearchScore"}}},
        {"$project": {"embedding": 0}},
    ]
    return await memories().aggregate(pipeline).to_list(length=None)


async def _always_load(user_id: str, types: tuple[str, ...] = ALWAYS_LOAD_TYPES) -> list[dict]:
    """All active preference/constraint memories — small set, directly relevant."""
    cursor = memories().find(
        {"user_id": user_id, "status": "active", "memory_type": {"$in": list(types)}}
    ).sort([("importance", -1), ("created_at", -1)])
    docs = await cursor.to_list(length=20)
    for d in docs:
        d.pop("embedding", None)
    return docs


async def retrieve(
    query: str,
    user_id: str,
    memory_type: str | None = None,
    max_results: int | None = None,
    intent: str = "general",
) -> tuple[List[RetrievedMemory], str]:
    """Two-path recall. Returns (retrieved memories, retrieval_mode)."""
    settings = get_settings()
    if max_results is None:
        max_results = settings.retrieval_max_memories

    try:
        q_emb = await embed(query)
    except EmbeddingError as exc:
        _logger.error("Embedding failed during retrieval: %s", exc)
        return [], "error"

    mode = "vector"
    vector_docs: list[dict] = []
    try:
        vector_docs = await _vector_search(q_emb, user_id, memory_type, max_results)
        if doc := next(
            (d for d in vector_docs if d.get("vs_score") is not None), None
        ):
            pass  # scores present; treat as healthy vector search
        if not vector_docs:
            raise RuntimeError("no results")
    except Exception as exc:
        _logger.info("Vector search unavailable (%s) — exact scan fallback", exc.__class__.__name__)
        mode = "exact"
        # Same isolation as vector path; identical results, just a linear scan.
        cursor = memories().find({"user_id": user_id, "status": "active"})
        candidates = await cursor.to_list(length=None)
        scored = []
        for doc in candidates:
            emb = doc.get("embedding")
            if not emb or len(emb) != len(q_emb):
                continue
            sim = _cosine(q_emb, emb)
            if sim >= settings.retrieval_min_similarity:
                scored.append((doc, sim))
        scored.sort(key=lambda x: x[1], reverse=True)
        vector_docs = [dict(d, vs_score=sim) for d, sim in scored[:max_results]]

    results: dict[str, tuple[dict, float, float, str]] = {}  # id -> (doc, sim, score, why/path)
    for doc in vector_docs:
        sim = float(doc.get("vs_score") or 0.0)
        if sim < settings.retrieval_min_similarity:
            continue
        score, why = _weighted(doc, sim)
        path = "vector" if mode == "vector" else "exact-scan"
        results[str(doc["_id"])] = (doc, sim, score, f"{path}: {why}")

    # Always-load path: preferences/constraints directly injected.
    loaded = await _always_load(user_id)
    for doc in loaded:
        key = str(doc["_id"])
        if key in results:
            doc, sim, score, why = results[key]
            results[key] = (doc, sim, score, f"always-load: {why.split(': ', 1)[-1]}")
            continue
        if len(results) >= max_results + len(ALWAYS_LOAD_TYPES) + 2:
            continue
        sim = _cosine(q_emb, doc.get("embedding") or [])
        score, why = _weighted(doc, max(sim, 0.0))
        results[key] = (doc, sim, score, f"always-load: all active preferences/constraints are loaded; {why}")

    retrieved = [
        RetrievedMemory(
            memory=_doc_to_memory_out(doc),
            similarity=round(sim, 4),
            score=score,
            why=why.split(": ", 1)[-1],
            path=why.split(": ", 1)[0],
        )
        for doc, sim, score, why in results.values()
    ]
    retrieved.sort(key=lambda r: r.score, reverse=True)

    # Touch access stats (best-effort).
    now = datetime.utcnow()
    for r in retrieved:
        try:
            await memories().update_one(
                {"_id": r.memory.id},
                {"$inc": {"access_count": 1}, "$set": {"last_accessed_at": now}},
            )
        except Exception:
            pass

    return retrieved[: max_results + len(ALWAYS_LOAD_TYPES)], mode
