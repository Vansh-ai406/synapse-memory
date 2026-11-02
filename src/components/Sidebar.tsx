'use client';

import React from 'react';
import {
  Database,
  MessageSquare,
  Users,
  GitPullRequest,
  ShieldAlert,
  TrendingUp,
  Network,
  Layers,
  Sparkles,
  FileText,
  RefreshCw,
  Activity,
  ChevronRight,
  Server,
  Zap,
} from 'lucide-react';

export type StudioView =
  | 'chat'
  | 'multi-agent'
  | 'code-review'
  | 'incident'
  | 'decay'
  | 'graph'
  | 'explorer';

interface SidebarProps {
  activeView: StudioView;
  setActiveView: (view: StudioView) => void;
  isStreaming: boolean;
  onSeedDemo: () => void;
  onReset: () => void;
  workspaceId: string;
  setWorkspaceId: (id: string) => void;
  totalMemoriesCount: number;
}

export default function Sidebar({
  activeView,
  setActiveView,
  isStreaming,
  onSeedDemo,
  onReset,
  workspaceId,
  setWorkspaceId,
  totalMemoriesCount,
}: SidebarProps) {
  const agentNav = [
    {
      id: 'chat' as StudioView,
      label: 'Synapse Copilot',
      description: 'Multi-Session Memory & Rules',
      icon: MessageSquare,
      badge: null,
    },
    {
      id: 'multi-agent' as StudioView,
      label: 'Agent Deliberation',
      description: '3-Agent Consensus Engine',
      icon: Users,
      badge: '3 Agents',
    },
    {
      id: 'code-review' as StudioView,
      label: 'PR Architecture Guard',
      description: 'CI/CD Memory Compliance',
      icon: GitPullRequest,
      badge: null,
    },
    {
      id: 'incident' as StudioView,
      label: 'Autonomous SRE',
      description: 'INC-402 Self-Healing Runbook',
      icon: ShieldAlert,
      badge: 'P1 Outage',
    },
  ];

  const dataNav = [
    {
      id: 'decay' as StudioView,
      label: 'Memory Decay Engine',
      description: 'Ebbinghaus Aggregation Curves',
      icon: TrendingUp,
      badge: null,
    },
    {
      id: 'graph' as StudioView,
      label: 'Knowledge Graph',
      description: '2D Constellation Visualizer',
      icon: Network,
      badge: 'Physics',
    },
    {
      id: 'explorer' as StudioView,
      label: 'Memory Bank',
      description: 'MongoDB Documents & TTL Index',
      icon: Layers,
      badge: `${totalMemoriesCount}`,
    },
  ];

  return (
    <aside className="w-64 lg:w-72 flex-shrink-0 flex flex-col bg-[#0b0d13] border-r border-white/[0.07] h-screen sticky top-0 z-40 select-none">
      {/* Brand Header */}
      <div className="p-4 border-b border-white/[0.07] bg-[#0c0f17]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="relative group">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#00ed64] to-emerald-600 flex items-center justify-center text-[#08090d] shadow-md shadow-emerald-500/20">
                <Database className="w-4 h-4 stroke-[2.8]" />
              </div>
              <div className="absolute -inset-0.5 rounded-lg bg-emerald-500/30 blur-sm -z-10" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="font-semibold text-sm text-white tracking-tight">
                  Synapse<span className="text-[#00ed64]">Memory</span>
                </h1>
                <span className="text-[9px] font-mono font-semibold px-1.5 py-0.2 rounded bg-white/[0.06] text-slate-300">
                  v2.0
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-mono">
                MongoDB Atlas • Track 1
              </p>
            </div>
          </div>
        </div>

        {/* Workspace Selector Bar */}
        <div className="mt-3.5 flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-[#111520] border border-white/[0.07] text-[11px]">
          <div className="flex items-center gap-2 text-slate-300 overflow-hidden">
            <Server className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
            <span className="truncate font-mono text-[10px] text-slate-300">
              cluster / {workspaceId}
            </span>
          </div>
          <span className="w-2 h-2 rounded-full bg-[#00ed64] flex-shrink-0" />
        </div>
      </div>

      {/* Navigation Sections */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        {/* Section 1: Agentic Workspace */}
        <div className="space-y-1">
          <div className="px-2 text-[10px] font-mono uppercase tracking-wider text-slate-300 font-semibold mb-2">
            Agentic Workspace
          </div>
          {agentNav.map((item) => {
            const Icon = item.icon;
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveView(item.id)}
                className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-left transition-all group ${
                  isActive
                    ? 'bg-white/[0.08] text-white border border-white/[0.12] shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
                }`}
              >
                <div className="flex items-center gap-2.5 overflow-hidden">
                  <Icon
                    className={`w-4 h-4 flex-shrink-0 transition-colors ${
                      isActive ? 'text-[#00ed64]' : 'text-slate-300 group-hover:text-slate-200'
                    }`}
                  />
                  <div className="truncate">
                    <span className="text-xs font-medium block leading-none">
                      {item.label}
                    </span>
                    <span className="text-[10px] text-slate-300 font-normal leading-tight mt-0.5 block truncate">
                      {item.description}
                    </span>
                  </div>
                </div>

                {item.badge && (
                  <span
                    className={`text-[9px] font-mono px-1.5 py-0.2 rounded font-semibold whitespace-nowrap ml-1 ${
                      isActive
                        ? 'bg-[#00ed64]/15 text-[#00ed64]'
                        : 'bg-white/[0.05] text-slate-300'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Section 2: Database Telemetry & Graph */}
        <div className="space-y-1">
          <div className="px-2 text-[10px] font-mono uppercase tracking-wider text-slate-300 font-semibold mb-2">
            Database Telemetry
          </div>
          {dataNav.map((item) => {
            const Icon = item.icon;
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveView(item.id)}
                className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-left transition-all group ${
                  isActive
                    ? 'bg-white/[0.08] text-white border border-white/[0.12] shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
                }`}
              >
                <div className="flex items-center gap-2.5 overflow-hidden">
                  <Icon
                    className={`w-4 h-4 flex-shrink-0 transition-colors ${
                      isActive ? 'text-[#00ed64]' : 'text-slate-300 group-hover:text-slate-200'
                    }`}
                  />
                  <div className="truncate">
                    <span className="text-xs font-medium block leading-none">
                      {item.label}
                    </span>
                    <span className="text-[10px] text-slate-300 font-normal leading-tight mt-0.5 block truncate">
                      {item.description}
                    </span>
                  </div>
                </div>

                {item.badge && (
                  <span
                    className={`text-[9px] font-mono px-1.5 py-0.2 rounded font-semibold whitespace-nowrap ml-1 ${
                      isActive
                        ? 'bg-[#00ed64]/15 text-[#00ed64]'
                        : 'bg-white/[0.05] text-slate-300'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Sidebar Footer Controls */}
      <div className="p-3 border-t border-white/[0.07] bg-[#0c0f17] space-y-2.5">
        {/* Change Stream Status */}
        <div className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-[#111520] border border-white/[0.06] text-[11px]">
          <div className="flex items-center gap-2">
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
            <span className="text-slate-300 text-[10px] font-mono">
              Change Streams
            </span>
          </div>
          <span
            className={`font-mono text-[10px] font-semibold ${
              isStreaming ? 'text-[#00ed64]' : 'text-amber-400'
            }`}
          >
            {isStreaming ? 'Active' : 'Polling'}
          </span>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-1.5">
          <button
            onClick={onSeedDemo}
            className="flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-lg bg-[#00ed64] hover:bg-[#00dc5c] text-[#08090d] text-xs font-semibold shadow-sm transition active:scale-95"
            title="Seed baseline hackathon demo scenarios"
          >
            <Sparkles className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Seed Scenarios</span>
          </button>

          <a
            href="/SynapseMemory_Project_Report.pdf"
            download="SynapseMemory_Project_Report.pdf"
            className="flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-lg bg-[#141824] hover:bg-[#1c2234] text-slate-200 border border-white/[0.08] text-xs font-medium transition active:scale-95"
            title="Download PDF Report"
          >
            <FileText className="w-3.5 h-3.5 text-[#00ed64]" />
            <span>PDF Report</span>
          </a>
        </div>

        {/* Reset Workspace Button */}
        <button
          onClick={onReset}
          className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-slate-300 hover:text-rose-400 hover:bg-rose-950/20 text-[11px] transition"
        >
          <RefreshCw className="w-3 h-3" />
          <span>Reset Memory Bank</span>
        </button>
      </div>
    </aside>
  );
}
