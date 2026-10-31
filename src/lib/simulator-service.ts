import { recallMemories, storeMemory } from './memory-service';
import { CodeReviewResult, CodeReviewFinding, IncidentResolutionReport, IncidentStep } from '@/types/simulator';

/**
 * Reviews code diff or snippet against stored MongoDB architecture and security constraints.
 */
export async function reviewCodeAgainstMemory(
  code: string,
  workspaceId: string = 'svnit-hackathon'
): Promise<CodeReviewResult> {
  const activeConstraints = await recallMemories(code, {
    workspaceId,
    limit: 6,
    minScore: 0.15,
  });

  const findings: CodeReviewFinding[] = [];
  const lines = code.split('\n');

  // Check 1: Check for forbidden Mongoose or unapproved ORMs
  const nativeDriverPolicy = activeConstraints.find(
    (c) =>
      c.title.toLowerCase().includes('native driver') ||
      c.content.toLowerCase().includes('mongoose') ||
      c.type === 'constraint'
  );

  if (nativeDriverPolicy) {
    lines.forEach((line, idx) => {
      if (line.includes('mongoose') || line.includes('from "mongoose"') || line.includes("from 'mongoose'")) {
        findings.push({
          id: `find-${idx}-orm`,
          severity: 'error',
          title: 'Forbidden ORM / Mongoose Import',
          description: `Code imports 'mongoose', violating team policy "${nativeDriverPolicy.title}". Our architecture strictly mandates the official MongoDB native driver for high throughput and zero abstraction overhead.`,
          lineNumber: idx + 1,
          violatedMemory: nativeDriverPolicy,
          suggestedFix: "import { MongoClient, Db } from 'mongodb';",
        });
      }
    });
  }

  // Check 2: Check for connection pool starvation risk (Incident INC-402)
  const poolPolicy = activeConstraints.find(
    (c) =>
      c.content.toLowerCase().includes('pool') ||
      c.title.toLowerCase().includes('inc-402') ||
      c.tags.includes('mongodb-pool')
  );

  if (poolPolicy) {
    const hasMongoClient = code.includes('MongoClient');
    const hasPoolSizeConfig = code.includes('maxPoolSize');

    if (hasMongoClient && !hasPoolSizeConfig) {
      findings.push({
        id: 'find-pool-starvation',
        severity: 'error',
        title: 'Connection Pool Starvation Risk (Incident INC-402 Violation)',
        description: `MongoClient initialized without specifying 'maxPoolSize'. Team incident post-mortem "${poolPolicy.title}" proved that default pools saturate and crash under traffic spikes. Mandate 'maxPoolSize: 50' and 'minPoolSize: 10'.`,
        lineNumber: lines.findIndex((l) => l.includes('MongoClient')) + 1 || 1,
        violatedMemory: poolPolicy,
        suggestedFix: 'const client = new MongoClient(uri, { maxPoolSize: 50, minPoolSize: 10, serverSelectionTimeoutMS: 5000 });',
      });
    }
  }

  // Check 3: Check for insecure TLS or unencrypted transport
  if (code.includes('tls: false') || code.includes('ssl: false')) {
    const secPolicy = activeConstraints.find((c) => c.tags.includes('security')) || activeConstraints[0];
    findings.push({
      id: 'find-tls-disabled',
      severity: 'error',
      title: 'Insecure Database Transport (TLS Disabled)',
      description: 'Connection options explicitly disable TLS/SSL encryption, violating corporate zero-trust network policy.',
      lineNumber: lines.findIndex((l) => l.includes('tls: false') || l.includes('ssl: false')) + 1 || 1,
      violatedMemory: secPolicy,
      suggestedFix: 'tls: true,',
    });
  }

  // Calculate score
  const passed = findings.filter((f) => f.severity === 'error').length === 0;
  const score = passed ? 100 : Math.max(20, 100 - findings.length * 30);

  const compliantCode = `import { MongoClient, Db } from 'mongodb';

// Compliant with team policies and past post-mortem INC-402
const client = new MongoClient(process.env.MONGODB_URI!, {
  maxPoolSize: 50,              // [INC-402 Fix: Prevents connection starvation]
  minPoolSize: 10,
  serverSelectionTimeoutMS: 5000,
  tls: true,                     // [Security Policy: Enforce TLS 1.3]
});

export async function getDatabase(): Promise<Db> {
  return client.db('production_db');
}
`;

  return {
    passed,
    score,
    totalChecks: 3,
    findings,
    compliantCode,
    evaluatedMemories: activeConstraints,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Simulates an autonomous SRE incident diagnosis & runbook execution based on historical memory.
 */
export async function simulateIncidentRemediation(
  incidentType: string = 'connection_pool_exhaustion',
  workspaceId: string = 'svnit-hackathon'
): Promise<IncidentResolutionReport> {
  // Query MongoDB memory for past incident fixes
  const incidentMemories = await recallMemories('incident crash connection pool saturation 402 outage', {
    workspaceId,
    limit: 3,
    types: ['incident_fix', 'runbook'],
    minScore: 0.15,
  });

  const matchingIncident = incidentMemories[0];

  const steps: IncidentStep[] = [
    {
      stepIndex: 1,
      phase: 'detection',
      title: 'CRITICAL ALERT: Connection Pool Exhaustion & Latency Spike',
      detail: 'Synthetic latency monitor detected 504 Gateway Timeouts on /api/checkout. Active MongoDB connection pool reached 100% saturation (5/5 default pool slots exhausted).',
      timestamp: '16:40:02',
      metrics: {
        latencyMs: 4320,
        poolUtilizationPct: 100,
        activeConnections: 5,
      },
    },
    {
      stepIndex: 2,
      phase: 'memory_recall',
      title: 'Consulting MongoDB Agentic Memory Bank for Precedents',
      detail: `SRE Agent queried MongoDB vector search for 'connection pool saturation'. Recalled high-confidence precedent: "${matchingIncident ? matchingIncident.title : 'Incident INC-402: Connection Pool Starvation Fix'}".`,
      timestamp: '16:40:04',
      recalledMemory: matchingIncident,
    },
    {
      stepIndex: 3,
      phase: 'root_cause',
      title: 'Root Cause Diagnosed: Configuration Under-Provisioning',
      detail: 'Service was deployed with default MongoClient poolSize=5. Spike traffic from promotional flash sale overwhelmed queue, triggering cascade timeouts identical to Diwali traffic incident.',
      timestamp: '16:40:06',
    },
    {
      stepIndex: 4,
      phase: 'remediation',
      title: 'Executing Tested Runbook: Dynamic Pool Resize & Rebalance',
      detail: 'Applied validated remediation from historical memory: Injected maxPoolSize: 50, minPoolSize: 10, serverSelectionTimeoutMS: 5000 into connection pool parameters and reconnected client.',
      timestamp: '16:40:09',
      metrics: {
        latencyMs: 85,
        poolUtilizationPct: 42,
        activeConnections: 21,
      },
    },
    {
      stepIndex: 5,
      phase: 'verification',
      title: 'SLO Restored & Self-Healing Verified',
      detail: 'Connection latency dropped from 4,320ms to 12ms. Zero 504 errors detected across last 1,000 requests. System health green.',
      timestamp: '16:40:12',
      metrics: {
        latencyMs: 12,
        poolUtilizationPct: 24,
        activeConnections: 12,
      },
    },
  ];

  // Log new operational memory document into MongoDB
  const newMemory = await storeMemory({
    workspaceId,
    userId: 'Sentinel-SRE-Bot',
    type: 'incident_fix',
    title: `Remediated Outage: ${incidentType.replace(/_/g, ' ')}`,
    content: `Autonomously remediated connection pool exhaustion by recalling and executing runbook INC-402 (applied maxPoolSize: 50). Latency restored to 12ms.`,
    summary: 'Autonomously applied INC-402 pool fix; verified latency drop to 12ms.',
    tags: ['incident', 'sre', 'self-healing', 'automated'],
    source: {
      sessionId: 'sre-outage-session',
      author: 'Sentinel SRE Bot',
      rawText: 'Automated self-healing triggered from MongoDB Agentic Memory.',
    },
  });

  return {
    incidentId: `INC-${Date.now().toString().slice(-4)}`,
    title: 'MongoDB Connection Pool Starvation under Traffic Spike',
    severity: 'P1-CRITICAL',
    status: 'resolved',
    steps,
    appliedFix: 'Configured maxPoolSize: 50, minPoolSize: 10, serverSelectionTimeoutMS: 5000',
    newMemoryLogged: newMemory.memory,
  };
}

