'use client';

import React, { useState } from 'react';
import {
  GitPullRequest,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Sparkles,
  ArrowRight,
  Code2,
  Copy,
  Check,
  Layers,
} from 'lucide-react';
import { CodeReviewResult, CodeReviewFinding } from '@/types/simulator';
import { RetrievedMemory } from '@/types/memory';

const PRESET_SNIPPET_VIOLATION = `// PR #104: Payment checkout service database connector
import mongoose from 'mongoose';

export async function connectDatabase() {
  // Connecting to cluster with default options
  return await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/payments');
}
`;

const PRESET_SNIPPET_COMPLIANT = `// PR #105: Memory-compliant payment connector
import { MongoClient } from 'mongodb';

export const client = new MongoClient(process.env.MONGODB_URI!, {
  maxPoolSize: 50,              // Enforcing INC-402 fix
  minPoolSize: 10,
  serverSelectionTimeoutMS: 5000,
  tls: true,
});
`;

interface CodeReviewerViewProps {
  workspaceId: string;
  onInspectMemory: (memory: RetrievedMemory) => void;
}

export default function CodeReviewerView({
  workspaceId,
  onInspectMemory,
}: CodeReviewerViewProps) {
  const [code, setCode] = useState(PRESET_SNIPPET_VIOLATION);
  const [isReviewing, setIsReviewing] = useState(false);
  const [result, setResult] = useState<CodeReviewResult | null>(null);
  const [copied, setCopied] = useState(false);

  const handleRunReview = async (overrideCode?: string) => {
    const activeCode = overrideCode || code;
    if (!activeCode.trim() || isReviewing) return;

    setIsReviewing(true);
    try {
      const res = await fetch('/api/simulator/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: activeCode, workspaceId }),
      });
      if (res.ok) {
        const data = await res.json();
        setResult(data);
      }
    } catch (err) {
      console.error('Code review error:', err);
    } finally {
      setIsReviewing(false);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col h-full rounded-2xl border border-white/[0.08] bg-[#0d1017]/90 backdrop-blur-xl shadow-2xl shadow-black/50 overflow-hidden">
      {/* Header */}
      <div className="px-5 py-3 border-b border-white/[0.08] bg-[#111520]/80 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center text-[#00ed64]">
            <GitPullRequest className="w-3.5 h-3.5" />
          </div>
          <div>
            <h2 className="text-xs font-semibold text-white flex items-center gap-2">
              <span>Agentic PR Code Review Guard</span>
              <span className="text-[9px] font-mono font-bold bg-white/[0.06] text-slate-300 px-1.5 py-0.2 rounded">
                CI/CD Memory Enforcer
              </span>
            </h2>
            <p className="text-[11px] text-slate-400">
              Evaluates code pull requests against architecture policies in MongoDB
            </p>
          </div>
        </div>

        {result && (
          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-semibold font-mono ${
              result.passed
                ? 'bg-emerald-500/10 border-emerald-500/30 text-[#00ed64]'
                : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
            }`}
          >
            {result.passed ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-[#00ed64]" />
            ) : (
              <XCircle className="w-3.5 h-3.5 text-rose-400" />
            )}
            <span>{result.passed ? 'PASSED 100%' : `VIOLATION (${result.score}%)`}</span>
          </div>
        )}
      </div>

      {/* Preset Code Chips */}
      <div className="px-4 py-2 bg-[#090b10] border-b border-white/[0.06] flex items-center gap-2 overflow-x-auto text-xs no-scrollbar">
        <span className="text-[11px] font-medium text-slate-400 flex items-center gap-1 flex-shrink-0">
          <Sparkles className="w-3.5 h-3.5 text-[#00ed64]" /> Sample Diffs:
        </span>
        <button
          onClick={() => {
            setCode(PRESET_SNIPPET_VIOLATION);
            handleRunReview(PRESET_SNIPPET_VIOLATION);
          }}
          className="whitespace-nowrap px-2.5 py-1 rounded-md bg-[#141824] hover:bg-rose-950/40 text-rose-300 hover:text-rose-200 border border-rose-500/20 hover:border-rose-500/40 transition text-[11px] flex items-center gap-1.5"
        >
          <span className="font-mono text-[10px] text-rose-400 bg-rose-500/10 px-1 rounded">1</span>
          <span>Forbidden Mongoose & Pool Risk</span>
        </button>

        <button
          onClick={() => {
            setCode(PRESET_SNIPPET_COMPLIANT);
            handleRunReview(PRESET_SNIPPET_COMPLIANT);
          }}
          className="whitespace-nowrap px-2.5 py-1 rounded-md bg-[#141824] hover:bg-[#1b2234] text-slate-300 hover:text-white border border-white/[0.08] hover:border-white/[0.16] transition text-[11px] flex items-center gap-1.5"
        >
          <span className="font-mono text-[10px] text-emerald-400 bg-emerald-500/10 px-1 rounded">2</span>
          <span>Compliant Driver Snippet</span>
        </button>
      </div>

      {/* Main Review Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
        {/* Code Input Area */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span className="flex items-center gap-1.5 font-medium text-slate-300">
              <Code2 className="w-3.5 h-3.5 text-emerald-400" /> Proposed Pull Request Code Diff
            </span>
            <span className="font-mono text-[10px] text-slate-500">TypeScript / Node.js</span>
          </div>
          <div className="relative rounded-xl overflow-hidden border border-white/[0.08] bg-[#090b10]">
            <textarea
              value={code}
              onChange={(e) => setCode(e.target.value)}
              rows={5}
              className="w-full bg-transparent p-3.5 text-xs font-mono text-emerald-300/90 focus:outline-none focus:ring-1 focus:ring-[#00ed64] leading-relaxed resize-y"
            />
          </div>
        </div>

        {/* Action Button */}
        <div className="flex justify-end">
          <button
            onClick={() => handleRunReview()}
            disabled={!code.trim() || isReviewing}
            className="bg-[#00ed64] hover:bg-[#00dc5c] disabled:opacity-40 text-[#08090d] font-semibold px-4 py-2 rounded-xl transition shadow-emerald-glow active:scale-95 flex items-center gap-2 text-xs"
          >
            <span>{isReviewing ? 'Auditing Against MongoDB Memory...' : 'Run Agentic Memory PR Review'}</span>
            <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
          </button>
        </div>

        {/* Review Results */}
        {result && (
          <div className="space-y-3.5 pt-2 border-t border-white/[0.08]">
            <h3 className="font-semibold text-white text-xs uppercase tracking-wider flex items-center gap-1.5">
              Audit Findings ({result.findings.length})
            </h3>

            {result.findings.length === 0 ? (
              <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-300 flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-[#00ed64] flex-shrink-0" />
                <div>
                  <h4 className="font-semibold text-white">Full Architectural Compliance Verified!</h4>
                  <p className="text-[11px] text-emerald-400/90 mt-0.5">
                    Code strictly adheres to stored MongoDB native driver constraints and connection pool sizing rules.
                  </p>
                </div>
              </div>
            ) : (
              result.findings.map((f) => (
                <div
                  key={f.id}
                  className="p-3.5 rounded-xl bg-[#121622] border border-rose-500/30 text-xs space-y-2 shadow-sm"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-3.5 h-3.5 text-rose-400 flex-shrink-0" />
                      <h4 className="font-semibold text-white text-xs">{f.title}</h4>
                    </div>
                    {f.lineNumber && (
                      <span className="px-2 py-0.5 rounded bg-rose-500/10 text-rose-300 border border-rose-500/20 text-[10px] font-mono">
                        Line {f.lineNumber}
                      </span>
                    )}
                  </div>

                  <p className="text-slate-300 text-[11px] leading-relaxed">
                    {f.description}
                  </p>

                  {/* Violated Memory Reference */}
                  <div className="pt-1.5 border-t border-white/[0.05] flex items-center justify-between text-[10px]">
                    <div className="flex items-center gap-1.5">
                      <Layers className="w-3 h-3 text-slate-400" />
                      <span className="text-slate-400">Violated Memory:</span>
                      <button
                        onClick={() => onInspectMemory(f.violatedMemory)}
                        className="font-medium text-[#00ed64] hover:underline"
                      >
                        &ldquo;{f.violatedMemory.title}&rdquo;
                      </button>
                    </div>

                    <span className="text-slate-500 font-mono">
                      {f.violatedMemory.type}
                    </span>
                  </div>
                </div>
              ))
            )}

            {/* Compliant Code Suggestion */}
            {result.compliantCode && !result.passed && (
              <div className="p-3.5 rounded-xl bg-[#111520] border border-emerald-500/30 space-y-2.5 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[#00ed64] flex items-center gap-1.5 uppercase tracking-wider">
                    <Sparkles className="w-3.5 h-3.5" /> Auto-Generated Compliant Replacement
                  </span>
                  <button
                    onClick={() => handleCopy(result.compliantCode!)}
                    className="flex items-center gap-1 px-2 py-1 rounded bg-[#161c28] hover:bg-[#1f283a] text-slate-300 hover:text-white text-[10px] border border-white/[0.08] transition"
                  >
                    {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copied ? 'Copied!' : 'Copy Fix'}</span>
                  </button>
                </div>
                <pre className="p-3 bg-[#090b10] rounded-lg border border-white/[0.08] font-mono text-[11px] text-emerald-300/90 overflow-x-auto leading-relaxed">
                  {result.compliantCode}
                </pre>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
