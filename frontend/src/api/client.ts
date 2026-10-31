import type {
  AuthResponse,
  AuthUser,
  ChatInput,
  ChatResponse,
  CreateMemoryInput,
  DashboardStats,
  FeedbackInput,
  ForgetResult,
  MemoryDoc,
  MemoryLookupResult,
  Simulation,
} from './types'

/** Backend base URL (FastAPI dev server). 127.0.0.1 explicitly so the
 *  browser never resolves `localhost` to IPv6 ::1 and misses the IPv4-only
 *  uvicorn bind. */
export const API_BASE = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '')

export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

export interface ListMemoriesParams {
  status?: string
  limit?: number
}

export interface ChatClient {
  register(name: string, email: string, password: string): Promise<AuthResponse>
  login(email: string, password: string): Promise<AuthResponse>
  me(): Promise<AuthUser>
  chat(input: ChatInput): Promise<ChatResponse>
  feedback(input: FeedbackInput): Promise<Record<string, unknown>>
  listMemories(params?: ListMemoriesParams): Promise<MemoryDoc[]>
  createMemory(input: CreateMemoryInput): Promise<MemoryDoc>
  searchMemories(query: string, limit?: number): Promise<MemoryLookupResult[]>
  forgetTopic(topic: string): Promise<ForgetResult>
  deleteMemory(id: string): Promise<void>
  dashboardStats(): Promise<DashboardStats>
  simulations(): Promise<Simulation[]>
}

interface ReqOptions {
  method?: string
  body?: unknown
  /** Authorization header attached by default when a token is present. */
  useToken?: boolean
}

export function createClient(token: string | null = null): ChatClient {
  async function request<T>(path: string, opts: ReqOptions = {}): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    }
    if (opts.useToken !== false && token) headers.Authorization = `Bearer ${token}`

    let res: Response
    try {
      res = await fetch(`${API_BASE}${path}`, {
        method: opts.method ?? 'GET',
        headers,
        body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
      })
    } catch {
      throw new ApiError(0, 'Unable to connect. Please check your connection and try again.')
    }

    if (!res.ok) {
      let detail = res.statusText || `HTTP ${res.status}`
      try {
        const body = (await res.json()) as { detail?: unknown }
        if (typeof body.detail === 'string') detail = body.detail
        else if (body.detail !== undefined) detail = JSON.stringify(body.detail)
      } catch {
        /* non-JSON error body — keep statusText */
      }
      throw new ApiError(res.status, detail)
    }

    if (res.status === 204) return undefined as T
    return (await res.json()) as T
  }

  return {
    register: (name, email, password) =>
      request('/api/auth/register', {
        method: 'POST',
        body: { name, email, password },
        useToken: false,
      }),
    login: (email, password) =>
      request('/api/auth/login', {
        method: 'POST',
        body: { email, password },
        useToken: false,
      }),
    me: () => request('/api/auth/me'),
    chat: (input) => request('/api/agent/chat', { method: 'POST', body: input }),
    feedback: (input) =>
      request('/api/agent/feedback', { method: 'POST', body: input }) as Promise<
        Record<string, unknown>
      >,
    listMemories: (params = {}) => {
      const q = new URLSearchParams()
      if (params.status) q.set('status', params.status)
      if (params.limit !== undefined) q.set('limit', String(params.limit))
      const qs = q.toString()
      return request(`/api/memories${qs ? `?${qs}` : ''}`)
    },
    createMemory: (input) => request('/api/memories', { method: 'POST', body: input }),
    searchMemories: (query, limit = 8) =>
      request('/api/memories/search', { method: 'POST', body: { query, limit } }),
    forgetTopic: (topic) =>
      request('/api/memories/forget', { method: 'POST', body: { topic } }),
    deleteMemory: async (id) => {
      await request(`/api/memories/${id}`, { method: 'DELETE' })
    },
    dashboardStats: () => request('/api/dashboard/stats'),
    simulations: () => request('/api/simulations'),
  }
}

/**
 * The /api/memories/search response may return raw MemoryDoc[] or the richer
 * retrieval shape ({memory, score, why, path}). Normalize either into
 * MemoryLookupResult[] so the UI can always render path/score/why.
 */
export function normalizeSearchResults(data: unknown): MemoryLookupResult[] {
  if (!Array.isArray(data)) return []
  return data.map((item) => {
    if (item && typeof item === 'object' && 'memory' in item) {
      return item as MemoryLookupResult
    }
    return { memory: item as MemoryDoc }
  })
}
