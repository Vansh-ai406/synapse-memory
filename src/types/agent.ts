import { MemoryDocument, RetrievedMemory, MemoryType } from './memory';

export type AgentRole = 'architect' | 'security' | 'sre' | 'developer';

export interface AgentProfile {
  id: string;
  name: string;
  role: AgentRole;
  avatar: string;
  title: string;
  description: string;
  focusTypes: MemoryType[];
  color: string;
}

export interface AgentDeliberationTurn {
  agent: AgentProfile;
  content: string;
  recalledMemories: RetrievedMemory[];
  createdOrUpdatedMemories?: MemoryDocument[];
  flags?: string[];
  status: 'approved' | 'concern' | 'blocked' | 'neutral';
  timestamp: string;
}

export interface MultiAgentSessionResult {
  sessionId: string;
  userGoal: string;
  turns: AgentDeliberationTurn[];
  finalSynthesis: string;
  consensusScore: number; // 0 - 100
  allRecalledMemories: RetrievedMemory[];
  conflictsResolved: Array<{
    ruleTitle: string;
    action: string;
    reason: string;
  }>;
}

export interface MemoryDecayMetric {
  memoryId: string;
  title: string;
  type: string;
  rawSimilarity: number;
  retentionScore: number; // 0.0 - 1.0 (Ebbinghaus decay curve)
  halfLifeHours: number;
  ageHours: number;
  accessCount: number;
  reinforcementLevel: 'high' | 'moderate' | 'decaying' | 'critical';
  lastAccessedAt: string;
}

export interface DecayAnalyticsReport {
  overallHealthScore: number;
  totalActive: number;
  decayingCount: number;
  reinforcedCount: number;
  memoriesWithScores: MemoryDecayMetric[];
}
