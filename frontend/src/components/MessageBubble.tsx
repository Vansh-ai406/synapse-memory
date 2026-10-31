import type { ChatMsg } from '../hooks/useChat'
import EvidenceStrip from './EvidenceStrip'
import { TypeChip } from './ui'
import { timeAgo } from '../lib/format'

function SecondsAgo({ ts }: { ts: number }) {
  return <span className="text-[9px] text-slate-600">{timeAgo(new Date(ts).toISOString())}</span>
}

function ReplyContent({ text }: { text: string }) {
  const inline = (line: string) => line.split(/(\*\*[^*]+\*\*|_[^_]+_)/g).map((part, index) =>
    part.startsWith('**') && part.endsWith('**') ? <strong key={index}>{part.slice(2, -2)}</strong>
      : part.startsWith('_') && part.endsWith('_') ? <em key={index}>{part.slice(1, -1)}</em>
      : part,
  )
  return <div className="reply-content">{text.split(/\n\s*\n/).map((block, index) => {
    const lines = block.split('\n')
    if (lines.every(line => /^[-*] /.test(line))) return <ul key={index}>{lines.map((line, n) => <li key={n}>{inline(line.slice(2))}</li>)}</ul>
    return <p key={index}>{lines.map((line, n) => <span key={n}>{n > 0 && <br />}{inline(line)}</span>)}</p>
  })}</div>
}

/** One chat message. Assistant bubbles carry the evidence strip underneath. */
export default function MessageBubble({ msg }: { msg: ChatMsg }) {
  if (msg.role === 'user') {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-2xl rounded-br-md bg-violet-600 px-4 py-2.5 text-sm text-white shadow-md shadow-violet-950/40 fade-in">
          <p className="whitespace-pre-wrap leading-relaxed">{msg.text}</p>
        </div>
      </div>
    )
  }

  const isPending = msg.pending
  const isError = msg.text.startsWith('⚠️')

  return (
    <div className="fade-in flex justify-start">
      <div
        className={`max-w-[92%] rounded-2xl rounded-bl-md border px-4 py-2.5 text-sm ${
          isError
            ? 'border-rose-500/40 bg-rose-950/40 text-rose-200'
            : 'border-white/10 bg-slate-900/80 text-slate-100 shadow-lg shadow-black/30'
        }`}
      >
        {isPending ? (
          <span className="flex items-center gap-2 text-slate-400" aria-live="polite">
            <span className="flex gap-1">
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-violet-400" style={{ animationDelay: '0ms' }} />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-violet-400" style={{ animationDelay: '150ms' }} />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-violet-400" style={{ animationDelay: '300ms' }} />
            </span>
            <span className="text-xs">thinking… (LLM call, can take ~15s)</span>
          </span>
        ) : (
          <ReplyContent text={msg.text} />
        )}

        {msg.resp && (
          <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[9px] text-slate-500">
            <span className="rounded bg-slate-800/80 px-1.5 py-px">provider: {msg.resp.provider}</span>
            <span
              className={`rounded px-1.5 py-px ${
                msg.resp.retrieval_mode === 'error'
                  ? 'bg-amber-500/10 text-amber-300'
                  : 'bg-slate-800/80'
              }`}
            >
              retrieval: {msg.resp.retrieval_mode}
            </span>
            {msg.resp.clarification && (
              <span className="rounded bg-violet-500/10 px-1.5 py-px text-violet-300">
                agent asked for clarification — next memory write was paused
              </span>
            )}
            <SecondsAgo ts={msg.ts} />
          </div>
        )}

        {msg.resp && (
          <EvidenceStrip retrieved={msg.resp.retrieved ?? []} changes={msg.resp.changes ?? []} />
        )}
      </div>
    </div>
  )
}

/** Tiny legend of memory-type colors (used above the chat input). */
export function TypeLegend() {
  const types = ['PREFERENCE', 'CONSTRAINT', 'FACT', 'GOAL', 'DECISION']
  return (
    <div className="flex items-center gap-1 text-[9px] text-slate-500">
      {types.map((t) => (
        <TypeChip key={t} type={t} size="sm" />
      ))}
      <span>+4 more</span>
    </div>
  )
}
