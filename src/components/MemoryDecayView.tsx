'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  TrendingUp,
  RefreshCw,
  Zap,
  Clock,
  ShieldCheck,
  AlertCircle,
  HelpCircle,
  Activity,
} from 'lucide-react';
import { DecayAnalyticsReport } from '@/types/agent';

interface MemoryDecayViewProps {
  workspaceId: string;
  onRefreshMemories?: () => void;
}

export default function MemoryDecayView({ workspaceId, onRefreshMemories }: MemoryDecayViewProps) {
  const [report, setReport] = useState<DecayAnalyticsReport | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [reinforcingId, setReinforcingId] = useState<string | null>(null);

  const fetchAnalytics = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/memories/decay?workspaceId=${workspaceId}`);
      if (res.ok) {
        const data = await res.json();
        setReport(data);
      }
    } catch (err) {
      console.error('Decay fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const handleReinforce = async (memoryId: string) => {
    setReinforcingId(memoryId);
    try {
      const res = await fetch('/api/memories/decay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memoryId }),
      });
      if (res.ok) {
        await fetchAnalytics();
        onRefreshMemories?.();
      }
    } catch (err) {
      console.error('Reinforce error:', err);
    } finally {
      setReinforcingId(null);
    }
  };

  return (
    <div className="flex flex-col h-full rounded-2xl border border-white/[0.08] bg-[#0d1017]/90 backdrop-blur-xl shadow-2xl shadow-black/50 overflow-hidden">
      {/* Header */}
      <div className="px-5 py-3 border-b border-white/[0.08] bg-[#111520]/80 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center text-[#00ed64]">
            <TrendingUp className="w-3.5 h-3.5" />
          </div>
          <div>
            <h2 className="text-xs font-semibold text-white flex items-center gap-2">
              <span>Ebbinghaus Memory Decay Engine</span>
              <span className="text-[9px] font-mono font-bold bg-white/[0.06] text-slate-300 px-1.5 py-0.2 rounded">
                MongoDB Aggregation Pipeline
              </span>
            </h2>
            <p className="text-[11px] text-slate-400">
              Spaced-repetition reinforcement & exponential retention decay telemetry
            </p>
          </div>
        </div>

        <button
          onClick={fetchAnalytics}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.06] transition"
          title="Refresh Decay Scores"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Math Formula Card */}
      <div className="px-5 py-2.5 bg-[#090b10] border-b border-white/[0.06] flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 text-slate-300 text-[11px]">
          <Activity className="w-3.5 h-3.5 text-[#00ed64]" />
          <span className="text-slate-400">Decay Formula:</span>
          <code className="bg-[#141824] text-emerald-400 px-2 py-0.5 rounded border border-white/[0.08] font-mono text-[10px]">
            Retention = exp(- &Delta;t / (&tau; &middot; (1 + ln(1 + N))))
          </code>
        </div>
        <div className="text-[10px] text-slate-400 font-mono">
          Half-Life (&tau;): <strong className="text-white">48 hours</strong>
        </div>
      </div>

      {/* Metrics Row */}
      {report && (
        <div className="p-3.5 grid grid-cols-3 gap-2.5 border-b border-white/[0.06] bg-[#0f121a]">
          <div className="p-3 rounded-xl bg-[#121622] border border-white/[0.08] shadow-sm">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider font-medium">
              Bank Retention Health
            </span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-xl font-bold text-[#00ed64] font-mono">
                {report.overallHealthScore}%
              </span>
              <span className="text-[10px] text-slate-500 font-mono">avg</span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-[#121622] border border-white/[0.08] shadow-sm">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider font-medium">
              High Retention
            </span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-xl font-bold text-sky-400 font-mono">
                {report.reinforcedCount}
              </span>
              <span className="text-[10px] text-slate-500 font-mono">boosted</span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-[#121622] border border-white/[0.08] shadow-sm">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider font-medium">
              Decaying / Stale
            </span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-xl font-bold text-amber-400 font-mono">
                {report.decayingCount}
              </span>
              <span className="text-[10px] text-slate-500 font-mono">needs recall</span>
            </div>
          </div>
        </div>
      )}

      {/* Memory Items with Retention Bars */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-2.5">
        {report?.memoriesWithScores && report.memoriesWithScores.length > 0 ? (
          report.memoriesWithScores.map((mem) => {
            const retentionPct = Math.round(mem.retentionScore * 100);
            const isReinforcing = reinforcingId === mem.memoryId;

            return (
              <div
                key={mem.memoryId}
                className="p-3.5 rounded-xl bg-[#121622] border border-white/[0.08] space-y-2 text-xs hover:border-white/[0.16] transition shadow-sm"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase bg-emerald-500/10 text-[#00ed64] border border-emerald-500/20 font-mono">
                      {mem.type}
                    </span>
                    <h4 className="font-semibold text-white text-xs truncate max-w-xs">
                      {mem.title}
                    </h4>
                  </div>

                  <button
                    onClick={() => handleReinforce(mem.memoryId)}
                    disabled={isReinforcing}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#161c28] hover:bg-[#1f283c] text-[#00ed64] border border-white/[0.08] hover:border-emerald-500/40 text-[10px] font-semibold transition active:scale-95 shadow-sm"
                    title="Simulate spaced-repetition recall to boost memory strength"
                  >
                    <Zap className="w-3 h-3 text-[#00ed64]" />
                    <span>{isReinforcing ? 'Boosting...' : 'Reinforce'}</span>
                  </button>
                </div>

                {/* Retention Bar */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[10px] text-slate-400">
                    <span>
                      Retention Strength: <strong className="text-white font-mono">{retentionPct}%</strong>
                    </span>
                    <span className="font-mono text-slate-400">
                      Recalls: <strong className="text-white">{mem.accessCount}x</strong> &bull; Age: {mem.ageHours}h
                    </span>
                  </div>
                  <div className="w-full bg-[#090b10] h-1.5 rounded-full overflow-hidden border border-white/[0.06]">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        retentionPct >= 75
                          ? 'bg-[#00ed64]'
                          : retentionPct >= 40
                          ? 'bg-amber-400'
                          : 'bg-rose-500'
                      }`}
                      style={{ width: `${retentionPct}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="py-12 flex flex-col items-center justify-center text-center text-slate-400">
            <Clock className="w-8 h-8 text-slate-600 mb-2 stroke-1" />
            <p className="text-xs">No active memories to analyze for decay</p>
          </div>
        )}
      </div>
    </div>
  );
}
