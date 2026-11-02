'use client';

import React, { useState, useEffect } from 'react';
import {
  Brain,
  Filter,
  Search,
  Clock,
  Trash2,
  Eye,
  Shield,
  Layers,
  ArrowRight,
  PlusCircle,
  X,
  Network,
  LayoutGrid,
} from 'lucide-react';
import { MemoryDocument, MemoryType, RetrievedMemory } from '@/types/memory';
import { formatTimeAgo } from '@/lib/utils';
import MemoryGraphCanvas from './MemoryGraphCanvas';

interface MemoryExplorerProps {
  memories: MemoryDocument[];
  onInspect: (memory: RetrievedMemory) => void;
  onDelete: (id: string) => void;
  onAddManual: (mem: Partial<MemoryDocument>) => void;
  lastUpdatedId?: string | null;
}

export default function MemoryExplorer({
  memories,
  onInspect,
  onDelete,
  onAddManual,
  lastUpdatedId,
}: MemoryExplorerProps) {
  const [viewMode, setViewMode] = useState<'cards' | 'graph'>('cards');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

  // Live timer tick for TTL countdowns
  const [, setTick] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  // Filter memories
  const filtered = memories.filter((m) => {
    if (selectedStatus !== 'all' && m.lifecycle?.status !== selectedStatus) return false;
    if (selectedType !== 'all' && m.type !== selectedType) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchText = (m.title + ' ' + m.content + ' ' + (m.tags || []).join(' ')).toLowerCase();
      if (!matchText.includes(q)) return false;
    }
    return true;
  });

  const getTtlRemaining = (expiresAt?: Date | string | null): string | null => {
    if (!expiresAt) return null;
    const exp = new Date(expiresAt).getTime();
    const now = Date.now();
    const diffSec = Math.floor((exp - now) / 1000);
    if (diffSec <= 0) return 'Expired (Purging via TTL...)';
    const m = Math.floor(diffSec / 60);
    const s = diffSec % 60;
    return `${m}m ${s}s`;
  };

  return (
    <div className="flex flex-col h-full rounded-2xl border border-white/[0.08] bg-[#0d1017]/90 backdrop-blur-xl shadow-2xl shadow-black/50 overflow-hidden">
      {/* Explorer Header */}
      <div className="px-5 py-3 border-b border-white/[0.08] bg-[#111520]/80 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Brain className="w-4 h-4 text-[#00ed64]" />
          <div>
            <h2 className="text-xs font-semibold text-white tracking-wide flex items-center gap-2">
              <span>MongoDB Memory Bank</span>
              <span className="font-mono text-[10px] text-slate-400 bg-white/[0.06] px-1.5 py-0.2 rounded font-normal">
                {memories.length} docs
              </span>
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* View Mode Toggle */}
          <div className="flex items-center p-0.5 rounded-lg bg-[#161c28] border border-white/[0.08]">
            <button
              onClick={() => setViewMode('cards')}
              className={`p-1.5 rounded-md transition ${
                viewMode === 'cards'
                  ? 'bg-white/[0.12] text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Card View"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewMode('graph')}
              className={`p-1.5 rounded-md transition ${
                viewMode === 'graph'
                  ? 'bg-emerald-500/20 text-[#00ed64] shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Interactive Knowledge Graph"
            >
              <Network className="w-3.5 h-3.5" />
            </button>
          </div>

          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg bg-[#161c28] hover:bg-[#1f283a] text-slate-200 border border-white/[0.08] hover:border-emerald-500/40 transition active:scale-95"
          >
            <PlusCircle className="w-3.5 h-3.5 text-[#00ed64]" />
            <span className="hidden sm:inline">New</span>
          </button>
        </div>
      </div>

      {/* Main View Area */}
      {viewMode === 'graph' ? (
        <div className="flex-1 p-3">
          <MemoryGraphCanvas
            memories={memories}
            onInspectNode={onInspect}
            lastUpdatedId={lastUpdatedId}
          />
        </div>
      ) : (
        <>
          {/* Search & Filters */}
          <div className="p-3 bg-[#090b10] border-b border-white/[0.06] space-y-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search memories, tags, or content..."
                className="w-full bg-[#121622] text-xs text-white pl-8 pr-3 py-1.5 rounded-lg border border-white/[0.08] focus:outline-none focus:border-[#00ed64] placeholder:text-slate-500 transition-colors"
              />
            </div>

            <div className="flex items-center gap-2 overflow-x-auto text-xs no-scrollbar">
              <Filter className="w-3 h-3 text-slate-400 flex-shrink-0" />
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="bg-[#121622] text-[11px] text-slate-300 border border-white/[0.08] rounded px-2 py-1 focus:outline-none focus:border-[#00ed64] cursor-pointer"
              >
                <option value="all">Status: All</option>
                <option value="active">Active</option>
                <option value="superseded">Superseded</option>
                <option value="expired">Expired</option>
              </select>

              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="bg-[#121622] text-[11px] text-slate-300 border border-white/[0.08] rounded px-2 py-1 focus:outline-none focus:border-[#00ed64] cursor-pointer"
              >
                <option value="all">Type: All</option>
                <option value="constraint">Constraint</option>
                <option value="incident_fix">Incident Fix</option>
                <option value="decision">Decision</option>
                <option value="preference">Preference</option>
                <option value="fact">Fact</option>
              </select>
            </div>
          </div>

          {/* Cards Feed */}
          <div className="flex-1 overflow-y-auto p-3.5 space-y-2.5">
            {filtered.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500">
                <Layers className="w-8 h-8 stroke-1 text-slate-600 mb-2" />
                <p className="text-xs">No memories matching current filters</p>
              </div>
            ) : (
              filtered.map((m) => {
                const ttlText = getTtlRemaining(m.expiresAt);
                const isJustUpdated = lastUpdatedId === m._id;

                return (
                  <div
                    key={m._id}
                    className={`rounded-xl p-3 border text-xs space-y-2 transition-all relative overflow-hidden ${
                      isJustUpdated
                        ? 'ring-2 ring-[#00ed64] bg-[#162030]'
                        : m.lifecycle?.status === 'superseded'
                        ? 'bg-[#12141c]/60 border-rose-500/20 opacity-75'
                        : 'bg-[#121622] border-white/[0.08] hover:border-white/[0.16] shadow-sm'
                    }`}
                  >
                    {/* Top Row */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase tracking-wider font-mono ${
                            m.type === 'constraint'
                              ? 'bg-rose-500/10 text-rose-300 border border-rose-500/20'
                              : m.type === 'incident_fix'
                              ? 'bg-amber-500/10 text-amber-300 border border-amber-500/20'
                              : 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'
                          }`}
                        >
                          {m.type}
                        </span>

                        <span
                          className={`px-1.5 py-0.5 rounded text-[9px] font-medium uppercase font-mono ${
                            m.lifecycle?.status === 'active'
                              ? 'bg-emerald-500/10 text-[#00ed64] border border-emerald-500/20'
                              : m.lifecycle?.status === 'superseded'
                              ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                              : 'bg-slate-800 text-slate-400 border border-slate-700'
                          }`}
                        >
                          {m.lifecycle?.status || 'active'}
                        </span>
                      </div>

                      <div className="flex items-center gap-1 text-slate-400">
                        <button
                          onClick={() => onInspect(m as RetrievedMemory)}
                          className="p-1 hover:text-emerald-400 rounded hover:bg-white/[0.06] transition"
                          title="Inspect Vector Search & Explainability"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => m._id && onDelete(m._id)}
                          className="p-1 hover:text-rose-400 rounded hover:bg-white/[0.06] transition"
                          title="Delete from MongoDB"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Title & Content */}
                    <div>
                      <h4 className="font-semibold text-slate-100 text-xs leading-snug">
                        {m.title}
                      </h4>
                      <p className="text-slate-300/80 text-[11px] mt-1 leading-relaxed line-clamp-3">
                        {m.content}
                      </p>
                    </div>

                    {/* Superseded Reason Banner */}
                    {m.lifecycle?.status === 'superseded' && (
                      <div className="p-2 rounded bg-rose-950/20 border border-rose-500/20 text-[10px] text-rose-300 flex items-center gap-1.5">
                        <ArrowRight className="w-3 h-3 flex-shrink-0 text-rose-400" />
                        <span className="truncate">
                          {m.lifecycle.supersededReason || `Superseded by newer policy`}
                        </span>
                      </div>
                    )}

                    {/* Live TTL Countdown */}
                    {ttlText && (
                      <div className="flex items-center gap-1.5 p-1.5 rounded bg-purple-500/10 border border-purple-500/20 text-purple-300 text-[10px] font-mono">
                        <Clock className="w-3 h-3 text-purple-400 animate-spin" />
                        <span>MongoDB TTL Auto-Purge: {ttlText}</span>
                      </div>
                    )}

                    {/* Footer Info: Tags & Timestamp */}
                    <div className="pt-1.5 border-t border-white/[0.05] flex items-center justify-between text-[10px] text-slate-500">
                      <div className="flex items-center gap-1 flex-wrap">
                        {m.tags && m.tags.slice(0, 3).map((tag, idx) => (
                          <span
                            key={idx}
                            className="px-1.5 py-0.2 rounded bg-white/[0.04] text-slate-400 border border-white/[0.05] font-mono text-[9px]"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                      <span className="text-slate-400">{formatTimeAgo(m.updatedAt || m.createdAt)}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </>
      )}

      {/* Manual Memory Creation Modal */}
      {showAddModal && (
        <AddMemoryModal
          onClose={() => setShowAddModal(false)}
          onSubmit={(data) => {
            onAddManual(data);
            setShowAddModal(false);
          }}
        />
      )}
    </div>
  );
}

function AddMemoryModal({
  onClose,
  onSubmit,
}: {
  onClose: () => void;
  onSubmit: (data: Partial<MemoryDocument>) => void;
}) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [type, setType] = useState<MemoryType>('constraint');
  const [tags, setTags] = useState('database, policy');
  const [ttlSeconds, setTtlSeconds] = useState<string>('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    onSubmit({
      title,
      content,
      type,
      tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
      ttlSeconds: ttlSeconds ? parseInt(ttlSeconds, 10) : null,
    } as any);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#111520] border border-white/[0.12] rounded-2xl w-full max-w-lg p-5 space-y-4 shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <PlusCircle className="w-4 h-4 text-[#00ed64]" />
            Insert Memory into MongoDB
          </h3>
          <button onClick={onClose} className="p-1 rounded text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3 text-xs">
          <div>
            <label className="block text-slate-300 font-medium mb-1">Title</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Mandatory Connection Pooling Policy"
              className="w-full bg-[#161c28] rounded-lg px-3 py-2 border border-white/[0.08] text-white focus:outline-none focus:border-[#00ed64]"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-medium mb-1">Content / Rule</label>
            <textarea
              required
              rows={3}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Detailed guidelines, schema constraints, or runbook instructions..."
              className="w-full bg-[#161c28] rounded-lg px-3 py-2 border border-white/[0.08] text-white focus:outline-none focus:border-[#00ed64]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-medium mb-1">Memory Type</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as MemoryType)}
                className="w-full bg-[#161c28] rounded-lg px-2.5 py-2 border border-white/[0.08] text-white focus:outline-none focus:border-[#00ed64]"
              >
                <option value="constraint">Constraint</option>
                <option value="incident_fix">Incident Fix</option>
                <option value="decision">Decision</option>
                <option value="preference">Preference</option>
                <option value="fact">Fact</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">TTL (Seconds, optional)</label>
              <input
                type="number"
                value={ttlSeconds}
                onChange={(e) => setTtlSeconds(e.target.value)}
                placeholder="e.g. 120"
                className="w-full bg-[#161c28] rounded-lg px-3 py-2 border border-white/[0.08] text-white focus:outline-none focus:border-[#00ed64]"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-300 font-medium mb-1">Tags (Comma-separated)</label>
            <input
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="mongodb, pool, tls"
              className="w-full bg-[#161c28] rounded-lg px-3 py-2 border border-white/[0.08] text-white focus:outline-none focus:border-[#00ed64]"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-white/[0.08]">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.05]"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 rounded-lg bg-[#00ed64] text-[#08090d] font-semibold hover:bg-[#00dc5c] shadow-emerald-glow"
            >
              Index Memory
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
