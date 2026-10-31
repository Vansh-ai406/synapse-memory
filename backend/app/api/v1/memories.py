"""Memory CRUD, search, and lifecycle endpoints (forget / delete)."""

from datetime import datetime, timedelta
from typing import Optional

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException

from app.schemas.memory import (
    MemoryCreate,
    ForgetRequest,
    MemorySearchRequest,
    MemoryOut,
    RetrievedMemory,
)
from app.core.security import get_current_user_id
from app.core.logging import logger
from app.database.mongodb import oid, users, memories, memory_history
from app.services.embedding_service import embed, EmbeddingError
from app.services.memory_extractor import extract, is_sensitive
from app.services.memory_conflict_resolver import resolve_conflict
from app.services.memory_retriever import retrieve
from app.services.llm_service import detect_intent

router = APIRouter(prefix="/memories", tags=["memories"])


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


@router.get("", response_model=list[MemoryOut])
async def list_memories(
    memory_type: Optional[str] = None,
    status: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
    user_id: str = Depends(get_current_user_id),
):
    db = memories()
    filt = {"user_id": user_id, "status": {"$ne": "deleted"}}
    if memory_type:
        filt["memory_type"] = memory_type
    if status:
        filt["status"] = status
    cursor = db.find(filt).sort("created_at", -1).skip(skip).limit(limit)
    docs = await cursor.to_list(length=None)
    return [_doc_to_out(d) for d in docs]


@router.post("", response_model=MemoryOut, status_code=201)
async def create_memory(
    create: MemoryCreate,
    user_id: str = Depends(get_current_user_id),
):
    """Create a memory from user-provided text. Idempotent: repeated identical
    content is detected as a duplicate and no new document is written."""
    if is_sensitive(create.content):
        raise HTTPException(422, "Content looks like a secret (password / key / token) and cannot be stored.")

    try:
        embedding = await embed(create.content)
    except EmbeddingError as exc:
        raise HTTPException(503, f"Embedding provider unavailable: {exc}")

    db = memories()
    existing = await db.find({"user_id": user_id}).to_list(None)
    existing_contents = [m.get("content", "") for m in existing]

    extracted, _ = await extract(create.content, existing_contents)
    if not extracted:
        raise HTTPException(400, "No memory extracted — content was empty or duplicate.")

    mem_dict = extracted[0]
    conflict = await resolve_conflict(mem_dict["content"], existing, new_embedding=embedding)
    if conflict["action"] == "duplicate":
        prior = conflict.get("previous")
        await memory_history().insert_one(
            {
                "user_id": user_id,
                "related_memory_id": prior.id if prior else "",
                "action": "duplicate_detected",
                "new_content": mem_dict["content"],
                "reason": conflict["reason"],
                "created_at": datetime.utcnow(),
            }
        )
        raise HTTPException(409, f"Duplicate memory: {conflict['reason']}")

    now = datetime.utcnow()
    previous = conflict.get("previous")
    mem_doc = {
        "user_id": user_id,
        "memory_type": create.memory_type.value if create.memory_type else mem_dict["type"],
        "content": mem_dict["content"],
        "context": create.context or mem_dict.get("context"),
        "embedding": embedding,
        "importance": create.importance,
        "confidence": mem_dict.get("confidence", 0.8),
        "status": "active",
        "pinned": False,
        "is_sensitive": False,
        "reason": mem_dict.get("reason", ""),
        "source": {
            "conversation_id": None,
            "message_id": None,
            "source_type": "manual",
        },
        "created_at": now,
        "updated_at": now,
        "last_accessed_at": None,
        "expires_at": create.expires_at or _parse_expiry(mem_dict["content"]),
        "access_count": 0,
        "superseded_by": None,
        "supersedes": None,
    }

    action = conflict["action"]
    prior_doc = None
    if action == "supersede" and previous:
        prior_doc = await db.find_one(
            {"_id": oid(previous.id), "user_id": user_id, "status": "active"}
        )
        if prior_doc:
            mem_doc["supersedes"] = str(prior_doc["_id"])
    res = await db.insert_one(mem_doc)
    if action == "supersede" and previous and prior_doc:
        await db.update_one(
            {"_id": prior_doc["_id"]},
            {"$set": {"status": "superseded", "superseded_by": str(res.inserted_id), "updated_at": now}},
        )
    await memory_history().insert_one(
        {
            "user_id": user_id,
            "related_memory_id": str(res.inserted_id),
            "action": "superseded" if action == "supersede" and prior_doc else "created",
            "old_content": previous.content if (action == "supersede" and previous) else None,
            "new_content": mem_doc["content"],
            "memory_type": mem_doc["memory_type"],
            "reason": conflict["reason"],
            "created_at": now,
        }
    )

    doc = await db.find_one({"_id": res.inserted_id})
    return _doc_to_out(doc)


def _parse_expiry(content: str) -> datetime | None:
    import re

    text = content.lower()
    if content.lower().find("tomorrow") != -1:
        return datetime.utcnow() + timedelta(hours=36)
    date = re.search(r"\b(\d{4}-\d{2}-\d{2})\b", content)
    if date:
        try:
            return datetime.fromisoformat(date.group(1))
        except ValueError:
            return None
    return None


@router.post("/search", response_model=list[RetrievedMemory])
async def search_memories(
    request: MemorySearchRequest,
    user_id: str = Depends(get_current_user_id),
):
    """Search the user's memories — vector path when the Atlas index exists,
    exact-scan otherwise. Every hit returns score, path, and why."""
    try:
        retrieved, _mode = await retrieve(
            request.query, user_id, memory_type=request.memory_type.value if request.memory_type else None,
            max_results=request.limit,
        )
    except EmbeddingError as exc:
        raise HTTPException(503, f"Embedding provider unavailable: {exc}")
    return retrieved


@router.post("/forget")
async def forget_memories(
    request: ForgetRequest,
    user_id: str = Depends(get_current_user_id),
):
    """Mark matching memories deleted (status=deleted; the row is audited in
    memory_history and never recalled again)."""
    db = memories()
    filt = {"user_id": user_id, "status": "active"}
    if request.memory_type:
        filt["memory_type"] = request.memory_type.value
    idmatched = []
    if request.topic:
        try:
            embedding = await embed(request.topic)
        except EmbeddingError as exc:
            raise HTTPException(503, f"Embedding provider unavailable: {exc}")
        retrieved, _mode = await retrieve(request.topic, user_id, max_results=5)
        # Keep memories whose similarity is reasonably high OR token-overlap.
        import re

        topic_tokens = set(re.findall(r"[a-z0-9]{3,}", request.topic.lower()))
        candidate_ids = []
        for r in retrieved:
            if r.path in ("always-load", "vector", "exact-scan") and r.similarity >= 0.30:
                candidate_ids.append(r.memory.id)
            else:
                content_tokens = set(re.findall(r"[a-z0-9]{3,}", r.memory.content.lower()))
                if len(content_tokens & topic_tokens) >= 2:
                    candidate_ids.append(r.memory.id)
        if not candidate_ids:
            return {"deleted": 0, "reason": "No matching memory found for that topic."}
        filt["_id"] = {"$in": [oid(i) for i in candidate_ids]}

    now = datetime.utcnow()
    films = await db.find(filt).to_list(None)
    if not films:
        return {"deleted": 0, "reason": "No matching memory found."}
    res = await db.update_many(
        filt, {"$set": {"status": "deleted", "updated_at": now}}
    )
    for doc in films:
        await memory_history().insert_one(
            {
                "user_id": user_id,
                "related_memory_id": str(doc["_id"]),
                "action": "deleted",
                "old_content": doc.get("content", ""),
                "new_content": "user requested forgetting",
                "reason": request.topic or "forget request",
                "created_at": now,
            }
        )
    return {"deleted": res.modified_count, "reason": "Marked deleted; they can no longer be recalled."}


@router.delete("/{memory_id}")
async def delete_memory(
    memory_id: str,
    user_id: str = Depends(get_current_user_id),
):
    db = memories()
    res = await db.update_one(
        {"_id": oid(memory_id), "user_id": user_id},
        {"$set": {"status": "deleted", "updated_at": datetime.utcnow()}},
    )
    if not res.modified_count:
        raise HTTPException(404, "Memory not found")
    await memory_history().insert_one(
        {
            "user_id": user_id,
            "related_memory_id": memory_id,
            "action": "deleted",
            "old_content": None,
            "new_content": "user requested forgetting",
            "reason": "manual delete",
            "created_at": datetime.utcnow(),
        }
    )
    return {"status": "deleted"}
