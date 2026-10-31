"""Dashboard and analytics endpoints."""

from datetime import datetime, timedelta
from fastapi import APIRouter, Depends
from app.core.config import get_settings
from app.core.security import get_current_user_id
from app.database.mongodb import memories, memory_history, feedback, conversations, messages
from typing import List

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


def _current_user_id() -> str:
    return get_current_user_id()


@router.get("/stats")
async def get_stats(user_id: str = Depends(_current_user_id)):
    """Overall memory statistics for the dashboard."""
    mem_db = memories()
    total = await mem_db.count_documents({"user_id": user_id, "status": {"$ne": "deleted"}})
    active = await mem_db.count_documents({"user_id": user_id, "status": "active"})
    superseded = await mem_db.count_documents({"user_id": user_id, "status": "superseded"})

    # Category distribution
    pipeline = [
        {"$match": {"user_id": user_id, "status": "active"}},
        {"$group": {"_id": "$memory_type", "count": {"$sum": 1}}},
    ]
    cat_cursor = mem_db.aggregate(pipeline)
    categories = {doc["_id"]: doc["count"] async for doc in cat_cursor}

    # Expiring soon (next 30 days)
    soon = datetime.utcnow() + timedelta(days=30)
    expiring = await mem_db.count_documents(
        {
            "user_id": user_id,
            "status": "active",
            "expires_at": {"$ne": None, "$lte": soon},
        }
    )

    # Conversation count
    conv_count = await conversations().count_documents({"user_id": user_id})

    # Memory growth (last 30 days, by day)
    growth_pipeline = [
        {
            "$match": {
                "user_id": user_id,
                "status": {"$ne": "deleted"},
                "created_at": {"$gte": datetime.utcnow() - timedelta(days=30)},
            }
        },
        {
            "$group": {
                "_id": {
                    "$dateToString": {"format": "%Y-%m-%d", "date": "$created_at"}
                },
                "count": {"$sum": 1},
            }
        },
        {"$sort": {"_id": 1}},
    ]
    growth_cursor = mem_db.aggregate(growth_pipeline)
    growth = [
        {"date": doc["_id"], "count": doc["count"]} async for doc in growth_cursor
    ]

    return {
        "total_memories": total,
        "active_memories": active,
        "superseded_memories": superseded,
        "categories": categories,
        "expiring_soon": expiring,
        "conversation_count": conv_count,
        "growth": growth,
    }


@router.get("/memory-health")
async def get_memory_health(user_id: str = Depends(_current_user_id)):
    """Compute a memory health score based on various quality metrics."""
    mem_db = memories()
    all_memories = await mem_db.find(
        {"user_id": user_id, "status": {"$ne": "deleted"}}
    ).to_list(None)

    if not all_memories:
        return {"score": 100, "issues": [], "suggestions": []}

    issues: List[str] = []
    suggestions: List[str] = []

    # 1. Duplicate detection (simple content hash overlap)
    content_hashes = {}
    duplicates = 0
    for m in all_memories:
        h = hash(m.get("content", "").strip().lower())
        if h in content_hashes:
            duplicates += 1
        else:
            content_hashes[h] = m["_id"]
    if duplicates > 0:
        issues.append(f"Found {duplicates} potential duplicate memories")
        suggestions.append("Review and merge duplicate preferences")

    # 2. Low confidence memories
    low_conf = sum(1 for m in all_memories if m.get("confidence", 1) < 0.6)
    if low_conf > 0:
        issues.append(f"{low_conf} memories have low confidence (< 0.6)")
        suggestions.append("Review low-confidence memories and confirm or delete")

    # 3. Outdated memories (old, never accessed)
    old_unused = 0
    cutoff = datetime.utcnow() - timedelta(days=90)
    for m in all_memories:
        created = m.get("created_at")
        last = m.get("last_accessed_at")
        if created and created < cutoff and (not last or last < cutoff):
            old_unused += 1
    if old_unused > 0:
        issues.append(f"{old_unused} memories are old and never accessed")
        suggestions.append("Consider expiring or removing stale memories")

    # 4. Expired but still in DB (TTL hasn't run yet)
    expired = sum(
        1
        for m in all_memories
        if m.get("expires_at") and m["expires_at"] < datetime.utcnow()
    )
    if expired > 0:
        issues.append(f"{expired} memories have passed their expiration date")
        suggestions.append("TTL index will remove these automatically, or delete manually")

    # 5. Missing source information
    missing_source = sum(
        1
        for m in all_memories
        if not m.get("source") or not m["source"].get("conversation_id")
    )
    if missing_source > 0:
        issues.append(f"{missing_source} memories lack source information")
        suggestions.append("Add source context for better explainability")

    # 6. Conflicting memories (same type, overlapping content)
    conflicts = 0
    by_type = {}
    for m in all_memories:
        t = m.get("memory_type", "FACT")
        by_type.setdefault(t, []).append(m)
    for t, mems in by_type.items():
        if len(mems) > 1:
            # Simple check: any two with similar tokens
            for i in range(len(mems)):
                for j in range(i + 1, len(mems)):
                    a = set(mems[i].get("content", "").lower().split())
                    b = set(mems[j].get("content", "").lower().split())
                    if len(a & b) >= 3:
                        conflicts += 1
                        break
    if conflicts > 0:
        issues.append(f"{conflicts} potential conflicting memories detected")
        suggestions.append("Resolve conflicting goals or preferences")

    # Calculate score: start at 100, deduct for each issue
    score = 100
    score -= min(duplicates * 5, 20)
    score -= min(low_conf * 3, 15)
    score -= min(old_unused * 2, 20)
    score -= min(expired * 2, 10)
    score -= min(missing_source, 10)
    score -= min(conflicts * 5, 15)
    score = max(score, 0)

    return {
        "score": score,
        "issues": issues,
        "suggestions": suggestions,
        "details": {
            "duplicates": duplicates,
            "low_confidence": low_conf,
            "old_unused": old_unused,
            "expired": expired,
            "missing_source": missing_source,
            "conflicts": conflicts,
        },
    }


@router.get("/recent-memories")
async def recent_memories(
    limit: int = 10, user_id: str = Depends(_current_user_id)
):
    """Most recently created/updated memories."""
    mem_db = memories()
    cursor = (
        mem_db.find({"user_id": user_id, "status": {"$ne": "deleted"}})
        .sort([("updated_at", -1), ("created_at", -1)])
        .limit(limit)
    )
    docs = await cursor.to_list(length=None)
    return [
        {
            "id": str(d["_id"]),
            "memory_type": d.get("memory_type"),
            "content": d.get("content"),
            "status": d.get("status"),
            "created_at": d.get("created_at"),
            "updated_at": d.get("updated_at"),
        }
        for d in docs
    ]


@router.get("/expiring-memories")
async def expiring_memories(
    days: int = 30, user_id: str = Depends(_current_user_id)
):
    """Memories that will expire within N days."""
    soon = datetime.utcnow() + timedelta(days=days)
    mem_db = memories()
    cursor = mem_db.find(
        {
            "user_id": user_id,
            "status": "active",
            "expires_at": {"$ne": None, "$lte": soon},
        }
    ).sort("expires_at", 1)
    docs = await cursor.to_list(length=None)
    return [
        {
            "id": str(d["_id"]),
            "memory_type": d.get("memory_type"),
            "content": d.get("content"),
            "expires_at": d.get("expires_at"),
        }
        for d in docs
    ]