import type { ChatMsg, ComparePair } from '../hooks/useChat'
import EvidenceStrip from './EvidenceStrip'

/**
 * Side-by-side "With memory" vs "Without memory" card — the flagship demo
 * beat: one click replays the identical request in a fresh conversation with
 * memory disabled, so judges see memory changing the very next reply.
 */
export default function CompareCard({ pair, withMsg }: { pair: ComparePair; withMsg: ChatMsg }) {
  const withCount = withMsg.resp?.retrieved?.length ?? 0

  return (
    <div className="fade-in rounded-xl border border-violet-500/40 bg-violet-950/20 p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-violet-300">
          🔬 A/B — same request, without memory
        </span>
        <span className="text-[9px] text-slate-500">
          prompt: “{pair.prompt}” · replayed in a new conversation (use_memory=false)
        </span>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <div className="rounded-lg border border-violet-500/30 bg-slate-900/80 p-3">
          <div className="mb-1 text-[9px] font-bold uppercase tracking-wider text-violet-300">
            ✅ With memory {withCount > 0 && `· ${withCount} memories used`}
          </div>
          <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-slate-100">
            {withMsg.text}
          </p>
          {withMsg.resp && <EvidenceStrip retrieved={withMsg.resp.retrieved ?? []} changes={withMsg.resp.changes ?? []} />}
        </div>

        <div className="rounded-lg border border-white/10 bg-slate-950/60 p-3">
          <div className="mb-1 text-[9px] font-bold uppercase tracking-wider text-slate-500">
            🚫 Without memory (fresh brain, same request)
          </div>
          <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-slate-300">
            {pair.without.reply}
          </p>
          <div className="mt-2 rounded-lg px-2 py-1 text-[10px] text-slate-500">
            no evidence strip — nothing persisted, nothing recalled
          </div>
        </div>
      </div>
    </div>
  )
}
