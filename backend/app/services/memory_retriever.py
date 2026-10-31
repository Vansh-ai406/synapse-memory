"""Memory retrieval using MongoDB Atlas Vector Search.

Falls back to exact cosine similarity over stored embeddings when the
Atlas vector index is unavailable.
"""

import logging
from datetime import datetime
from typing import List

from app.core.config import get_settings
from app.database.mongodb import memories
from app.schemas.memory import RetrievedMemory, MemoryOut
from app.services.embedding_service import embed

_logger = logging.getLogger("recallos")


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


async def retrieve(
    query: str,
    user_id: str,
    memory_type: str | None = None,
    max_results: int | None = None,
) -> tuple[List[RetrievedMemory], str]:
    """Retrieve relevant memories for a user query.

    Returns a tuple of (retrieved memories list, retrieval mode string).
    Retrieval mode is "vector" when Atlas vector search is used, "exact"
    when we fell back to cosine scan over stored embeddings.
    """
    settings = get_settings()
    if max_results is None:
        max_results = settings.retrieval_max_memories

    # Generate query embedding
    q_emb = await embed(query)

    db = memories()
    filter_doc = {"user_id": user_id, "status": "active"}
    if memory_type:
        filter_doc["memory_type"] = memory_type

    # Try Atlas vector search first
    vector_index = settings.vector_index_name

    # Build the $vectorSearch aggregation pipeline
    pipeline = [
        {"$match": filter_doc},
        {
            "$vectorSearch": {
                "index": vector_index,
                "path": "embedding",
                "queryVector": q_emb,
                "numCandidates": settings.retrieval_candidates * 3,
                "limit": settings.retrieval_candidates,
                "filter": {},  # additional filters go here if needed
            }
        },
        {"$project": {"embedding": 0}},  # Remove embedding from results
        {"$limit": max_results},
    ]

    # Attempt vector search; catch errors to fall back to exact mode
    try:
        results = await db.aggregate(pipeline).to_list(length=None)
        if not results:
            # Vector search returned empty - fall back to exact scan
            raise Exception("No results from vector search")
        retrieval_mode = "vector"
    except Exception as exc:
        _logger.info("Vector search unavailable (%s), using exact cosine scan", exc)
        retrieval_mode = "exact"

        # Exact scan: get all candidate embeddings and compute cosine
        cursor = db.find(filter_doc).sort([("importance", -1), ("confidence", -1)])
        candidates = await cursor.to_list(length=None)

        scored = []
        for doc in candidates:
            emb = doc.get("embedding")
            if emb and len(emb) == len(q_emb):
                sim = _cosine(q_emb, emb)
                if sim >= settings.retrieval_min_similarity:
                    scored.append((doc, sim, sim))
            else:
                # No embedding - skip
                continue

        # Sort by score and take top K
        scored.sort(key=lambda x: x[2], reverse=True)
        results = [r[0] for r in scored[:max_results]]

    # Update access counts and timestamps
    for doc in results:
        await db.update_one(
            {"_id": doc["_id"]},
            {"$inc": {"access_count": 1}, "$set": {"last_accessed_at": datetime.utcnow()}},
        )

    # Build retrieved memory objects with scores
    retrieved = []
    for doc in results:
        # Re-score including all ranking weights for the response
        sim = doc.get("_score", 0.0) if "_score" in doc else _cosine(q_emb, doc.get("embedding", [0] * len(q_emb)))
        imp = doc.get("importance", 0.5)
        conf = doc.get("confidence", 0.5)

        # Recency: 1.0 for demo
        rec = 1.0

        w_sim = settings.rank_weight_similarity
        w_imp = settings.rank_weight_importance
        w_conf = settings.rank_weight_confidence
        w_rec = settings.rank_weight_recency

        weighted_score = round(w_sim * sim + w_imp * imp + w_conf * conf + w_rec * rec, 4)

        # Build rationale
        why_parts = []
        if sim >= 0.6:
            why_parts.append("high similarity")
        if imp >= 0.8:
            why_parts.append("high importance")
        if conf >= 0.8:
            why_parts.append("high confidence")
        why = "; ".join(why_parts) if why_parts else "matches query"

        retrieved.append(
            RetrievedMemory(
                memory=_doc_to_memory_out(doc),
                similarity=round(sim, 4),
                score=weighted_score,
                why=why,
            )
        )

    # Sort by final weighted score
    retrieved.sort(key=lambda r: r.score, reverse=True)

    return retrieved[:max_results], retrieval_mode