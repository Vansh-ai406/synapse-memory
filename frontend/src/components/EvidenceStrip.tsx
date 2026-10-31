import { useState } from 'react'
import type { MemoryChange, ChatResponse } from '../api/types'
import { fmtPct, timeAgo } from '../lib/format'
import { actionMetaFor, changeText, sourceLabel } from '../lib/memory'
import { Meter, PathBadge, TypeChip } from './ui'

/**
 * The "why this reply" evidence — the visible proof that persisted memory
 * changed this response. Dashed border + subtle bg distinguish it from
 * normal reply text so judges can see at a glance that this reply was
 * shaped by persisted memory.
 */
export default function EvidenceStrip({
  retrieved,
  changes,
}: {
  retrieved: NonNullable<ChatResponse['retrieved']>
  changes: NonNullable<ChatResponse['changes']>
}) {
  const [openIdx, setOpenIdx] = useState<number | null>(null)
  const hasAnything = (retrieved?.length ?? 0) > 0 || (changes?.length ?? 0) > 0

  if (!hasAnything) {
    return (
      <div className="mt-2 rounded-lg border border-dashed border-slate-700/70 bg-slate-900/40 px-3 py-2 text-[11px] text-slate-500">
        ✨ No prior memories influenced this reply — everything it learns lands in the memory panel.
      </div>
    )
  }

  return (
    <div
      className="mt-2 rounded-lg border border-dashed border-violet-500/30 bg-violet-950/10 p-2"
      title="Evidence: persisted memories that shaped this reply"
    >
      <div className="mb-1 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-violet-300/80">
        <span>⚡ Evidence</span>
        <span className="font-normal normal-case text-slate-500">
          {retrieved.length ? 'context recalled for this reply' : 'memory updated for future replies'}
        </span>
      </div>

      <div className="space-y-1">
        {(retrieved ?? []).map((r, i) => {
          const mem = r.memory
          const open = openIdx === i
          return (
            <button
              key={`${mem.id}-${i}`}
              onClick={() => setOpenIdx(open ? null : i)}
              className={`block w-full cursor-pointer rounded-md border px-2 py-1.5 text-left transition ${
                open ? 'border-violet-500/40 bg-slate-900/80' : 'border-transparent bg-slate-900/50 hover:bg-slate-800/70'
              }`}
            >
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <TypeChip type={mem.memory_type} size="sm" />
                <PathBadge path={r.path} />
                {r.similarity !== null && r.similarity !== undefined && (
                  <span className="rounded bg-slate-800 px-1.5 py-px text-[9px] text-slate-300">
                    sim {fmtPct(r.similarity)}
                  </span>
                )}
                <span className="min-w-0 flex-1 truncate text-[11px] text-slate-200">
                  {mem.content}
                </span>
                <span className="text-slate-500" aria-hidden>
                  {open ? '▾' : '▸'}
                </span>
              </div>
              {r.why && (
                <div className="mt-0.5 truncate text-[10px] italic text-violet-300/70">✨ {r.why}</div>
              )}
              {open && (
                <div className="mt-2 space-y-1.5 border-t border-dashed border-slate-700 pt-2">
                  <p className="text-[11px] leading-relaxed text-slate-200">{mem.content}</p>
                  {mem.context && (
                    <p className="text-[10px] text-slate-400">
                      <span className="font-semibold uppercase text-slate-500">context</span> {mem.context}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-3 pt-1">
                    <Meter label="Importance" value={mem.importance} />
                    <Meter label="Confidence" value={mem.confidence} className="bg-emerald-400" />
                  </div>
                  <p className="text-[10px] text-slate-400">
                    <span className="font-semibold uppercase text-slate-500">reason</span>{' '}
                    {mem.reason ?? '—'}
                  </p>
                  <div className="flex flex-wrap items-center gap-x-3 text-[10px] text-slate-500">
                    {(r.score ?? mem.confidence) !== null && (
                      <span>
                        score {r.score !== null && r.score !== undefined ? fmtPct(r.score) : fmtPct(mem.confidence)}
                      </span>
                    )}
                    <span>
                      path {r.path}{' '}
                      {r.path === 'always-load'
                        ? '(active preferences and constraints)'
                        : r.path === 'exact-scan'
                          ? '(cosine similarity over stored memory embeddings)'
                          : '(semantic vector search via MongoDB Atlas)'}
                    </span>
                    {mem.created_at && <span>stored {timeAgo(mem.created_at)}</span>}
                    {sourceLabel(mem.source) && <span>src {sourceLabel(mem.source)}</span>}
                  </div>
                </div>
              )}
            </button>
          )
        })}
      </div>

      {/* Memory-write events for this turn, inline next to the evidence */}
      {(changes ?? []).length > 0 && (
        <div className="mt-1.5 flex flex-wrap gap-1.5 border-t border-dashed border-slate-700/70 pt-1.5">
          {(changes ?? []).map((c: MemoryChange, i) => {
            const meta = actionMetaFor(c.action)
            return (
              <span
                key={i}
                className={`inline-flex max-w-full items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] ${meta.className}`}
                title={c.reason ?? meta.label}
              >
                <span aria-hidden>{meta.icon}</span>
                <span className="truncate">
                  <span className="font-semibold">{meta.label}</span>
                  {changeText(c) && <> — {changeText(c)}</>}
                </span>
              </span>
            )
          })}
        </div>
      )}

      <div className="mt-1 text-right text-[9px] text-slate-600">
        what was retrieved / why · similarity scores · storage changes
      </div>
    </div>
  )
}
