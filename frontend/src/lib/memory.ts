import type { ChangeAction, MemoryChange, MemoryDoc } from '../api/types'

/**
 * Central color/label mapping so chat evidence strips, the memory panel,
 * toasts, and search hits all talk about memories the same way.
 */

export interface ChipStyle {
  label: string
  className: string
  dot: string
}

/** Type chip colors required by the demo spec. */
export const TYPE_STYLES: Record<string, ChipStyle> = {
  PREFERENCE: {
    label: 'PREFERENCE',
    className: 'bg-purple-500/15 text-purple-300 border-purple-500/40',
    dot: 'bg-purple-400',
  },
  CONSTRAINT: {
    label: 'CONSTRAINT',
    className: 'bg-amber-500/15 text-amber-300 border-amber-500/40',
    dot: 'bg-amber-400',
  },
  FACT: {
    label: 'FACT',
    className: 'bg-blue-500/15 text-blue-300 border-blue-500/40',
    dot: 'bg-blue-400',
  },
  GOAL: {
    label: 'GOAL',
    className: 'bg-green-500/15 text-green-300 border-green-500/40',
    dot: 'bg-green-400',
  },
  DECISION: {
    label: 'DECISION',
    className: 'bg-teal-500/15 text-teal-300 border-teal-500/40',
    dot: 'bg-teal-400',
  },
  FEEDBACK: {
    label: 'FEEDBACK',
    className: 'bg-orange-500/15 text-orange-300 border-orange-500/40',
    dot: 'bg-orange-400',
  },
  EXPERIENCE: {
    label: 'EXPERIENCE',
    className: 'bg-sky-500/15 text-sky-300 border-sky-500/40',
    dot: 'bg-sky-400',
  },
  TASK: {
    label: 'TASK',
    className: 'bg-rose-500/15 text-rose-300 border-rose-500/40',
    dot: 'bg-rose-400',
  },
  STRATEGY: {
    label: 'STRATEGY',
    className: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/40',
    dot: 'bg-indigo-400',
  },
}

export const FALLBACK_CHIP: ChipStyle = {
  label: '',
  className: 'bg-slate-500/15 text-slate-300 border-slate-500/40',
  dot: 'bg-slate-400',
}

export function chipFor(type: string | null | undefined): ChipStyle {
  if (!type) return FALLBACK_CHIP
  return TYPE_STYLES[type.toUpperCase()] ?? { ...FALLBACK_CHIP, label: type.toUpperCase() }
}

/** All memory types for the "Add memory" selector. */
export const MEMORY_TYPES = Object.keys(TYPE_STYLES)

/** Retrieval path → badge styling. */
export const PATH_STYLES: Record<string, { label: string; className: string }> = {
  'always-load': {
    label: 'always-load',
    className: 'border-violet-400/50 bg-violet-500/10 text-violet-300',
  },
  vector: {
    label: 'vector',
    className: 'border-fuchsia-400/50 bg-fuchsia-500/10 text-fuchsia-300',
  },
  'exact-scan': {
    label: 'exact-scan',
    className: 'border-emerald-400/50 bg-emerald-500/10 text-emerald-300',
  },
}

export function pathBadgeFor(path: string | null | undefined) {
  if (!path) return null
  return PATH_STYLES[path] ?? { label: path, className: 'border-slate-500/50 bg-slate-500/10 text-slate-300' }
}

/** Change actions → icon, label, color accent (used in toasts + strips). */
export const ACTION_META: Record<
  string,
  { icon: string; label: string; className: string; toast: string }
> = {
  created: {
    icon: '🧠',
    label: 'Memory created',
    className: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300',
    toast: 'created' as const,
  },
  supersede: {
    icon: '♻️',
    label: 'Superseded',
    className: 'border-violet-500/40 bg-violet-500/10 text-violet-300',
    toast: 'supersede' as const,
  },
  copied: {
    icon: '⧉',
    label: 'Copied',
    className: 'border-sky-500/40 bg-sky-500/10 text-sky-300',
    toast: 'created' as const,
  },
  skipped_duplicate: {
    icon: '⏭️',
    label: 'Duplicate skipped',
    className: 'border-amber-500/40 bg-amber-500/10 text-amber-300',
    toast: 'skipped' as const,
  },
  skipped_sensitive: {
    icon: '🛡️',
    label: 'Sensitive — not stored',
    className: 'border-amber-500/40 bg-amber-500/10 text-amber-300',
    toast: 'skipped' as const,
  },
  deleted: {
    icon: '🗑️',
    label: 'Forgotten',
    className: 'border-rose-500/40 bg-rose-500/10 text-rose-300',
    toast: 'deleted' as const,
  },
}

export function actionMetaFor(action: ChangeAction | string) {
  return ACTION_META[action] ?? { icon: '•', label: action, className: 'border-slate-500/40 bg-slate-500/10 text-slate-300', toast: 'info' as const }
}

/** Human sentence for a change (used verbatim in toasts). */
export function changeText(c: MemoryChange): string {
  const prev = c.previous?.content
  const next = c.memory?.content
  if (c.action === 'supersede' && prev && next) return `${prev} → ${next}`
  return next ?? prev ?? c.reason ?? ''
}

export function changeKind(
  action: ChangeAction | string,
): 'created' | 'supersede' | 'skipped' | 'deleted' {
  if (action === 'supersede') return 'supersede'
  if (action === 'deleted') return 'deleted'
  if (String(action).startsWith('skipped')) return 'skipped'
  return 'created'
}

/** Normalize the many ways `source` may be serialized. */
export function sourceLabel(source: MemoryDoc['source']): string | null {
  if (!source) return null
  if (typeof source === 'string') return source
  const parts = [source.session_id, source.message_id].filter(Boolean)
  return parts.length ? parts.join(' / ') : null
}

/** True when the memory looks like a "pinned / always-load" high-value item. */
export function isPinned(m: MemoryDoc): boolean {
  if (m.pinned) return true
  return (m.importance ?? 0) >= 0.9 && m.status !== 'deleted'
}
