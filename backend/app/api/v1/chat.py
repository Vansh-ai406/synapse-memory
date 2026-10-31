"""Agent chat endpoint: the core conversational loop with memory retrieval."""

import re
from datetime import datetime, timedelta
from typing import List

from fastapi import APIRouter, Depends, HTTPException

from app.schemas.chat import ChatRequest, ChatResponse, FeedbackRequest, MemoryChange
from app.schemas.memory import RetrievedMemory
from app.core.config import get_settings
from app.core.security import get_current_user_id
from app.core.logging import logger
from app.database.mongodb import (
    oid,
    users,
    conversations,
    messages,
    memories,
    memory_history,
    feedback,
)
from app.services.embedding_service import embed, EmbeddingError, provider
from app.services.memory_extractor import extract, is_sensitive
from app.services.memory_conflict_resolver import resolve_conflict
from app.services.memory_retriever import retrieve, ALWAYS_LOAD_TYPES
from app.services.llm_service import chat as llm_chat, detect_intent, LLMError

router = APIRouter(prefix="/agent", tags=["agent"])


def _doc_to_memory_out(doc: dict):
    from app.schemas.memory import MemoryOut

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


# ------------------------------------------------------------------ forget

def _parse_expiry(message: str) -> datetime | None:
    """Heuristic: 'exam tomorrow' → expires in ~36 hours. LLM extraction also
    sets expires_at; this covers the offline path."""
    lowered = message.lower()
    if re.search(r"(tomorrow|today|tonight)", lowered):
        return datetime.utcnow() + timedelta(hours=36)
    date = re.search(r"\b(\d{4}-\d{2}-\d{2})\b", message)
    if date:
        try:
            return datetime.fromisoformat(date.group(1))
        except ValueError:
            return None
    return None


async def _handle_forget(message: str, user_id: str, retrieved: List[RetrievedMemory]) -> str | None:
    """'Forget that / forget my X preference' → mark the best-matching recently
    recalled memory deleted. Returns a human confirmation."""
    db = memories()
    target = None
    if retrieved:
        target = retrieved[0].memory.id
    else:
        # Fall back to the most recently accessed/created active memory.
        doc = await db.find_one(
            {"user_id": user_id, "status": "active"},
            sort=[("last_accessed_at", -1), ("created_at", -1)],
        )
        if doc:
            target = str(doc["_id"])
    if not target:
        return None

    res = await db.update_one(
        {"_id": oid(target), "user_id": user_id},
        {"$set": {"status": "deleted", "updated_at": datetime.utcnow(),
                  "superseded_by": None}},
    )
    if res.modified_count:
        await memory_history().insert_one(
            {
                "user_id": user_id,
                "related_memory_id": target,
                "action": "deleted",
                "new_content": "user requested forgetting",
                "reason": "explicit forget request",
                "created_at": datetime.utcnow(),
            }
        )
    return target


@router.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest, user_id: str = Depends(get_current_user_id)):
    """Retrieve memories (two paths), generate a response, then extract new ones."""
    settings = get_settings()
    now = datetime.utcnow()

    # 0. Demo toggle: with-memory vs without-memory comparison.
    use_memory = bool(request.use_memory)

    # 1. Get or create conversation
    conv_db = conversations()
    if request.conversation_id:
        conv_oid = oid(request.conversation_id)
        conv = await conv_db.find_one({"_id": conv_oid, "user_id": user_id})
        if not conv:
            raise HTTPException(404, "Conversation not found")
        conversation_id = request.conversation_id
    else:
        conv = {"user_id": user_id, "created_at": now, "updated_at": now}
        res = await conv_db.insert_one(conv)
        conversation_id = str(res.inserted_id)

    intent = detect_intent(request.message)

    # 2. Store the user message
    user_msg = {
        "conversation_id": conversation_id,
        "user_id": user_id,
        "role": "user",
        "content": request.message,
        "intent": intent,
        "created_at": now,
        "retrieved_memories": [],
    }
    msg_res = await messages().insert_one(user_msg)
    message_id = str(msg_res.inserted_id)

    # 3. Memory retrieval — two paths (vector / always-load), user-filtered.
    retrieved: List[RetrievedMemory] = []
    retrieval_mode = "exact"
    if use_memory:
        try:
            retrieved, retrieval_mode = await retrieve(request.message, user_id, intent=intent)
        except EmbeddingError as exc:
            logger.error("Retrieval failed: %s", exc)
            retrieval_mode = "error"

    # 4. Build history for context
    history_cursor = (
        messages()
        .find({"conversation_id": conversation_id, "user_id": user_id})
        .sort("created_at", -1)
        .limit(10)
    )
    history_docs = await history_cursor.to_list(length=None)
    history = [{"role": d["role"], "content": d["content"]} for d in reversed(history_docs)]

    # 5. Generate response (Gemini or fallback template)
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
    reply = None
    if settings.llm_enabled:
        reply = await llm_chat(request.message, mem_for_llm, history)
    used_provider = provider()
    if not reply:
        reply = _fallback_reply(request.message, retrieved)
        used_provider = "template"

    # 6. Explicit forget request → mark matching memory deleted before extracting.
    clarification = None
    changes: List[MemoryChange] = []
    user = await users().find_one({"_id": oid(user_id)})
    memory_paused = user.get("memory_paused", False) if user else False

    if intent == "forget" and not memory_paused:
        forgot_id = await _handle_forget(request.message, user_id, retrieved)
        if forgot_id:
            reply = (
                f"Done — I deleted that memory ({forgot_id[:8]}…). "
                "It no longer influences my answers. Future responses will ignore it."
            )
            changes.append(
                MemoryChange(
                    action="deleted",
                    memory=None,
                    previous=None,
                    reason=f"Memory {forgot_id} marked deleted by explicit forget request.",
                )
            )

    # 7. Store assistant message
    asst_msg = {
        "conversation_id": conversation_id,
        "user_id": user_id,
        "role": "assistant",
        "content": reply,
        "created_at": now,
        "retrieved_memories": [r.memory.id for r in retrieved],
        "provider": used_provider,
        "retrieval_mode": retrieval_mode,
    }
    await messages().insert_one(asst_msg)

    await conv_db.update_one({"_id": oid(conversation_id)}, {"$set": {"updated_at": now}})

    # 8. Extract new memories from the user's message (not the assistant's).
    # Memory-off (compare) mode is read-only by design.
    if not memory_paused and use_memory and intent not in ("forget",):
        existing = await memories().find({"user_id": user_id}).to_list(None)
        existing_contents = [m.get("content", "") for m in existing]

        try:
            extracted, ask_user = await extract(request.message, existing_contents)
        except EmbeddingError as exc:
            logger.error("Extraction aborted: %s", exc)
            extracted, ask_user = [], False

        for mem_dict in extracted:
            if is_sensitive(mem_dict["content"]):
                changes.append(
                    MemoryChange(action="skipped_sensitive", memory=None, previous=None,
                                 reason="Content looks like a secret; not stored.")
                )
                continue

            conflict = await resolve_conflict(mem_dict["content"], existing)
            action = conflict["action"]

            if action == "duplicate":
                changes.append(
                    MemoryChange(action="skipped_duplicate", memory=None,
                                 previous=conflict.get("previous"), reason=conflict["reason"])
                )
                continue

            now_mem = datetime.utcnow()
            mem_emb = await embed(mem_dict["content"])
            expires_raw = mem_dict.get("expires_at")
            expires_at = None
            if isinstance(expires_raw, datetime):
                expires_at = expires_raw
            elif isinstance(expires_raw, str):
                try:
                    expires_at = datetime.fromisoformat(expires_raw.replace("Z", "+00:00")).replace(tzinfo=None)
                except ValueError:
                    expires_at = _parse_expiry(mem_dict["content"])
            if expires_at is None:
                expires_at = _parse_expiry(mem_dict["content"])

            previous = conflict.get("previous")

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
                "expires_at": expires_at,
                "access_count": 0,
                "superseded_by": None,
                "supersedes": None,
            }

            # Supersede: ordered writes + both sides linked, reason logged.
            if action == "supersede" and previous:
                prior_doc = await memories().find_one(
                    {"_id": oid(previous.id), "user_id": user_id, "status": "active"}
                )
                if prior_doc:
                    mem_doc["supersedes"] = str(prior_doc["_id"])
                res_ins = await memories().insert_one(mem_doc)
                if prior_doc:
                    await memories().update_one(
                        {"_id": prior_doc["_id"]},
                        {"$set": {"status": "superseded", "superseded_by": str(res_ins.inserted_id),
                                  "updated_at": now_mem}},
                    )
                await memory_history().insert_one(
                    {
                        "user_id": user_id,
                        "related_memory_id": str(res_ins.inserted_id),
                        "action": "superseded",
                        "old_memory_id": previous.id,
                        "old_content": previous.content,
                        "new_content": mem_dict["content"],
                        "reason": conflict["reason"],
                        "created_at": now_mem,
                    }
                )
                inserted_id = res_ins.inserted_id
            else:
                res_ins = await memories().insert_one(mem_doc)
                await memory_history().insert_one(
                    {
                        "user_id": user_id,
                        "related_memory_id": str(res_ins.inserted_id),
                        "action": "created",
                        "new_content": mem_dict["content"],
                        "memory_type": mem_dict["type"],
                        "reason": mem_dict.get("reason", ""),
                        "created_at": now_mem,
                    }
                )
                inserted_id = res_ins.inserted_id

            changes.append(
                MemoryChange(
                    action=action if action != "unrelated" else "created",
                    memory=_doc_to_memory_out({**mem_doc, "_id": inserted_id}),
                    previous=previous,
                    reason=conflict["reason"],
                )
            )

        if ask_user and changes:
            clarification = (
                "This might overlap an existing memory. Replace it, keep both, or skip?"
            )

    return ChatResponse(
        conversation_id=conversation_id,
        message_id=message_id,
        reply=reply,
        provider=used_provider,
        retrieval_mode=retrieval_mode,
        retrieved=retrieved,
        changes=changes,
        clarification=clarification,
    )


def _fallback_reply(message: str, retrieved: List[RetrievedMemory]) -> str:
    """Template fallback when the LLM is unavailable (quota, offline mode).

    Builds a real keyword-driven answer for plan/recommend intents so beats 2
    and 4 still visibly change with memory. Says plainly that the LLM is off.
    """
    tops = retrieved[:3]
    mem_bits = []
    for r in tops:
        mtype = r.memory.memory_type
        mtype = mtype.value if hasattr(mtype, "value") else str(mtype)
        mem_bits.append(f"[{mtype}] {r.memory.content.rstrip('.')}")
    mem_list = ";\n- ".join(mem_bits)

    header = "_LLM off (quota/offline) — deterministic fallback, memory still applied._\n\n"
    if not tops:
        return header + f'I have no relevant memories yet, so a generic answer to: "{message}".'

    prefs = " ".join(r.memory.content.lower() for r in tops)
    slots = []
    if any(k in prefs for k in ("morning", "before 9", "early")):
        slots.append("schedule the blocks in the morning (your stored preference)")
    if any(k in prefs for k in ("evening", "after 7", "night")):
        slots.append("place blocks after 7 PM (your stored preference)")
    if any(k in prefs for k in ("short", "25", "50")):
        slots.append("use short focused blocks (~25-45 min)")
    if any(k in prefs for k in ("python",)):
        slots.append("prefer Python examples where the solution language is yours")
    slot_lines = "".join(f"- {s}\n" for s in slots) or "- use your stored preferences to shape the plan\n"

    if re.search(r"\b(plan|schedule|revise|revision)\b", message, re.I):
        return (
            header
            + f"Here's your {message.lower().rstrip('.?')} plan, built from your memories:\n\n"
            + "**How it's shaped by your memories**\n"
            + slot_lines
            + "\n**Suggested structure**\n"
            "- Day 1: fundamentals — quick notes pass, then a small practice set\n"
            "- Day 2: hands-on — one real exercise, one review session\n"
            "- Day 3: recall check — closed-book quiz and gap review\n"
            f"\nMemories used: \n- {mem_list}"
        )
    return (
        header
        + 'Shaping my answer around your memories:\n- '
        + mem_list
    )


@router.post("/feedback")
async def feedback_endpoint(
    request: FeedbackRequest,
    user_id: str = Depends(get_current_user_id),
):
    """Record feedback on an assistant message."""
    from app.schemas.common import FeedbackRating

    await feedback().insert_one(
        {
            "user_id": user_id,
            "message_id": request.message_id,
            "rating": request.rating.value,
            "note": request.note,
            "created_at": datetime.utcnow(),
        }
    )

    # Rating adaptation: turn clear negative feedback into an active FEEDBACK memory
    if request.rating.value in (
        FeedbackRating.TOO_COMPLICATED,
        FeedbackRating.INCORRECT,
        FeedbackRating.NOT_RELEVANT,
    ):
        content = f"User gave feedback: {request.rating.value}" + (f" — {request.note}" if request.note else "")
        try:
            emb = await embed(content)
            await memories().insert_one(
                {
                    "user_id": user_id,
                    "memory_type": "FEEDBACK",
                    "content": content,
                    "context": request.note,
                    "embedding": emb,
                    "importance": 0.7,
                    "confidence": 0.85,
                    "status": "active",
                    "pinned": False,
                    "is_sensitive": False,
                    "reason": "negative feedback adaptation",
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
    user_id: str = Depends(get_current_user_id),
):
    """Debug endpoint: what memories were retrieved for each message."""
    conv_oid = oid(conversation_id)
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
                "intent": m.get("intent"),
                "retrieved_memory_ids": m.get("retrieved_memories", []),
                "provider": m.get("provider"),
                "retrieval_mode": m.get("retrieval_mode"),
            }
            for m in msgs
        ],
    }
