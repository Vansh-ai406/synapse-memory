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
    <div className="flex flex-col h-full bg-[#001721] rounded-2xl border border-emerald-950/80 shadow-2xl overflow-hidden">
      {/* Header */}
      <div className="px-5 py-3.5 border-b border-emerald-950/60 bg-[#001c27] flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-950 border border-[#00ed64]/40 flex items-center justify-center text-[#00ed64]">
            <GitPullRequest className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              Agentic PR Code Review Guard
              <span className="text-[10px] font-semibold bg-emerald-950 text-[#00ed64] border border-emerald-500/30 px-2 py-0.5 rounded-full">
                Memory-Enforced CI/CD
              </span>
            </h2>
            <p className="text-[11px] text-slate-400">
              Evaluates code pull requests against team guidelines and historical post-mortems in MongoDB
            </p>
          </div>
        </div>

        {result && (
          <div
            className={`flex items-center gap-2 px-3 py-1 rounded-lg border text-xs font-semibold ${
              result.passed
                ? 'bg-emerald-950/80 border-emerald-500/40 text-[#00ed64]'
                : 'bg-rose-950/80 border-rose-500/40 text-rose-300'
            }`}
          >
            {result.passed ? (
              <CheckCircle2 className="w-3.5 h-3.5" />
            ) : (
              <XCircle className="w-3.5 h-3.5" />
            )}
            <span>{result.passed ? 'PASSED (100%)' : `FAILED (${result.score}%)`}</span>
          </div>
        )}
      </div>

      {/* Preset Code Chips */}
      <div className="px-4 py-2 bg-[#00141d] border-b border-emerald-950/40 flex items-center gap-2 overflow-x-auto text-xs no-scrollbar">
        <span className="text-[11px] font-semibold text-emerald-400 flex items-center gap-1 flex-shrink-0">
          <Sparkles className="w-3 h-3" /> Test PR Diffs:
        </span>
        <button
          onClick={() => {
            setCode(PRESET_SNIPPET_VIOLATION);
            handleRunReview(PRESET_SNIPPET_VIOLATION);
          }}
          className="whitespace-nowrap px-2.5 py-1 rounded-md bg-rose-950/50 hover:bg-rose-900/60 text-rose-300 border border-rose-800/50 transition text-[11px]"
        >
          1. PR with Mongoose & Pool Violations
        </button>

        <button
          onClick={() => {
            setCode(PRESET_SNIPPET_COMPLIANT);
            handleRunReview(PRESET_SNIPPET_COMPLIANT);
          }}
          className="whitespace-nowrap px-2.5 py-1 rounded-md bg-emerald-950/50 hover:bg-emerald-900/60 text-emerald-300 border border-emerald-800/50 transition text-[11px]"
        >
          2. Compliant Official Driver PR
        </button>
      </div>

      {/* Main Review Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
        {/* Code Input Area */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span className="flex items-center gap-1 font-semibold text-slate-300">
              <Code2 className="w-3.5 h-3.5 text-emerald-400" /> Proposed Code Diff
            </span>
            <span>TypeScript / Node.js</span>
          </div>
          <textarea
            value={code}
            onChange={(e) => setCode(e.target.value)}
            rows={5}
            className="w-full bg-[#00141d] border border-emerald-950 rounded-xl p-3 text-xs font-mono text-emerald-300 focus:outline-none focus:border-[#00ed64] leading-relaxed"
          />
        </div>

        {/* Action Button */}
        <div className="flex justify-end">
          <button
            onClick={() => handleRunReview()}
            disabled={!code.trim() || isReviewing}
            className="bg-[#00ed64] hover:bg-[#00c954] disabled:opacity-40 text-[#001e2b] font-bold px-4 py-2.5 rounded-xl transition shadow-lg shadow-emerald-500/20 active:scale-95 flex items-center gap-2 text-xs"
          >
            <span>{isReviewing ? 'Auditing Against MongoDB Memory...' : 'Run Agentic Memory PR Review'}</span>
            <ArrowRight className="w-4 h-4 stroke-[2.5]" />
          </button>
        </div>

        {/* Review Results */}
        {result && (
          <div className="space-y-4 pt-2 border-t border-emerald-950/60">
            {/* Findings List */}
            <div className="space-y-3">
              <h3 className="font-bold text-white text-xs uppercase tracking-wider flex items-center gap-1.5">
                Audit Findings ({result.findings.length})
              </h3>

              {result.findings.length === 0 ? (
                <div className="p-4 rounded-xl bg-emerald-950/30 border border-emerald-500/40 text-xs text-emerald-300 flex items-center gap-2.5">
                  <CheckCircle2 className="w-5 h-5 text-[#00ed64] flex-shrink-0" />
                  <div>
                    <h4 className="font-bold text-white">Full Compliance Verified!</h4>
                    <p className="text-[11px] text-emerald-400/90 mt-0.5">
                      Code strictly adheres to all stored MongoDB architectural constraints, driver standards, and pool sizing runbooks.
                    </p>
                  </div>
                </div>
              ) : (
                result.findings.map((f) => (
                  <div
                    key={f.id}
                    className="p-3.5 rounded-xl bg-[#002230] border border-rose-900/60 text-xs space-y-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0" />
                        <h4 className="font-bold text-white">{f.title}</h4>
                      </div>
                      {f.lineNumber && (
                        <span className="px-2 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-800/40 text-[10px] font-mono">
                          Line {f.lineNumber}
                        </span>
                      )}
                    </div>

                    <p className="text-slate-300 text-[11px] leading-relaxed">
                      {f.description}
                    </p>

                    {/* Violated Memory Reference */}
                    <div className="pt-1 flex items-center justify-between text-[10px]">
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

                      <span className="text-slate-500">
                        {f.violatedMemory.type}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Compliant Code Suggestion */}
            {result.compliantCode && !result.passed && (
              <div className="p-4 rounded-xl bg-[#001c27] border border-emerald-500/40 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#00ed64] flex items-center gap-1.5 uppercase tracking-wider">
                    <Sparkles className="w-3.5 h-3.5" /> Auto-Generated Compliant Replacement
                  </span>
                  <button
                    onClick={() => handleCopy(result.compliantCode!)}
                    className="flex items-center gap-1 px-2 py-1 rounded bg-[#002b3d] hover:bg-[#003850] text-slate-300 hover:text-white text-[10px] transition"
                  >
                    <Copy className="w-3 h-3" />
                    <span>{copied ? 'Copied!' : 'Copy Fix'}</span>
                  </button>
                </div>
                <pre className="p-3 bg-[#00131c] rounded-lg border border-emerald-950 font-mono text-[11px] text-emerald-300 overflow-x-auto leading-relaxed">
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
