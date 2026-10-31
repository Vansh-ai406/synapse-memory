import { useEffect, useRef, useState } from 'react'
import type { ChatClient } from '../api/client'
import type { ChatApi, ChatMsg } from '../hooks/useChat'
import type { ToastApi } from '../hooks/useToasts'
import { pushChangeToasts } from '../hooks/useToasts'
import CompareCard from './CompareCard'
import MessageBubble, { TypeLegend } from './MessageBubble'

interface ChatPaneProps {
  client: ChatClient
  chat: ChatApi
  toasts: ToastApi
  refreshMemory: () => Promise<void>
}

/**
 * Left column: conversation + input + the one-click "compare without memory"
 * flow. Since the chat hook `chat` is owned by App, simulation runs appear
 * here live too.
 */
export default function ChatPane({ chat, toasts, refreshMemory }: ChatPaneProps) {
  const [draft, setDraft] = useState('')
  const [useMemory, setUseMemory] = useState(true)
  const [compareBusy, setCompareBusy] = useState(false)
  const scrollRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [chat.messages, chat.thinking, chat.compare])

  const deliver = async (message: string) => {
    const resp = await chat.send(message, useMemory)
    if (resp) {
      // 🔒 demo beat: every memory write appears as a toast
      pushChangeToasts(resp.changes ?? [], toasts.push)
      refreshMemory()
    } else {
      toasts.push('Chat request failed — is the backend running?', 'error')
    }
  }

  const submit = () => {
    const message = draft.trim()
    if (!message || chat.thinking || chat.comparing) return
    setDraft('')
    void deliver(message)
  }

  const runCompare = () => {
    if (!chat.canCompare || compareBusy) return
    setCompareBusy(true)
    void chat
      .runCompare()
      .then(() => refreshMemory())
      .finally(() => setCompareBusy(false))
  }

  return (
    <section className="flex min-w-0 flex-1 flex-col">
      {/* transcript */}
      <div ref={scrollRef} className="chat-transcript min-h-0 flex-1 space-y-5 overflow-y-auto p-4" aria-live="polite">
        {chat.messages.length === 0 && (
          <div className="chat-welcome">
            <div className="welcome-symbol" aria-hidden="true">✳</div>
            <span className="section-label">A FRESH SESSION. A FAMILIAR COMPANION.</span>
            <h2>What’s on your<br /><em>mind today?</em></h2>
            <p>Start with a goal or a little about how you learn.<br />We’ll build the next step around you.</p>
            <div className="starter-grid">
              {[
                ['01', 'Find my rhythm', 'I prefer short morning study sessions before 9 AM.'],
                ['02', 'Make a study plan', 'Plan my MongoDB revision.'],
                ['03', 'Change things up', 'Actually, I now prefer evening sessions after 7 PM.'],
              ].map(([n, title, prompt]) => <button key={n} onClick={() => setDraft(prompt)}><span>{n} ↗</span><strong>{title}</strong><small>{prompt}</small></button>)}
            </div>
          </div>
        )}
        {chat.messages.map((m) => (
          <div key={m.id} className="space-y-2">
            {chat.compare && chat.compare.withMsgId === m.id && (
              <CompareCard pair={chat.compare} withMsg={m} />
            )}
            <Bubble msg={m} />
          </div>
        ))}
        {chat.comparing && (
          <div className="rounded-xl border border-violet-500/30 bg-violet-950/20 px-4 py-3 text-xs text-violet-200">
            🔬 Replaying the same request without memory… (LLM call, up to ~15s)
          </div>
        )}
      </div>

      {/* composer */}
      <div className="chat-composer border-t border-white/10 p-3">
        <div className="mb-2 flex items-center justify-between">
          <TypeLegend />
          <span className="text-[9px] text-slate-600">
            conversation {chat.conversationId ? `#…${chat.conversationId.slice(-6)}` : 'new'}
          </span>
        </div>

        {/* compare button — core demo beat, one click */}
        {chat.canCompare && (
          <button
            onClick={runCompare}
            disabled={compareBusy}
            className="mb-2 w-full cursor-pointer rounded-lg border border-violet-500/40 bg-violet-500/10 px-3 py-2 text-xs font-semibold text-violet-200 transition hover:bg-violet-500/20 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {compareBusy ? '🔬 Replaying without memory…' : '🔬 Compare: same request WITHOUT memory'}
          </button>
        )}

        <div className="flex items-end gap-2">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                submit()
              }
            }}
            rows={2}
            aria-label="Message your study companion"
            placeholder="A goal, a question, a thought…"
            className="min-w-0 flex-1 resize-none rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-slate-200 placeholder-slate-600 focus:border-violet-400 focus:outline-none"
          />
          <button
            onClick={() => setUseMemory((v) => !v)}
            title="Toggle whether new messages write/recall memory"
            aria-pressed={useMemory}
            className={`h-[42px] shrink-0 rounded-xl border px-3 text-xs font-semibold transition ${
              useMemory
                ? 'border-violet-500/50 bg-violet-500/15 text-violet-200'
                : 'border-white/10 bg-white/5 text-slate-400'
            }`}
          >
            {useMemory ? '◉ Memory on' : '○ Memory off'}
          </button>
          <button
            onClick={submit}
            disabled={!draft.trim() || chat.thinking || chat.comparing}
            className="h-[42px] shrink-0 cursor-pointer rounded-xl bg-violet-600 px-4 text-sm font-semibold text-white transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {chat.thinking ? '…' : 'Send ↗'}
          </button>
        </div>
        <p className="composer-note">Enter to send · Shift + Enter for a new line <span>You’re always in control of what’s remembered.</span></p>
      </div>
    </section>
  )
}

function Bubble({ msg }: { msg: ChatMsg }) {
  return <MessageBubble msg={msg} />
}
