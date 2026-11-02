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
  CheckCircle,
  Copy,
  Check,
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
  const [copied, setCopied] = useState(false);

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

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col h-full rounded-2xl border border-white/[0.08] bg-[#0d1017]/90 backdrop-blur-xl shadow-2xl shadow-black/50 overflow-hidden">
      {/* Header */}
      <div className="px-5 py-3 border-b border-white/[0.08] bg-[#111520]/80 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center text-[#00ed64]">
            <Users className="w-3.5 h-3.5" />
          </div>
          <div>
            <h2 className="text-xs font-semibold text-white flex items-center gap-2">
              <span>Multi-Agent Consensus Room</span>
              <span className="text-[9px] font-mono font-bold bg-white/[0.06] text-slate-300 px-1.5 py-0.2 rounded">
                3 Autonomous Agents
              </span>
            </h2>
            <p className="text-[11px] text-slate-400">
              Shared MongoDB Memory deliberation & conflict harmonizer
            </p>
          </div>
        </div>

        {result && (
          <div className="flex items-center gap-2 bg-[#161c28] border border-white/[0.08] px-3 py-1 rounded-full text-xs shadow-inner-glow">
            <span className="text-slate-400 text-[11px] font-medium">Consensus:</span>
            <span className="text-[#00ed64] font-mono font-bold text-xs">
              {result.consensusScore}%
            </span>
          </div>
        )}
      </div>

      {/* Suggested Multi-Agent Goals */}
      <div className="px-4 py-2 bg-[#090b10] border-b border-white/[0.06] flex items-center gap-2 overflow-x-auto text-xs no-scrollbar">
        <span className="text-[11px] font-medium text-slate-400 flex items-center gap-1 flex-shrink-0">
          <Sparkles className="w-3.5 h-3.5 text-[#00ed64]" /> Scenarios:
        </span>
        <button
          onClick={() => {
            const g = 'Architect high-concurrency payment service connected to MongoDB Atlas';
            setGoal(g);
            handleRunDeliberation(g);
          }}
          className="whitespace-nowrap px-2.5 py-1 rounded-md bg-[#141824] hover:bg-[#1b2234] text-slate-300 hover:text-white border border-white/[0.08] hover:border-white/[0.16] transition text-[11px] flex items-center gap-1.5"
        >
          <span className="font-mono text-[10px] text-emerald-400 bg-emerald-500/10 px-1 rounded">1</span>
          <span>High-Concurrency Payments</span>
        </button>

        <button
          onClick={() => {
            const g = 'Review security posture and database connection protocols for public API';
            setGoal(g);
            handleRunDeliberation(g);
          }}
          className="whitespace-nowrap px-2.5 py-1 rounded-md bg-[#141824] hover:bg-sky-950/40 text-sky-300 hover:text-sky-200 border border-sky-500/20 hover:border-sky-500/40 transition text-[11px] flex items-center gap-1.5"
        >
          <span className="font-mono text-[10px] text-sky-400 bg-sky-500/10 px-1 rounded">2</span>
          <span>Zero-Trust Security Audit</span>
        </button>

        <button
          onClick={() => {
            const g = 'Validate SRE incident mitigation and connection starvation protections';
            setGoal(g);
            handleRunDeliberation(g);
          }}
          className="whitespace-nowrap px-2.5 py-1 rounded-md bg-[#141824] hover:bg-amber-950/40 text-amber-300 hover:text-amber-200 border border-amber-500/20 hover:border-amber-500/40 transition text-[11px] flex items-center gap-1.5"
        >
          <span className="font-mono text-[10px] text-amber-400 bg-amber-500/10 px-1 rounded">3</span>
          <span>Incident INC-402 Check</span>
        </button>
      </div>

      {/* Deliberation Transcript */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3.5">
        {/* Active Agents Roster */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          <div className="p-3 rounded-xl bg-[#121622] border border-emerald-500/20 flex items-start gap-2.5 shadow-sm">
            <span className="text-xl">🏗️</span>
            <div>
              <h4 className="font-semibold text-white text-xs">Archi (Architect)</h4>
              <p className="text-[10px] text-emerald-400 font-medium mt-0.5">Enforces Native Driver & Schemas</p>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-[#121622] border border-sky-500/20 flex items-start gap-2.5 shadow-sm">
            <span className="text-xl">🛡️</span>
            <div>
              <h4 className="font-semibold text-white text-xs">Aegis (Security)</h4>
              <p className="text-[10px] text-sky-400 font-medium mt-0.5">Mandates TLS 1.3 & PrivateLink</p>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-[#121622] border border-amber-500/20 flex items-start gap-2.5 shadow-sm">
            <span className="text-xl">⚡</span>
            <div>
              <h4 className="font-semibold text-white text-xs">Sentinel (SRE)</h4>
              <p className="text-[10px] text-amber-400 font-medium mt-0.5">Recalls INC-402 & Pool Sizing</p>
            </div>
          </div>
        </div>

        {/* Deliberation Turns */}
        {result ? (
          <div className="space-y-3 pt-1">
            {result.turns.map((turn, idx) => (
              <div
                key={idx}
                className="rounded-xl p-3.5 bg-[#121622] border border-white/[0.08] text-xs space-y-2 transition shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-base">{turn.agent.avatar}</span>
                    <h4 className="font-semibold text-white text-xs flex items-center gap-1.5">
                      <span>{turn.agent.name}</span>
                      <span className="text-[10px] text-slate-400 font-normal">
                        • {turn.agent.title}
                      </span>
                    </h4>
                  </div>

                  <span
                    className="px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase tracking-wider"
                    style={{
                      backgroundColor: `${turn.agent.color}15`,
                      color: turn.agent.color,
                      border: `1px solid ${turn.agent.color}35`,
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
                  <div className="pt-2 border-t border-white/[0.05] flex flex-wrap items-center gap-1.5">
                    <span className="text-[10px] text-slate-400 mr-1 flex items-center gap-1">
                      <Layers className="w-3 h-3 text-emerald-400" />
                      Consulted Memories:
                    </span>
                    {turn.recalledMemories.map((rm, i) => (
                      <button
                        key={i}
                        onClick={() => onInspectMemory(rm)}
                        className="px-2 py-0.5 rounded bg-[#161c28] hover:bg-[#1c2436] text-[#00ed64] border border-white/[0.08] hover:border-emerald-500/40 text-[10px] font-medium flex items-center gap-1 transition"
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
            <div className="p-4 rounded-xl bg-[#111520] border border-emerald-500/30 text-xs space-y-2.5 shadow-lg relative">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-[#00ed64] font-semibold text-xs uppercase tracking-wider">
                  <CheckCircle className="w-3.5 h-3.5" /> Harmonized Action Plan
                </div>
                <button
                  onClick={() => handleCopy(result.finalSynthesis)}
                  className="flex items-center gap-1 px-2 py-1 rounded bg-[#161c28] hover:bg-[#1e2536] text-slate-300 hover:text-white border border-white/[0.08] text-[10px] transition"
                >
                  {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copied ? 'Copied' : 'Copy Plan'}</span>
                </button>
              </div>

              <div className="prose prose-invert max-w-none text-slate-200 text-xs">
                <div className="whitespace-pre-wrap font-sans leading-relaxed">{result.finalSynthesis}</div>
              </div>
            </div>
          </div>
        ) : (
          <div className="py-12 flex flex-col items-center justify-center text-center text-slate-400">
            <Users className="w-9 h-9 text-slate-600 mb-2 stroke-1" />
            <p className="text-xs font-semibold text-slate-300">
              No Multi-Agent Deliberation Executed Yet
            </p>
            <p className="text-[11px] text-slate-500 max-w-xs mt-1">
              Select a scenario above or click &quot;Run Deliberation&quot; to see 3 agents negotiate via shared MongoDB memory in real time.
            </p>
          </div>
        )}

        {isRunning && (
          <div className="flex items-center justify-center gap-2.5 text-emerald-400 text-xs py-5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00ed64] opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#00ed64]" />
            </span>
            <span className="font-medium text-slate-300">Agents negotiating via shared MongoDB Memory Bank...</span>
          </div>
        )}
      </div>

      {/* Goal Input & Submit */}
      <div className="p-3 bg-[#111520] border-t border-white/[0.08] flex items-center gap-2">
        <input
          type="text"
          value={goal}
          onChange={(e) => setGoal(e.target.value)}
          placeholder="State the cross-discipline engineering goal..."
          className="flex-1 bg-[#161c28] text-white text-xs sm:text-sm rounded-xl px-4 py-2.5 border border-white/[0.08] focus:outline-none focus:border-[#00ed64] placeholder:text-slate-500 transition-colors"
          disabled={isRunning}
        />
        <button
          onClick={() => handleRunDeliberation()}
          disabled={!goal.trim() || isRunning}
          className="bg-[#00ed64] hover:bg-[#00dc5c] disabled:opacity-40 text-[#08090d] font-semibold px-4 py-2.5 rounded-xl transition shadow-emerald-glow active:scale-95 flex items-center gap-1.5 flex-shrink-0 text-xs"
        >
          <span>Run Deliberation</span>
          <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
        </button>
      </div>
    </div>
  );
}
