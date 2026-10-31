import { useCallback, useEffect, useState } from 'react'
import { normalizeSearchResults, type ChatClient } from '../api/client'
import type {
  DashboardStats,
  ForgetResult,
  MemoryDoc,
  MemoryLookupResult,
  MemoryTypeLabel,
} from '../api/types'
import type { ToastApi } from '../hooks/useToasts'
import type { MemoryFeedApi } from '../hooks/useMemoryFeed'
import { MEMORY_TYPES } from '../lib/memory'
import { fmtPct, timeAgo as timeAgoLabel, timeUntil as timeUntilLabel } from '../lib/format'
import MemoryCard from './MemoryCard'
import { PathBadge, StatusBadge, TypeChip, Field } from './ui'

type Tab = 'active' | 'history' | 'add'

interface MemoryPanelProps {
  client: ChatClient
  feed: MemoryFeedApi
  toasts: ToastApi
  user: { email: string }
}

/**
 * Right column: dashboard strip (stats), Active/History/Add tabs, the
 * "forget something" input, and the pause-resume notice. Polls live via
 * `feed` (paused while we're on a non-Active tab).
 */
export default function MemoryPanel({ client, feed, toasts, user }: MemoryPanelProps) {
  const [tab, setTab] = useState<Tab>('active')
  const [history, setHistory] = useState<MemoryDoc[]>([])
  const [stats, setStats] = useState<DashboardStats | null>(null)

  // search
  const [query, setQuery] = useState('')
  const [hits, setHits] = useState<MemoryLookupResult[] | null>(null)
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)

  // forget
  const [forgetTopic, setForgetTopic] = useState('')
  const [forgetting, setForgetting] = useState(false)
  const [forgetNotice, setForgetNotice] = useState<string | null>(null)

  // add
  const [newContent, setNewContent] = useState('')
  const [newType, setNewType] = useState<MemoryTypeLabel>('PREFERENCE')
  const [newContext, setNewContext] = useState('')
  const [newExpiry, setNewExpiry] = useState<string>('')
  const [adding, setAdding] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)

  const [deletingId, setDeletingId] = useState<string | null>(null)

  // Poll only makes sense on the Active tab (the one the judges watch).
  useEffect(() => {
    feed.setPaused(tab !== 'active')
    if (tab === 'active') void feed.refresh()
    return () => feed.setPaused(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab])

  const loadAux = useCallback(async () => {
    try {
      const [hist, st] = await Promise.all([
        client.listMemories({ status: 'superseded', limit: 50 }),
        client.dashboardStats(),
      ])
      setHistory(Array.isArray(hist) ? hist : [])
      setStats(st)
    } catch {
      /* backend hiccup — keep old data */
    }
  }, [client])

  useEffect(() => {
    void loadAux()
  }, [loadAux, feed.memories.length])

  const runSearch = async () => {
    const q = query.trim()
    if (!q || searching) return
    setSearching(true)
    setSearchError(null)
    try {
      const res = await client.searchMemories(q, 10)
      setHits(normalizeSearchResults(res))
    } catch (err) {
      setSearchError(err instanceof Error ? err.message : 'search failed')
      setHits(null)
    } finally {
      setSearching(false)
    }
  }

  const forget = async () => {
    const topic = forgetTopic.trim()
    if (!topic || forgetting) return
    setForgetting(true)
    try {
      const res: ForgetResult = await client.forgetTopic(topic)
      const n = typeof res.deleted === 'number' ? res.deleted : res.deleted ? 1 : 0
      setForgetNotice(
        n > 0
          ? `${n} memory about “${topic}” forgotten and excluded from future recall.`
          : `No active memories matched “${topic}”. ${res.reason ?? ''}`,
      )
      setForgetTopic('')
      void feed.refresh()
      toasts.push(`Forgot: “${topic}” — ${res.reason ?? 'excluded from recall'}`, 'deleted')
    } catch (err) {
      setForgetNotice(`Forget failed: ${err instanceof Error ? err.message : 'error'}`)
    } finally {
      setForgetting(false)
    }
  }

  const add = async () => {
    const content = newContent.trim()
    if (!content || adding) return
    setAdding(true)
    setAddError(null)
    try {
      await client.createMemory({
        content,
        memory_type: newType,
        context: newContext.trim() || undefined,
        expires_at: newExpiry ? new Date(newExpiry).toISOString() : undefined,
      })
      setNewContent('')
      setNewContext('')
      setNewExpiry('')
      toasts.push(`🧠 Memory saved manually: ${content}`, 'created')
      void feed.refresh()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'failed'
      setAddError(msg) // 409 duplicates land here: "Duplicate memory: …"
    } finally {
      setAdding(false)
    }
  }

  const hardDelete = async (m: MemoryDoc) => {
    if (deletingId) return
    setDeletingId(m.id)
    try {
      await client.deleteMemory(m.id)
      toasts.push(`🗑️ Deleted: ${m.content}`, 'deleted')
      void feed.refresh()
    } catch (err) {
      toasts.push(`Delete failed: ${err instanceof Error ? err.message : 'error'}`, 'error')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <aside className="flex h-full flex-col bg-slate-950/40">
      {/* dashboard strip */}
      <StatsStrip stats={stats} />

      {/* header */}
      <div className="flex items-center justify-between px-4 pb-2">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-bold tracking-tight text-slate-100">Your memory</h2>
          {feed.live && (
            <span className="flex items-center gap-1 text-[9px] font-semibold uppercase tracking-wider text-emerald-400">
              <span className="live-dot h-1.5 w-1.5 rounded-full bg-emerald-400" />
              {feed.mode === 'stream' ? 'live' : 'synced'}
            </span>
          )}
        </div>
        <span className="text-[9px] text-slate-500" title={user.email}>{feed.live ? 'JUST FOR YOU' : 'RECONNECTING'}</span>
      </div>

      {/* tabs */}
      <div className="px-4 pb-2">
        <div className="flex gap-1 rounded-xl bg-slate-900 p-1 text-xs">
          {(
            [
              ['active', `Active${feed.memories.length ? ` (${feed.memories.length})` : ''}`],
              ['history', `History${history.length ? ` (${history.length})` : ''}`],
              ['add', 'Add'],
            ] as Array<[Tab, string]>
          ).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex-1 cursor-pointer rounded-lg px-2 py-1.5 font-medium transition ${
                tab === key ? 'bg-violet-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">
        {tab === 'active' && (
          <div className="space-y-3">
            {/* vector search */}
            <div className="rounded-xl border border-dashed border-slate-700 bg-slate-950/40 p-3">
              <div className="mb-2 flex items-center gap-2 text-[10px]">
                <span className="font-semibold uppercase tracking-wide text-slate-400">
                  Search memories
                </span>
                <span className="text-slate-500">find the context behind a response</span>
              </div>
              <div className="flex gap-1.5">
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && runSearch()}
                  aria-label="Search your memories"
                  placeholder="How do I like to study?"
                  className="min-w-0 flex-1 rounded-lg border border-white/10 bg-slate-950/70 px-2.5 py-1.5 text-xs placeholder-slate-600 focus:border-violet-400 focus:outline-none"
                />
                <button
                  onClick={runSearch}
                  disabled={!query.trim() || searching}
                  className="shrink-0 cursor-pointer rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {searching ? '…' : 'Find'}
                </button>
              </div>
              {searchError && <p className="mt-2 text-[10px] text-rose-300">{searchError}</p>}
              {hits && (
                <div className="mt-2 space-y-1.5">
                  {hits.length === 0 && (
                    <p className="text-[11px] text-slate-500">No matches.</p>
                  )}
                  {hits.map((h, i) => (
                    <div
                      key={`${h.memory.id}-${i}`}
                      className="rounded-lg border border-white/10 bg-slate-900/70 p-2"
                    >
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <TypeChip type={h.memory.memory_type} size="sm" />
                        <PathBadge path={h.path} />
                        <span className="text-[9px] text-slate-400">
                          {h.similarity !== null && h.similarity !== undefined
                            ? `sim ${fmtPct(h.similarity)}`
                            : h.score !== null && h.score !== undefined
                              ? `score ${fmtPct(h.score)}`
                              : ''}
                        </span>
                      </div>
                      <p className="mt-1 text-[12px] text-slate-100">{h.memory.content}</p>
                      {h.why && <p className="mt-0.5 text-[10px] italic text-violet-300/70">✨ {h.why}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {feed.loading && <p className="text-center text-xs text-slate-500">loading memory…</p>}

            {!feed.loading && feed.memories.length === 0 && (
              <p className="rounded-xl border border-dashed border-slate-700 p-4 text-center text-xs text-slate-500">
                Nothing stored yet. Chat a little, or add a memory manually.
              </p>
            )}

            {feed.memories.map((m) => (
              <MemoryCard key={m.id} memory={m} onDelete={hardDelete} deleting={deletingId === m.id} />
            ))}

            {/* forget + undo-proof notice */}
            <div className="rounded-xl border border-rose-500/20 bg-rose-950/10 p-3">
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-rose-300/80">
                Forget something
              </p>
              <div className="flex gap-1.5">
                <input
                  value={forgetTopic}
                  onChange={(e) => setForgetTopic(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && forget()}
                  placeholder="forget my morning preference"
                  className="min-w-0 flex-1 rounded-lg border border-white/10 bg-slate-950/70 px-2.5 py-1.5 text-xs placeholder-slate-600 focus:border-rose-400 focus:outline-none"
                />
                <button
                  onClick={forget}
                  disabled={!forgetTopic.trim() || forgetting}
                  className="shrink-0 cursor-pointer rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-1.5 text-xs font-semibold text-rose-200 transition hover:bg-rose-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {forgetting ? '…' : 'Forget'}
                </button>
              </div>
              {forgetNotice && (
                <p className="mt-2 text-[10px] leading-relaxed text-rose-200/80">
                  {forgetNotice}
                </p>
              )}
              <p className="mt-1.5 text-[9px] text-slate-600">
                Forgotten memories are excluded from future responses. Your history records the change.
              </p>
            </div>
          </div>
        )}

        {tab === 'history' && (
          <div className="space-y-2">
            <p className="text-[10px] text-slate-500">
              Timeline of memories replaced by newer ones (superseded). Old versions stay here for audit.
            </p>
            {history.length === 0 && (
              <p className="rounded-xl border border-dashed border-slate-700 p-4 text-center text-xs text-slate-500">
                No superseded memories yet — they appear when RecallOS upgrades an old memory.
              </p>
            )}
            {history.map((m) => (
              <div
                key={m.id}
                className="rounded-xl border border-white/10 bg-slate-900/50 p-3 opacity-80"
              >
                <div className="mb-1 flex items-center gap-1.5">
                  <TypeChip type={m.memory_type} size="sm" />
                  <StatusBadge status={(m.status as string) ?? 'superseded'} />
                  {m.created_at && (
                    <span className="ml-auto text-[9px] text-slate-600">{timeAgoLabel(m.created_at)}</span>
                  )}
                </div>
                <p className="text-[12px] text-slate-500 line-through">{m.content}</p>
                {m.reason && (
                  <p className="mt-0.5 text-[10px] italic text-slate-600">.reason: {m.reason}</p>
                )}
                {m.expires_at && (
                  <p className="mt-0.5 text-[9px] text-slate-600">⏳ {timeUntilLabel(m.expires_at)}</p>
                )}
              </div>
            ))}
          </div>
        )}

        {tab === 'add' && (
          <div className="space-y-3">
            <p className="text-[10px] text-slate-500">
              Seed a memory directly — useful before the demo so RecallOS already “knows” you.
            </p>
            <Field label="Memory content">
              <textarea
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
                rows={4}
                placeholder="I take oat milk in my coffee"
                className="w-full resize-none rounded-lg border border-white/10 bg-slate-950/70 px-3 py-2 text-xs placeholder-slate-600 focus:border-violet-400 focus:outline-none"
              />
            </Field>
            <div className="grid grid-cols-3 gap-2">
              <Field label="Type">
                <select
                  value={newType}
                  onChange={(e) => setNewType(e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-slate-950/70 px-2 py-2 text-xs focus:border-violet-400 focus:outline-none"
                >
                  {MEMORY_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Expires at (optional)">
                <input
                  type="datetime-local"
                  value={newExpiry}
                  onChange={(e) => setNewExpiry(e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-slate-950/70 px-2 py-2 text-xs focus:border-violet-400 focus:outline-none"
                />
              </Field>
              <div className="self-end"></div>
            </div>
            <Field label="Context (optional)">
              <input
                value={newContext}
                onChange={(e) => setNewContext(e.target.value)}
                placeholder="where/when this was said"
                className="w-full rounded-lg border border-white/10 bg-slate-950/70 px-3 py-2 text-xs placeholder-slate-600 focus:border-violet-400 focus:outline-none"
              />
            </Field>
            {addError && (
              <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-200">
                {addError}
              </p>
            )}
            <button
              onClick={add}
              disabled={!newContent.trim() || adding}
              className="w-full cursor-pointer rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {adding ? 'Saving…' : '🧠 Save memory'}
            </button>
          </div>
        )}
      </div>
    </aside>
  )
}
function StatsStrip({ stats }: { stats: DashboardStats | null }) {
  const items = stats
    ? [
        { label: 'active', value: stats.active_memories, cls: 'text-emerald-300' },
        { label: 'superseded', value: stats.superseded_memories, cls: 'text-slate-400' },
        { label: 'expiring soon', value: stats.expiring_soon, cls: 'text-amber-300' },
        { label: 'conversations', value: stats.conversation_count, cls: 'text-violet-300' },
      ]
    : []
  return (
    <div className="px-4 pb-1">
      <div className="grid grid-cols-4 gap-1.5 rounded-xl border border-white/10 bg-slate-900/60 p-2">
        {items.length === 0 ? (
          <span className="col-span-4 text-center text-[10px] text-slate-500">loading stats…</span>
        ) : (
          items.map((it) => (
            <div key={it.label} className="text-center">
              <div className={`text-sm font-bold ${it.cls}`}>{it.value}</div>
              <div className="text-[8px] uppercase tracking-wide text-slate-500">{it.label}</div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
