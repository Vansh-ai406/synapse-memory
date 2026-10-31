import { RetrievedMemory, MemoryDocument } from './memory';

export interface CodeReviewFinding {
  id: string;
  severity: 'error' | 'warning' | 'info';
  title: string;
  description: string;
  lineNumber?: number;
  violatedMemory: RetrievedMemory;
  suggestedFix?: string;
}

export interface CodeReviewResult {
  passed: boolean;
  score: number; // 0 - 100
  totalChecks: number;
  findings: CodeReviewFinding[];
  compliantCode?: string;
  evaluatedMemories: RetrievedMemory[];
  timestamp: string;
}

export interface IncidentStep {
  stepIndex: number;
  phase: 'detection' | 'memory_recall' | 'root_cause' | 'remediation' | 'verification';
  title: string;
  detail: string;
  timestamp: string;
  recalledMemory?: RetrievedMemory;
  metrics?: {
    latencyMs: number;
    poolUtilizationPct: number;
    activeConnections: number;
  };
}

export interface IncidentResolutionReport {
  incidentId: string;
  title: string;
  severity: 'P1-CRITICAL' | 'P2-HIGH' | 'P3-MEDIUM';
  status: 'mitigated' | 'investigating' | 'resolved';
  steps: IncidentStep[];
  appliedFix: string;
  newMemoryLogged?: MemoryDocument;
}
