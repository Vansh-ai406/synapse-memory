"""Idempotent demo-data reset: creates the demo users and clears their data.

Run before every demo rehearsal and before demo day:
    python scripts/reset_demo_data.py

- demo user 1: demo@recallos.app / Demo1234!  (the presenter)
- demo user 2: other@recallos.app / Demo1234! (isolation proof)
Safe to run repeatedly: users are upserted by email, scoped data is cleared.
"""

import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from dotenv import load_dotenv  # type: ignore

load_dotenv(Path(__file__).resolve().parents[1] / ".env")

from pymongo import MongoClient, ASCENDING  # noqa: E402
from app.core.security import hash_password  # noqa: E402

DEMO_USERS = [
    {"name": "Demo Pres", "email": "demo@recallos.app", "password": "Demo1234!"},
    {"name": "Other User", "email": "other@recallos.app", "password": "Demo1234!"},
]

COLLECTIONS = ["memories", "conversations", "messages", "memory_history", "feedback"]


def main() -> None:
    uri = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
    db_name = os.getenv("MONGODB_DB", "recallos")
    client = MongoClient(uri, serverSelectionTimeoutMS=8000)
    db = client[db_name]
    print(f"Connected to {db_name}")

    for spec in DEMO_USERS:
        doc = db["users"].find_one_and_update(
            {"email": spec["email"]},
            {"$set": {
                "name": spec["name"],
                "hashed_password": hash_password(spec["password"]),
                "memory_paused": False,
            }},
            upsert=True,
            return_document=True,
        )
        user_id = str(doc["_id"])
        print(f"user ready: {spec['email']} ({user_id[:8]}…)")
        for col in COLLECTIONS:
            db[col].delete_many({"user_id": user_id})
        print(f"  cleared: {', '.join(COLLECTIONS)}")

    # Regular + TTL indexes (Atlas Vector index is created in the Atlas UI).
    db["users"].create_index("email", unique=True)
    db["memories"].create_index("expires_at", expireAfterSeconds=0, name="memories_ttl")
    db["memories"].create_index([("user_id", ASCENDING), ("status", ASCENDING)])
    db["memories"].create_index([("user_id", ASCENDING), ("memory_type", ASCENDING)])
    db["memories"].create_index([("user_id", ASCENDING), ("created_at", ASCENDING)])
    db["messages"].create_index([("conversation_id", ASCENDING), ("created_at", ASCENDING)])
    db["memory_history"].create_index([("user_id", ASCENDING), ("created_at", ASCENDING)])
    print("regular + TTL indexes ensured")

    # Sanity: does the Atlas vector index exist?
    try:
        probe = [
            {
                "$vectorSearch": {
                    "index": "memories_vector",
                    "path": "embedding",
                    "queryVector": [0.0] * int(os.getenv("EMBEDDING_DIMENSIONS", "768")),
                    "numCandidates": 5,
                    "limit": 1,
                    "filter": {"user_id": "none-str-probe", "status": "active"},
                }
            }
        ]
        db["memories"].aggregate(probe)
        print("vector search: OK — memories_vector index is active")
    except Exception as exc:
        print("vector search: NOT READY — create the Atlas index (see README):",
              str(exc).split("errmsg:")[-1][:120])
    client.close()
    print("reset complete")


if __name__ == "__main__":
    main()
