"""Live memory feed over Server-Sent Events backed by a MongoDB change stream.

One module owns the whole change-stream concern (per AGENTS.md): the watch
cursor, the per-user event filter, and the SSE formatting. The frontend
subscribes with EventSource and gets instant memory-panel updates instead of
polling.
"""

import asyncio
import json
from datetime import datetime

from fastapi import APIRouter, Depends, Request
from fastapi.responses import StreamingResponse

from app.core.security import get_current_user_id
from app.core.logging import logger
from app.database.mongodb import get_db

router = APIRouter(prefix="/agent", tags=["agent"])

_MEMORY_FIELDS = (
    "memory_type", "content", "status", "context",
    "importance", "confidence", "reason",
    "supersedes", "superseded_by", "expires_at",
)


def _change_event(change: dict) -> dict:
    doc = change.get("fullDocument") or {}
    event = {"type": change.get("operationType")}
    key = change.get("documentKey", {}).get("_id")
    if key is not None:
        event["memory_id"] = str(key)
    for field in _MEMORY_FIELDS:
        if field in doc:
            event[field] = doc[field]
    event["at"] = doc.get("updated_at") or doc.get("created_at") or datetime.utcnow()
    return event


@router.get("/memories/stream")
async def memories_stream(
    request: Request,
    user_id: str = Depends(get_current_user_id),
):
    """SSE stream of memory changes for the authenticated user only.

    The change stream watches the `memories` collection server-side; the
    user_id filter runs before anything is sent, so user B never receives
    user A's events. A 5s keepalive comment holds the connection through
    proxies.
    """

    async def generator():
        stream = get_db()["memories"].watch(
            [{"$match": {"fullDocument.user_id": user_id}}],
            full_document="updateLookup", max_await_time_ms=1000,
        )
        try:
            # Initialize the cursor before advertising an active stream.
            await stream.__aenter__()
            yield f"data: {json.dumps({'type': 'connected'})}\n\n"
            while True:
                if await request.is_disconnected():
                    break
                change = await stream.try_next()
                if change is None:
                    yield ": keepalive\n\n"
                    continue
                event = _change_event(change)
                if event["type"] == "update":
                    # In-place updates don't carry the document under some
                    # resume conditions; only forward when we can identify it.
                    if not event.get("content") and not event.get("memory_id"):
                        continue
                try:
                    if change["fullDocument"].get("user_id") != user_id:
                        continue
                except KeyError:
                    continue
                yield f"data: {json.dumps(event, default=str)}\n\n"
        except Exception as exc:  # client disconnect ends the generator
            logger.info("Memory stream ended: %s", exc.__class__.__name__)
        finally:
            await stream.close()

    return StreamingResponse(
        generator(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
