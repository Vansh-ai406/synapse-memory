# RecallOS — persistent-memory AI assistant

A MongoDB Student Hackathon (Track 1) project: a study-planning assistant whose
answers visibly change because of what it remembers about you — across
sessions — with every recall explainable down to the individual stored
memory.

FastAPI + Motor (MongoDB Atlas) + Gemini (chat & embeddings) + Atlas
$vectorSearch + Vite/React/Tailwind frontend.

## Demo beats (what judges should see)

1. **Create** — user: "I prefer short morning study sessions, before 9 AM."
   → an active `PREFERENCE` memory appears instantly in the live panel and in
   the `memories` collection (with its 768-dim embedding).
2. **Recall changes output** — new conversation, user: "Plan my MongoDB
   revision." → the plan explicitly uses short morning blocks *"because you
   prefer short morning sessions"*. Hit **Compare without memory** → the same
   request with memory OFF gives a generic plan: side-by-side proof that one
   persisted document changed the answer.
3. **Inspect** — every reply shows an evidence strip: memory type chip,
   retrieval path (`always-load` vs `vector` vs `exact-scan`), similarity %,
   weighted score, and a why-selected string. The panel shows the stored
   document's importance/confidence/source counters.
4. **Correction** — user: "I now prefer evening sessions after 7 PM." → old
   memory flips to `superseded`, new one is active with `supersedes` linked;
   the next plan uses evenings.
5. **Forget** — "Forget that" (or panel 🗑) → memory `status=deleted`, audit
   row in `memory_history`, never recalled again.
6. **Expiry** — "I have an exam tomorrow" → temporary memory with `expires_at`
   removed by the TTL index (~once a minute; say so on stage).
7. **Isolation** — register a second user → zero access to user 1's memories
   (enforced by `user_id` on every query, in vector filters and in the
   change-stream feed).

## Quickstart

Backend (port 8000):

```powershell
cd backend
# create .env from .env.example and fill MONGODB_URI + GEMINI_API_KEY
..\.venv\Scripts\python.exe -m pip install -r requirements.txt
..\.venv\Scripts\python.exe -m uvicorn app.main:app --port 8000
```

Frontend (port 5173):

```powershell
cd frontend
npm install
npm run dev        # NOTE: plain `npm run dev` (the --port flag is flaky on this npm)
```

Open http://localhost:5173, register, run the beats above.
Reset to a clean demo state any time:

```powershell
cd backend
..\.venv\Scripts\python.exe scripts\reset_demo_data.py
# demo login: demo@recallos.app / Demo1234!
```

## Manual step: Atlas Vector Search index

PyMongo cannot create Search/Vector indexes. Create once in the Atlas UI:

1. Atlas ▸ your cluster ▸ **Atlas Search** ▸ **Create Search Index**
2. Choose **Vector Search** — index name: `memories_vector`
3. Database: `recallos` — Collection: `memories`
4. Dimensions: **768**, similarity: **cosine**
5. Paste this definition:

```json
{
  "fields": [
    {
      "type": "vector",
      "path": "embedding",
      "numDimensions": 768,
      "similarity": "cosine"
    },
    {
      "type": "filter",
      "path": "user_id"
    },
    {
      "type": "filter",
      "path": "status"
    },
    {
      "type": "filter",
      "path": "memory_type"
    }
  ]
}
```

Wait for status **READY**. Until then the backend automatically falls back to
an exact cosine scan (flagged `exact-scan` in the UI; ranking may differ from approximate vector search).

## Environment

`backend/.env` (never commit):

```
MONGODB_URI=mongodb+srv://...
MONGODB_DB=recallos
JWT_SECRET=...
GEMINI_API_KEY=...
GEMINI_CHAT_MODEL=gemini-2.5-flash
GEMINI_EMBED_MODEL=gemini-embedding-001
EMBEDDING_DIMENSIONS=768
```

Free-tier Gemini: text quota is small. The app degrades gracefully — after
consecutive 429s a circuit breaker answers from a deterministic template that
still applies recalled memories, and responses are badged `template` so the
demo stays honest.

## Tests

```powershell
cd backend
..\.venv\Scripts\python.exe -m pytest tests -q
```

## Architecture (one paragraph)

Every message is embedded and recalled two ways: an **always-load** path (all
active `PREFERENCE`/`CONSTRAINT` memories — needed because "Plan my revision"
has little semantic overlap with "I prefer short morning sessions") and a
**vector** path via Atlas `$vectorSearch` filtered by `user_id` + `status=active`.
Responses are shaped by the memories, then extraction stores what is worth
remembering (with a duplicate/conflict/supersede judgement) and a Mongo
change-stream feeds the live panel over SSE. Persistence lives only in
MongoDB — users, conversations, messages, memories, memory_history, feedback.

## Deployment verified — 31 October 2026

Temporary public demo: https://concentrations-strips-regular-lovers.trycloudflare.com

This is a Cloudflare Quick Tunnel, not permanent hosting. Keep this computer awake and the API/tunnel processes running. Restarting the tunnel produces a new URL. The running API is on `127.0.0.1:8010`; its PID and the tunnel PID are in ignored `tmp/api.pid` and `tmp/tunnel.pid`. No credentials are included in the frontend bundle or hosting files.

The React production build is served by FastAPI on the same origin. Development uses Vite's `/api` proxy; an optional `VITE_API_BASE_URL` supports a separately hosted API. `/health` reports process health; `/health/ready` verifies Atlas and returns 503 when unavailable.

To run again from the repository root:

```powershell
npm ci --prefix frontend
npm run build --prefix frontend
cd backend
& '../.venv/Scripts/python.exe' -m uvicorn app.main:app --host 127.0.0.1 --port 8010 --log-level warning
```

In another terminal from the root:

```powershell
& './tmp/cloudflared.exe' tunnel --url http://127.0.0.1:8010 --protocol http2
```

For permanent hosting, `Dockerfile` builds React and runs FastAPI as a non-root user; `render.yaml` defines a Render service. Connect the repository to the host and supply `MONGODB_URI` and `GEMINI_API_KEY` through its secret settings. The Blueprint generates a JWT secret. Atlas must allow the host's outbound connection. This permanent-host configuration has not been deployed or Docker-built in this session.

### Verification and current limits

- Production frontend: `npm run build --prefix frontend` passed.
- Backend: `RECALLOS_API_BASE=http://127.0.0.1:8010`, then `../.venv/Scripts/python.exe -m pytest tests -q`: **18 passed** (one dependency deprecation warning).
- Real Atlas smoke rehearsal: create, later-session recall, morning-to-evening correction and linked supersession passed. API tests also verify forget, cross-user isolation, and repeatable seeding.
- Database readiness and homepage returned HTTP 200 at the public HTTPS URL.
- Authenticated MongoDB change-stream delivery and isolation passed locally. The public tunnel uses the panel's three-second polling fallback, labeled `synced`; it is not presented as live SSE.
- Text generation currently uses the explicitly labeled `template` fallback. Semantic recall is currently reported as `exact`/`exact-scan`, with preferences on the always-load path. Full Gemini generation and Atlas vector indexing are not claimed as working.
- Demo login: `demo@recallos.app` / `Demo1234!`. Demo accounts are shared fixtures; use them only for demonstration content.

The UI now includes responsive memory access, a new-session button, starter prompts, memory evidence and comparison, honest connection/provider status, and reduced-motion support.

## Third-party components and AI-use disclosure

RecallOS was built during the event with FastAPI, Uvicorn, Motor/PyMongo,
React, Vite, Tailwind CSS, bcrypt, PyJWT, HTTPX, Gemini APIs, MongoDB Atlas,
and Cloudflare Tunnel for the temporary preview. Codex was used as an AI coding
assistant for planning, implementation, debugging, tests, documentation, and UI
polish. The team remains responsible for the submitted design, code, testing,
and presentation. No external dataset is used; demo records are synthetic.

The permanent deployment definition is [render.yaml](render.yaml). Automatic
deploys are disabled so pushes after the submission freeze cannot silently
change the judged service. Secrets are supplied only in the hosting dashboard.
