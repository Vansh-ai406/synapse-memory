'use client';

import React, { useState } from 'react';
import { X, Search, CheckCircle, Zap, Code2, Shield, Copy, Check } from 'lucide-react';
import { RetrievedMemory } from '@/types/memory';

interface ExplainabilityModalProps {
  memory: RetrievedMemory | null;
  onClose: () => void;
}

export default function ExplainabilityModal({ memory, onClose }: ExplainabilityModalProps) {
  const [copied, setCopied] = useState(false);
  if (!memory) return null;

  const scorePct = Math.round((memory.similarityScore || 0.85) * 100);

  const rawJson = JSON.stringify(
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
  );

  const handleCopy = () => {
    navigator.clipboard.writeText(rawJson);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Close on Escape key
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
    >
      <div className="bg-[#0f131c] border border-white/[0.12] rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/[0.08] bg-[#121622] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center text-[#00ed64]">
              <Search className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">
                Memory Explainability Inspector
              </h3>
              <p className="text-[11px] text-slate-400">
                Hackathon Step 3: Why was this memory recalled from MongoDB Atlas?
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.06] transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs">
          {/* Key Metric: Similarity Score */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3.5 rounded-xl bg-[#141824] border border-white/[0.08] flex flex-col justify-between shadow-sm">
              <span className="text-slate-400 text-[11px] flex items-center gap-1.5 font-medium">
                <Zap className="w-3.5 h-3.5 text-[#00ed64]" /> Semantic Similarity
              </span>
              <span className="text-xl font-bold text-[#00ed64] font-mono mt-1">
                {scorePct}%
              </span>
              <span className="text-[10px] text-slate-500 font-mono">Cosine Vector Search</span>
            </div>

            <div className="p-3.5 rounded-xl bg-[#141824] border border-white/[0.08] flex flex-col justify-between shadow-sm">
              <span className="text-slate-400 text-[11px] flex items-center gap-1.5 font-medium">
                <CheckCircle className="w-3.5 h-3.5 text-sky-400" /> Lifecycle Status
              </span>
              <span className="text-base font-semibold text-white uppercase mt-1 font-mono">
                {memory.lifecycle?.status || 'active'}
              </span>
              <span className="text-[10px] text-slate-500 font-mono">
                Confidence: {((memory.lifecycle?.confidence ?? 1) * 100).toFixed(0)}%
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-[#141824] border border-white/[0.08] flex flex-col justify-between shadow-sm">
              <span className="text-slate-400 text-[11px] flex items-center gap-1.5 font-medium">
                <Shield className="w-3.5 h-3.5 text-amber-400" /> Reinforcement
              </span>
              <span className="text-base font-semibold text-white mt-1 font-mono">
                {memory.lifecycle?.accessCount ?? 0} Recalls
              </span>
              <span className="text-[10px] text-slate-500 font-mono">Adaptive frequency score</span>
            </div>
          </div>

          {/* Memory Details */}
          <div className="p-4 rounded-xl bg-[#141824] border border-white/[0.08] space-y-2 shadow-sm">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[9px] font-semibold uppercase bg-emerald-500/10 text-[#00ed64] border border-emerald-500/20 font-mono">
                {memory.type}
              </span>
              <h4 className="font-semibold text-white text-sm">{memory.title}</h4>
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
              <li className="flex items-start gap-2.5 p-2.5 rounded-xl bg-[#141824] border border-white/[0.06]">
                <CheckCircle className="w-4 h-4 text-[#00ed64] flex-shrink-0 mt-0.5" />
                <span>
                  <strong>Semantic Overlap:</strong> Query embedding aligned with high cosine proximity ({scorePct}%) to the indexed document vector.
                </span>
              </li>
              <li className="flex items-start gap-2.5 p-2.5 rounded-xl bg-[#141824] border border-white/[0.06]">
                <CheckCircle className="w-4 h-4 text-[#00ed64] flex-shrink-0 mt-0.5" />
                <span>
                  <strong>Metadata Filter Match:</strong> Scoped strictly to <code className="text-emerald-400 font-mono">workspaceId: &apos;{memory.workspaceId}&apos;</code> and active lifecycle state.
                </span>
              </li>
              <li className="flex items-start gap-2.5 p-2.5 rounded-xl bg-[#141824] border border-white/[0.06]">
                <CheckCircle className="w-4 h-4 text-[#00ed64] flex-shrink-0 mt-0.5" />
                <span>
                  <strong>Behavioral Impact:</strong> Injected into system prompt to enforce architectural rules and prevent non-compliant code generation.
                </span>
              </li>
            </ul>
          </div>

          {/* Raw Document View */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <h5 className="font-semibold text-slate-300 text-xs flex items-center gap-1.5">
                <Code2 className="w-3.5 h-3.5 text-[#00ed64]" /> Raw MongoDB Document
              </h5>
              <button
                onClick={handleCopy}
                className="flex items-center gap-1 px-2 py-0.5 rounded bg-[#141824] hover:bg-[#1a2030] text-slate-400 hover:text-white border border-white/[0.08] text-[10px] transition"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copied ? 'Copied' : 'Copy JSON'}</span>
              </button>
            </div>
            <pre className="p-3 bg-[#090b10] rounded-xl border border-white/[0.08] text-[11px] font-mono text-emerald-300/90 overflow-x-auto max-h-48 leading-relaxed">
              {rawJson}
            </pre>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-white/[0.08] bg-[#121622] flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-[#00ed64] hover:bg-[#00dc5c] text-[#08090d] font-semibold shadow-emerald-glow transition active:scale-95 text-xs"
          >
            Close Inspector
          </button>
        </div>
      </div>
    </div>
  );
}
