import { useCallback, useEffect, useState } from 'react'
import type { ChatClient } from '../api/client'
import type { Simulation, SimulationStep } from '../api/types'
import type { ChatApi } from '../hooks/useChat'
import type { ToastApi } from '../hooks/useToasts'
import { pushChangeToasts } from '../hooks/useToasts'

interface SimulationsDockProps {
  client: ChatClient
  chat: ChatApi
  toasts: ToastApi
  open: boolean
  setOpen: (v: boolean) => void
  onDone: () => void
}

interface RunState {
  simId: string
  /** 1-based step, or steps.length+1 when done */
  step: number
  total: number
  error: string | null
  done: boolean
}

/**
 * Collapsible side dock fed by GET /api/simulations. "Run" sends the script's
 * steps sequentially through the live chat pane (visible to judges), so a
 * scripted multi-step story plays out against the real agent.
 */
export default function SimulationsDock(props: SimulationsDockProps) {
  return (
    <>
      <button
        onClick={() => props.setOpen(!props.open)}
        title="Scripted demo stories"
        className="fixed bottom-4 left-4 z-50 cursor-pointer rounded-xl border border-white/10 bg-slate-900/90 px-4 py-2.5 text-sm font-semibold text-slate-200 shadow-xl shadow-black/50 backdrop-blur transition hover:border-violet-500/50 hover:text-violet-200"
      >
        🎬 {props.open ? 'Hide demos' : 'Demo scripts'}
      </button>
      {props.open && <Dock {...props} />}
    </>
  )
}

function Dock({ client, chat, toasts, setOpen, onDone }: Omit<SimulationsDockProps, 'open'>) {
  const [sims, setSims] = useState<Simulation[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [run, setRun] = useState<RunState | null>(null)

  useEffect(() => {
    let cancelled = false
    client
      .simulations()
      .then((list) => {
        if (!cancelled) setSims(Array.isArray(list) ? list : [])
      })
      .catch((err: unknown) => {
        if (!cancelled) setLoadError(err instanceof Error ? err.message : 'failed to load simulations')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [client])

  const runSim = useCallback(
    async (sim: Simulation) => {
      if (run && !run.done) return
      chat.clearCompare()
      setRun({ simId: sim.id, step: 1, total: sim.steps.length, error: null, done: false })
      try {
        for (let i = 0; i < sim.steps.length; i++) {
          setRun({ simId: sim.id, step: i + 1, total: sim.steps.length, error: null, done: false })
          const step: SimulationStep = sim.steps[i]
          if (step.role === 'user') {
            const resp = await chat.send(step.content ?? '', true)
            if (!resp) throw new Error('chat request failed')
            pushChangeToasts(resp.changes ?? [], toasts.push)
          } else {
            // feedback steps rate the previous assistant message
            const prev = [...chat.messages]
              .reverse()
              .find((m) => m.role === 'assistant' && m.resp)
            const messageId = prev?.resp?.message_id
            if (!messageId) throw new Error('no assistant message to rate')
            await client.feedback({
              message_id: messageId,
              rating: step.rating ?? 'helpful',
              note: step.note,
            })
          }
        }
        setRun({ simId: sim.id, step: sim.steps.length + 1, total: sim.steps.length, error: null, done: true })
        toasts.push(`🎬 “${sim.title}” complete — check the memory panel!`, 'created')
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'failed'
        setRun((r) => (r ? { ...r, error: msg, done: true } : null))
        toasts.push(`Simulation failed: ${msg}`, 'error')
      } finally {
        onDone()
      }
    },
    [chat, client, onDone, run, toasts],
  )

  const busy = run !== null && !run.done

  return (
    <div className="fixed bottom-16 left-4 z-50 max-h-[70vh] w-[340px] overflow-y-auto rounded-xl border border-white/10 bg-slate-950/95 p-3 shadow-2xl shadow-black/60 backdrop-blur">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-bold tracking-tight text-slate-100">
          🎬 Scripted demo stories
        </span>
        <button onClick={() => setOpen(false)} className="cursor-pointer text-xs text-slate-500 hover:text-slate-300">
          ✕
        </button>
      </div>

      {loading && <p className="text-xs text-slate-500">loading scripts…</p>}
      {!loading && loadError && <p className="text-xs text-rose-300">{loadError}</p>}
      {!loading && !loadError && sims.length === 0 && (
        <p className="text-xs text-slate-500">No simulations available from the backend.</p>
      )}

      <div className="space-y-2">
        {sims.map((sim) => {
          const s = run && run.simId === sim.id ? run : null
          const userSteps = sim.steps.filter((st) => st.role === 'user').length
          return (
            <div key={sim.id} className="rounded-lg border border-white/10 bg-slate-900/70 p-2.5">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold text-slate-100">{sim.title}</p>
                  <p className="mt-0.5 text-[11px] leading-relaxed text-slate-400">{sim.description}</p>
                </div>
                <button
                  onClick={() => void runSim(sim)}
                  disabled={busy}
                  className="shrink-0 cursor-pointer rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {busy && run?.simId === sim.id ? `${run.step}/${run.total}` : 'Run'}
                </button>
              </div>
              <p className="mt-1 text-[9px] text-slate-600">
                {sim.steps.length} steps · {userSteps} sent via /api/agent/chat · plays into the live chat
              </p>
              {s && (
                <div className="mt-2">
                  <div className="h-1 overflow-hidden rounded-full bg-slate-700">
                    <div
                      className="h-full rounded-full bg-violet-500 transition-all"
                      style={{ width: `${Math.min(100, (s.step / Math.max(1, s.total)) * 100)}%` }}
                    />
                  </div>
                  {s.done && !s.error && <p className="mt-1 text-[10px] text-emerald-300">✔ done</p>}
                  {s.error && <p className="mt-1 text-[10px] text-rose-300">⚠ {s.error}</p>}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
