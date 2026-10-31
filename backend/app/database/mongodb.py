"""Single async Motor client for the process. Indexes are ensured on startup."""

import re

import pymongo
from bson import ObjectId
from bson.errors import InvalidId
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorCollection, AsyncIOMotorDatabase

from app.core.config import get_settings

_client: AsyncIOMotorClient | None = None


def get_client() -> AsyncIOMotorClient:
    global _client
    if _client is None:
        settings = get_settings()
        # AsyncIOMotorClient does not open sockets until it is used, so it is
        # safe to create inside or outside a running event loop.
        _client = AsyncIOMotorClient(settings.mongodb_uri, serverSelectionTimeoutMS=5000)
    return _client


def get_db() -> AsyncIOMotorDatabase:
    return get_client()[get_settings().mongodb_db]


def users() -> AsyncIOMotorCollection:
    return get_db()["users"]


def conversations() -> AsyncIOMotorCollection:
    return get_db()["conversations"]


def messages() -> AsyncIOMotorCollection:
    return get_db()["messages"]


def memories() -> AsyncIOMotorCollection:
    return get_db()["memories"]


def memory_history() -> AsyncIOMotorCollection:
    return get_db()["memory_history"]


def feedback() -> AsyncIOMotorCollection:
    return get_db()["feedback"]


def oid(value) -> ObjectId | None:
    """Convert a string id to ObjectId. Accepts existing ObjectId. None on failure.

    Documents store user_id as the string form of the user's ObjectId, but
    primary keys (_id) are ObjectIds, so callers hydrate them with this helper.
    """
    if value is None:
        return None
    if isinstance(value, ObjectId):
        return value
    try:
        return ObjectId(str(value))
    except (InvalidId, TypeError):
        return None


def ensure_indexes() -> None:
    """Regular and TTL indexes. The Atlas Vector Search index is manual in Atlas."""
    users().create_index("email", unique=True)

    conversations().create_index([("user_id", pymongo.ASCENDING), ("updated_at", pymongo.ASCENDING)])

    messages().create_index([("conversation_id", pymongo.ASCENDING), ("created_at", pymongo.ASCENDING)])
    messages().create_index("user_id")

    # expireAfterSeconds=0 means a document is removed once expires_at is in the
    # past. Documents with expires_at = null are never removed by this index.
    memories().create_index("expires_at", expireAfterSeconds=0, name="memories_ttl", sparse=True)
    memories().create_index([("user_id", pymongo.ASCENDING), ("status", pymongo.ASCENDING)])
    memories().create_index([("user_id", pymongo.ASCENDING), ("memory_type", pymongo.ASCENDING)])
    memories().create_index([("user_id", pymongo.ASCENDING), ("created_at", pymongo.ASCENDING)])

    memory_history().create_index([("user_id", pymongo.ASCENDING), ("created_at", pymongo.ASCENDING)])
    memory_history().create_index([("related_memory_id", pymongo.ASCENDING)])

    feedback().create_index([("user_id", pymongo.ASCENDING), ("created_at", pymongo.ASCENDING)])


async def async_ensure_indexes() -> None:
    """Motor-compatible index creation used on startup."""
    await users().create_index("email", unique=True)

    await conversations().create_index([("user_id", pymongo.ASCENDING), ("updated_at", pymongo.ASCENDING)])

    await messages().create_index([("conversation_id", pymongo.ASCENDING), ("created_at", pymongo.ASCENDING)])
    await messages().create_index("user_id")

    await memories().create_index("expires_at", expireAfterSeconds=0, name="memories_ttl")
    await memories().create_index([("user_id", pymongo.ASCENDING), ("status", pymongo.ASCENDING)])
    await memories().create_index([("user_id", pymongo.ASCENDING), ("memory_type", pymongo.ASCENDING)])
    await memories().create_index([("user_id", pymongo.ASCENDING), ("created_at", pymongo.ASCENDING)])

    await memory_history().create_index([("user_id", pymongo.ASCENDING), ("created_at", pymongo.ASCENDING)])
    await memory_history().create_index("related_memory_id")

    await feedback().create_index([("user_id", pymongo.ASCENDING), ("created_at", pymongo.ASCENDING)])


async def ping() -> bool:
    await get_client().admin.command("ping")
    return True


async def close() -> None:
    global _client
    if _client is not None:
        _client.close()
        _client = None
