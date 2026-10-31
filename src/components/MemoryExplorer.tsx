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
} from 'lucide-react';
import { MemoryDocument, MemoryStatus, MemoryType, RetrievedMemory } from '@/types/memory';
import { formatTimeAgo } from '@/lib/utils';

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
    if (selectedStatus !== 'all' && m.lifecycle.status !== selectedStatus) return false;
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
    <div className="flex flex-col h-full bg-[#001721] rounded-2xl border border-emerald-950/80 shadow-2xl overflow-hidden">
      {/* Explorer Header */}
      <div className="px-5 py-3.5 border-b border-emerald-950/60 bg-[#001c27] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Brain className="w-5 h-5 text-[#00ed64]" />
          <div>
            <h2 className="text-sm font-bold text-white tracking-wide">
              MongoDB Memory Bank
            </h2>
            <p className="text-[11px] text-slate-400">
              {memories.length} persistent documents stored
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-emerald-950 text-[#00ed64] border border-emerald-500/30 hover:bg-emerald-900/50 transition active:scale-95"
        >
          <PlusCircle className="w-3.5 h-3.5" />
          <span>New Memory</span>
        </button>
      </div>

      {/* Search & Filters */}
      <div className="p-3 bg-[#00141d] border-b border-emerald-950/50 space-y-2">
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search stored memories or tags..."
            className="w-full bg-[#002433] text-xs text-white pl-8 pr-3 py-2 rounded-lg border border-emerald-950 focus:outline-none focus:border-[#00ed64] placeholder:text-slate-500"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto text-xs no-scrollbar">
          <Filter className="w-3 h-3 text-slate-400 flex-shrink-0" />
          {/* Status selector */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="bg-[#002433] text-[11px] text-slate-300 border border-emerald-950 rounded px-2 py-1 focus:outline-none focus:border-[#00ed64]"
          >
            <option value="all">Status: All</option>
            <option value="active">Active</option>
            <option value="superseded">Superseded</option>
            <option value="expired">Expired</option>
          </select>

          {/* Type selector */}
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="bg-[#002433] text-[11px] text-slate-300 border border-emerald-950 rounded px-2 py-1 focus:outline-none focus:border-[#00ed64]"
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

      {/* Memory Cards Feed */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
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
                className={`rounded-xl p-3.5 border text-xs space-y-2.5 transition relative overflow-hidden ${
                  isJustUpdated
                    ? 'ring-2 ring-[#00ed64] bg-[#002b3d]'
                    : m.lifecycle.status === 'superseded'
                    ? 'bg-[#001b24] border-amber-900/40 opacity-75'
                    : 'bg-[#00212e] border-emerald-950 hover:border-emerald-800/80 shadow-sm'
                }`}
              >
                {/* Top Row: Type, Status, Actions */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider ${
                        m.type === 'constraint'
                          ? 'bg-rose-950 text-rose-300 border border-rose-800/40'
                          : m.type === 'incident_fix'
                          ? 'bg-amber-950 text-amber-300 border border-amber-800/40'
                          : 'bg-emerald-950 text-emerald-300 border border-emerald-800/40'
                      }`}
                    >
                      {m.type}
                    </span>

                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-medium uppercase ${
                        m.lifecycle.status === 'active'
                          ? 'bg-emerald-950 text-[#00ed64] border border-emerald-500/30'
                          : m.lifecycle.status === 'superseded'
                          ? 'bg-amber-950 text-amber-400 border border-amber-500/30'
                          : 'bg-slate-800 text-slate-400 border border-slate-700'
                      }`}
                    >
                      {m.lifecycle.status}
                    </span>
                  </div>

                  <div className="flex items-center gap-1 text-slate-400">
                    <button
                      onClick={() => onInspect(m as RetrievedMemory)}
                      className="p-1 hover:text-emerald-400 rounded hover:bg-[#002f42] transition"
                      title="Inspect Vector Search & Explainability"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => m._id && onDelete(m._id)}
                      className="p-1 hover:text-rose-400 rounded hover:bg-[#002f42] transition"
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
                  <p className="text-slate-300 text-[11px] mt-1 leading-relaxed line-clamp-3">
                    {m.content}
                  </p>
                </div>

                {/* Superseded Reason / Conflict trail */}
                {m.lifecycle.status === 'superseded' && (
                  <div className="p-2 rounded bg-amber-950/40 border border-amber-800/30 text-[10px] text-amber-300 flex items-start gap-1.5">
                    <ArrowRight className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                    <div>
                      <span>{m.lifecycle.supersededReason || 'Superseded by newer decision'}</span>
                    </div>
                  </div>
                )}

                {/* TTL Live Countdown */}
                {ttlText && (
                  <div className="flex items-center gap-1.5 text-[10px] text-purple-300 font-mono bg-purple-950/40 border border-purple-800/40 px-2 py-1 rounded">
                    <Clock className="w-3 h-3 text-purple-400 animate-pulse" />
                    <span>TTL Auto-Expiry: <strong>{ttlText}</strong></span>
                  </div>
                )}

                {/* Footer Metadata */}
                <div className="pt-1.5 border-t border-emerald-950/60 flex items-center justify-between text-[10px] text-slate-400">
                  <div className="flex items-center gap-2">
                    <span>Recalled: <strong>{m.lifecycle.accessCount}x</strong></span>
                    <span>•</span>
                    <span>{formatTimeAgo(m.updatedAt)}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Shield className="w-3 h-3 text-slate-500" />
                    <span className="capitalize">{m.privacy}</span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Manual Memory Modal */}
      {showAddModal && (
        <ManualAddMemoryModal
          onClose={() => setShowAddModal(false)}
          onAdd={(data) => {
            onAddManual(data);
            setShowAddModal(false);
          }}
        />
      )}
    </div>
  );
}

function ManualAddMemoryModal({
  onClose,
  onAdd,
}: {
  onClose: () => void;
  onAdd: (data: any) => void;
}) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [type, setType] = useState<MemoryType>('constraint');
  const [ttlMinutes, setTtlMinutes] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !content) return;
    onAdd({
      title,
      content,
      type,
      ttlSeconds: ttlMinutes ? parseInt(ttlMinutes, 10) * 60 : null,
      tags: ['manual', type],
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#001e2b] border border-emerald-800/80 rounded-2xl w-full max-w-md p-5 shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-emerald-950 pb-3">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Brain className="w-4 h-4 text-[#00ed64]" /> Inject Memory Document into MongoDB
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3 text-xs">
          <div>
            <label className="block text-slate-300 font-semibold mb-1">Title</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. AWS PrivateLink requirement"
              className="w-full bg-[#002738] border border-emerald-900 rounded-lg p-2.5 text-white focus:outline-none focus:border-[#00ed64]"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">Memory Type</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as MemoryType)}
              className="w-full bg-[#002738] border border-emerald-900 rounded-lg p-2.5 text-white focus:outline-none focus:border-[#00ed64]"
            >
              <option value="constraint">Constraint</option>
              <option value="incident_fix">Incident Fix</option>
              <option value="decision">Decision</option>
              <option value="preference">Preference</option>
              <option value="fact">Fact</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">Content / Rule</label>
            <textarea
              required
              rows={3}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="State the rule, decision, or post-mortem detail..."
              className="w-full bg-[#002738] border border-emerald-900 rounded-lg p-2.5 text-white focus:outline-none focus:border-[#00ed64]"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              TTL Expiry (Minutes, optional)
            </label>
            <input
              type="number"
              value={ttlMinutes}
              onChange={(e) => setTtlMinutes(e.target.value)}
              placeholder="Leave empty for permanent, or e.g. 5 for 5-min TTL"
              className="w-full bg-[#002738] border border-emerald-900 rounded-lg p-2.5 text-white focus:outline-none focus:border-[#00ed64]"
            />
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-[#00ed64] text-[#001e2b] font-bold hover:bg-[#00c954]"
            >
              Save to MongoDB
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
