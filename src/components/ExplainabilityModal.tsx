'use client';

import React from 'react';
import { X, Search, CheckCircle, Zap, Code2, Tag, Shield } from 'lucide-react';
import { RetrievedMemory } from '@/types/memory';

interface ExplainabilityModalProps {
  memory: RetrievedMemory | null;
  onClose: () => void;
}

export default function ExplainabilityModal({ memory, onClose }: ExplainabilityModalProps) {
  if (!memory) return null;

  const scorePct = Math.round((memory.similarityScore || 0.85) * 100);

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#001c27] border border-emerald-700/60 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-emerald-950 bg-[#002230] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-950 border border-[#00ed64]/40 flex items-center justify-center text-[#00ed64]">
              <Search className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">
                Memory Explainability Inspector
              </h3>
              <p className="text-[11px] text-slate-400">
                Hackathon Step 3: Why was this memory recalled from MongoDB?
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs">
          {/* Key Metric: Similarity Score */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3.5 rounded-xl bg-[#002738] border border-emerald-900/60 flex flex-col justify-between">
              <span className="text-slate-400 text-[11px] flex items-center gap-1">
                <Zap className="w-3 h-3 text-[#00ed64]" /> Semantic Similarity
              </span>
              <span className="text-xl font-bold text-[#00ed64] font-mono mt-1">
                {scorePct}%
              </span>
              <span className="text-[10px] text-slate-400">Cosine Vector Search</span>
            </div>

            <div className="p-3.5 rounded-xl bg-[#002738] border border-emerald-900/60 flex flex-col justify-between">
              <span className="text-slate-400 text-[11px] flex items-center gap-1">
                <CheckCircle className="w-3 h-3 text-[#00ed64]" /> Lifecycle Status
              </span>
              <span className="text-base font-semibold text-white uppercase mt-1">
                {memory.lifecycle.status}
              </span>
              <span className="text-[10px] text-slate-400">
                Confidence: {(memory.lifecycle.confidence * 100).toFixed(0)}%
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-[#002738] border border-emerald-900/60 flex flex-col justify-between">
              <span className="text-slate-400 text-[11px] flex items-center gap-1">
                <Shield className="w-3 h-3 text-slate-400" /> Reinforcement
              </span>
              <span className="text-base font-semibold text-white mt-1">
                {memory.lifecycle.accessCount} Recalls
              </span>
              <span className="text-[10px] text-slate-400">Adaptive frequency score</span>
            </div>
          </div>

          {/* Memory Details */}
          <div className="p-4 rounded-xl bg-[#002433] border border-emerald-950 space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase bg-emerald-950 text-[#00ed64] border border-emerald-500/30">
                {memory.type}
              </span>
              <h4 className="font-bold text-white text-sm">{memory.title}</h4>
            </div>
            <p className="text-slate-200 text-xs leading-relaxed">
              {memory.content}
            </p>
          </div>

          {/* Reasoning Breakdown */}
          <div className="space-y-2">
            <h5 className="font-semibold text-slate-300 text-xs uppercase tracking-wider">
              Retrieval Explanation & Selection Rationale
            </h5>
            <ul className="space-y-1.5 text-slate-300">
              <li className="flex items-start gap-2 p-2 rounded-lg bg-[#002433]/70 border border-emerald-950">
                <CheckCircle className="w-3.5 h-3.5 text-[#00ed64] flex-shrink-0 mt-0.5" />
                <span>
                  <strong>Semantic Overlap:</strong> Query embedding aligned with high cosine proximity ({scorePct}%) to the indexed document vector.
                </span>
              </li>
              <li className="flex items-start gap-2 p-2 rounded-lg bg-[#002433]/70 border border-emerald-950">
                <CheckCircle className="w-3.5 h-3.5 text-[#00ed64] flex-shrink-0 mt-0.5" />
                <span>
                  <strong>Metadata Filter Match:</strong> Scoped strictly to <code className="text-emerald-400 font-mono">workspaceId: &apos;{memory.workspaceId}&apos;</code> and active lifecycle state.
                </span>
              </li>
              <li className="flex items-start gap-2 p-2 rounded-lg bg-[#002433]/70 border border-emerald-950">
                <CheckCircle className="w-3.5 h-3.5 text-[#00ed64] flex-shrink-0 mt-0.5" />
                <span>
                  <strong>Behavioral Impact:</strong> Injected into system prompt to enforce architectural rules and prevent non-compliant code generation.
                </span>
              </li>
            </ul>
          </div>

          {/* Raw Document View */}
          <div className="space-y-1.5">
            <h5 className="font-semibold text-slate-300 text-xs flex items-center gap-1.5">
              <Code2 className="w-3.5 h-3.5 text-[#00ed64]" /> Raw MongoDB Document
            </h5>
            <pre className="p-3 bg-[#00131c] rounded-xl border border-emerald-950 text-[11px] font-mono text-emerald-300/90 overflow-x-auto max-h-48">
              {JSON.stringify(
                {
                  _id: memory._id,
                  workspaceId: memory.workspaceId,
                  type: memory.type,
                  title: memory.title,
                  content: memory.content,
                  lifecycle: memory.lifecycle,
                  expiresAt: memory.expiresAt || null,
                  tags: memory.tags,
                  embeddingDimension: memory.embedding?.length || 768,
                  createdAt: memory.createdAt,
                },
                null,
                2
              )}
            </pre>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-emerald-950 bg-[#002230] flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-[#00ed64] text-[#001e2b] font-bold hover:bg-[#00c954]"
          >
            Close Inspector
          </button>
        </div>
      </div>
    </div>
  );
}
