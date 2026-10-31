# RecallOS Architecture

RecallOS is a persistent-memory agent. Every user message is embedded, matched
against that user's memories in MongoDB Atlas Vector Search, ranked, and
injected into the LLM prompt. After the reply, the same pipeline decides what
is worth remembering, whether it corrects an existing memory, and whether it
should expire.

Persistence lives only in MongoDB. Nothing the agent "remembers" is kept in
localStorage or in process memory.

## Pipeline

```
User message
    │
    ▼
Intent detection          (llm_service.detect_intent)
    │
    ▼
Embed the message         (embedding_service)
    │
    ▼
Vector search             (memory_retriever)   ── MongoDB Atlas $vectorSearch
    │                                              filter: user_id, status=active
    ▼
Rank + filter             (memory_ranker)
    │  score = 0.50·similarity + 0.20·importance
    │        + 0.15·confidence + 0.15·recency
    ▼
Build context + reply     (agent + llm_service)
    │
    ▼
User feedback  ──────────► FEEDBACK memory + preference adjustment
    │
    ▼
Extract candidates        (memory_extractor)
    │  worth remembering? already known? sensitive? temporary? a correction?
    ▼
Conflict resolution       (memory_conflict_resolver)
    │  supersede | contextual (keep both) | duplicate (skip) | ask user
    ▼
Insert / update / expire  (memory_manager)   ── MongoDB
```

## Collections

| Collection       | Purpose                                                        |
|------------------|----------------------------------------------------------------|
| users            | Account, hashed password, `memory_paused` flag                 |
| conversations    | One document per chat thread                                   |
| messages         | Every turn, plus the memories that influenced the reply        |
| memories         | One document per memory, with its embedding                    |
| memory_history   | Append-only record of create / update / supersede / delete     |
| feedback         | Per-message ratings that drive future responses                |

## Memory document

```json
{
  "_id": "ObjectId",
  "user_id": "ObjectId",
  "memory_type": "PREFERENCE",
  "content": "Prefers simple Python explanations",
  "context": "DSA vs ML distinction, when relevant",
  "embedding": [768 floats],
  "source": {"conversation_id": "...", "message_id": "...", "source_type": "conversation"},
  "importance": 0.9,
  "confidence": 0.95,
  "status": "active",
  "pinned": false,
  "is_sensitive": false,
  "reason": "Why this was stored",
  "created_at": "datetime",
  "updated_at": "datetime",
  "last_accessed_at": null,
  "expires_at": null,
  "access_count": 0,
  "superseded_by": null,
  "supersedes": null
}
```

`status` is `active`, `superseded`, or `deleted`. Deleted memories are removed
from `memories` entirely; their history row in `memory_history` is what the
"deleted history" view reads. Superseded memories stay so the timeline can show
the evolution.

`expires_at` is `null` for permanent memories. A TTL index on `expires_at`
removes temporary memories automatically. MongoDB's TTL monitor runs about once
a minute, so deletion is not instant — the dashboard says so.

## Indexes

Created automatically by `scripts/create_indexes.py` and on backend startup:

- `memories`: TTL on `expires_at` (expireAfterSeconds 0), plus
  `(user_id, status)`, `(user_id, memory_type)`, `(user_id, created_at)`.
- `messages`, `conversations`, `feedback`, `memory_history`: user-scoped lookups.

Created **manually in Atlas** (Vector Search indexes cannot be built with
PyMongo):

- `memories_vector` on `memories.embedding`, 768 dimensions, cosine, with
  `user_id`, `memory_type`, and `status` as filter fields.

## Retrieval fallback

If the Atlas vector index is not built yet, retrieval falls back to an exact
cosine scan over the user's own memories. Results are identical, only slower,
and the response is flagged `retrieval_mode: "exact"` so the UI can say so.
User isolation is enforced in both paths: the filter always includes `user_id`.

## Embeddings without an API key

With `GEMINI_API_KEY` unset, embeddings come from a local hashing embedder
(`backend/app/services/hash_embedder.py`, 768 dims). It is deterministic and
needs no model download, so the full pipeline — storage, vector search, ranking,
cross-session retrieval — runs offline. Quality is far below Gemini's, and the
UI shows which provider is active. Set the key and the app switches to
`gemini-embedding-001` with `outputDimensionality: 768` without a code change.

## Security

- JWT auth, bcrypt password hashing.
- Every memory query filters by the authenticated `user_id`.
- MongoDB URI and API keys live in `backend/.env`, never in the frontend.
- A regex screen rejects passwords, API keys, and tokens before storage.
- Private memories are stored but excluded from retrieval context sent to the LLM.
- Logs record memory ids and types, never memory content.
