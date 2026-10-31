# RecallOS Submission Checklist

Audit date: 31 October 2026, before the 10:00 PM IST submission deadline.

## Mandatory form fields and links

| Requirement | Status | Submission content / action |
|---|---|---|
| Team details | BLOCKED ON TEAM | Enter the team name, exactly three eligible SVNIT members, departments/years, and primary contact. |
| Project overview | READY | **RecallOS** - a persistent-memory study companion that remembers learning preferences across sessions, explains why a memory was selected, and lets the learner correct or forget it. |
| Main features | READY | Persistent memory, new-session recall, with/without-memory comparison, inspectable score/reason/path, correction and supersession, forget/expiry lifecycle, scoped users, responsive memory panel. |
| Live deployment | IN PROGRESS | Replace the temporary `trycloudflare.com` URL with the permanent `onrender.com` URL and test it in a private browser. |
| GitHub repository | READY AFTER PUSH | `https://github.com/KARANBHAI029/MONGO-DB-HACKATHON` - confirm it is accessible to judges. |
| Demo video | MISSING | Record and upload a maximum 7-minute video. Keep the URL accessible without requesting access. |
| Presentation deck | MISSING | Create PPT covering problem, solution, implementation, technology choices, and impact. Ensure its link is accessible. |
| Access instructions | READY | Demo account: `demo@recallos.app` / `Demo1234!`. State that this is a synthetic shared judge account. |
| Successful form submission | MANUAL | Submit all fields by 10:00 PM IST, save the confirmation, and stop code/deployment changes. |

## Track 1 compliance

| Track requirement | Evidence | Result |
|---|---|---|
| One workflow end to end | Learner preference -> later study plan -> inspect -> correct/forget | PASS |
| Persistent memory across sessions | MongoDB `memories` collection; UI `New session` retains user-scoped records | PASS |
| Memory visibly changes the next result | Morning preference changes the MongoDB revision plan; compare-without-memory shows the difference | PASS |
| Inspect memory and explain selection | Evidence strip and memory panel show content, path, similarity/score, and `why selected` | PASS |
| Difficult lifecycle case | Morning preference becomes superseded by the evening correction; forget marks it deleted and excludes it from recall | PASS |
| Memory document fields | Owner, type, content, source, confidence/importance, timestamps, lifecycle, embedding, expiry and supersession links | PASS |
| Semantic recall | Atlas `$vectorSearch` code and documented index; exact-cosine fallback is visibly labeled when the index is unavailable | CONDITIONAL - verify Atlas index reports READY |
| Scoped retrieval | Every recall filters authenticated `user_id` and `status=active`; isolation regression test passes | PASS |
| TTL expiry | TTL index on a real `expires_at` date | PASS |
| Live updates | Authenticated, user-scoped MongoDB change stream with polling fallback | PASS |
| Repeatable setup | Idempotent reset/seed script and Docker deployment | PASS |
| Explain architecture and data model | README and ARCHITECTURE.md | PASS |

## Final technical verification

- [x] Frontend production build passes.
- [x] Backend suite: 18 tests passed.
- [x] Signup/login, dashboard, memory creation, cross-session recall, compare, correction, forget, user isolation and change-stream scope are covered by tests or browser rehearsal.
- [x] `/health/ready` verifies Atlas connectivity without exposing connection details.
- [x] `.env`, local runtime files, generated bundles and logs are ignored.
- [ ] Atlas Vector Search index `memories_vector` is `READY`, dimension 768, cosine, with `user_id`, `status`, and `memory_type` filter fields.
- [ ] Permanent URL signup tested using a fresh email, then login and all four demo beats rehearsed.
- [ ] Gemini text generation verified on the permanent host. If quota remains exhausted, disclose the visible `template` provider badge rather than claiming live Gemini output.
- [ ] Judge links tested in a signed-out/private browser.

## Suggested 7-minute demo

1. **0:00-0:40 - Problem:** generic study tools forget how a learner works.
2. **0:40-1:20 - Architecture:** React/FastAPI, MongoDB collections, two recall paths, lifecycle and change stream.
3. **1:20-2:10 - Create:** say “I prefer short morning study sessions before 9 AM.” Show the stored preference.
4. **2:10-3:20 - Recall:** start a new session and ask “Plan my MongoDB revision.” Show morning blocks and compare without memory.
5. **3:20-4:10 - Inspect:** expand the evidence: owner scope, path, score and why selected.
6. **4:10-5:15 - Correct:** say “Actually, I now prefer evening sessions after 7 PM.” Show active/superseded links and the changed plan.
7. **5:15-5:50 - Forget/expiry:** forget the preference and show it is excluded; mention MongoDB TTL timing for temporary memories.
8. **5:50-6:30 - Reliability:** isolation test, idempotent seed, health endpoint and honest fallbacks.
9. **6:30-7:00 - Impact:** a transparent assistant that improves over time while the user controls memory.

## Likely judge questions

- Why use both always-load and vector recall? Because planning queries can have low semantic overlap with a stored schedule preference; always-load protects high-value preferences/constraints while vector search handles other memory types.
- How do you prevent cross-user leakage? The authenticated user ID is applied inside every active-memory query and the vector filter; an isolation regression test creates two users and checks list/search results.
- How do corrections work? Candidate memories are compared with active memories; conflicts insert the new record, mark the old record superseded, link both directions, and append history.
- Why soft-delete? It keeps an auditable lifecycle while every recall path filters `status=active`.
- How does expiry work? MongoDB's TTL index removes documents after `expires_at`; the TTL monitor is asynchronous, so expiry is not instant.
- What happens if Gemini or the vector index is unavailable? The UI labels deterministic template generation and exact-cosine recall; it never presents fallback output as live Gemini or Atlas Vector Search.
- What does MongoDB uniquely provide? Durable user-scoped documents, lifecycle history, vector recall, TTL expiry, aggregation-based dashboard data, and change streams from one data platform.
- What is the biggest limitation? Gemini quota and Atlas index readiness must be checked before judging; free hosting may have a cold start.

## Freeze procedure

After the form is submitted: record the Git commit SHA, deployed URL and deployment version; do not push commits, change functionality, edit the video/PPT, or redeploy unless organizers explicitly authorize it. Keep the service and Atlas cluster available and notify organizers immediately about an outage.
