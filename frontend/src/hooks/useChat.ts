import { useCallback, useState } from 'react'
import type { ChatClient } from '../api/client'
import type { ChatResponse } from '../api/types'
import { uid } from '../lib/format'

export interface ChatMsg {
  id: string
  role: 'user' | 'assistant'
  text: string
  ts: number
  /** Present on assistant messages: full agent response incl. evidence. */
  resp?: ChatResponse
  /** True while the backend is generating this assistant message. */
  pending?: boolean
}

export interface ComparePair {
  /** id of the assistant message whose reply is the "with memory" side. */
  withMsgId: string
  /** Original request both sides answer. */
  prompt: string
  /** Agent response from a fresh conversation with use_memory=false. */
  without: ChatResponse
}

export interface ChatApi {
  messages: ChatMsg[]
  thinking: boolean
  conversationId: string | null
  send: (message: string, useMemory?: boolean) => Promise<ChatResponse | null>
  /** A with-memory exchange exists that we can re-run without memory. */
  canCompare: boolean
  comparing: boolean
  compare: ComparePair | null
  runCompare: () => Promise<void>
  clearCompare: () => void
  newSession: () => void
}

/**
 * Conversation state for the chat pane. One conversation at a time; the
 * "compare" flow replays the same prompt in a brand-new conversation with
 * memory OFF and keeps both replies side by side (the core demo beat).
 */
export function useChat(client: ChatClient): ChatApi {
  const [messages, setMessages] = useState<ChatMsg[]>([])
  const [thinking, setThinking] = useState(false)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [lastWith, setLastWith] = useState<{ message: string; withMsgId: string } | null>(null)
  const [comparing, setComparing] = useState(false)
  const [compare, setCompare] = useState<ComparePair | null>(null)

  const send = useCallback(
    async (message: string, useMemory = true): Promise<ChatResponse | null> => {
      setThinking(true)
      setMessages((cur) => [...cur, { id: uid(), role: 'user', text: message, ts: Date.now() }])
      const placeholderId = uid()
      setMessages((cur) => [
        ...cur,
        { id: placeholderId, role: 'assistant', text: '', ts: Date.now(), pending: true },
      ])
      try {
        // NOTE: chat can take up to ~15s (LLM) — the pane shows "thinking…" meanwhile.
        const resp = await client.chat({
          message,
          conversation_id: conversationId ?? undefined,
          use_memory: useMemory,
        })
        setConversationId(resp.conversation_id)
        setMessages((cur) =>
          cur.map((m) =>
            m.id === placeholderId
              ? { id: placeholderId, role: 'assistant' as const, text: resp.reply, ts: Date.now(), resp }
              : m,
          ),
        )
        if (useMemory) setLastWith({ message, withMsgId: placeholderId })
        return resp
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'request failed'
        setMessages((cur) =>
          cur.filter((m) => m.id !== placeholderId),
        )
        setMessages((cur) => [
          ...cur,
          { id: placeholderId, role: 'assistant', text: `⚠️ ${msg}`, ts: Date.now() },
        ])
        return null
      } finally {
        setThinking(false)
      }
    },
    [client, conversationId],
  )

  const runCompare = useCallback(async () => {
    if (!lastWith || thinking || comparing) return
    setLastWith(null)
    setComparing(true)
    try {
      // Fresh conversation (no conversation_id) + memory disabled.
      const without = await client.chat({ message: lastWith.message, use_memory: false })
      setCompare({ withMsgId: lastWith.withMsgId, prompt: lastWith.message, without })
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'request failed'
      setMessages((cur) => [
        ...cur,
        { id: uid(), role: 'assistant', text: `⚠️ Compare failed: ${msg}`, ts: Date.now() },
      ])
    } finally {
      setComparing(false)
    }
  }, [client, lastWith, thinking, comparing])

  const clearCompare = useCallback(() => setCompare(null), [])

  const canCompare = !!lastWith && !thinking && !comparing
  const newSession = () => {
    if (thinking || comparing) return
    setMessages([])
    setConversationId(null)
    setLastWith(null)
    setCompare(null)
  }

  return {
    messages,
    thinking,
    conversationId,
    send,
    canCompare,
    comparing,
    compare,
    runCompare,
    clearCompare,
    newSession,
  }
}
