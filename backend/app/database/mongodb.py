"""Single MongoClient for the process. Indexes are ensured on startup."""

from pymongo import ASCENDING, MongoClient
from pymongo.collection import Collection
from pymongo.database import Database

from app.core.config import get_settings

_client: MongoClient | None = None


def get_client() -> MongoClient:
    global _client
    if _client is None:
        settings = get_settings()
        _client = MongoClient(settings.mongodb_uri, serverSelectionTimeoutMS=5000)
    return _client


def get_db() -> Database:
    return get_client()[get_settings().mongodb_db]


def users() -> Collection:
    return get_db()["users"]


def conversations() -> Collection:
    return get_db()["conversations"]


def messages() -> Collection:
    return get_db()["messages"]


def memories() -> Collection:
    return get_db()["memories"]


def memory_history() -> Collection:
    return get_db()["memory_history"]


def feedback() -> Collection:
    return get_db()["feedback"]


def ensure_indexes() -> None:
    """Regular and TTL indexes. The Atlas Vector Search index is manual."""
    users().create_index("email", unique=True)

    conversations().create_index([("user_id", ASCENDING), ("updated_at", ASCENDING)])

    messages().create_index([("conversation_id", ASCENDING), ("created_at", ASCENDING)])
    messages().create_index("user_id")

    # expireAfterSeconds=0 means a document is removed once expires_at is in the
    # past. Documents with expires_at = null are never removed by this index.
    memories().create_index("expires_at", expireAfterSeconds=0, name="memories_ttl")
    memories().create_index([("user_id", ASCENDING), ("status", ASCENDING)])
    memories().create_index([("user_id", ASCENDING), ("memory_type", ASCENDING)])
    memories().create_index([("user_id", ASCENDING), ("created_at", ASCENDING)])

    memory_history().create_index([("memory_id", ASCENDING), ("created_at", ASCENDING)])
    memory_history().create_index("user_id")

    feedback().create_index([("user_id", ASCENDING), ("created_at", ASCENDING)])


def ping() -> bool:
    get_client().admin.command("ping")
    return True


def close() -> None:
    global _client
    if _client is not None:
        _client.close()
        _client = None
