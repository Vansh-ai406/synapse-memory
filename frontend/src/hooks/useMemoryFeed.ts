import { useCallback, useEffect, useRef, useState } from 'react'
import type { ChatClient } from '../api/client'
import { API_BASE } from '../api/client'
import type { MemoryDoc } from '../api/types'

const POLL_MS = 3000

export interface MemoryFeedApi {
  memories: MemoryDoc[]
  loading: boolean
  live: boolean
  mode: 'stream' | 'poll'
  lastUpdated: number | null
  refresh: () => Promise<void>
  setPaused: (paused: boolean) => void
}

/**
 * Live memory feed for the right-hand panel.
 *
 * Authenticated change events trigger refreshes. A 3s poll also catches TTL
 * removals and keeps the panel current on hosts that do not forward SSE.
 */
export function useMemoryFeed(client: ChatClient, token: string | null): MemoryFeedApi {
  const [memories, setMemories] = useState<MemoryDoc[]>([])
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<number | null>(null)
  const [live, setLive] = useState(false)
  const [mode, setMode] = useState<'stream' | 'poll'>('poll')
  const pausedRef = useRef(false)
  const inFlight = useRef(false)

  const refresh = useCallback(async () => {
    if (inFlight.current) return
    inFlight.current = true
    try {
      const list = await client.listMemories({ status: 'active', limit: 100 })
      setMemories(Array.isArray(list) ? list : [])
      setLastUpdated(Date.now())
      setLive(true)
    } catch {
      setLive(false)
      // transient (backend restarting, etc.) — keep showing the last snapshot
    } finally {
      inFlight.current = false
      setLoading(false)
    }
  }, [client])

  useEffect(() => {
    void refresh()
  }, [refresh])

  useEffect(() => {
    if (!token) return
    const controller = new AbortController()
    const connect = async () => {
      try {
        const response = await fetch(`${API_BASE}/api/agent/memories/stream`, {
          headers: { Authorization: `Bearer ${token}` }, signal: controller.signal,
        })
        if (!response.ok || !response.body) return
        const reader = response.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ''
        while (!controller.signal.aborted) {
          const { done, value } = await reader.read()
          if (done) break
          buffer += decoder.decode(value, { stream: true })
          let end: number
          while ((end = buffer.indexOf('\n\n')) >= 0) {
            const event = buffer.slice(0, end)
            buffer = buffer.slice(end + 2)
            if (event.startsWith('data:')) {
              setMode('stream')
              if (!pausedRef.current) void refresh()
            }
          }
        }
      } catch { /* polling remains available when streams are unsupported */ }
      finally { if (!controller.signal.aborted) setMode('poll') }
    }
    void connect()
    return () => controller.abort()
  }, [token, refresh])

  useEffect(() => {
    const t = window.setInterval(() => {
      if (!pausedRef.current) void refresh()
    }, POLL_MS)
    return () => window.clearInterval(t)
  }, [refresh])

  const setPaused = useCallback((paused: boolean) => {
    pausedRef.current = paused
  }, [])

  return { memories, loading, live, mode, lastUpdated, refresh, setPaused }
}
