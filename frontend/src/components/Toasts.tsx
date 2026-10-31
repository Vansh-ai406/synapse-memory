import type { Toast } from '../hooks/useToasts'
import { toastStyleFor } from '../hooks/useToasts'

/**
 * Fixed bottom-right toast stack. Memory-write events land here on every
 * chat turn — judges watch memories being created/superseded in real time.
 */
export default function Toasts({ toasts, dismiss }: { toasts: Toast[]; dismiss: (id: string) => void }) {
  if (toasts.length === 0) return null
  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-50 flex w-[min(380px,90vw)] flex-col items-end gap-2">
      {toasts.map((t) => {
        const style = toastStyleFor(t.kind)
        return (
          <div
            key={t.id}
            onClick={() => dismiss(t.id)}
            className={`toast-in pointer-events-auto flex max-w-full cursor-pointer items-start gap-2 rounded-xl border px-3.5 py-2.5 text-xs shadow-xl shadow-black/50 backdrop-blur ${style.className}`}
          >
            <span className="shrink-0 text-base leading-none" aria-hidden>
              {style.icon}
            </span>
            <span className="leading-relaxed">{t.text}</span>
          </div>
        )
      })}
    </div>
  )
}
