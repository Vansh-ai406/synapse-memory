import { useCallback, useState } from 'react'
import type { MemoryChange } from '../api/types'
import { actionMetaFor, changeKind, changeText } from '../lib/memory'
import { uid } from '../lib/format'

export type ToastKind = 'created' | 'supersede' | 'skipped' | 'deleted' | 'error' | 'info'

export interface Toast {
  id: string
  text: string
  kind: ToastKind
}

const KIND_STYLES: Record<ToastKind, { className: string; icon: string }> = {
  created: { className: 'border-emerald-500/40 bg-emerald-950/60 text-emerald-100', icon: '🧠' },
  supersede: { className: 'border-violet-500/40 bg-violet-950/60 text-violet-100', icon: '♻️' },
  skipped: { className: 'border-amber-500/40 bg-amber-950/60 text-amber-100', icon: '✋' },
  deleted: { className: 'border-rose-500/40 bg-rose-950/60 text-rose-100', icon: '🗑️' },
  error: { className: 'border-rose-500/40 bg-rose-950/60 text-rose-100', icon: '⚠️' },
  info: { className: 'border-slate-500/40 bg-slate-900/80 text-slate-100', icon: '🧠' },
}

export function toastStyleFor(kind: ToastKind) {
  return KIND_STYLES[kind]
}

export interface ToastApi {
  toasts: Toast[]
  push: (text: string, kind?: ToastKind) => void
  dismiss: (id: string) => void
}

/**
 * Tiny in-app toast queue. Memory-write toasts ("🧠 Memory created: …") are
 * a required demo beat: judges must SEE that a turn persisted something.
 */
export function useToasts(): ToastApi {
  const [toasts, setToasts] = useState<Toast[]>([])

  const dismiss = useCallback((id: string) => {
    setToasts((cur) => cur.filter((t) => t.id !== id))
  }, [])

  const push = useCallback(
    (text: string, kind: ToastKind = 'info') => {
      const toast: Toast = { id: uid(), text, kind }
      setToasts((cur) => [...cur.slice(-5), toast])
      window.setTimeout(() => dismiss(toast.id), 7000)
    },
    [dismiss],
  )

  return { toasts, push, dismiss }
}

/** Turn backend `changes` into one toast per action with the right kind. */
export function pushChangeToasts(changes: MemoryChange[], push: (text: string, kind?: ToastKind) => void): void {
  for (const c of changes) {
    const meta = actionMetaFor(c.action)
    const body = changeText(c)
    const suffix = c.reason ? ` · ${c.reason}` : ''
    push(`${meta.icon} ${meta.label}: ${body}${suffix}`, changeKind(c.action))
  }
}
