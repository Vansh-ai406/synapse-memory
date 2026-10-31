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
    <div className="flex flex-col h-full bg-[#001721] rounded-2xl border border-emerald-950/80 shadow-2xl overflow-hidden">
      {/* Header */}
      <div className="px-5 py-3.5 border-b border-emerald-950/60 bg-[#001c27] flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-amber-950 border border-amber-500/40 flex items-center justify-center text-amber-400">
            <ShieldAlert className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              SRE Adaptive Incident Self-Healing
              <span className="text-[10px] font-semibold bg-amber-950 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full">
                Runbook Automation
              </span>
            </h2>
            <p className="text-[11px] text-slate-400">
              Autonomous incident resolution guided by historical post-mortems in MongoDB
            </p>
          </div>
        </div>

        {report && (
          <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-emerald-950 border border-emerald-500/40 text-[#00ed64] text-xs font-semibold">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>INCIDENT MITIGATED</span>
          </div>
        )}
      </div>

      {/* Main Incident Console */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
        {/* Outage Alert Card */}
        <div className="p-4 rounded-xl bg-gradient-to-r from-rose-950/40 to-[#002230] border border-rose-500/40 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
              <span className="text-xs font-bold uppercase tracking-wider text-rose-400 flex items-center gap-1.5">
                <AlertOctagon className="w-4 h-4" /> Active Incident Simulation
              </span>
            </div>
            <span className="px-2 py-0.5 rounded bg-rose-950 text-rose-300 text-[10px] font-mono border border-rose-800">
              P1-CRITICAL
            </span>
          </div>

          <div>
            <h3 className="font-bold text-white text-sm">
              MongoDB Connection Pool Saturation & 504 Cascades
            </h3>
            <p className="text-slate-300 text-xs mt-1 leading-relaxed">
              Traffic spike triggered connection exhaustion on port 27017. Default pool size (5) saturated; queue latency exceeded 4,000ms.
            </p>
          </div>

          {/* Telemetry Before vs After */}
          <div className="grid grid-cols-3 gap-2 pt-1 text-center font-mono">
            <div className="p-2.5 rounded-lg bg-[#001721] border border-emerald-950">
              <span className="text-[10px] text-slate-400 block">P99 Latency</span>
              <span className={`text-base font-bold ${report ? 'text-[#00ed64]' : 'text-rose-400'}`}>
                {report ? '12 ms' : '4,320 ms'}
              </span>
            </div>
            <div className="p-2.5 rounded-lg bg-[#001721] border border-emerald-950">
              <span className="text-[10px] text-slate-400 block">Pool Saturation</span>
              <span className={`text-base font-bold ${report ? 'text-[#00ed64]' : 'text-rose-400'}`}>
                {report ? '24%' : '100%'}
              </span>
            </div>
            <div className="p-2.5 rounded-lg bg-[#001721] border border-emerald-950">
              <span className="text-[10px] text-slate-400 block">Active Connections</span>
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
                className="bg-[#00ed64] hover:bg-[#00c954] text-[#001e2b] font-bold px-4 py-2.5 rounded-xl transition shadow-lg shadow-emerald-500/20 active:scale-95 flex items-center gap-2 text-xs"
              >
                <Zap className="w-4 h-4 fill-current" />
                <span>{isRunning ? 'Consulting MongoDB Runbooks...' : 'Trigger Autonomous SRE Self-Healing'}</span>
              </button>
            </div>
          )}
        </div>

        {/* Remediation Timeline */}
        {report && (
          <div className="space-y-3 pt-2">
            <h4 className="font-bold text-white text-xs uppercase tracking-wider flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-emerald-400" />
              Autonomous Self-Healing Execution Timeline ({report.steps.length} Steps)
            </h4>

            <div className="space-y-2.5">
              {report.steps.map((step) => (
                <div
                  key={step.stepIndex}
                  className="p-3.5 rounded-xl bg-[#002230] border border-emerald-950 text-xs space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-emerald-950 text-[#00ed64] border border-emerald-500/30 flex items-center justify-center font-bold text-[10px]">
                        {step.stepIndex}
                      </span>
                      <h5 className="font-bold text-white text-xs">{step.title}</h5>
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
              <div className="p-3.5 rounded-xl bg-emerald-950/30 border border-emerald-500/40 text-xs flex items-center justify-between">
                <div className="flex items-center gap-2 text-[#00ed64]">
                  <Database className="w-4 h-4 flex-shrink-0" />
                  <span className="text-xs text-slate-200">
                    New Incident Resolution Indexed into MongoDB: <strong className="text-white">&ldquo;{report.newMemoryLogged.title}&rdquo;</strong>
                  </span>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-950 text-[#00ed64] border border-emerald-500/30">
                  Episodic Memory
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

