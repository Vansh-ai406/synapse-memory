'use client';

import React from 'react';
import { Database, Activity, RefreshCw, Zap, Shield, Sparkles } from 'lucide-react';

interface HeaderProps {
  isStreaming: boolean;
  onReset: () => void;
  onSeedDemo: () => void;
  workspaceId: string;
  setWorkspaceId: (id: string) => void;
}

export default function Header({
  isStreaming,
  onReset,
  onSeedDemo,
  workspaceId,
  setWorkspaceId,
}: HeaderProps) {
  return (
    <header className="border-b border-emerald-950/80 bg-[#001e2b]/90 backdrop-blur sticky top-0 z-50 px-4 lg:px-8 py-3.5 flex flex-wrap items-center justify-between gap-4">
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
            <span className="text-[11px] font-semibold uppercase tracking-wider bg-emerald-950 text-[#00ed64] border border-emerald-500/30 px-2 py-0.5 rounded-full">
              Track 1: Agentic Memory
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Persistent Multi-Session Memory Engine powered by MongoDB Atlas
          </p>
        </div>
      </div>

      {/* Middle Status Indicators */}
      <div className="flex items-center gap-3">
        {/* Change Stream Status */}
        <div className="flex items-center gap-2 bg-[#002738] border border-emerald-900/60 px-3 py-1.5 rounded-lg text-xs">
          <span
            className={`w-2 h-2 rounded-full ${
              isStreaming ? 'bg-[#00ed64] animate-ping' : 'bg-amber-400'
            }`}
          />
          <Activity className="w-3.5 h-3.5 text-[#00ed64]" />
          <span className="text-slate-300">
            Change Streams:{' '}
            <strong className="text-white font-medium">
              {isStreaming ? 'Live' : 'Syncing'}
            </strong>
          </span>
        </div>

        {/* MongoDB Vector Search pill */}
        <div className="hidden sm:flex items-center gap-2 bg-[#002738] border border-emerald-900/60 px-3 py-1.5 rounded-lg text-xs">
          <Zap className="w-3.5 h-3.5 text-[#00ed64]" />
          <span className="text-slate-300">
            Vector Search: <strong className="text-white font-medium">Active</strong>
          </span>
        </div>

        {/* TTL Auto-Expiry Pill */}
        <div className="hidden md:flex items-center gap-2 bg-[#002738] border border-emerald-900/60 px-3 py-1.5 rounded-lg text-xs">
          <Shield className="w-3.5 h-3.5 text-[#00ed64]" />
          <span className="text-slate-300">
            TTL Index: <strong className="text-white font-medium">Auto-Purge</strong>
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <button
          onClick={onSeedDemo}
          className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg bg-[#00ed64] text-[#001e2b] hover:bg-[#00c954] transition shadow-md shadow-emerald-500/20 active:scale-95"
          title="Seed all 4 hackathon demo scenarios"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Load Demo Scenarios</span>
        </button>

        <button
          onClick={onReset}
          className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 transition active:scale-95 border border-slate-700"
          title="Reset workspace memories"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Reset</span>
        </button>
      </div>
    </header>
  );
}
