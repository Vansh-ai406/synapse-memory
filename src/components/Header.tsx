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
  ChevronRight,
  Zap,
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
  const navItems = [
    { id: 'chat' as AppViewMode, label: 'Copilot', icon: MessageSquare },
    { id: 'multi-agent' as AppViewMode, label: 'Multi-Agent', icon: Users, badge: '3' },
    { id: 'code-review' as AppViewMode, label: 'PR Guard', icon: GitPullRequest },
    { id: 'incident' as AppViewMode, label: 'SRE Outage', icon: ShieldAlert },
    { id: 'decay' as AppViewMode, label: 'Decay Engine', icon: TrendingUp },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/[0.08] bg-[#090b10]/80 backdrop-blur-xl px-4 lg:px-7 py-2.5">
      <div className="max-w-[1750px] mx-auto flex flex-wrap items-center justify-between gap-3">
        {/* Left: Brand Identity & Breadcrumb */}
        <div className="flex items-center gap-3">
          <div className="relative group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#00ed64] to-emerald-600 flex items-center justify-center text-[#08090d] font-bold shadow-lg shadow-emerald-500/20 group-hover:scale-105 transition-transform duration-200">
              <Database className="w-4 h-4 stroke-[2.6]" />
            </div>
            <div className="absolute -inset-0.5 rounded-xl bg-emerald-500/30 blur-sm -z-10 group-hover:bg-emerald-500/50 transition-colors" />
          </div>

          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm text-white tracking-tight flex items-center">
                Synapse<span className="text-[#00ed64]">Memory</span>
              </span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
              <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 text-[#00ed64] border border-emerald-500/25 font-semibold">
                Track 1
              </span>
            </div>
            <span className="text-[11px] text-slate-400 font-normal">
              Autonomous Agentic Memory • MongoDB Atlas
            </span>
          </div>
        </div>

        {/* Center: Sleek Segmented Pill Control */}
        <nav className="flex items-center p-1 rounded-xl bg-[#121622]/90 border border-white/[0.08] shadow-inner-glow overflow-x-auto no-scrollbar">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveView(item.id)}
                className={`relative flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all duration-200 ${
                  isActive
                    ? 'text-white bg-white/[0.10] shadow-sm border border-white/[0.14]'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
                }`}
              >
                <Icon
                  className={`w-3.5 h-3.5 transition-colors ${
                    isActive ? 'text-[#00ed64]' : 'text-slate-400'
                  }`}
                />
                <span>{item.label}</span>
                {item.badge && (
                  <span
                    className={`text-[9px] px-1.5 py-0.2 rounded font-mono font-bold ${
                      isActive
                        ? 'bg-[#00ed64]/20 text-[#00ed64]'
                        : 'bg-white/[0.06] text-slate-400'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Right: Telemetry & Actions */}
        <div className="flex items-center gap-2">
          {/* Live Stream Beacon */}
          <div className="hidden sm:flex items-center gap-2 bg-[#121622] border border-white/[0.08] px-2.5 py-1.5 rounded-lg text-xs">
            <span className="relative flex h-2 w-2">
              {isStreaming && (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00ed64] opacity-75" />
              )}
              <span
                className={`relative inline-flex rounded-full h-2 w-2 ${
                  isStreaming ? 'bg-[#00ed64]' : 'bg-amber-400'
                }`}
              />
            </span>
            <span className="text-[11px] text-slate-300 font-medium">
              Change Streams:{' '}
              <span className={isStreaming ? 'text-[#00ed64]' : 'text-amber-400'}>
                {isStreaming ? 'Live' : 'Polling'}
              </span>
            </span>
          </div>

          {/* PDF Report Link */}
          <a
            href="/SynapseMemory_Project_Report.pdf"
            download="SynapseMemory_Project_Report.pdf"
            className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg bg-[#141824] hover:bg-[#1a2030] text-slate-200 border border-white/[0.08] hover:border-white/[0.16] transition active:scale-95 shadow-sm"
            title="Download 3-Page Publication PDF Report"
          >
            <FileText className="w-3.5 h-3.5 text-[#00ed64]" />
            <span className="hidden md:inline text-[11px]">Report</span>
          </a>

          {/* Seed Demo Button */}
          <button
            onClick={onSeedDemo}
            className="relative group flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-[#00ed64] hover:bg-[#00dc5c] text-[#08090d] shadow-emerald-glow transition-all active:scale-95"
            title="Load Hackathon Demo Scenarios into MongoDB"
          >
            <Sparkles className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Seed Scenarios</span>
          </button>

          {/* Reset Workspace Button */}
          <button
            onClick={onReset}
            className="p-1.5 rounded-lg bg-[#141824] hover:bg-rose-950/40 hover:text-rose-400 text-slate-400 border border-white/[0.08] hover:border-rose-900/60 transition active:scale-95"
            title="Clear all memories in workspace"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </header>
  );
}
