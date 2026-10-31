# SynapseMemory 🧠⚡
### Autonomous Multi-Session Agentic Memory Platform powered by MongoDB Atlas
**MongoDB Student Hackathon SVNIT — Track 1: Agentic Memory (Problem Statement 1)**

---

## 🌟 Executive Summary
**SynapseMemory** is an enterprise-grade Autonomous Developer & SRE Platform powered by MongoDB Atlas Agentic Memory. It enables software teams and autonomous agents to persist, recall, harmonize, and decay operational memories across interactions and sessions. 

Rather than a basic chatbot, SynapseMemory implements **3 Specialized Autonomous Agents** (Systems Architect, Security Officer, Principal SRE), an **Interactive Force-Directed Knowledge Graph**, an **Ebbinghaus Memory Decay Engine**, an **Agentic PR Code Review Guard**, and an **Autonomous SRE Incident Self-Healing Simulator**.

---

## 🚀 Key MongoDB Technologies Showcased

1. **Rich Document Modeling & Lifecycle Management**
   - Each memory is modeled with `owner`, `workspaceId`, `type` (`constraint`, `incident_fix`, `decision`, `preference`, `fact`), `lifecycle` state (`active`, `superseded`, `expired`), confidence score, and access frequency counters.
2. **MongoDB Atlas Vector Search (`$vectorSearch`)**
   - Recalls relevant memories using high-dimensional embeddings (768-dim normalized vectors) combined with strict metadata pre-filtering (`workspaceId`, `lifecycle.status: "active"`).
3. **MongoDB TTL Indexes (`expireAfterSeconds`)**
   - Ephemeral memories (e.g. temporary incident war-room tokens, staging bypass keys) automatically purge at the database engine level via index `{ expiresAt: 1 }` with `{ expireAfterSeconds: 0 }`.
4. **MongoDB Change Streams (`collection.watch()`)**
   - Real-time Server-Sent Events (SSE) push live database mutations to connected clients as soon as memories are indexed, updated, or superseded.
5. **MongoDB Aggregation Framework for Memory Decay**
   - Utilizes mathematical operators (`$exp`, `$ln`, `$dateDiff`, `$facet`) to calculate **Ebbinghaus Memory Retention Curves** based on time elapsed ($\Delta t$) and spaced-repetition recall frequency ($N$).

---

## 🎯 The 5 Core Platform Modules

### 1. 💬 Interactive Copilot (Multi-Session Continuity)
- Demonstrates persistent memory across separate sessions (Session 1 $\to$ Session 2).
- Automatically retrieves team constraints and past incident fixes to write compliant database code.
- Detects semantic contradictions (e.g., migrating from native driver to Prisma), marks outdated rules as `superseded`, and records the audit trail.

### 2. 🤖 Multi-Agent Consensus Room (`/api/multi-agent`)
- **Archi (Architect):** Enforces driver standards, schema validation, and stack guidelines.
- **Aegis (Security):** Mandates TLS 1.3, zero-trust network boundaries, and ephemeral credential TTLs.
- **Sentinel (SRE):** Recalls historical outage post-mortems (**Incident INC-402**) and enforces connection pool limits (`maxPoolSize: 50`).
- Agents negotiate simultaneously against shared MongoDB memory and produce a unified action plan with a **Consensus Score**.

### 3. 🔍 Agentic PR Code Review Guard (`/api/simulator/review`)
- Evaluates code diffs in pull requests against team memories.
- Flags violations (e.g. attempting to import Mongoose, missing connection pool parameters, or disabling TLS) with inline line annotations and citations of the exact violated memory document.
- One-click auto-generation of memory-compliant replacement code.

### 4. 🚨 SRE Adaptive Incident Self-Healing (`/api/simulator/incident`)
- Simulates a P1 production crisis: *MongoDB Connection Pool Exhaustion under Traffic Spike*.
- Autonomous Agent queries MongoDB vector store $\to$ identifies runbook **INC-402** $\to$ applies dynamic pool resize $\to$ drops latency from 4,320ms to 12ms.
- Closes the learning loop by automatically indexing a new episodic incident resolution document into MongoDB!

### 5. 📉 Ebbinghaus Memory Decay Engine (`/api/memories/decay`)
- Implements exponential memory retention:
  $$\text{Retention} = \exp\left(-\frac{\Delta t}{\tau \cdot (1 + \ln(1 + N))}\right)$$
- Displays bank health telemetry, high-retention memories, and decaying memories.
- Spaced-repetition reinforcement button boosts memory strength upon recall.

### 6. 🕸️ Interactive 2D Force-Directed Knowledge Graph
- 60fps HTML5 Canvas physics engine visualizing memories as interconnected nodes.
- Shows relationships: `indexes`, `enforces`, and `superseded_by` (dashed red links).
- Interactive drag physics, hover tooltips, and click-to-inspect deep explainability modal.

---

## 🛠️ Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment (`.env.local`)
```env
MONGODB_URI=mongodb://127.0.0.1:27017/synapse_memory
# Or your MongoDB Atlas connection string:
# MONGODB_URI=mongodb+srv://<user>:<password>@cluster.mongodb.net/synapse_memory

# Optional LLM Key (Google Gemini or OpenAI)
GEMINI_API_KEY=your_gemini_key_here
```

### 3. Initialize MongoDB Indexes
```bash
npm run setup:db
```

### 4. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📂 Repository Architecture
```
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── chat/route.ts                # Memory-informed LLM reasoning & extraction
│   │   │   ├── memories/route.ts            # CRUD operations for memory collection
│   │   │   ├── memories/decay/route.ts      # Ebbinghaus decay analytics & reinforcement
│   │   │   ├── memories/stream/route.ts     # MongoDB Change Stream (SSE)
│   │   │   ├── multi-agent/route.ts         # Multi-agent shared memory deliberation
│   │   │   ├── scenarios/seed/route.ts      # 1-click hackathon rubric demo seed
│   │   │   ├── simulator/incident/route.ts  # Autonomous SRE self-healing
│   │   │   └── simulator/review/route.ts    # PR code review against constraints
│   │   ├── globals.css                      # Modern dark theme & glow animations
│   │   ├── layout.tsx                       # Root layout & metadata
│   │   └── page.tsx                         # Multi-tab dashboard controller
│   ├── components/
│   │   ├── Header.tsx                       # Mode switcher & live status pills
│   │   ├── ChatPlayground.tsx               # Multi-session copilot & memory citations
│   │   ├── MemoryExplorer.tsx               # Memory bank list & view mode toggle
│   │   ├── MemoryGraphCanvas.tsx            # Force-directed 2D Knowledge Graph
│   │   ├── MultiAgentView.tsx               # 3-agent deliberation room
│   │   ├── CodeReviewerView.tsx             # PR code guard with inline annotations
│   │   ├── IncidentSimulatorView.tsx        # Outage telemetry & autonomous runbook execution
│   │   ├── MemoryDecayView.tsx              # Ebbinghaus retention curves & gauges
│   │   └── ExplainabilityModal.tsx          # Cosine similarity breakdown & raw JSON
│   ├── lib/
│   │   ├── mongodb.ts                       # Connection pooling & client management
│   │   ├── ai.ts                            # Embeddings, extraction & response generation
│   │   ├── memory-service.ts                # Storage, vector recall & conflict resolution
│   │   ├── decay-service.ts                 # Aggregation pipeline decay engine
│   │   ├── multi-agent-orchestrator.ts      # Multi-agent coordination logic
│   │   └── simulator-service.ts             # Code review & incident self-healing service
│   └── types/
│       ├── memory.ts                        # Memory document schemas & lifecycle types
│       ├── agent.ts                         # Agent profiles, turns & decay metrics
│       └── simulator.ts                     # PR reviews & incident remediation types
├── scripts/
│   └── setup-db.js                          # MongoDB TTL & Compound Index initialization
├── Dockerfile                               # Production container image
├── docker-compose.yml                       # Multi-container orchestration
└── package.json
```
