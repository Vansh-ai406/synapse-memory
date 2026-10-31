/** Shared API types mirroring the RecallOS FastAPI backend contract. */

export type ChatProvider = 'gemini' | 'local' | 'template'
export type RetrievalMode = 'vector' | 'exact' | 'error'
export type MemoryPath = 'vector' | 'always-load' | 'exact-scan'
export type MemoryStatus = 'active' | 'superseded' | 'deleted'
export type ChangeAction =
  | 'created'
  | 'supersede'
  | 'copied'
  | 'skipped_duplicate'
  | 'skipped_sensitive'
  | 'deleted'
export type FeedbackRating =
  | 'helpful'
  | 'not_helpful'
  | 'too_complicated'
  | 'too_detailed'
  | 'incorrect'
  | 'not_relevant'
/** May grow server-side; backend sends its own labels. */
export type MemoryTypeLabel = string

/** Memory document — matches the schema in AGENTS.md. */
export interface MemoryDoc {
  id: string
  memory_type: MemoryTypeLabel
  content: string
  context?: string | null
  importance?: number | null
  confidence?: number | null
  status?: MemoryStatus | string
  reason?: string | null
  source?: string | { session_id?: string; message_id?: string } | null
  created_at?: string | null
  updated_at?: string | null
  last_used_at?: string | null
  expires_at?: string | null
  supersedes?: string | null
  /** Optional convenience flag if the backend ever sends it. */
  pinned?: boolean
}

/** One retrieved memory plus its scoring/story. */
export interface RetrievedMemory {
  memory: MemoryDoc
  similarity: number | null
  score: number | null
  why?: string | null
  path: MemoryPath | string
}

/** A memory lifecycle change reported by the agent after a chat turn. */
export interface MemoryChange {
  action: ChangeAction | string
  memory?: MemoryDoc | null
  previous?: MemoryDoc | null
  reason?: string | null
}

export interface ChatResponse {
  conversation_id: string
  message_id: string
  reply: string
  provider: ChatProvider | string
  retrieval_mode: RetrievalMode | string
  retrieved: RetrievedMemory[]
  changes: MemoryChange[]
  clarification?: string | null
}

export interface ChatInput {
  message: string
  conversation_id?: string | null
  use_memory?: boolean
}

export interface FeedbackInput {
  message_id: string
  rating: FeedbackRating
  note?: string
}

export interface AuthUser {
  id: string
  name: string
  email: string
  memory_paused?: boolean
}

export interface AuthResponse {
  token: string
  user: AuthUser
}

export interface MemoryLookupResult {
  memory: MemoryDoc
  similarity?: number | null
  score?: number | null
  why?: string | null
  path?: MemoryPath | string | null
}

export interface ForgetResult {
  deleted: number | boolean
  reason?: string | null
}

export interface DashboardStats {
  total_memories: number
  active_memories: number
  superseded_memories: number
  /** Shape may be a map of type→count, a list of labels, or a number. */
  categories: Record<string, number> | MemoryTypeLabel[] | number | null
  expiring_soon: number
  conversation_count: number
  growth: unknown
}

export interface SimulationStep {
  role: 'user' | 'feedback'
  content?: string
  rating?: FeedbackRating
  note?: string
}

export interface Simulation {
  id: string
  title: string
  description: string
  steps: SimulationStep[]
}

export interface CreateMemoryInput {
  content: string
  memory_type: MemoryTypeLabel
  context?: string
  expires_at?: string | null
}
