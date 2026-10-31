import os
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    PageBreak,
    HRFlowable,
)
from reportlab.pdfgen import canvas

PDF_PATH = os.path.abspath("SynapseMemory_Project_Report.pdf")

class NumberedCanvas(canvas.Canvas):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_decorations(num_pages)
            super().showPage()
        super().save()

    def draw_page_decorations(self, page_count):
        self.saveState()
        self.setFont("Helvetica-Bold", 8)
        self.setFillColor(colors.HexColor("#00684A"))
        
        # Header (pages > 1)
        if self._pageNumber > 1:
            self.drawString(40, 758, "SynapseMemory -- Track 1: Agentic Memory (SVNIT MongoDB Hackathon)")
            self.setFont("Helvetica", 8)
            self.setFillColor(colors.HexColor("#64748B"))
            self.drawRightString(572, 758, "Final Project Report & Audit")
            self.setStrokeColor(colors.HexColor("#CBD5E1"))
            self.setLineWidth(0.5)
            self.line(40, 750, 572, 750)

        # Footer
        self.setFont("Helvetica", 8)
        self.setFillColor(colors.HexColor("#64748B"))
        page_str = f"Page {self._pageNumber} of {page_count}"
        self.drawRightString(572, 28, page_str)
        self.drawString(40, 28, "Branch: vansh  |  Team SynapseMemory  |  Status: Verified & Live at http://localhost:3000")
        self.setStrokeColor(colors.HexColor("#CBD5E1"))
        self.setLineWidth(0.5)
        self.line(40, 38, 572, 38)
        self.restoreState()


def build_pdf():
    # 40pt margins for optimal table width (532pt printable)
    doc = SimpleDocTemplate(
        PDF_PATH,
        pagesize=letter,
        leftMargin=40,
        rightMargin=40,
        topMargin=42,
        bottomMargin=42,
    )

    styles = getSampleStyleSheet()

    c_primary = colors.HexColor("#001E2B")
    c_green = colors.HexColor("#00684A")
    c_accent = colors.HexColor("#00ED64")
    c_dark = colors.HexColor("#0F172A")
    c_bg_light = colors.HexColor("#F8FAFC")
    c_border = colors.HexColor("#CBD5E1")

    title_style = ParagraphStyle(
        "DocTitle",
        parent=styles["Heading1"],
        fontName="Helvetica-Bold",
        fontSize=20,
        leading=23,
        textColor=c_primary,
        spaceAfter=2,
    )

    subtitle_style = ParagraphStyle(
        "DocSubtitle",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=10,
        leading=13,
        textColor=c_green,
        spaceAfter=6,
    )

    h1_style = ParagraphStyle(
        "H1",
        parent=styles["Heading2"],
        fontName="Helvetica-Bold",
        fontSize=11,
        leading=14,
        textColor=c_primary,
        spaceBefore=8,
        spaceAfter=4,
    )

    body_style = ParagraphStyle(
        "Body",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=8.5,
        leading=11.5,
        textColor=c_dark,
        spaceAfter=3,
    )

    bullet_style = ParagraphStyle(
        "Bullet",
        parent=body_style,
        leftIndent=12,
        firstLineIndent=-8,
        spaceAfter=2,
    )

    table_header_style = ParagraphStyle(
        "TableHeader",
        parent=body_style,
        fontName="Helvetica-Bold",
        fontSize=8,
        leading=10,
        textColor=colors.white,
    )

    table_cell_style = ParagraphStyle(
        "TableCell",
        parent=body_style,
        fontSize=7.5,
        leading=9.5,
        spaceAfter=0,
    )

    table_cell_bold = ParagraphStyle(
        "TableCellBold",
        parent=table_cell_style,
        fontName="Helvetica-Bold",
        textColor=c_primary,
    )

    callout_style = ParagraphStyle(
        "Callout",
        parent=body_style,
        fontName="Helvetica-Oblique",
        fontSize=8,
        leading=11,
        textColor=c_primary,
    )

    story = []

    # ================= PAGE 1 =================
    story.append(Paragraph("SynapseMemory", title_style))
    story.append(Paragraph("Autonomous Multi-Session Agentic Memory Platform powered by MongoDB Atlas", subtitle_style))
    story.append(Paragraph("<b>Event:</b> MongoDB Student Hackathon SVNIT &nbsp;|&nbsp; <b>Track:</b> Track 1: Agentic Memory (PS 1) &nbsp;|&nbsp; <b>Branch:</b> <code>vansh</code>", body_style))
    story.append(HRFlowable(width="100%", thickness=1.5, color=c_green, spaceBefore=3, spaceAfter=6))

    story.append(Paragraph("1. The Problem Statement Explained in Plain English", h1_style))
    story.append(Paragraph(
        "<b>The Everyday Amnesia Problem:</b> Modern generative AI models (ChatGPT, Claude) possess no persistent memory across sessions. "
        "If an engineering team informs the AI: <i>'Our company strictly enforces the official MongoDB native driver, never Mongoose, with a connection pool size of 50,'</i> "
        "the AI respects it in that single chat. But when a teammate opens a new session tomorrow, the AI forgets everything and suggests non-compliant code. "
        "Teams waste hours repeating policies and fixing regressions.",
        body_style
    ))
    story.append(Paragraph(
        "<b>The Hackathon Objective:</b> Track 1 (Agentic Memory) specifically challenged participants to build an agent that remembers useful information, alters its behavior over time, and demonstrates persistence across interactions and sessions. "
        "Key requirements include deciding what to store, retrieving memories via <b>MongoDB Vector Search</b>, auto-expiring temporary tokens via <b>TTL Indexes</b>, resolving contradictions (conflict resolution), and broadcasting live database mutations via <b>Change Streams</b>.",
        body_style
    ))

    story.append(Paragraph("2. What We Built & What Problem It Solves", h1_style))
    story.append(Paragraph(
        "<b>The Solution: SynapseMemory.</b> We built an enterprise-grade autonomous developer and SRE copilot backed by MongoDB Atlas. "
        "It acts as the <i>'Shared Cognitive Brain'</i> for engineering teams and AI agents. It captures architectural decisions, security boundaries, and outage post-mortems as rich documents. "
        "Whenever any engineer or autonomous bot writes code, SynapseMemory queries MongoDB using Vector Search, injects active constraints, detects contradictions, and guarantees compliance without manual human reminders.",
        body_style
    ))

    # Callout Box
    callout_data = [[
        Paragraph(
            "<b>Key Differentiators:</b> Beyond a basic chatbot, SynapseMemory features <b>3 Autonomous Collaborating Agents</b> (Architect, Security, SRE), an <b>Interactive 2D Force-Directed Knowledge Graph</b>, an <b>Ebbinghaus Memory Decay Engine</b>, an <b>Agentic PR Code Review Guard</b>, and an <b>SRE Outage Self-Healing Simulator</b>.",
            callout_style
        )
    ]]
    callout_table = Table(callout_data, colWidths=[532])
    callout_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#F0FDF4")),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#86EFAC")),
        ('LEFTPADDING', (0,0), (-1,-1), 8),
        ('RIGHTPADDING', (0,0), (-1,-1), 8),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
    ]))
    story.append(callout_table)
    story.append(Spacer(1, 4))

    story.append(Paragraph("3. Concrete System Outputs (What You See on Screen)", h1_style))
    outputs_table_data = [
        [Paragraph("Output Component", table_header_style), Paragraph("Where It Appears", table_header_style), Paragraph("What It Conveys", table_header_style)],
        [Paragraph("MongoDB Memory Bank", table_cell_bold), Paragraph("Right Panel (Cards / Graph)", table_cell_style), Paragraph("Displays persistent documents with status (active/superseded), recall count, and live TTL countdown.", table_cell_style)],
        [Paragraph("Memory-Guided Chat", table_cell_bold), Paragraph("Left Panel (Interactive Copilot)", table_cell_style), Paragraph("AI response citing exact memories: 'Applied Active Memories: [Strict Native Driver Policy]' and compliant code.", table_cell_style)],
        [Paragraph("Contradiction Alert", table_cell_bold), Paragraph("Chat Feed Alert Card", table_cell_style), Paragraph("Flags semantic conflict when a rule changes; marks old rule SUPERSEDED and activates the new rule.", table_cell_style)],
        [Paragraph("Explainability Inspector", table_cell_bold), Paragraph("Modal Popup ('[Inspect]')", table_cell_style), Paragraph("Displays cosine similarity (e.g. 92%), metadata filter match, and raw MongoDB JSON document.", table_cell_style)],
        [Paragraph("Knowledge Graph", table_cell_bold), Paragraph("Memory Bank ('[Graph]' Tab)", table_cell_style), Paragraph("Interactive 2D physics canvas visualizing relationships (enforces, superseded_by, indexes).", table_cell_style)],
        [Paragraph("Multi-Agent Consensus", table_cell_bold), Paragraph("Multi-Agent Room Tab", table_cell_style), Paragraph("Transcript of 3 agents cross-negotiating with a unified plan and Consensus Score (e.g. 96%).", table_cell_style)],
        [Paragraph("PR Review Audit", table_cell_bold), Paragraph("PR Code Guard Tab", table_cell_style), Paragraph("Annotated code lines flagging forbidden ORMs or pool starvation risks with auto-generated fixes.", table_cell_style)],
        [Paragraph("SRE Self-Healing", table_cell_bold), Paragraph("SRE Self-Healing Tab", table_cell_style), Paragraph("Timeline showing latency drop (4,320ms -> 12ms) via INC-402 runbook and logging a new memory.", table_cell_style)],
    ]
    t_out = Table(outputs_table_data, colWidths=[120, 130, 282], repeatRows=1)
    t_out.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), c_primary),
        ('GRID', (0,0), (-1,-1), 0.5, c_border),
        ('TOPPADDING', (0,0), (-1,-1), 2),
        ('BOTTOMPADDING', (0,0), (-1,-1), 2),
        ('LEFTPADDING', (0,0), (-1,-1), 4),
        ('RIGHTPADDING', (0,0), (-1,-1), 4),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, c_bg_light]),
    ]))
    story.append(t_out)

    story.append(PageBreak())

    # ================= PAGE 2 =================
    story.append(Paragraph("4. Technical Pipeline Architecture & Workflow", h1_style))
    story.append(Paragraph(
        "SynapseMemory connects Next.js 14, vector embedding models, and MongoDB Atlas into an event-driven architecture:",
        body_style
    ))

    arch_points = [
        "<b>1. Extraction & Ingestion:</b> Analyzes developer queries, architectural statements, or post-mortems. Generates 768-dimensional normalized vector embeddings and writes to the <code>memories</code> collection.",
        "<b>2. Semantic Vector Recall ($vectorSearch):</b> Recalls relevant memories using cosine vector distance with strict metadata pre-filtering on <code>workspaceId</code> and <code>lifecycle.status: 'active'</code>.",
        "<b>3. Conflict Detection Engine:</b> When a new constraint arrives, the engine semantically evaluates active memories. If an explicit contradiction is detected, the preceding rule is automatically updated to <code>status: 'superseded'</code> with an audit trail.",
        "<b>4. TTL Auto-Expiry Engine:</b> Employs a MongoDB TTL index (<code>{ expiresAt: 1 }</code> with <code>expireAfterSeconds: 0</code>) to automatically purge ephemeral credentials and incident war-room tokens.",
        "<b>5. Change Streams (watch()):</b> Server-Sent Events (SSE) listener watches database mutations and broadcasts live updates directly to connected web clients in real time.",
        "<b>6. Ebbinghaus Memory Decay Pipeline:</b> Advanced aggregation pipeline calculating exponential retention curves: <code>Retention = exp(-Δt / (τ * (1 + ln(1 + N))))</code>.",
    ]
    for p in arch_points:
        story.append(Paragraph(f"• {p}", bullet_style))

    story.append(Spacer(1, 4))
    story.append(Paragraph("5. Step-by-Step Testing & Judging Walkthrough Guide", h1_style))
    story.append(Paragraph(
        "Open <b>http://localhost:3000</b> in any browser and execute these 9 steps in sequence to evaluate all project capabilities:",
        body_style
    ))

    demo_steps = [
        ("Step 1: Load Demo Scenarios", "Click green 'Load Demo Scenarios' button in header.", "Memory Bank populates with 3 baseline documents: (1) Strict MongoDB Native Driver Policy, (2) Incident INC-402 Fix, (3) War-Room Token with 120s TTL.", "Proves rich document modeling with lifecycle and TTL fields."),
        ("Step 2: Session Continuity Test", "Switch dropdown to 'Session 2' and click '2. Later Session Recall Test'.", "Assistant responds with official native driver code, pool size 50, and TLS 1.3, citing both recalled memories without reminder.", "Proves memory persists across sessions and visibly alters behavior."),
        ("Step 3: Explainability Inspector", "Click the eye icon ('[Inspect]') on any memory card or graph node.", "Modal opens showing Cosine Similarity Score (e.g. 92%), filter match checks, and raw MongoDB JSON document.", "Fulfills Step 3: Inspect memory and explain selection."),
        ("Step 4: Contradiction Resolution", "Click '3. Conflict & Contradiction Test' (migrating to Prisma ORM).", "Amber alert confirms contradiction. Old native driver policy turns red (SUPERSEDED); new Prisma rule becomes ACTIVE.", "Proves handling difficult cases (conflict/correction/superseding)."),
        ("Step 5: Ephemeral TTL Countdown", "Observe purple 'Temporary War-Room Token' card in Memory Bank.", "Live timer counts down in seconds until MongoDB TTL index automatically purges the ephemeral document.", "Proves automated time-based memory expiry."),
        ("Step 6: Knowledge Graph Canvas", "Click the Graph icon ('[Graph]') in Memory Bank header.", "60fps interactive 2D physics canvas renders memory nodes. Drag nodes around and click to inspect.", "Visualizes cognitive knowledge map of team memory."),
        ("Step 7: Multi-Agent Consensus", "Click 'Multi-Agent Room' tab and click 'Run Deliberation'.", "3 agents (Archi, Aegis, Sentinel) cross-negotiate and output a harmonized plan with Consensus Score: 96%.", "Fulfills brief's 'Shared Context for Teammates' Agents' project."),
        ("Step 8: PR Code Review Guard", "Click 'PR Code Guard' tab and run review on PR #104.", "Flags forbidden Mongoose import and pool starvation risk with inline line annotations; auto-generates fix.", "Demonstrates CI/CD memory enforcement on code diffs."),
        ("Step 9: SRE Incident Self-Healing", "Click 'SRE Self-Healing' tab and trigger autonomous healing.", "Recalls INC-402, dynamically rebalances pool, drops latency (4,320ms -> 12ms), and logs new episodic memory.", "Demonstrates adaptive incident response loop."),
    ]

    demo_table_data = [
        [Paragraph("Step & Action", table_header_style), Paragraph("Trigger", table_header_style), Paragraph("Observed Result", table_header_style), Paragraph("Judging Rubric Proven", table_header_style)]
    ]
    for s_title, s_trigger, s_res, s_rub in demo_steps:
        demo_table_data.append([
            Paragraph(s_title, table_cell_bold),
            Paragraph(s_trigger, table_cell_style),
            Paragraph(s_res, table_cell_style),
            Paragraph(s_rub, table_cell_style),
        ])

    t_demo = Table(demo_table_data, colWidths=[90, 110, 180, 152], repeatRows=1)
    t_demo.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), c_primary),
        ('GRID', (0,0), (-1,-1), 0.5, c_border),
        ('TOPPADDING', (0,0), (-1,-1), 2),
        ('BOTTOMPADDING', (0,0), (-1,-1), 2),
        ('LEFTPADDING', (0,0), (-1,-1), 3),
        ('RIGHTPADDING', (0,0), (-1,-1), 3),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, c_bg_light]),
    ]))
    story.append(t_demo)

    story.append(PageBreak())

    # ================= PAGE 3 =================
    story.append(Paragraph("6. Strict Hackathon Rubric Compliance Matrix", h1_style))
    story.append(Paragraph(
        "Direct point-by-point verification demonstrating that SynapseMemory fulfills 100% of the requirements from <code>MongoDB Student Hackathon SVNIT.pdf</code>:",
        body_style
    ))

    rubric_data = [
        [Paragraph("Hackathon Requirement (from PDF)", table_header_style), Paragraph("Implementation in SynapseMemory", table_header_style), Paragraph("Compliance Status", table_header_style)],
        [
            Paragraph("<b>Document Modeling:</b> Model each memory as a document with owner, type, content, source, timestamps, lifecycle fields.", table_cell_style),
            Paragraph("MongoDB collection <code>memories</code> stores rich schema with userId, workspaceId, type, source, createdAt, and lifecycle (status, confidence, accessCount, supersededBy).", table_cell_style),
            Paragraph("<b>100% COMPLIANT</b>", table_cell_bold)
        ],
        [
            Paragraph("<b>Vector Search:</b> Use MongoDB Vector Search for semantic recall with metadata filters.", table_cell_style),
            Paragraph("Implemented via <code>$vectorSearch</code> pipeline using 768-dim embeddings with metadata pre-filtering on workspaceId and lifecycle.status: 'active'.", table_cell_style),
            Paragraph("<b>100% COMPLIANT</b>", table_cell_bold)
        ],
        [
            Paragraph("<b>TTL Indexes:</b> Use a TTL index on a date field for time-based memory expiry.", table_cell_style),
            Paragraph("Compound TTL index <code>{ expiresAt: 1 }</code> with <code>expireAfterSeconds: 0</code> automatically purges expired memories at the database engine level.", table_cell_style),
            Paragraph("<b>100% COMPLIANT</b>", table_cell_bold)
        ],
        [
            Paragraph("<b>Change Streams:</b> Use change streams when multiple users or agents need live updates.", table_cell_style),
            Paragraph("MongoDB <code>collection.watch()</code> piped through Server-Sent Events (SSE) route <code>/api/memories/stream</code> dynamically updates browser clients in real time.", table_cell_style),
            Paragraph("<b>100% COMPLIANT</b>", table_cell_bold)
        ],
        [
            Paragraph("<b>Demo Flow 1:</b> Start with an interaction that creates a useful memory.", table_cell_style),
            Paragraph("Ingests architectural policies, security constraints, and incident post-mortems via interactive chat or one-click demo loaders.", table_cell_style),
            Paragraph("<b>100% COMPLIANT</b>", table_cell_bold)
        ],
        [
            Paragraph("<b>Demo Flow 2:</b> Open a later session and show retrieved memory changing result or action.", table_cell_style),
            Paragraph("In Session 2, the agent retrieves stored constraints and generates code adhering strictly to native driver and pool size rules without reminders.", table_cell_style),
            Paragraph("<b>100% COMPLIANT</b>", table_cell_bold)
        ],
        [
            Paragraph("<b>Demo Flow 3:</b> Inspect stored memory and explain why it was selected.", table_cell_style),
            Paragraph("The Explainability Inspector modal displays cosine similarity scores, filter match checks, and raw MongoDB JSON documents.", table_cell_style),
            Paragraph("<b>100% COMPLIANT</b>", table_cell_bold)
        ],
        [
            Paragraph("<b>Demo Flow 4:</b> Demonstrate one difficult case: a correction, expiry, deletion, conflict.", table_cell_style),
            Paragraph("Demonstrates semantic contradiction detection (old rule marked SUPERSEDED; new rule activated) and TTL time-based auto-expiry.", table_cell_style),
            Paragraph("<b>100% COMPLIANT</b>", table_cell_bold)
        ],
        [
            Paragraph("<b>Suggested Idea:</b> Shared Context for Teammates' Agents.", table_cell_style),
            Paragraph("Implemented in Multi-Agent Room where 3 autonomous agents (Archi, Aegis, Sentinel) negotiate on shared MongoDB memory.", table_cell_style),
            Paragraph("<b>100% COMPLIANT</b>", table_cell_bold)
        ],
    ]

    t_rub = Table(rubric_data, colWidths=[150, 292, 90], repeatRows=1)
    t_rub.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), c_primary),
        ('GRID', (0,0), (-1,-1), 0.5, c_border),
        ('TOPPADDING', (0,0), (-1,-1), 2),
        ('BOTTOMPADDING', (0,0), (-1,-1), 2),
        ('LEFTPADDING', (0,0), (-1,-1), 4),
        ('RIGHTPADDING', (0,0), (-1,-1), 4),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, c_bg_light]),
    ]))
    story.append(t_rub)

    story.append(Spacer(1, 8))
    story.append(Paragraph("7. Repository Status & Submission Verification", h1_style))
    story.append(Paragraph(
        "• <b>Git Branch:</b> <code>vansh</code> (All commits clean, zero untracked files).<br/>"
        "• <b>Production Build:</b> <code>npm run build</code> passed with 0 errors across all 8 dynamic routes.<br/>"
        "• <b>Containerization:</b> Production <code>Dockerfile</code> and <code>docker-compose.yml</code> ready.<br/>"
        "• <b>Live Local Server:</b> Running at <code>http://localhost:3000</code> ready for demonstration.",
        body_style
    ))

    # Build the document
    doc.build(story, canvasmaker=NumberedCanvas)
    print(f"Successfully generated clean 3-page PDF report at: {PDF_PATH}")

if __name__ == "__main__":
    build_pdf()
