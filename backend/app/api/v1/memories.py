"""Memory CRUD and search endpoints."""

from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from app.schemas.memory import (
    MemoryCreate,
    MemoryUpdate,
    ForgetRequest,
    MemorySearchRequest,
    MemoryOut,
    RetrievedMemory,
)
from app.core.config import get_settings
from app.core.security import get_current_user_id
from app.core.logging import logger
from app.database.mongodb import users, memories, memory_history
from app.services.embedding_service import embed, EmbeddingError
from app.services.memory_extractor import extract
from app.services.memory_conflict_resolver import resolve_conflict
from typing import Optional
import re

router = APIRouter(prefix="/memories", tags=["memories"])


def _current_user_id() -> str:
    return get_current_user_id()


@router.get("", response_model=list[MemoryOut])
async def list_memories(
    memory_type: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
    user_id: str = Depends(_current_user_id),
):
    db = memories()
    filt = {"user_id": user_id, "status": {"$ne": "deleted"}}
    if memory_type:
        filt["memory_type"] = memory_type
    cursor = db.find(filt).sort("created_at", -1).skip(skip).limit(limit)
    docs = await cursor.to_list(length=None)
    return [_doc_to_out(d) for d in docs]


def _doc_to_out(d: dict) -> MemoryOut:
    return MemoryOut(
        id=str(d["_id"]),
        memory_type=d.get("memory_type", "FACT"),
        content=d.get("content", ""),
        context=d.get("context"),
        importance=d.get("importance", 0.5),
        confidence=d.get("confidence", 0.5),
        status=d.get("status", "active"),
        pinned=d.get("pinned", False),
        is_sensitive=d.get("is_sensitive", False),
        reason=d.get("reason"),
        source=d.get("source", {}),
        created_at=d.get("created_at"),
        updated_at=d.get("updated_at"),
        last_accessed_at=d.get("last_accessed_at"),
        expires_at=d.get("expires_at"),
        access_count=d.get("access_count", 0),
        superseded_by=d.get("superseded_by"),
        supersedes=d.get("supersedes"),
    )


@router.post("", response_model=MemoryOut, status_code=201)
async def create_memory(
    create: MemoryCreate,
    user_id: str = Depends(_current_user_id),
):
    """Create a memory from a user-provided text."""
    # 1. Get embedding
    try:
        embedding = embed(create.content)
    except EmbeddingError as exc:
        raise HTTPException(
            422, f"Could not embed memory: {exc}"
        )

    # 2. Check for duplicates / conflicts with existing memories
    db = memories()
    existing = await db.find({"user_id": user_id}).to_list(None)
    existing_contents = [m.get("content", "") for m in existing]

    extracted, _ = extract(create.content, existing_contents)
    if not extracted:
        raise HTTPException(
            400, "No memory extracted — content was empty, duplicate, or sensitive."
        )

    final_memories: list[dict] = []
    for mem_dict in extracted:
        if _is_sensitive(mem_dict["content"]):
            logger.warning("Sensitive memory suppressed after extraction.")
            continue

        # Resolve conflicts
        conflict = resolve_conflict(mem_dict["content"], existing)
        action = conflict["action"]

        if action == "duplicate":
            await memory_history().insert_one(
                {
                    "user_id": user_id,
                    "related_memory_id": str(existing[0]["_id"] if existing else ""),
                    "action": "duplicate_detected",
                    "new_content": mem_dict["content"],
                    "reason": conflict["reason"],
                    "created_at": datetime.utcnow(),
                }
            )
            continue

        now = datetime.utcnow()
        mem_doc = {
            "user_id": user_id,
            "memory_type": mem_dict["type"],
            "content": mem_dict["content"],
            "context": mem_dict.get("context"),
            "embedding": embedding,
            "importance": mem_dict.get("importance", 0.7),
            "confidence": mem_dict.get("confidence", 0.8),
            "status": "active",
            "pinned": False,
            "is_sensitive": False,
            "reason": mem_dict.get("reason", ""),
            "source": {
                "conversation_id": None,
                "message_id": None,
                "source_type": "conversation",
            },
            "created_at": now,
            "updated_at": now,
            "last_accessed_at": None,
            "expires_at": mem_dict.get("expires_at"),
            "access_count": 0,
            "superseded_by": None,
            "supersedes": None,
        }

        if action in ("contextual", "supersede") and existing:
            await db.update_one(
                {"_id": existing[0]["_id"]},
                {"$set": {"status": "superseded", "updated_at": now}},
            )
            await memory_history().insert_one(
                {
                    "user_id": user_id,
                    "action": "superseded" if action == "supersede" else "contextual_update",
                    "old_content": existing[0].get("content", ""),
                    "new_content": mem_dict["content"],
                    "reason": conflict["reason"],
                    "created_at": now,
                }
            )

        final_memories.append(mem_doc)

    # 3. Insert new memories
    inserted_ids = []
    for md in final_memories:
        result = await db.insert_one(md)
        inserted_ids.append(str(result.inserted_id))
        await memory_history().insert_one(
            {
                "user_id": user_id,
                "action": "created",
                "new_content": md["content"],
                "memory_type": md["memory_type"],
                "reason": md.get("reason", ""),
                "created_at": md["created_at"],
            }
        )

    if not inserted_ids:
        raise HTTPException(400, "Failed to store memory")

    return _doc_to_out(await db.find_one({"_id": inserted_ids[0]}))


@router.post("/search", response_model=list[RetrievedMemory])
async def search_memories(
    request: MemorySearchRequest,
    user_id: str = Depends(_current_user_id),
):
    """Search the user's memories using vector similarity + ranking."""
    q_emb = await embed(request.query)

    db = memories()
    filt = {"user_id": user_id, "status": "active"}
    if request.memory_type:
        filt["memory_type"] = request.memory_type

    cursor = db.find(filt).sort([("importance", -1), ("confidence", -1)])
    candidates = await cursor.to_list(length=None)

    # Build list of (doc, embedding) for ranking
    stored_embeddings = []
    valid_docs = []
    for doc in candidates:
        emb = doc.get("embedding")
        if emb and len(emb) == len(q_emb):
            stored_embeddings.append(emb)
            valid_docs.append(doc)

    if not valid_docs:
        return []

    # Rank using the memory_ranker
    from app.services.memory_ranker import rank_memories, _cosine
    settings = get_settings()

    results: list[RetrievedMemory] = []
    for doc, stored_emb in zip(valid_docs, stored_embeddings):
        sim = _cosine(q_emb, stored_emb)
        if sim < settings.retrieval_min_similarity:
            continue

        mr = RetrievedMemory(
            memory=_doc_to_out(doc),
            similarity=sim,
            score=sim,  # rank_memories will recompute the weighted score
            why=f"similarity={sim:.2f}",
        )
        results.append(mr)

    results.sort(key=lambda r: r.score, reverse=True)
    return results[: settings.retrieval_max_memories]


def _is_sensitive(content: str) -> bool:
    """Heuristic: reject passwords, API keys, tokens from storage."""
    sensitive_re = re.compile(
        r"(?:password|api\.key|secret|token|credential|auth)\s*[:=]\s*[^\s]{5,}",
        re.I,
    )
    return bool(sensitive_re.search(content))