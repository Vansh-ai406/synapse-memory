# Agentic Memory Demo Plan (v2)

## Deployment and visual upgrade — 2026-10-31 (approval pending)

Continue the existing React/FastAPI study assistant; preserve the single workflow and prior repairs. This section supersedes the older provider and task-order assumptions below: the handoff uses Gemini embeddings, 768 dimensions, with honestly labeled fallbacks.

1. **Baseline and connectivity (15 min):** run the frontend production build and backend unit tests; safely probe Atlas and provider availability without printing credentials. Use `memory-debug` for failures. Inspect existing deployment access before choosing the host.
2. **Deployment readiness (25 min):** replace the hard-coded loopback API URL with deployment configuration or same-origin routing; add a Python-capable deployment configuration, useful readiness reporting, and safe production settings. Prefer one origin serving the built React app and FastAPI. Sites alone cannot run this backend. If hosting access is unavailable, offer a clearly labeled temporary tunnel and report its lifetime dependency.
3. **Visual upgrade (40 min):** build a cohesive graphite/ivory study workspace with emerald accents, strong typography, refined spacing, responsive chat and memory inspection, polished onboarding, clear loading/error/empty states, and accessible motion. Keep recall evidence, memory comparison, correction history, and forget actions prominent. Improve backend reliability and error responses where inspection identifies concrete issues; retain the existing workflow.
4. **Evidence and publication (40 min):** run tests after each task and the production build after UI changes; apply `memory-demo-check` to create, later-session recall, inspect score/reason, correction, deletion, isolation, and live updates. Verify the deployed URL and report any failing beat or fallback honestly.

**Demo inputs:** "I prefer short morning study sessions" → stored preference; new session "Plan my MongoDB revision" → morning blocks versus a no-memory comparison; inspect → content/score/why; "Actually I now prefer evening sessions after 7 PM" → superseded morning preference and evening plan; forget → excluded from subsequent recall.

**Data contract:** retain scoped memories and source IDs, active/superseded/deleted lifecycle, timestamps and optional expiry. Audit current field names against the documented schema before changing them. Use the same embedding model/dimensions for writes and recall; vectorSearch filters must declare every filtered field, including user and status. Keep TTL on expires_at and change streams in the existing stream module. Seeds remain idempotent and scoped.

**Boundaries and fallbacks:** preserve existing user changes and login; add no new workflows. Atlas availability and external hosting access may require user action. Label template generation and exact-scan recall; never present them as live AI or Atlas vector search. Cut decorative extras before functional verification. Apply relevant repo skills when their work is reached; do not perform unrelated ASP, encryption, or migration work merely to invoke every skill.

**Approval requested:** approve this upgrade/deployment sequence before application-code changes, as required by AGENTS.md and memory-plan.

## Product and workflow

Build a study-planning assistant for one user: the user states a recurring preference or constraint, and a later planning request recalls it so the generated plan visibly changes.

## Four-beat demo (+ two short extras)

1. **Create:** User says, "I prefer short morning study sessions." The assistant extracts and stores an active `preference` memory.
2. **Recall changes output:** In a later session, user asks, "Plan my MongoDB revision." Recall returns the preference, so the plan uses short morning blocks and explains that choice. A **with-memory / without-memory toggle** in the UI shows the same request producing a different plan.
3. **Inspect:** Open the memory panel and show the stored document, retrieval path (always-load or vector), similarity score where applicable, user/workspace filters, and a `why selected` string.
4. **Hard case (correction):** User says, "I now prefer evening sessions." The new memory is matched against the old one, the old one becomes `superseded`, the new one is active with `supersedes` set, and the next plan uses evenings.
5. **Extra A (forget):** User says, "Forget that." The memory is marked `deleted` and no longer recalled.
6. **Extra B (expiry):** A temporary memory (e.g., "I have an exam tomorrow") is stored with `expires_at` about 2 minutes ahead; show it disappear. The TTL monitor runs roughly once a minute, so allow for delay, and say so on stage.

## Memory behavior

Remember explicit preferences, constraints, decisions, facts, outcomes, and feedback. Ingest after each qualifying interaction.

**Recall (two paths, both shown in the panel):**
- **Always-load path:** for planning requests, load all `status=active` memories of type `preference` and `constraint` for the user. Reason: a query like "Plan my MongoDB revision" has little semantic overlap with "I prefer short morning study sessions," so vector search alone could miss it.
- **Vector path:** filtered `$vectorSearch` (`user_id`, `workspace_id`, `status=active`) for `fact`, `decision`, `outcome`, `feedback`. Embed the query as `"study preferences and constraints for: <request>"` when helpful. Return score for every hit.
- Every recalled item returns content, retrieval path, score (if any), and `why selected`.

**Correction / conflict handling (on every candidate memory):**
1. Embed the candidate and run a filtered vector search over the same `user_id` + `type` + `status=active`.
2. Send the candidate plus top matches to the LLM, which returns one of `new`, `duplicate`, `conflict` (with the id of the conflicting memory and a one-line reason).
3. `new` -> insert. `duplicate` -> bump `updated_at`, no insert. `conflict` -> insert the new memory with `supersedes=<old_id>` and mark the old one `superseded` (same transaction or ordered writes; log the reason).

**Deletion:** "forget that" resolves to a memory (most recent recalled, or best vector match), sets `status=deleted`. **Expiry:** `expires_at` TTL cleanup for temporary memories.

## LLM and embeddings

- **LLM:** one thin wrapper (`llm.py`, single `complete(system, user, json=False)` function). Provider and model come from `.env` (`LLM_PROVIDER`, `LLM_MODEL`, API key). Used for: memory extraction, conflict judging, plan generation, "why selected" text. Do not hard-code a provider elsewhere.
- **Embeddings:** Voyage AI. In task 1, check which Voyage models the key can use and pick a current general-purpose one (consider MongoDB server-side auto-embedding if it works on the cluster; otherwise embed in app code). Read the dimension from the model, do not hard-code it. Use the same model for writes and queries. Record `embedding_model` on each memory document.
- **Fallback:** if Voyage is unavailable, use deterministic local test embeddings (clearly flagged) so tests run; never present them as the production path.

## Schema and indexes

Use the AGENTS.md document schema: `user_id`, `workspace_id`, `type`, `content`, `embedding`, `embedding_model`, source IDs, lifecycle `status` (`active|superseded|deleted`), `confidence`, timestamps, optional `supersedes` / `expires_at`.

Indexes:
- TTL on `expires_at` (`expireAfterSeconds: 0`); the field must be a real Date.
- Compound `(user_id, status, type)`.
- Atlas `vectorSearch` on `embedding` (dimensions from chosen model) with filter fields `user_id`, `workspace_id`, `type`, `status`.
- `$jsonSchema` validator on required fields and enums.

## Module layout

`llm` (provider wrapper) · `ingest/extract` (candidate memories) · `store` (validate + write, idempotent) · `recall` (always-load + filtered vector, returns path/score/why) · `lifecycle` (conflict judge, supersede, delete, expiry) · `api/ui` (chat, memory panel, with/without-memory toggle, forget action) · `change_stream` (live memory panel feed; own code, not via MCP).

## Tasks (timeline is adjustable; defaults assume 2 hours)

1. **0-30 min:** configure Atlas/env; verify Voyage model access and pick model; create collection, validator, indexes; seed idempotent fixtures; prove one filtered `$vectorSearch` works.
2. **30-60 min:** implement `llm`, ingestion, storage, two-path recall, and the conflict/supersede lifecycle; reach a working end-to-end CLI demo (beats 1, 2, 4) by minute 60.
3. **60-90 min:** add API/UI with memory panel (score, path, why), with/without-memory toggle, forget action, and live change-stream updates.
4. **90-120 min:** run `memory-debug` and `memory-demo-check`, add the expiry demo, tighten copy, rehearse all beats and the talking points (architecture, data model, why two recall paths).

Cut first: rich UI styling, extra workflows, authentication, nonessential analytics, Extra B if short on time. Keep: user isolation, recall, correction lifecycle, live panel.

## Tests (minimum)

- Isolation: user B never recalls user A's memories.
- Beat 2: with memory the plan contains morning blocks; without memory it does not.
- Beat 4: after correction, old is `superseded`, new is `active`, plan uses evenings.
- Forget: deleted memory is not recalled.
- Idempotent seed: running twice creates no duplicates.

## Risks and fallbacks

- Voyage quota/model unavailable -> local deterministic embeddings (flagged), keep the same interface.
- Vector index still building -> wait for READY status; meanwhile the always-load path still serves preferences.
- LLM returns invalid JSON for the conflict judge -> retry once, then default to `new` and log it.
- Atlas connectivity fails -> stop and report the exact error; do not claim recall is working.

Approve this plan before any application code is written.

## Execution evidence — 2026-10-31

Approved by user: "execute till deployment now". Upgrade implemented and temporary public HTTPS deployment verified at https://concentrations-strips-regular-lovers.trycloudflare.com. Frontend production build passed; expanded backend suite: 18 passed. Real Atlas smoke confirmed preference creation, later-session recall and correction. Dashboard authentication, static bundle routing, readiness errors, authenticated change streams, responsive memory access and new-session UX repaired/verified. Secrets and runtime/build artifacts are ignored.

Remaining limits: temporary tunnel requires the host computer and processes to stay running; permanent Docker/Render deployment requires hosting access and is not completed. Gemini text remains on labeled template fallback; recall uses exact scan/always-load. Local change-stream test passed; public tunnel falls back to polling. Expiry was not separately rehearsed in this run. See README for reproducible commands and deployment details.
