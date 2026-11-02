'use client';

import React, { useState } from 'react';
import {
  AlertOctagon,
  Zap,
  Activity,
  CheckCircle2,
  Clock,
  ShieldAlert,
  ArrowRight,
  Database,
  Layers,
} from 'lucide-react';
import { IncidentResolutionReport } from '@/types/simulator';
import { RetrievedMemory } from '@/types/memory';

interface IncidentSimulatorViewProps {
  workspaceId: string;
  onInspectMemory: (memory: RetrievedMemory) => void;
  onRefreshMemories: () => void;
}

export default function IncidentSimulatorView({
  workspaceId,
  onInspectMemory,
  onRefreshMemories,
}: IncidentSimulatorViewProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [report, setReport] = useState<IncidentResolutionReport | null>(null);

  const handleTriggerSelfHealing = async () => {
    setIsRunning(true);
    try {
      const res = await fetch('/api/simulator/incident', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          incidentType: 'connection_pool_exhaustion',
          workspaceId,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setReport(data);
        onRefreshMemories();
      }
    } catch (err) {
      console.error('Incident simulation error:', err);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="flex flex-col h-full rounded-2xl border border-white/[0.08] bg-[#0d1017]/90 backdrop-blur-xl shadow-2xl shadow-black/50 overflow-hidden">
      {/* Header */}
      <div className="px-5 py-3 border-b border-white/[0.08] bg-[#111520]/80 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/25 flex items-center justify-center text-amber-400">
            <ShieldAlert className="w-3.5 h-3.5" />
          </div>
          <div>
            <h2 className="text-xs font-semibold text-white flex items-center gap-2">
              <span>SRE Incident Self-Healing Simulator</span>
              <span className="text-[9px] font-mono font-bold bg-white/[0.06] text-slate-300 px-1.5 py-0.2 rounded">
                Automated Runbook
              </span>
            </h2>
            <p className="text-[11px] text-slate-400">
              Autonomous incident resolution guided by historical post-mortems in MongoDB
            </p>
          </div>
        </div>

        {report && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-[#00ed64] text-[11px] font-semibold font-mono">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>INCIDENT RESOLVED</span>
          </div>
        )}
      </div>

      {/* Main Incident Console */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
        {/* Outage Alert Card */}
        <div className="p-4 rounded-xl bg-[#121622] border border-rose-500/30 space-y-3 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-500 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500" />
              </span>
              <span className="text-xs font-semibold uppercase tracking-wider text-rose-400 flex items-center gap-1.5 font-mono">
                <AlertOctagon className="w-3.5 h-3.5" /> Active Outage Telemetry
              </span>
            </div>
            <span className="px-2 py-0.5 rounded bg-rose-500/10 text-rose-300 text-[10px] font-mono border border-rose-500/25 font-bold">
              P1-CRITICAL
            </span>
          </div>

          <div>
            <h3 className="font-semibold text-white text-sm">
              MongoDB Connection Pool Saturation & 504 Gateway Timeouts
            </h3>
            <p className="text-slate-300/80 text-xs mt-1 leading-relaxed">
              Sudden traffic spike overwhelmed default MongoClient pool size (5 slots). Request queue latency exceeded 4,000ms.
            </p>
          </div>

          {/* Telemetry Before vs After */}
          <div className="grid grid-cols-3 gap-2.5 pt-1 text-center font-mono">
            <div className="p-2.5 rounded-lg bg-[#090b10] border border-white/[0.08]">
              <span className="text-[10px] text-slate-400 block font-sans">P99 Latency</span>
              <span className={`text-base font-bold ${report ? 'text-[#00ed64]' : 'text-rose-400'}`}>
                {report ? '12 ms' : '4,320 ms'}
              </span>
            </div>
            <div className="p-2.5 rounded-lg bg-[#090b10] border border-white/[0.08]">
              <span className="text-[10px] text-slate-400 block font-sans">Pool Saturation</span>
              <span className={`text-base font-bold ${report ? 'text-[#00ed64]' : 'text-rose-400'}`}>
                {report ? '24%' : '100%'}
              </span>
            </div>
            <div className="p-2.5 rounded-lg bg-[#090b10] border border-white/[0.08]">
              <span className="text-[10px] text-slate-400 block font-sans">Active Connections</span>
              <span className="text-base font-bold text-sky-400">
                {report ? '12 / 50' : '5 / 5 (Max)'}
              </span>
            </div>
          </div>

          {/* Trigger Button */}
          {!report && (
            <div className="pt-2 flex justify-end">
              <button
                onClick={handleTriggerSelfHealing}
                disabled={isRunning}
                className="bg-[#00ed64] hover:bg-[#00dc5c] text-[#08090d] font-semibold px-4 py-2 rounded-xl transition shadow-emerald-glow active:scale-95 flex items-center gap-2 text-xs"
              >
                <Zap className="w-3.5 h-3.5 fill-current" />
                <span>{isRunning ? 'Consulting MongoDB Runbooks...' : 'Trigger Autonomous Self-Healing'}</span>
              </button>
            </div>
          )}
        </div>

        {/* Remediation Timeline */}
        {report && (
          <div className="space-y-3 pt-1">
            <h4 className="font-semibold text-white text-xs uppercase tracking-wider flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-emerald-400" />
              Autonomous Self-Healing Execution Timeline ({report.steps.length} Steps)
            </h4>

            <div className="space-y-2">
              {report.steps.map((step) => (
                <div
                  key={step.stepIndex}
                  className="p-3.5 rounded-xl bg-[#121622] border border-white/[0.08] text-xs space-y-1.5 shadow-sm"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-emerald-500/10 text-[#00ed64] border border-emerald-500/25 flex items-center justify-center font-bold text-[10px] font-mono">
                        {step.stepIndex}
                      </span>
                      <h5 className="font-semibold text-white text-xs">{step.title}</h5>
                    </div>
                    <span className="text-[10px] font-mono text-slate-500">{step.timestamp}</span>
                  </div>

                  <p className="text-slate-300 text-[11px] leading-relaxed pl-7">
                    {step.detail}
                  </p>

                  {/* Recalled Memory Pill */}
                  {step.recalledMemory && (
                    <div className="ml-7 pt-1 flex items-center gap-2">
                      <span className="text-[10px] text-slate-400 flex items-center gap-1">
                        <Layers className="w-3 h-3 text-amber-400" /> Recalled Post-Mortem:
                      </span>
                      <button
                        onClick={() => onInspectMemory(step.recalledMemory!)}
                        className="text-[10px] font-semibold text-amber-400 hover:underline"
                      >
                        &ldquo;{step.recalledMemory.title}&rdquo;
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Knowledge Loop Closure Card */}
            {report.newMemoryLogged && (
              <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-2.5 text-[#00ed64]">
                  <Database className="w-4 h-4 flex-shrink-0" />
                  <span className="text-xs text-slate-200">
                    Episodic Memory Indexed into MongoDB: <strong className="text-white">&ldquo;{report.newMemoryLogged.title}&rdquo;</strong>
                  </span>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-emerald-500/20 text-[#00ed64] border border-emerald-500/30">
                  Closed-Loop
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
