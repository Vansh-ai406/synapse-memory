'use client';

import React from 'react';
import {
  Layers,
  ChevronRight,
  Database,
  ExternalLink,
  PanelRightOpen,
  PanelRightClose,
} from 'lucide-react';
import { StudioView } from './Sidebar';

interface TopBarProps {
  activeView: StudioView;
  sessionId: string;
  setSessionId: (id: string) => void;
  showDrawer: boolean;
  setShowDrawer: (show: boolean) => void;
  totalMemoriesCount: number;
}

const VIEW_TITLES: Record<StudioView, { title: string; subtitle: string; category: string }> = {
  chat: {
    category: 'Agentic Workspace',
    title: 'Synapse Copilot',
    subtitle: 'Persistent multi-session memory, guideline recall, and semantic contradiction detection',
  },
  'multi-agent': {
    category: 'Agentic Workspace',
    title: 'Multi-Agent Consensus Room',
    subtitle: '3 autonomous agents (Archi, Aegis, Sentinel) harmonizing stack & security constraints',
  },
  'code-review': {
    category: 'Agentic Workspace',
    title: 'PR Architecture Guard',
    subtitle: 'Automated CI/CD pull request evaluation against active MongoDB architecture memories',
  },
  incident: {
    category: 'Agentic Workspace',
    title: 'Autonomous SRE Self-Healing',
    subtitle: 'Simulating and remediating outage crisis (INC-402) using past post-mortem memories',
  },
  decay: {
    category: 'Database Telemetry',
    title: 'Ebbinghaus Memory Decay Engine',
    subtitle: 'Mathematical retention curves powered by MongoDB Aggregation Pipeline ($exp, $ln)',
  },
  graph: {
    category: 'Database Telemetry',
    title: '2D Knowledge Graph Visualizer',
    subtitle: 'Force-directed constellation canvas showing links, constraints, and superseded relationships',
  },
  explorer: {
    category: 'Database Telemetry',
    title: 'MongoDB Memory Bank Explorer',
    subtitle: 'Document lifecycle manager, vector similarity search, and automated TTL indexing',
  },
};

export default function TopBar({
  activeView,
  sessionId,
  setSessionId,
  showDrawer,
  setShowDrawer,
  totalMemoriesCount,
}: TopBarProps) {
  const current = VIEW_TITLES[activeView] || VIEW_TITLES.chat;

  return (
    <header className="h-14 border-b border-white/[0.07] bg-[#090b10]/80 backdrop-blur-xl px-5 flex items-center justify-between flex-shrink-0 select-none">
      {/* Left: Breadcrumbs & View Title */}
      <div className="flex items-center gap-2 overflow-hidden">
        <span className="text-xs font-mono text-slate-300 hidden sm:inline">
          {current.category}
        </span>
        <ChevronRight className="w-3.5 h-3.5 text-slate-600 hidden sm:inline" />
        <h2 className="text-xs font-semibold text-white tracking-tight flex items-center gap-2">
          <span>{current.title}</span>
        </h2>
        <span className="text-[11px] text-slate-300 hidden xl:inline border-l border-white/[0.08] pl-2.5 truncate max-w-md">
          {current.subtitle}
        </span>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-3">
        {/* Session Switcher if in Chat View */}
        {activeView === 'chat' && (
          <div className="flex items-center gap-2 bg-[#121622] border border-white/[0.08] px-2.5 py-1 rounded-lg text-xs">
            <span className="text-slate-300 text-[10px] font-mono">Session:</span>
            <select
              value={sessionId}
              onChange={(e) => setSessionId(e.target.value)}
              className="bg-transparent text-white text-xs font-medium focus:outline-none cursor-pointer"
            >
              <option value="session-1" className="bg-[#121622]">Session 1 (Arch Setup)</option>
              <option value="session-2" className="bg-[#121622]">Session 2 (Feature Build)</option>
              <option value="session-3" className="bg-[#121622]">Session 3 (Incident Room)</option>
            </select>
          </div>
        )}

        {/* Toggle Memory Bank Drawer (available across all views!) */}
        {activeView !== 'explorer' && (
          <button
            onClick={() => setShowDrawer(!showDrawer)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition ${
              showDrawer
                ? 'bg-emerald-500/15 border-emerald-500/30 text-[#00ed64]'
                : 'bg-[#121622] border-white/[0.08] text-slate-300 hover:text-white hover:border-white/[0.16]'
            }`}
            title="Toggle Live Memory Bank Drawer"
          >
            {showDrawer ? (
              <PanelRightClose className="w-3.5 h-3.5" />
            ) : (
              <PanelRightOpen className="w-3.5 h-3.5" />
            )}
            <span className="text-[11px]">
              Memory Bank <span className="font-mono text-[10px] text-slate-300">({totalMemoriesCount})</span>
            </span>
          </button>
        )}
      </div>
    </header>
  );
}
