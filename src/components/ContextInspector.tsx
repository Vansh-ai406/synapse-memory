'use client';

import React, { useState, useEffect } from 'react';
import {
  Brain,
  Sparkles,
  Layers,
  Filter,
  Search,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Trash2,
  Edit3,
  Save,
  X,
  Code2,
  ChevronRight,
  PlusCircle,
  Network,
  LayoutGrid,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import { MemoryDocument, MemoryType, RetrievedMemory } from '@/types/memory';
import { formatTimeAgo } from '@/lib/utils';
import MemoryGraphCanvas from './MemoryGraphCanvas';

interface ContextInspectorProps {
  memories: MemoryDocument[];
  activeInspectedMemory: RetrievedMemory | null;
  onSelectMemory: (mem: RetrievedMemory | null) => void;
  onUpdateMemory: (id: string, updates: Partial<MemoryDocument>) => Promise<void>;
  onDeleteMemory: (id: string) => Promise<void>;
  onAddManual: (mem: Partial<MemoryDocument>) => Promise<void>;
  lastUpdatedId?: string | null;
}

export default function ContextInspector({
  memories,
  activeInspectedMemory,
  onSelectMemory,
  onUpdateMemory,
  onDeleteMemory,
  onAddManual,
  lastUpdatedId,
}: ContextInspectorProps) {
  const [activeTab, setActiveTab] = useState<'inspector' | 'vault'>('inspector');
  const [viewMode, setViewMode] = useState<'cards' | 'graph'>('cards');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [showAddModal, setShowAddModal] = useState(false);

  // Inline editing state for memory corrections
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editType, setEditType] = useState<MemoryType>('constraint');
  const [isSaving, setIsSaving] = useState(false);

  // Show raw JSON inspector toggle
  const [showRawJson, setShowRawJson] = useState(false);

  // Live timer tick for TTL countdowns
  const [, setTick] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  // When activeInspectedMemory changes, switch to inspector tab and sync edit form
  useEffect(() => {
    if (activeInspectedMemory) {
      setActiveTab('inspector');
      setEditTitle(activeInspectedMemory.title);
      setEditContent(activeInspectedMemory.content);
      setEditType(activeInspectedMemory.type);
      setIsEditing(false);
    }
  }, [activeInspectedMemory]);

  // If no memory is selected but inspector tab opened, select first active memory as default
  useEffect(() => {
    if (!activeInspectedMemory && memories.length > 0 && activeTab === 'inspector') {
      const firstActive = memories.find((m) => m.lifecycle?.status === 'active') || memories[0];
      if (firstActive) {
        onSelectMemory({
          ...firstActive,
          similarityScore: 0.94,
          retrievalReason: 'Directly recalled from active MongoDB Vector collection',
        });
      }
    }
  }, [activeInspectedMemory, memories, activeTab, onSelectMemory]);

  const handleSaveCorrection = async () => {
    if (!activeInspectedMemory?._id) return;
    setIsSaving(true);
    try {
      await onUpdateMemory(activeInspectedMemory._id, {
        title: editTitle,
        content: editContent,
        type: editType,
      });
      setIsEditing(false);
    } catch (err) {
      console.error('Failed to save memory correction:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleMarkSuperseded = async () => {
    if (!activeInspectedMemory?._id) return;
    const reason = prompt('Enter superseding rationale (e.g., Contradicted by newer sprint policy):', 'Superseded via Context Inspector');
    if (!reason) return;
    await onUpdateMemory(activeInspectedMemory._id, {
      lifecycle: {
        ...activeInspectedMemory.lifecycle,
        status: 'superseded',
        supersededReason: reason,
      },
    });
  };

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

  const filteredMemories = memories.filter((m) => {
    if (selectedStatus !== 'all' && m.lifecycle?.status !== selectedStatus) return false;
    if (selectedType !== 'all' && m.type !== selectedType) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchText = (m.title + ' ' + m.content + ' ' + (m.tags || []).join(' ')).toLowerCase();
      if (!matchText.includes(q)) return false;
    }
    return true;
  });

  return (
    <div className="flex flex-col h-full rounded-2xl border border-white/[0.08] bg-[#0d1017]/95 backdrop-blur-xl shadow-2xl shadow-black/50 overflow-hidden">
      {/* Top Header / Mode Tabs */}
      <div className="px-4 py-2.5 border-b border-white/[0.08] bg-[#111520]/90 flex items-center justify-between">
        <div className="flex items-center gap-1.5 p-0.5 rounded-lg bg-[#161c28] border border-white/[0.08]">
          <button
            onClick={() => setActiveTab('inspector')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold transition ${
              activeTab === 'inspector'
                ? 'bg-[#00ed64]/15 text-[#00ed64] border border-[#00ed64]/30 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Context Inspector</span>
          </button>
          <button
            onClick={() => setActiveTab('vault')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold transition ${
              activeTab === 'vault'
                ? 'bg-white/[0.12] text-white border border-white/[0.12] shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Brain className="w-3.5 h-3.5 text-slate-400" />
            <span>Memory Vault</span>
            <span className="font-mono text-[10px] text-slate-400 bg-white/[0.06] px-1.5 rounded">
              {memories.length}
            </span>
          </button>
        </div>

        {activeTab === 'vault' && (
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setViewMode(viewMode === 'cards' ? 'graph' : 'cards')}
              className={`p-1.5 rounded-md border text-xs transition ${
                viewMode === 'graph'
                  ? 'bg-emerald-500/20 text-[#00ed64] border-emerald-500/30'
                  : 'bg-[#161c28] text-slate-400 hover:text-white border-white/[0.08]'
              }`}
              title={viewMode === 'cards' ? 'Switch to Knowledge Graph' : 'Switch to Cards'}
            >
              {viewMode === 'cards' ? <Network className="w-3.5 h-3.5" /> : <LayoutGrid className="w-3.5 h-3.5" />}
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="p-1.5 rounded-md bg-[#161c28] text-[#00ed64] border border-white/[0.08] hover:border-emerald-500/40 transition"
              title="Add New Memory"
            >
              <PlusCircle className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Main Body */}
      {activeTab === 'inspector' ? (
        /* CONTEXT INSPECTOR VIEW */
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {activeInspectedMemory ? (
            <>
              {/* Attribution Banner / Chip Summary */}
              <div className="p-3.5 rounded-xl bg-gradient-to-br from-[#121826] to-[#0e131f] border border-[#00ed64]/25 shadow-inner-glow space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#00ed64] animate-ping" />
                    <span className="text-[10px] uppercase font-bold tracking-wider text-[#00ed64] font-mono">
                      Active Injected Context
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">
                    TTL: {activeInspectedMemory.expiresAt ? getTtlRemaining(activeInspectedMemory.expiresAt) : 'Permanent'}
                  </span>
                </div>

                <div className="bg-[#090b10]/80 rounded-lg p-2.5 border border-white/[0.06] text-xs">
                  <div className="text-[11px] font-mono text-emerald-300 font-medium">
                    Pulled from chat on{' '}
                    {new Date(activeInspectedMemory.createdAt || Date.now()).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                    })}
                    : <span className="text-white font-semibold">{activeInspectedMemory.title}</span>
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-2">
                    <span>Source: {activeInspectedMemory.source?.sessionId || 'cross-session'}</span>
                    <span>•</span>
                    <span>Author: {activeInspectedMemory.source?.author || activeInspectedMemory.userId || 'system'}</span>
                  </div>
                </div>
              </div>

              {/* Vector Retrieval & Confidence Score Meter */}
              <div className="p-3.5 rounded-xl bg-[#111520] border border-white/[0.08] space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400 font-medium">Semantic Similarity Score</span>
                  <span className="font-mono text-emerald-400 font-bold text-sm">
                    {Math.round((activeInspectedMemory.similarityScore || 0.94) * 100)}% Match
                  </span>
                </div>

                {/* Meter Bar */}
                <div className="w-full bg-[#182030] h-2 rounded-full overflow-hidden border border-white/[0.05]">
                  <div
                    className="bg-gradient-to-r from-teal-500 via-emerald-400 to-[#00ed64] h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.round((activeInspectedMemory.similarityScore || 0.94) * 100)}%`,
                    }}
                  />
                </div>

                <div className="text-[11px] text-slate-300/90 leading-relaxed bg-[#0a0d14] p-2.5 rounded-lg border border-white/[0.04]">
                  <span className="text-emerald-400 font-semibold">Recall Rationale: </span>
                  {activeInspectedMemory.retrievalReason ||
                    'Indexed via text-embedding-3-small (1536 dims). Recalled dynamically via MongoDB Atlas Vector Search based on semantic query match with active session prompts.'}
                </div>
              </div>

              {/* Stored Memory Metadata & Lifecycle */}
              <div className="p-3.5 rounded-xl bg-[#111520] border border-white/[0.08] space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-semibold text-white tracking-wide">
                    Document Specification
                  </h3>
                  <div className="flex items-center gap-1.5">
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase bg-emerald-500/10 text-[#00ed64] border border-emerald-500/25 font-mono">
                      {activeInspectedMemory.type}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase font-mono ${
                        activeInspectedMemory.lifecycle?.status === 'active'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                      }`}
                    >
                      {activeInspectedMemory.lifecycle?.status || 'active'}
                    </span>
                  </div>
                </div>

                {/* Inline Editing vs Viewing */}
                {isEditing ? (
                  <div className="space-y-2.5">
                    <div>
                      <label className="text-[10px] font-semibold text-slate-400 uppercase">Title</label>
                      <input
                        type="text"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        className="w-full bg-[#161c28] text-xs text-white p-2 rounded-lg border border-white/[0.12] focus:outline-none focus:border-[#00ed64]"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold text-slate-400 uppercase">Policy Content</label>
                      <textarea
                        rows={4}
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        className="w-full bg-[#161c28] text-xs text-white p-2 rounded-lg border border-white/[0.12] focus:outline-none focus:border-[#00ed64]"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold text-slate-400 uppercase">Memory Type</label>
                      <select
                        value={editType}
                        onChange={(e) => setEditType(e.target.value as MemoryType)}
                        className="w-full bg-[#161c28] text-xs text-white p-2 rounded-lg border border-white/[0.12] focus:outline-none focus:border-[#00ed64]"
                      >
                        <option value="constraint">constraint</option>
                        <option value="decision">decision</option>
                        <option value="preference">preference</option>
                        <option value="fact">fact</option>
                        <option value="feedback">feedback</option>
                        <option value="incident_fix">incident_fix</option>
                      </select>
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <button
                        onClick={handleSaveCorrection}
                        disabled={isSaving}
                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#00ed64] hover:bg-[#00dc5c] text-[#08090d] text-xs font-bold transition shadow-sm"
                      >
                        <Save className="w-3.5 h-3.5" />
                        <span>{isSaving ? 'Saving...' : 'Save to MongoDB'}</span>
                      </button>
                      <button
                        onClick={() => setIsEditing(false)}
                        className="px-3 py-1.5 rounded-lg bg-[#1a202c] hover:bg-[#222a3a] text-slate-300 text-xs transition"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div>
                      <div className="text-[10px] uppercase font-mono text-slate-500 font-semibold">Title</div>
                      <div className="text-xs font-semibold text-slate-100 mt-0.5">
                        {activeInspectedMemory.title}
                      </div>
                    </div>

                    <div>
                      <div className="text-[10px] uppercase font-mono text-slate-500 font-semibold">Content</div>
                      <div className="text-xs text-slate-300/90 leading-relaxed bg-[#0a0d14] p-2.5 rounded-lg border border-white/[0.04] mt-0.5">
                        {activeInspectedMemory.content}
                      </div>
                    </div>

                    {activeInspectedMemory.tags && activeInspectedMemory.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-1">
                        {activeInspectedMemory.tags.map((t, i) => (
                          <span
                            key={i}
                            className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/[0.05] text-slate-400 border border-white/[0.05]"
                          >
                            #{t}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Action Toolbar: Correct, Supersede, Delete */}
              <div className="flex items-center gap-2 pt-1">
                {!isEditing && (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-[#161c28] hover:bg-[#1c2434] text-slate-200 hover:text-white border border-white/[0.08] hover:border-[#00ed64]/30 text-xs font-medium transition"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Correct Memory</span>
                  </button>
                )}

                {activeInspectedMemory.lifecycle?.status === 'active' && (
                  <button
                    onClick={handleMarkSuperseded}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-amber-950/20 hover:bg-amber-950/40 text-amber-300 border border-amber-500/20 text-xs font-medium transition"
                    title="Mark memory as superseded / conflicted"
                  >
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>Supersede</span>
                  </button>
                )}

                <button
                  onClick={async () => {
                    if (confirm('Delete this memory from MongoDB?')) {
                      if (activeInspectedMemory._id) {
                        await onDeleteMemory(activeInspectedMemory._id);
                        onSelectMemory(null);
                      }
                    }
                  }}
                  className="p-2 rounded-xl bg-rose-950/20 hover:bg-rose-950/40 text-rose-300 border border-rose-500/20 transition"
                  title="Delete from MongoDB"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Raw MongoDB Document Inspector */}
              <div className="rounded-xl border border-white/[0.08] bg-[#090b10] overflow-hidden">
                <button
                  onClick={() => setShowRawJson(!showRawJson)}
                  className="w-full px-3.5 py-2.5 flex items-center justify-between text-xs font-mono text-slate-400 hover:text-white bg-[#10131c] transition"
                >
                  <div className="flex items-center gap-2">
                    <Code2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Raw MongoDB BSON Document</span>
                  </div>
                  <span className="text-[10px] text-slate-500">{showRawJson ? 'Hide' : 'Expand'}</span>
                </button>

                {showRawJson && (
                  <div className="p-3 max-h-64 overflow-y-auto text-[11px] font-mono text-emerald-300/90 leading-tight bg-[#07090e]">
                    <pre className="whitespace-pre-wrap">
                      {JSON.stringify(
                        {
                          _id: activeInspectedMemory._id,
                          workspaceId: activeInspectedMemory.workspaceId,
                          userId: activeInspectedMemory.userId,
                          type: activeInspectedMemory.type,
                          title: activeInspectedMemory.title,
                          content: activeInspectedMemory.content,
                          lifecycle: activeInspectedMemory.lifecycle,
                          source: activeInspectedMemory.source,
                          expiresAt: activeInspectedMemory.expiresAt,
                          embedding_dim: activeInspectedMemory.embedding ? activeInspectedMemory.embedding.length : 1536,
                          updatedAt: activeInspectedMemory.updatedAt,
                        },
                        null,
                        2
                      )}
                    </pre>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500">
              <Sparkles className="w-8 h-8 text-slate-600 mb-2" />
              <p className="text-xs">No active memory selected</p>
              <p className="text-[11px] text-slate-600 mt-1">
                Click any &ldquo;Pulled from chat on...&rdquo; chip in the chat window to inspect its vector metrics.
              </p>
            </div>
          )}
        </div>
      ) : (
        /* MEMORY VAULT VIEW */
        <div className="flex-1 flex flex-col min-h-0">
          {viewMode === 'graph' ? (
            <div className="flex-1 p-3">
              <MemoryGraphCanvas
                memories={memories}
                onInspectNode={(mem) => {
                  onSelectMemory(mem as RetrievedMemory);
                  setActiveTab('inspector');
                }}
                lastUpdatedId={lastUpdatedId}
              />
            </div>
          ) : (
            <>
              {/* Search & Filter Bar */}
              <div className="p-3 bg-[#090b10] border-b border-white/[0.06] space-y-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search memories, tags, or content..."
                    className="w-full bg-[#121622] text-xs text-white pl-8 pr-3 py-1.5 rounded-lg border border-white/[0.08] focus:outline-none focus:border-[#00ed64] placeholder:text-slate-500"
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
                    <option value="decision">Decision</option>
                    <option value="preference">Preference</option>
                    <option value="fact">Fact</option>
                    <option value="feedback">Feedback</option>
                    <option value="incident_fix">Incident Fix</option>
                  </select>
                </div>
              </div>

              {/* Memory Cards Feed */}
              <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
                {filteredMemories.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500">
                    <Layers className="w-8 h-8 stroke-1 text-slate-600 mb-2" />
                    <p className="text-xs">No memories matching filters</p>
                  </div>
                ) : (
                  filteredMemories.map((m) => {
                    const ttlText = getTtlRemaining(m.expiresAt);
                    const isSelected = activeInspectedMemory?._id === m._id;

                    return (
                      <div
                        key={m._id}
                        onClick={() => {
                          onSelectMemory({
                            ...m,
                            similarityScore: 0.94,
                            retrievalReason: 'Selected from MongoDB Memory Vault',
                          });
                          setActiveTab('inspector');
                        }}
                        className={`rounded-xl p-3 border text-xs space-y-1.5 transition-all cursor-pointer ${
                          isSelected
                            ? 'ring-2 ring-[#00ed64] bg-[#141d2c] border-[#00ed64]/40'
                            : m.lifecycle?.status === 'superseded'
                            ? 'bg-[#12141c]/60 border-rose-500/20 opacity-75'
                            : 'bg-[#121622] border-white/[0.08] hover:border-white/[0.2] shadow-sm'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase bg-emerald-500/10 text-[#00ed64] border border-emerald-500/20 font-mono">
                              {m.type}
                            </span>
                            <span
                              className={`px-1.5 py-0.5 rounded text-[9px] font-mono ${
                                m.lifecycle?.status === 'active'
                                  ? 'text-emerald-400 bg-emerald-500/10'
                                  : 'text-rose-400 bg-rose-500/10'
                              }`}
                            >
                              {m.lifecycle?.status || 'active'}
                            </span>
                          </div>

                          {ttlText && (
                            <span className="text-[10px] font-mono text-purple-400 flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {ttlText}
                            </span>
                          )}
                        </div>

                        <h4 className="font-semibold text-slate-100 text-xs leading-snug">{m.title}</h4>
                        <p className="text-slate-300/80 text-[11px] leading-relaxed line-clamp-2">{m.content}</p>

                        <div className="text-[10px] text-slate-500 font-mono pt-0.5 flex items-center justify-between">
                          <span>Updated {formatTimeAgo(m.updatedAt)}</span>
                          <span className="text-emerald-400 flex items-center gap-1">
                            Inspect <ChevronRight className="w-3 h-3" />
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* Manual Memory Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-[#0d1017] border border-white/[0.12] rounded-2xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <PlusCircle className="w-4 h-4 text-[#00ed64]" />
                Index New Memory into MongoDB
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const form = e.target as any;
                const title = form.title.value.trim();
                const content = form.content.value.trim();
                const type = form.type.value;
                const ttl = form.ttl.value ? parseInt(form.ttl.value) : null;
                if (!title || !content) return;
                await onAddManual({ title, content, type, ttlSeconds: ttl } as any);
                setShowAddModal(false);
              }}
              className="space-y-3 text-xs"
            >
              <div>
                <label className="text-slate-400 font-medium">Memory Title</label>
                <input
                  name="title"
                  required
                  placeholder="e.g. Strict Rate Limiting Policy"
                  className="w-full bg-[#161c28] text-white p-2 rounded-lg border border-white/[0.1] focus:outline-none focus:border-[#00ed64] mt-1"
                />
              </div>

              <div>
                <label className="text-slate-400 font-medium">Content / Instruction</label>
                <textarea
                  name="content"
                  required
                  rows={3}
                  placeholder="e.g. All API endpoints must be guarded by Redis sliding window rate limits."
                  className="w-full bg-[#161c28] text-white p-2 rounded-lg border border-white/[0.1] focus:outline-none focus:border-[#00ed64] mt-1"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-400 font-medium">Type</label>
                  <select
                    name="type"
                    className="w-full bg-[#161c28] text-white p-2 rounded-lg border border-white/[0.1] focus:outline-none focus:border-[#00ed64] mt-1"
                  >
                    <option value="constraint">constraint</option>
                    <option value="decision">decision</option>
                    <option value="preference">preference</option>
                    <option value="fact">fact</option>
                    <option value="feedback">feedback</option>
                    <option value="incident_fix">incident_fix</option>
                  </select>
                </div>
                <div>
                  <label className="text-slate-400 font-medium">TTL (Seconds)</label>
                  <input
                    name="ttl"
                    type="number"
                    placeholder="e.g. 120 (optional)"
                    className="w-full bg-[#161c28] text-white p-2 rounded-lg border border-white/[0.1] focus:outline-none focus:border-[#00ed64] mt-1"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-white/[0.08]">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3 py-1.5 rounded-lg bg-[#161c28] text-slate-300 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-[#00ed64] text-[#08090d] font-bold hover:bg-[#00dc5c]"
                >
                  Index Memory
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}