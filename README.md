# SynapseMemory 🧠⚡
### Autonomous Multi-Session Agentic Memory Platform powered by MongoDB Atlas
**MongoDB Student Hackathon SVNIT — Track 1: Agentic Memory (Problem Statement 1)**

---

## 🌟 Overview
**SynapseMemory** is an enterprise-grade Autonomous Developer & SRE Copilot that maintains persistent memory across interactions, sessions, and multi-agent workflows. It intelligently extracts durable rules, architectural constraints, and incident fixes, semantically indexes them with vector embeddings, detects and resolves contradictions, and leverages MongoDB TTL indexes for auto-expiring ephemeral context.

---

## 🚀 Key MongoDB Technologies Showcased

1. **Rich Document Modeling & Lifecycle Management**
   - Each memory is stored as a rich document with `owner`, `workspaceId`, `type` (`constraint`, `incident_fix`, `decision`, `preference`, `fact`), `lifecycle` state (`active`, `superseded`, `expired`), confidence score, and access frequency counters.
2. **MongoDB Atlas Vector Search (`$vectorSearch`)**
   - Recalls relevant memories using high-dimensional embeddings (Gemini 768-dim / OpenAI 1536-dim) combined with strict metadata pre-filtering (`workspaceId`, `lifecycle.status: "active"`).
3. **MongoDB TTL Indexes (`expireAfterSeconds`)**
   - Automatically expires ephemeral memories (e.g. temporary incident war-room tokens, debug bypass keys) directly at the database engine level via index `{ expiresAt: 1 }`.
4. **MongoDB Change Streams (`collection.watch()`)**
   - Pushes real-time SSE updates to the dashboard as soon as any agent creates, updates, or supersedes memories across sessions.

---

## 🎯 4-Step Hackathon Demo Walkthrough (For Judges)

### Step 1: Useful Memory Creation (Session 1)
- **Action:** In Session 1, instruct the agent:
  > *"Our team strictly enforces Node.js TypeScript with MongoDB native driver, no Mongoose, and all collections must have schema validation."*
- **Result:** SynapseMemory identifies this as a durable `constraint`, calculates its vector embedding, and stores it in the `memories` collection.

### Step 2: Behavioral Shift in Subsequent Session (Session 2)
- **Action:** Switch the session selector to **Session 2 (Feature Development)** and ask:
  > *"Write a database connection and user lookup function for our new API."*
- **Result:** The agent retrieves the stored constraint via MongoDB Vector Search and automatically generates code using the official native driver with schema validation—without being reminded!

### Step 3: Inspect Stored Memory & Explain Selection
- **Action:** Click the **Inspect** eye icon or click the **Recalled Memories** pill in the chat message.
- **Result:** The **Explainability Inspector** opens, showing the exact cosine similarity score, matching metadata filters, and raw MongoDB document.

### Step 4: Difficult Cases (Contradiction / Conflict & TTL Expiry)
- **Case A: Contradiction / Conflict Resolution**
  - Say: *"We have updated our team policy: we are migrating to Prisma ORM for all new services."*
  - SynapseMemory detects the semantic conflict with the previous rule, marks the old rule as `status: "superseded"`, and updates the active constraint.
- **Case B: Ephemeral TTL Auto-Expiry**
  - Say: *"Active war-room auth token: WAR-ROOM-9921. Expire this temporary memory in 60 seconds."*
  - Memory is created with `expiresAt`. Watch the live TTL countdown tick down until MongoDB automatically purges it!

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

# Optional LLM Key (Gemini or OpenAI)
GEMINI_API_KEY=your_gemini_key_here
```

### 3. Initialize Indexes
```bash
npm run setup:db
```

### 4. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📂 Project Structure
```
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── chat/route.ts          # Memory-informed LLM reasoning & extraction
│   │   │   ├── memories/route.ts      # CRUD endpoints for memory collection
│   │   │   ├── memories/stream/route.ts # MongoDB Change Stream (SSE)
│   │   │   └── scenarios/seed/route.ts # 1-click hackathon rubric demo seed
│   │   ├── globals.css                # Dark theme & MongoDB styling
│   │   ├── layout.tsx                 # Root layout
│   │   └── page.tsx                   # Main dual-pane dashboard
│   ├── components/
│   │   ├── Header.tsx                 # Status pills (Change Stream, Vector Search)
│   │   ├── ChatPlayground.tsx         # Multi-session chat & memory attribution
│   │   ├── MemoryExplorer.tsx         # Real-time memory bank with TTL countdown
│   │   └── ExplainabilityModal.tsx    # Semantic search inspector & raw JSON viewer
│   ├── lib/
│   │   ├── mongodb.ts                 # Connection pool & client management
│   │   ├── ai.ts                      # Vector embeddings & LLM completion
│   │   ├── memory-service.ts          # Storage, vector recall, conflict resolution
│   │   └── utils.ts                   # Formatting & styling utilities
│   └── types/
│       └── memory.ts                  # TypeScript types for memory documents
├── scripts/
│   └── setup-db.js                    # MongoDB TTL & Compound Index initialization
└── package.json
```
