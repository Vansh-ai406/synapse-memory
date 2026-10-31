# RecallOS — Frontend

Persistent-memory AI assistant demo for the **MongoDB Student Hackathon, Track 1**.
Vite + React 19 + TypeScript + Tailwind CSS v4, talking to the FastAPI backend at
`http://localhost:8000`.

## Run

```bash
cd frontend
npm install
npm run dev -- --port 5173     # dev server on http://localhost:5173
```

The frontend dev server runs on port **5173** because the backend CORS allows
`http://localhost:5173`.

Production build / type check:

```bash
npm run build        # tsc -b && vite build
npm run preview      # serve the built bundle
```

Make sure the backend is up on `http://localhost:8000` — the UI talks to it
directly (fetch, with `Authorization: Bearer <token>`).

## What the demo shows (judging beats)

| Beat | Where to see it |
| --- | --- |
| 1. Interaction creates a memory | Send "I take oat milk in my coffee" → `🧠 Memory created` toast + it appears in the right-hand memory panel (LIVE dot, ~3s refresh) |
| 2. Recalled memory changes the next reply | Ask "what milk do I like?" → reply uses it; every assistant message shows an **⚡ Evidence** strip (dashed violet) with type chips, retrieval path (`always-load` / `vector` / `exact-scan`), similarity %, and the `why` sentence. Click a row for importance/confidence/reason/score. |
| 3. Inspect stored memory & why it was selected | Right panel → **Active** tab (type=color coded chips, importance/confidence bars, expiry countdown), plus the built-in **vector search** box showing `path / score / why` per hit, and the dashboard strip (active / superseded / expiring soon / conversations). |
| 4. Hard cases | **🔬 Compare: same request WITHOUT memory** button replays the identical message in a new conversation with `use_memory=false` and renders a With/Without side-by-side card. The **Forget** input demonstrates undo-proof deletion (deleted + superseded shown struck-through in **History**). Toasts mark `created / supersede / skipped_duplicate / skipped_sensitive` per turn, inline in the evidence strip too. |

## Layout

```
src/
  api/client.ts   typed fetch client (auth, chat, memories, search, stats, sims)
  api/types.ts    shared DTOs mirroring the backend contract
  hooks/
    useAuth.ts        token in localStorage + GET /api/auth/me revalidation
    useChat.ts        conversation + messages + "compare without memory" flow
    useMemoryFeed.ts  3s-polling memory feed (swappable for SSE — see file TODO)
    useToasts.ts      toast queue + change→toast mapping
  components/
    AuthScreen.tsx    single card login/register
    ChatPane.tsx      chat + "Memory ON/OFF" toggle + compose bar
    MessageBubble.tsx bubbles + provider/retrieval badges + thinking dots
    EvidenceStrip.tsx the per-reply "why this was said" memory evidence
    CompareCard.tsx   with-memory vs without-memory diff card
    MemoryPanel.tsx   right column: stats strip, Active/History/Add tabs,
                      vector search, forget (undo-proof) input
    MemoryCard.tsx    one memory with bars, expiry countdown, hover 🗑 delete
    Toasts.tsx        animated memory-write toasts
    SimulationsDock.tsx  collapsible 🎬 demo-script dock (runs GET /api/simulations)
    ui.tsx            TypeChip / PathBadge / StatusBadge / Meter primitives
```

Memory type colors: PREFERENCE **purple**, CONSTRAINT **amber**, FACT **blue**,
GOAL **green**, DECISION **teal**, FEEDBACK **orange**, EXPERIENCE **sky**,
TASK **rose**, STRATEGY **indigo**.

## Notes

- Auth is a plain bearer token persisted in `localStorage` (`recallos_token`).
- The memory feed polls `GET /api/memories?status=active&limit=100` every 3s
  while the **Active** tab is open; `useMemoryFeed.ts` documents where an
  EventSource (SSE) can be swapped in later.
- Chat calls can take up to ~15s (LLM) — the UI shows animated "thinking…" dots.
