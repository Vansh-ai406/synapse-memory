import type { ReactNode } from 'react'
import { chipFor, isPinned, pathBadgeFor } from '../lib/memory'
import { pctOf } from '../lib/format'

/** Colored memory-type chip (PREFERENCE=purple, CONSTRAINT=amber, …). */
export function TypeChip({ type, size = 'md' }: { type: string; size?: 'sm' | 'md' }) {
  const chip = chipFor(type)
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border font-semibold uppercase tracking-wider ${
        chip.className
      } ${size === 'sm' ? 'px-1.5 py-px text-[9px]' : 'px-2 py-0.5 text-[10px]'}`}
    >
      {chip.label}
    </span>
  )
}

/** Retrieval path badge: always-load / vector / exact-scan. */
export function PathBadge({ path }: { path: string | null | undefined }) {
  const badge = pathBadgeFor(path)
  if (!badge) return null
  return (
    <span
      className={`inline-flex items-center gap-1 rounded border px-1.5 py-px text-[9px] font-medium tracking-wide ${badge.className}`}
    >
      {badge.label}
    </span>
  )
}

/** Status badge (active / superseded / deleted). */
export function StatusBadge({ status }: { status: string | null | undefined }) {
  if (!status) return null
  const map: Record<string, string> = {
    active: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300',
    superseded: 'border-slate-500/40 bg-slate-500/10 text-slate-400',
    deleted: 'border-rose-500/40 bg-rose-500/10 text-rose-300',
  }
  return (
    <span
      className={`inline-flex items-center rounded border px-1.5 py-px text-[9px] font-medium uppercase tracking-wide ${
        map[status] ?? map.active
      }`}
    >
      {status}
    </span>
  )
}

/** Tiny horizontal meter for importance / confidence. */
export function Meter({
  label,
  value,
  className = 'bg-violet-400',
}: {
  label: string
  value: number | null | undefined
  className?: string
}) {
  const pct = pctOf(value)
  return (
    <div className="flex items-center gap-1.5" title={`${label}: ${pct}%`}>
      <span className="w-[3.4rem] shrink-0 text-[9px] font-medium uppercase tracking-wide text-slate-500">
        {label}
      </span>
      <div className="h-1 w-14 overflow-hidden rounded-full bg-slate-700">
        <div className={`h-full rounded-full ${className}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[9px] text-slate-500">{pct}%</span>
    </div>
  )
}

/** Small labeled input field. */
export function Field({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-slate-400">{label}</span>
      {children}
    </label>
  )
}

/** 📌 marker for high-priority / pinned memories. */
export function PinMark({ m }: { m: { pinned?: boolean; importance?: number | null; status?: string } }) {
  if (!isPinned(m as never)) return null
  return <span title="High-priority (always loaded)">📌</span>
}
