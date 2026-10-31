import type { MemoryDoc } from '../api/types'
import { timeAgo, timeUntil } from '../lib/format'
import { chipFor, isPinned, sourceLabel } from '../lib/memory'
import { Meter, StatusBadge, TypeChip } from './ui'

/**
 * One memory in the right-hand panel. Hover reveals 🗑 (hard delete), and
 * high-importance ("always-load") memories get pin styling.
 */
export default function MemoryCard({
  memory,
  onDelete,
  deleting,
}: {
  memory: MemoryDoc
  onDelete: (m: MemoryDoc) => void
  deleting: boolean
}) {
  const chip = chipFor(memory.memory_type)
  const until = timeUntil(memory.expires_at)
  const src = sourceLabel(memory.source)

  return (
    <div
      className={`group relative rounded-xl border border-white/10 p-3 transition hover:border-white/20 ${
        isPinned(memory) ? 'bg-slate-800/70 shadow-sm shadow-violet-950/50 ring-1 ring-violet-500/40' : 'bg-slate-900/70'
      }`}
    >
      <div className={`absolute left-0 top-2 bottom-2 w-1 rounded-full ${chip.dot}`} />

      <div className="mb-1.5 flex min-h-6 items-start justify-between gap-2">
        <div className="flex min-w-0 flex-wrap items-center gap-1.5">
          <TypeChip type={memory.memory_type} />
          <StatusBadge status={memory.status as string | null} />
          {isPinned(memory) && (
            <span className="text-[10px]" title="High importance → always loaded">
              📌
            </span>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {memory.created_at && <span className="text-[9px] text-slate-500">{timeAgo(memory.created_at)}</span>}
          <button
            onClick={() => onDelete(memory)}
            disabled={deleting}
            title="Forget this memory"
            aria-label="Forget this memory"
            className="cursor-pointer rounded px-1 text-xs text-slate-400 transition hover:text-rose-400 disabled:cursor-wait disabled:opacity-50"
          >
            {deleting ? '…' : '🗑'}
          </button>
        </div>
      </div>

      <p className="text-[13px] leading-relaxed text-slate-100">{memory.content}</p>

      {memory.context && (
        <p className="mt-1 text-[11px] leading-relaxed text-slate-400">
          <span className="font-semibold uppercase tracking-wide text-slate-600">ctx</span>{' '}
          {memory.context}
        </p>
      )}

      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
        <Meter label="Importance" value={memory.importance} />
        <Meter label="Confidence" value={memory.confidence} className="bg-emerald-400" />
      </div>

      <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[9px] text-slate-500">
        {until && (
          <span className={until === 'expired' ? 'text-rose-300/80' : 'text-amber-300/70'}>
            ⏳ {until}
          </span>
        )}
        {memory.reason && <span className="truncate italic">.reason: {memory.reason}</span>}
        {src && <span className="truncate">src {src}</span>}
        {memory.supersedes && <span>supersedes …{memory.supersedes.slice(-6)}</span>}
      </div>
    </div>
  )
}
