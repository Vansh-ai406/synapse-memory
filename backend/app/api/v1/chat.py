"""Agent chat endpoint: the core conversational loop with memory retrieval."""

from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from app.schemas.chat import ChatRequest, ChatResponse, FeedbackRequest, MemoryChange
from app.schemas.memory import RetrievedMemory, MemoryOut
from app.core.config import get_settings
from app.core.security import get_current_user_id
from app.core.logging import logger
from app.database.mongodb import (
    users,
    conversations,
    messages,
    memories,
    memory_history,
    feedback,
)
from app.services.embedding_service import embed, EmbeddingError, provider
from app.services.memory_extractor import extract
from app.services.memory_conflict_resolver import resolve_conflict
from app.services.memory_ranker import rank_memories
from app.services.llm_service import chat as llm_chat, detect_intent
from app.services.llm_service import LLMError
from typing import List
import re

router = APIRouter(prefix="/agent", tags=["agent"])


def _current_user_id() -> str:
    return get_current_user_id()


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


def _is_sensitive(content: str) -> bool:
    sensitive_re = re.compile(
        r"(?:password|api\.key|secret|token|credential|auth)\s*[:=]\s*[^\s]{5,}",
        re.I,
    )
    return bool(sensitive_re.search(content))


@router.post("/chat", response_model=ChatResponse)
async def chat(
    request: ChatRequest,
    user_id: str = Depends(_current_user_id),
):
    """Main chat endpoint: retrieve memories, generate response, extract new memories."""
    settings = get_settings()
    now = datetime.utcnow()

    # 1. Get or create conversation
    conv_db = conversations()
    if request.conversation_id:
        conv = await conv_db.find_one({"_id": request.conversation_id, "user_id": user_id})
        if not conv:
            raise HTTPException(404, "Conversation not found")
        conversation_id = request.conversation_id
    else:
        conv = {"user_id": user_id, "created_at": now, "updated_at": now}
        res = await conv_db.insert_one(conv)
        conversation_id = str(res.inserted_id)

    # 2. Store the user message
    user_msg = {
        "conversation_id": conversation_id,
        "user_id": user_id,
        "role": "user",
        "content": request.message,
        "created_at": now,
        "retrieved_memories": [],
    }
    msg_res = await messages().insert_one(user_msg)
    message_id = str(msg_res.inserted_id)

    # 3. Check if memory extraction is paused
    user = await users().find_one({"_id": user_id})
    memory_paused = user.get("memory_paused", False) if user else False

    # 4. Retrieve relevant memories
    q_emb = await embed(request.message)
    db_mem = memories()
    filt = {"user_id": user_id, "status": "active"}
    cursor = db_mem.find(filt).sort([("importance", -1), ("confidence", -1)])
    candidates = await cursor.to_list(length=None)

    stored_embeddings = []
    valid_docs = []
    for doc in candidates:
        emb = doc.get("embedding")
        if emb and len(emb) == len(q_emb):
            stored_embeddings.append(emb)
            valid_docs.append(doc)

    retrieved: List[RetrievedMemory] = []
    if valid_docs:
        ranked = rank_memories(valid_docs, q_emb, stored_embeddings)
        # Update access counts and last_accessed_at for retrieved memories
        for r in ranked:
            await db_mem.update_one(
                {"_id": r.memory.id},
                {"$inc": {"access_count": 1}, "$set": {"last_accessed_at": now}},
            )
        retrieved = ranked

    # 5. Build history for context
    history_cursor = (
        messages()
        .find({"conversation_id": conversation_id, "user_id": user_id})
        .sort("created_at", -1)
        .limit(10)
    )
    history_docs = await history_cursor.to_list(length=None)
    history = [
        {"role": d["role"], "content": d["content"]}
        for d in reversed(history_docs)
    ]

    # 6. Generate response (Gemini or fallback)
    reply = None
    retrieval_mode = "vector" if valid_docs else "exact"
    provider_name = provider()

    mem_for_llm = [
        {
            "memory_type": r.memory.memory_type,
            "content": r.memory.content,
            "context": r.memory.context,
            "importance": r.memory.importance,
            "confidence": r.memory.confidence,
        }
        for r in retrieved
    ]

    try:
        if settings.llm_enabled:
            reply = await llm_chat(request.message, mem_for_llm, history)
    except (LLMError, EmbeddingError) as exc:
        logger.warning("LLM chat failed: %s", exc)

    if not reply:
        # Fallback: template response that at least acknowledges the query
        reply = _fallback_reply(request.message, retrieved)

    # 7. Store assistant message
    asst_msg = {
        "conversation_id": conversation_id,
        "user_id": user_id,
        "role": "assistant",
        "content": reply,
        "created_at": now,
        "retrieved_memories": [r.memory.id for r in retrieved],
        "provider": provider_name,
        "retrieval_mode": retrieval_mode,
    }
    await messages().insert_one(asst_msg)

    # 8. Update conversation timestamp
    await conv_db.update_one(
        {"_id": conversation_id}, {"$set": {"updated_at": now}}
    )

    # 9. Extract new memories from the user's message (not the assistant's)
    changes: List[MemoryChange] = []
    if not memory_paused:
        existing = await memories().find({"user_id": user_id}).to_list(None)
        existing_contents = [m.get("content", "") for m in existing]

        extracted, ask_user = extract(request.message, existing_contents)

        for mem_dict in extracted:
            if _is_sensitive(mem_dict["content"]):
                continue

            conflict = resolve_conflict(mem_dict["content"], existing)
            action = conflict["action"]

            now_mem = datetime.utcnow()
            mem_emb = await embed(mem_dict["content"])

            mem_doc = {
                "user_id": user_id,
                "memory_type": mem_dict["type"],
                "content": mem_dict["content"],
                "context": mem_dict.get("context"),
                "embedding": mem_emb,
                "importance": mem_dict.get("importance", 0.7),
                "confidence": mem_dict.get("confidence", 0.8),
                "status": "active",
                "pinned": False,
                "is_sensitive": False,
                "reason": mem_dict.get("reason", ""),
                "source": {
                    "conversation_id": conversation_id,
                    "message_id": message_id,
                    "source_type": "conversation",
                },
                "created_at": now_mem,
                "updated_at": now_mem,
                "last_accessed_at": None,
                "expires_at": mem_dict.get("expires_at"),
                "access_count": 0,
                "superseded_by": None,
                "supersedes": None,
            }

            if action in ("contextual", "supersede") and existing:
                # Mark old as superseded
                await memories().update_one(
                    {"_id": existing[0]["_id"]},
                    {"$set": {"status": "superseded", "updated_at": now_mem}},
                )
                await memory_history().insert_one(
                    {
                        "user_id": user_id,
                        "action": "superseded" if action == "supersede" else "contextual_update",
                        "old_content": existing[0].get("content", ""),
                        "new_content": mem_dict["content"],
                        "reason": conflict["reason"],
                        "created_at": now_mem,
                    }
                )

            await memories().insert_one(mem_doc)
            await memory_history().insert_one(
                {
                    "user_id": user_id,
                    "action": "created",
                    "new_content": mem_dict["content"],
                    "memory_type": mem_dict["type"],
                    "reason": mem_dict.get("reason", ""),
                    "created_at": now_mem,
                }
            )

            changes.append(
                MemoryChange(
                    action=action if action != "unrelated" else "created",
                    memory=_doc_to_memory_out(mem_doc),
                    previous=None,
                    reason=conflict["reason"],
                )
            )

    # 10. If user asked for clarification, include it
    clarification = None
    if ask_user and changes:
        clarification = "I noticed this might conflict with an existing memory. Would you like me to replace it, keep both with different contexts, or skip it?"

    return ChatResponse(
        conversation_id=conversation_id,
        message_id=message_id,
        reply=reply,
        provider=provider_name,
        retrieval_mode=retrieval_mode,
        retrieved=retrieved,
        changes=changes,
        clarification=clarification,
    )


def _fallback_reply(message: str, retrieved: List[RetrievedMemory]) -> str:
    """Simple template fallback when LLM is unavailable."""
    if retrieved:
        mem_list = ", ".join(
            f"[{r.memory.memory_type}] {r.memory.content}" for r in retrieved[:3]
        )
        return f"Based on your memories ({mem_list}), here's a brief answer to: \"{message}\""
    return f"I don't have any relevant memories yet. You said: \"{message}\""


@router.post("/feedback")
async def feedback_endpoint(
    request: FeedbackRequest,
    user_id: str = Depends(_current_user_id),
):
    """Record feedback on an assistant message."""
    # Store feedback
    await feedback().insert_one(
        {
            "user_id": user_id,
            "message_id": request.message_id,
            "rating": request.rating.value,
            "note": request.note,
            "created_at": datetime.utcnow(),
        }
    )

    # Convert feedback to a memory that influences future responses
    if request.rating.value in (
        "too_complicated",
        "too_detailed",
        "incorrect",
        "not_relevant",
    ):
        content = f"User gave {request.rating.value} feedback"
        try:
            emb = await embed(content)
            await memories().insert_one(
                {
                    "user_id": user_id,
                    "memory_type": "FEEDBACK",
                    "content": content,
                    "context": request.note,
                    "embedding": emb,
                    "importance": 0.6,
                    "confidence": 0.8,
                    "status": "active",
                    "pinned": False,
                    "is_sensitive": False,
                    "reason": f"Feedback: {request.rating.value}",
                    "source": {
                        "conversation_id": None,
                        "message_id": request.message_id,
                        "source_type": "feedback",
                    },
                    "created_at": datetime.utcnow(),
                    "updated_at": datetime.utcnow(),
                    "last_accessed_at": None,
                    "expires_at": None,
                    "access_count": 0,
                    "superseded_by": None,
                    "supersedes": None,
                }
            )
        except EmbeddingError:
            pass

    return {"status": "ok"}


@router.get("/retrieval-debug/{conversation_id}")
async def retrieval_debug(
    conversation_id: str,
    user_id: str = Depends(_current_user_id),
):
    """Debug endpoint: show what memories were retrieved for each message in a conversation."""
    msgs = await messages().find(
        {"conversation_id": conversation_id, "user_id": user_id}
    ).to_list(None)
    return {
        "conversation_id": conversation_id,
        "messages": [
            {
                "message_id": str(m["_id"]),
                "role": m["role"],
                "content": m["content"],
                "retrieved_memory_ids": m.get("retrieved_memories", []),
                "provider": m.get("provider"),
                "retrieval_mode": m.get("retrieval_mode"),
            }
            for m in msgs
        ],
    }