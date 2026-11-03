export type MemoryType = 
  | 'constraint' 
  | 'preference' 
  | 'decision' 
  | 'incident_fix' 
  | 'runbook' 
  | 'fact'
  | 'feedback';

export type MemoryStatus = 'active' | 'superseded' | 'deprecated' | 'expired';

export type MemoryPrivacy = 'team' | 'private';

export interface MemorySource {
  sessionId?: string;
  turnIndex?: number;
  rawText?: string;
  author?: string;
}

export interface MemoryLifecycle {
  status: MemoryStatus;
  confidence: number;
  accessCount: number;
  lastAccessedAt: string;
  supersededBy?: string | null;
  supersededReason?: string | null;
  conflictReason?: string | null;
}

export interface MemoryDocument {
  _id?: string;
  workspaceId: string;
  userId: string;
  agentId: string;
  type: MemoryType;
  title: string;
  content: string;
  summary: string;
  embedding?: number[];
  source: MemorySource;
  lifecycle: MemoryLifecycle;
  privacy: MemoryPrivacy;
  tags: string[];
  expiresAt?: Date | string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RetrievedMemory extends MemoryDocument {
  similarityScore?: number;
  retrievalReason?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  retrievedMemories?: RetrievedMemory[];
  createdMemories?: MemoryDocument[];
  detectedConflict?: {
    previousMemory: MemoryDocument;
    newMemoryContent: string;
    explanation: string;
  };
}

export interface ConflictRecord {
  _id?: string;
  workspaceId: string;
  previousMemoryId: string;
  newMemoryContent: string;
  reason: string;
  status: 'pending' | 'resolved' | 'rejected';
  createdAt: string;
}

