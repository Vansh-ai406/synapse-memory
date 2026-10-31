#!/usr/bin/env python3
"""Create MongoDB indexes, including Atlas Vector Search.

Vector Search indexes must be created manually in Atlas:
1. Go to Atlas → Clusters → Collections → Vector Search Indexes
2. Create new index on `memories.embedding`
3. Set Vector Dimensions to 768
4. Set Similarity to Cosine
5. Add filters: user_id, memory_type, status

Run this script to create all other (non-vector) indexes.
"""

import sys
import os

# Add parent directory so we can import app modules
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database.mongodb import ensure_indexes, get_db


def create_indexes():
    db = get_db()

    # Regular indexes
    db.users.create_index("email", unique=True)
    db.users.create_index("name")

    db.conversations.create_index([("user_id", 1), ("updated_at", -1)])

    db.messages.create_index([("conversation_id", 1), ("created_at", 1)])
    db.messages.create_index("user_id")

    # TTL index on expires_at (automatically removes docs when their
    # expires_at passes). Only works on replica sets or Atlas clusters.
    db.memories.create_index("expires_at", expireAfterSeconds=0, name="memories_ttl")

    db.memories.create_index([("user_id", 1), ("status", 1)])
    db.memories.create_index([("user_id", 1), ("memory_type", 1)])
    db.memories.create_index([("user_id", 1), ("created_at", -1)])
    db.memories.create_index([("user_id", 1), ("updated_at", -1)])

    db.memory_history.create_index([("memory_id", 1), ("created_at", 1)])
    db.memory_history.create_index("user_id")

    db.feedback.create_index([("user_id", 1), ("created_at", 1)])

    print("✅ All indexes created successfully!")
    print("\n⚠️  Vector Search index must be created manually in Atlas.")
    print("   Instructions:")
    print("   1. Go to https://cloud.mongodb.com")
    print("   2. Select your cluster → Collections → memories")
    print("   3. Click 'Vector Search Indexes' tab → 'Create Index'")
    print("   4. Select 'embedding' field")
    print("   5. Dimensions: 768, Similarity: Cosine")
    print("   6. Add filters: user_id, memory_type, status")
    print("   7. Name: memories_vector")


if __name__ == "__main__":
    create_indexes()