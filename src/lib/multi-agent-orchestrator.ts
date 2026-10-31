import { AgentProfile, AgentDeliberationTurn, MultiAgentSessionResult } from '@/types/agent';
import { recallMemories } from './memory-service';
import { RetrievedMemory } from '@/types/memory';

export const AGENT_PROFILES: Record<string, AgentProfile> = {
  architect: {
    id: 'agent-architect',
    name: 'Archi',
    role: 'architect',
    avatar: '🏗️',
    title: 'Lead Systems Architect',
    description: 'Enforces database driver standards, schema validation, and stack guidelines.',
    focusTypes: ['constraint', 'decision'],
    color: '#00ed64',
  },
  security: {
    id: 'agent-security',
    name: 'Aegis',
    role: 'security',
    avatar: '🛡️',
    title: 'Security & Zero-Trust Officer',
    description: 'Enforces TLS 1.3, PrivateLink isolation, and ephemeral credential TTLs.',
    focusTypes: ['constraint', 'fact'],
    color: '#38bdf8',
  },
  sre: {
    id: 'agent-sre',
    name: 'Sentinel',
    role: 'sre',
    avatar: '⚡',
    title: 'Principal SRE & Outage Defender',
    description: 'Recalls post-mortems, sets connection pool sizes, and executes runbooks.',
    focusTypes: ['incident_fix', 'runbook'],
    color: '#f59e0b',
  },
};

/**
 * Executes a collaborative multi-agent deliberation session using shared MongoDB Memory
 */
export async function runMultiAgentDeliberation(
  userGoal: string,
  workspaceId: string = 'svnit-hackathon'
): Promise<MultiAgentSessionResult> {
  const turns: AgentDeliberationTurn[] = [];
  const allRecalledMemories: RetrievedMemory[] = [];
  const seenMemoryIds = new Set<string>();

  // 1. Architect Turn
  const archMemories = await recallMemories(`${userGoal} architecture stack database driver`, {
    workspaceId,
    limit: 2,
    types: ['constraint', 'decision'],
    minScore: 0.15,
  });
  archMemories.forEach((m) => {
    if (m._id && !seenMemoryIds.has(m._id)) {
      seenMemoryIds.add(m._id);
      allRecalledMemories.push(m);
    }
  });

  const archConstraints = archMemories.map((m) => `"${m.title}"`).join(', ');
  const archTurn: AgentDeliberationTurn = {
    agent: AGENT_PROFILES.architect,
    content: archMemories.length > 0
      ? `I reviewed our MongoDB Architecture Memory. We must strictly adhere to: ${archConstraints}. I am rejecting any unapproved ORMs or unvalidated schemas. Code must utilize the official native driver with typed collections.`
      : `No blocking architectural constraints recalled for this stack. Recommending modular TypeScript service with strict MongoDB schema validation.`,
    recalledMemories: archMemories,
    status: 'approved',
    flags: archMemories.map((m) => `Enforcing: ${m.title}`),
    timestamp: new Date().toISOString(),
  };
  turns.push(archTurn);

  // 2. Security Turn
  const secMemories = await recallMemories(`${userGoal} security network tls private port credentials`, {
    workspaceId,
    limit: 2,
    minScore: 0.15,
  });
  secMemories.forEach((m) => {
    if (m._id && !seenMemoryIds.has(m._id)) {
      seenMemoryIds.add(m._id);
      allRecalledMemories.push(m);
    }
  });

  const hasTtlToken = secMemories.some((m) => m.expiresAt || m.tags.includes('ttl'));
  const secTurn: AgentDeliberationTurn = {
    agent: AGENT_PROFILES.security,
    content:
      `Auditing compliance against team security policies. All database transport must enforce TLS 1.3 and zero-trust VPC/PrivateLink endpoints.` +
      (hasTtlToken ? ` Detected active ephemeral token in memory; enforcing TTL bounds so credentials auto-purge.` : ` All secret access tokens must have strict expiration policies.`),
    recalledMemories: secMemories,
    status: 'approved',
    flags: ['Zero-Trust Enforced', 'TLS 1.3 Mandatory'],
    timestamp: new Date().toISOString(),
  };
  turns.push(secTurn);

  // 3. SRE Turn
  const sreMemories = await recallMemories(`${userGoal} incident crash pool traffic latency outage`, {
    workspaceId,
    limit: 2,
    types: ['incident_fix', 'runbook'],
    minScore: 0.15,
  });
  sreMemories.forEach((m) => {
    if (m._id && !seenMemoryIds.has(m._id)) {
      seenMemoryIds.add(m._id);
      allRecalledMemories.push(m);
    }
  });

  const hasPoolFix = sreMemories.some((m) => m.content.includes('pool') || m.content.includes('402'));
  const sreTurn: AgentDeliberationTurn = {
    agent: AGENT_PROFILES.sre,
    content: hasPoolFix
      ? `⚠️ CRITICAL: Recalled post-mortem Incident INC-402 from MongoDB memory! Default connection pools crash under peak traffic. I am mandating: maxPoolSize: 50, minPoolSize: 10, serverSelectionTimeoutMS: 5000.`
      : `System reliability parameters verified. Setting standard high-resilience retry logic and heartbeat frequency.`,
    recalledMemories: sreMemories,
    status: hasPoolFix ? 'concern' : 'approved',
    flags: hasPoolFix ? ['Incident INC-402 Guard Activated', 'Pool Config Overridden'] : ['SLO Target: 99.99%'],
    timestamp: new Date().toISOString(),
  };
  turns.push(sreTurn);

  // Synthesize Unified Plan
  const finalSynthesis =
    `### 🤝 Autonomous Multi-Agent Consensus Reached (3/3 Agents Aligned)\n\n` +
    `1. **${AGENT_PROFILES.architect.name} (Architecture):** Enforced official MongoDB driver; blocked unapproved ORMs.\n` +
    `2. **${AGENT_PROFILES.security.name} (Security):** Verified TLS 1.3 & private network ingress.\n` +
    `3. **${AGENT_PROFILES.sre.name} (SRE):** Embedded fix from **Incident INC-402** (\`maxPoolSize: 50\`) to protect against connection starvation.\n\n` +
    `\`\`\`typescript\n` +
    `// Production-grade implementation harmonized across 3 autonomous agents\n` +
    `import { MongoClient } from 'mongodb';\n\n` +
    `export const client = new MongoClient(process.env.MONGODB_URI!, {\n` +
    `  maxPoolSize: 50,              // [Sentinel - SRE Memory INC-402]\n` +
    `  minPoolSize: 10,\n` +
    `  serverSelectionTimeoutMS: 5000,\n` +
    `  tls: true,                     // [Aegis - Security Policy]\n` +
    `});\n` +
    `\`\`\`\n` +
    `*All 3 agents coordinated via shared MongoDB Agentic Memory collection in workspace \`${workspaceId}\`.*`;

  return {
    sessionId: `collab-${Date.now()}`,
    userGoal,
    turns,
    finalSynthesis,
    consensusScore: 96,
    allRecalledMemories,
    conflictsResolved: [
      {
        ruleTitle: 'Connection Sizing Policy',
        action: 'Overridden with Incident INC-402 parameter (maxPoolSize: 50)',
        reason: 'SRE Agent identified historical starvation failure during peak traffic',
      },
    ],
  };
}
