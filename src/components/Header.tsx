'use client';

import React from 'react';
import {
  Database,
  Activity,
  RefreshCw,
  Sparkles,
  MessageSquare,
  Users,
  TrendingUp,
  GitPullRequest,
  ShieldAlert,
  FileText,
} from 'lucide-react';

export type AppViewMode = 'chat' | 'multi-agent' | 'code-review' | 'incident' | 'decay';

interface HeaderProps {
  isStreaming: boolean;
  onReset: () => void;
  onSeedDemo: () => void;
  workspaceId: string;
  setWorkspaceId: (id: string) => void;
  activeView: AppViewMode;
  setActiveView: (view: AppViewMode) => void;
}

export default function Header({
  isStreaming,
  onReset,
  onSeedDemo,
  workspaceId,
  setWorkspaceId,
  activeView,
  setActiveView,
}: HeaderProps) {
  return (
    <header className="border-b border-emerald-950/80 bg-[#001e2b]/95 backdrop-blur sticky top-0 z-50 px-4 lg:px-8 py-3 flex flex-wrap items-center justify-between gap-4">
      {/* Brand & Track */}
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-[#00ed64] to-emerald-500 flex items-center justify-center text-[#001e2b] font-bold shadow-lg shadow-emerald-500/20">
          <Database className="w-5 h-5 stroke-[2.5]" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-bold text-lg text-white tracking-tight flex items-center gap-1.5">
              Synapse<span className="text-[#00ed64]">Memory</span>
            </h1>
            <span className="text-[10px] font-semibold uppercase tracking-wider bg-emerald-950 text-[#00ed64] border border-emerald-500/30 px-2 py-0.5 rounded-full">
              Track 1: Agentic Memory
            </span>
          </div>
          <p className="text-[11px] text-slate-400">
            Autonomous Memory Platform powered by MongoDB Atlas
          </p>
        </div>
      </div>

      {/* Center Navigation Tabs */}
      <div className="flex items-center p-1 rounded-xl bg-[#00141d] border border-emerald-950/80 overflow-x-auto no-scrollbar">
        <button
          onClick={() => setActiveView('chat')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
            activeView === 'chat'
              ? 'bg-[#002738] text-[#00ed64] shadow-sm border border-emerald-500/30'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <MessageSquare className="w-3.5 h-3.5" />
          <span>Interactive Copilot</span>
        </button>

        <button
          onClick={() => setActiveView('multi-agent')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
            activeView === 'multi-agent'
              ? 'bg-[#002738] text-[#00ed64] shadow-sm border border-emerald-500/30'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Multi-Agent Room</span>
          <span className="w-1.5 h-1.5 rounded-full bg-[#00ed64] animate-pulse" />
        </button>

        <button
          onClick={() => setActiveView('code-review')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
            activeView === 'code-review'
              ? 'bg-[#002738] text-[#00ed64] shadow-sm border border-emerald-500/30'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <GitPullRequest className="w-3.5 h-3.5" />
          <span>PR Code Guard</span>
        </button>

        <button
          onClick={() => setActiveView('incident')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
            activeView === 'incident'
              ? 'bg-[#002738] text-[#00ed64] shadow-sm border border-emerald-500/30'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
          <span>SRE Self-Healing</span>
        </button>

        <button
          onClick={() => setActiveView('decay')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
            activeView === 'decay'
              ? 'bg-[#002738] text-[#00ed64] shadow-sm border border-emerald-500/30'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <TrendingUp className="w-3.5 h-3.5" />
          <span>Decay Engine</span>
        </button>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-2">
        <div className="hidden sm:flex items-center gap-2 bg-[#002738] border border-emerald-900/60 px-2.5 py-1.5 rounded-lg text-xs">
          <span
            className={`w-2 h-2 rounded-full ${
              isStreaming ? 'bg-[#00ed64] animate-ping' : 'bg-amber-400'
            }`}
          />
          <Activity className="w-3.5 h-3.5 text-[#00ed64]" />
          <span className="text-slate-300 text-[11px]">
            Change Streams:{' '}
            <strong className="text-white font-medium">
              {isStreaming ? 'Live' : 'Polling'}
            </strong>
          </span>
        </div>

        <a
          href="/SynapseMemory_Project_Report.pdf"
          download="SynapseMemory_Project_Report.pdf"
          className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-2 rounded-lg bg-emerald-950 text-[#00ed64] border border-emerald-500/30 hover:bg-emerald-900/50 transition active:scale-95"
          title="Download Project Report PDF"
        >
          <FileText className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">PDF Report</span>
        </a>

        <button
          onClick={onSeedDemo}
          className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg bg-[#00ed64] text-[#001e2b] hover:bg-[#00c954] transition shadow-md shadow-emerald-500/20 active:scale-95"
          title="Seed all 4 hackathon demo scenarios"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Load Demo Scenarios</span>
          <span className="sm:hidden">Seed</span>
        </button>

        <button
          onClick={onReset}
          className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 transition active:scale-95 border border-slate-700"
          title="Reset workspace memories"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>
    </header>
  );
}
