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
}

export default function MemoryDecayView({ workspaceId }: MemoryDecayViewProps) {
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
      }
    } catch (err) {
      console.error('Reinforce error:', err);
    } finally {
      setReinforcingId(null);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#001721] rounded-2xl border border-emerald-950/80 shadow-2xl overflow-hidden">
      {/* Header */}
      <div className="px-5 py-3.5 border-b border-emerald-950/60 bg-[#001c27] flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-950 border border-[#00ed64]/40 flex items-center justify-center text-[#00ed64]">
            <TrendingUp className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              Ebbinghaus Memory Decay Engine
              <span className="text-[10px] font-semibold bg-emerald-950 text-[#00ed64] border border-emerald-500/30 px-2 py-0.5 rounded-full">
                MongoDB Aggregation Pipeline
              </span>
            </h2>
            <p className="text-[11px] text-slate-400">
              Spaced-repetition reinforcement & exponential retention decay scoring
            </p>
          </div>
        </div>

        <button
          onClick={fetchAnalytics}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          title="Refresh Decay Scores"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Math Formula Card */}
      <div className="px-5 py-3 bg-[#00141d] border-b border-emerald-950/50 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 text-slate-300 text-[11px]">
          <Activity className="w-3.5 h-3.5 text-[#00ed64]" />
          <span>Decay Function:</span>
          <code className="bg-[#002738] text-emerald-400 px-2 py-0.5 rounded border border-emerald-900/60 font-mono text-[10px]">
            Retention = exp(- &Delta;t / (&tau; &middot; (1 + ln(1 + N))))
          </code>
        </div>
        <div className="text-[11px] text-slate-400">
          Half-Life (&tau;): <strong>48 hours</strong>
        </div>
      </div>

      {/* Metrics Row */}
      {report && (
        <div className="p-4 grid grid-cols-3 gap-3 border-b border-emerald-950/60 bg-[#001824]">
          <div className="p-3 rounded-xl bg-[#002230] border border-emerald-900/60">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
              Bank Retention Health
            </span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-xl font-bold text-[#00ed64] font-mono">
                {report.overallHealthScore}%
              </span>
              <span className="text-[10px] text-slate-400">weighted avg</span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-[#002230] border border-emerald-900/60">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
              High Retention
            </span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-xl font-bold text-sky-400 font-mono">
                {report.reinforcedCount}
              </span>
              <span className="text-[10px] text-slate-400">reinforced</span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-[#002230] border border-emerald-900/60">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
              Decaying / Stale
            </span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-xl font-bold text-amber-400 font-mono">
                {report.decayingCount}
              </span>
              <span className="text-[10px] text-slate-400">needs recall</span>
            </div>
          </div>
        </div>
      )}

      {/* Memory Items with Retention Bars */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3">
        {report?.memoriesWithScores && report.memoriesWithScores.length > 0 ? (
          report.memoriesWithScores.map((mem) => {
            const retentionPct = Math.round(mem.retentionScore * 100);
            const isReinforcing = reinforcingId === mem.memoryId;

            return (
              <div
                key={mem.memoryId}
                className="p-3.5 rounded-xl bg-[#002230] border border-emerald-950 space-y-2 text-xs hover:border-emerald-800/80 transition"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase bg-emerald-950 text-[#00ed64] border border-emerald-500/20">
                      {mem.type}
                    </span>
                    <h4 className="font-semibold text-white text-xs truncate max-w-xs">
                      {mem.title}
                    </h4>
                  </div>

                  <button
                    onClick={() => handleReinforce(mem.memoryId)}
                    disabled={isReinforcing}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#002b3d] hover:bg-[#003850] text-[#00ed64] border border-emerald-900/60 hover:border-emerald-500/50 text-[10px] font-semibold transition active:scale-95"
                    title="Simulate spaced-repetition recall to boost memory strength"
                  >
                    <Zap className="w-3 h-3 text-[#00ed64]" />
                    <span>{isReinforcing ? 'Boosting...' : 'Reinforce Recall'}</span>
                  </button>
                </div>

                {/* Retention Bar */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[10px] text-slate-400">
                    <span>
                      Retention Strength: <strong className="text-white">{retentionPct}%</strong>
                    </span>
                    <span>
                      Recalls: <strong>{mem.accessCount}x</strong> &bull; Age: {mem.ageHours}h
                    </span>
                  </div>
                  <div className="w-full bg-[#001721] h-2 rounded-full overflow-hidden border border-emerald-950">
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

