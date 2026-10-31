'use client';

import React, { useState } from 'react';
import {
  Users,
  Shield,
  Activity,
  Sparkles,
  ArrowRight,
  Layers,
  ChevronRight,
} from 'lucide-react';
import { MultiAgentSessionResult } from '@/types/agent';
import { RetrievedMemory } from '@/types/memory';

interface MultiAgentViewProps {
  workspaceId: string;
  onInspectMemory: (memory: RetrievedMemory) => void;
}

export default function MultiAgentView({
  workspaceId,
  onInspectMemory,
}: MultiAgentViewProps) {
  const [goal, setGoal] = useState(
    'Architect and configure our new high-concurrency payment processing service connected to MongoDB Atlas.'
  );
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<MultiAgentSessionResult | null>(null);

  const handleRunDeliberation = async (overrideGoal?: string) => {
    const activeGoal = overrideGoal || goal;
    if (!activeGoal.trim() || isRunning) return;

    setIsRunning(true);
    try {
      const res = await fetch('/api/multi-agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ goal: activeGoal, workspaceId }),
      });
      if (res.ok) {
        const data = await res.json();
        setResult(data);
      }
    } catch (err) {
      console.error('Deliberation error:', err);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#001721] rounded-2xl border border-emerald-950/80 shadow-2xl overflow-hidden">
      {/* Header */}
      <div className="px-5 py-3.5 border-b border-emerald-950/60 bg-[#001c27] flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-950 border border-[#00ed64]/40 flex items-center justify-center text-[#00ed64]">
            <Users className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              Multi-Agent Memory Consensus
              <span className="text-[10px] font-semibold bg-emerald-950 text-[#00ed64] border border-emerald-500/30 px-2 py-0.5 rounded-full">
                3 Autonomous Agents
              </span>
            </h2>
            <p className="text-[11px] text-slate-400">
              Agents share the same MongoDB Memory Bank, negotiate constraints, and resolve conflicts
            </p>
          </div>
        </div>

        {result && (
          <div className="flex items-center gap-2 bg-[#002738] border border-emerald-900/60 px-3 py-1 rounded-lg text-xs">
            <span className="text-slate-400 text-[11px]">Consensus Score:</span>
            <strong className="text-[#00ed64] font-mono text-sm">
              {result.consensusScore}%
            </strong>
          </div>
        )}
      </div>

      {/* Suggested Multi-Agent Goals */}
      <div className="px-4 py-2 bg-[#00141d] border-b border-emerald-950/40 flex items-center gap-2 overflow-x-auto text-xs no-scrollbar">
        <span className="text-[11px] font-semibold text-emerald-400 flex items-center gap-1 flex-shrink-0">
          <Sparkles className="w-3 h-3" /> Scenarios:
        </span>
        <button
          onClick={() => {
            const g = 'Architect high-concurrency payment service connected to MongoDB Atlas';
            setGoal(g);
            handleRunDeliberation(g);
          }}
          className="whitespace-nowrap px-2.5 py-1 rounded-md bg-[#002b3d] hover:bg-[#003850] text-slate-200 border border-emerald-900/50 transition text-[11px]"
        >
          1. High-Concurrency Payments
        </button>

        <button
          onClick={() => {
            const g = 'Review security posture and database connection protocols for public API';
            setGoal(g);
            handleRunDeliberation(g);
          }}
          className="whitespace-nowrap px-2.5 py-1 rounded-md bg-[#002b3d] hover:bg-[#003850] text-sky-200 border border-sky-900/50 transition text-[11px]"
        >
          2. Security & Zero-Trust Audit
        </button>

        <button
          onClick={() => {
            const g = 'Validate SRE incident mitigation and connection starvation protections';
            setGoal(g);
            handleRunDeliberation(g);
          }}
          className="whitespace-nowrap px-2.5 py-1 rounded-md bg-[#002b3d] hover:bg-[#003850] text-amber-200 border border-amber-900/50 transition text-[11px]"
        >
          3. Incident INC-402 Runbook Check
        </button>
      </div>

      {/* Deliberation Transcript */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
        {/* Active Agents Roster */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3 rounded-xl bg-[#002230] border border-emerald-500/30 flex items-start gap-2.5">
            <span className="text-2xl">🏗️</span>
            <div>
              <h4 className="font-bold text-white text-xs">Archi (Architect)</h4>
              <p className="text-[10px] text-emerald-400 mt-0.5">Enforces Native Driver & Schemas</p>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-[#002230] border border-sky-500/30 flex items-start gap-2.5">
            <span className="text-2xl">🛡️</span>
            <div>
              <h4 className="font-bold text-white text-xs">Aegis (Security)</h4>
              <p className="text-[10px] text-sky-400 mt-0.5">Enforces TLS 1.3 & Zero-Trust</p>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-[#002230] border border-amber-500/30 flex items-start gap-2.5">
            <span className="text-2xl">⚡</span>
            <div>
              <h4 className="font-bold text-white text-xs">Sentinel (SRE)</h4>
              <p className="text-[10px] text-amber-400 mt-0.5">Recalls INC-402 & Pool Limits</p>
            </div>
          </div>
        </div>

        {/* Deliberation Turns */}
        {result ? (
          <div className="space-y-4 pt-2">
            {result.turns.map((turn, idx) => (
              <div
                key={idx}
                className="rounded-xl p-4 bg-[#002230] border text-xs space-y-2.5 transition"
                style={{ borderColor: `${turn.agent.color}40` }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{turn.agent.avatar}</span>
                    <div>
                      <h4 className="font-bold text-white text-xs flex items-center gap-2">
                        {turn.agent.name}
                        <span className="text-[10px] text-slate-400 font-normal">
                          ({turn.agent.title})
                        </span>
                      </h4>
                    </div>
                  </div>

                  <span
                    className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider"
                    style={{
                      backgroundColor: `${turn.agent.color}15`,
                      color: turn.agent.color,
                      borderColor: `${turn.agent.color}40`,
                    }}
                  >
                    {turn.status}
                  </span>
                </div>

                <p className="text-slate-200 leading-relaxed text-xs">
                  {turn.content}
                </p>

                {/* Recalled Memories pills */}
                {turn.recalledMemories.length > 0 && (
                  <div className="pt-2 border-t border-emerald-950/60 flex flex-wrap items-center gap-1.5">
                    <span className="text-[10px] text-slate-400 mr-1 flex items-center gap-1">
                      <Layers className="w-3 h-3 text-emerald-400" />
                      Consulted Memories:
                    </span>
                    {turn.recalledMemories.map((rm, i) => (
                      <button
                        key={i}
                        onClick={() => onInspectMemory(rm)}
                        className="px-2 py-0.5 rounded bg-[#002b3d] hover:bg-[#003850] text-[#00ed64] border border-emerald-900/60 hover:border-emerald-500/50 text-[10px] font-medium flex items-center gap-1 transition"
                      >
                        <span>{rm.title}</span>
                        <ChevronRight className="w-2.5 h-2.5" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {/* Final Synthesis Card */}
            <div className="p-4 rounded-xl bg-gradient-to-br from-[#002738] to-[#001c27] border border-emerald-500/40 text-xs space-y-3 shadow-lg">
              <div className="flex items-center gap-2 text-[#00ed64] font-bold text-xs uppercase tracking-wider">
                <Sparkles className="w-4 h-4" /> Harmonized Action Plan
              </div>
              <div className="prose prose-invert max-w-none text-slate-200 text-xs">
                <div className="whitespace-pre-wrap">{result.finalSynthesis}</div>
              </div>
            </div>
          </div>
        ) : (
          <div className="py-12 flex flex-col items-center justify-center text-center text-slate-400">
            <Users className="w-10 h-10 text-slate-600 mb-2 stroke-1" />
            <p className="text-xs font-semibold text-slate-300">
              No Multi-Agent Deliberation Executed Yet
            </p>
            <p className="text-[11px] text-slate-500 max-w-xs mt-1">
              Click &quot;Run Multi-Agent Deliberation&quot; or choose a scenario above to watch 3 agents query shared MongoDB memory in real time!
            </p>
          </div>
        )}

        {isRunning && (
          <div className="flex items-center justify-center gap-2 text-emerald-400 text-xs py-6">
            <span className="w-2.5 h-2.5 rounded-full bg-[#00ed64] animate-ping" />
            <span>Agents negotiating via shared MongoDB Memory Bank...</span>
          </div>
        )}
      </div>

      {/* Goal Input & Submit */}
      <div className="p-3 bg-[#001c27] border-t border-emerald-950/80 flex items-center gap-2">
        <input
          type="text"
          value={goal}
          onChange={(e) => setGoal(e.target.value)}
          placeholder="State the cross-discipline engineering goal..."
          className="flex-1 bg-[#002738] text-white text-xs sm:text-sm rounded-xl px-4 py-3 border border-emerald-950 focus:outline-none focus:border-[#00ed64] placeholder:text-slate-500"
          disabled={isRunning}
        />
        <button
          onClick={() => handleRunDeliberation()}
          disabled={!goal.trim() || isRunning}
          className="bg-[#00ed64] hover:bg-[#00c954] disabled:opacity-40 text-[#001e2b] font-bold px-4 py-3 rounded-xl transition shadow-lg shadow-emerald-500/20 active:scale-95 flex items-center gap-1.5 flex-shrink-0 text-xs"
        >
          <span>Run Deliberation</span>
          <ArrowRight className="w-4 h-4 stroke-[2.5]" />
        </button>
      </div>
    </div>
  );
}

