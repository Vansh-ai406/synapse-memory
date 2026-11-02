'use client';

import React, { useState } from 'react';
import {
  Send,
  Bot,
  User,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Layers,
  Terminal,
} from 'lucide-react';
import { ChatMessage, RetrievedMemory } from '@/types/memory';

interface ChatPlaygroundProps {
  messages: ChatMessage[];
  onSendMessage: (text: string) => Promise<void>;
  isLoading: boolean;
  sessionId: string;
  setSessionId: (id: string) => void;
  onInspectMemory: (memory: RetrievedMemory) => void;
}

export default function ChatPlayground({
  messages,
  onSendMessage,
  isLoading,
  sessionId,
  setSessionId,
  onInspectMemory,
}: ChatPlaygroundProps) {
  const [input, setInput] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    const text = input;
    setInput('');
    onSendMessage(text);
  };

  const handleQuickPrompt = (prompt: string) => {
    setInput(prompt);
  };

  return (
    <div className="flex flex-col h-full rounded-2xl border border-white/[0.08] bg-[#0d1017]/90 backdrop-blur-xl shadow-2xl shadow-black/50 overflow-hidden">
      {/* Session Header / Multi-session switcher */}
      <div className="px-5 py-3 border-b border-white/[0.08] bg-[#111520]/80 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Layers className="w-4 h-4 text-[#00ed64]" />
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Active Context:
          </span>
          <select
            value={sessionId}
            onChange={(e) => setSessionId(e.target.value)}
            className="bg-[#171d2b] text-white text-xs border border-white/[0.12] rounded-lg px-2.5 py-1 font-medium focus:outline-none focus:border-[#00ed64] cursor-pointer"
          >
            <option value="session-1">Session 1 (Architecture Guidelines)</option>
            <option value="session-2">Session 2 (Feature Development)</option>
            <option value="session-3">Session 3 (Incident War-Room)</option>
          </select>
        </div>

        <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
          <span className="w-1.5 h-1.5 rounded-full bg-[#00ed64] animate-pulse" />
          <span>Cross-Session MongoDB Memory</span>
        </div>
      </div>

      {/* Suggested Demo Prompts bar */}
      <div className="px-4 py-2 bg-[#090b10] border-b border-white/[0.06] flex items-center gap-2 overflow-x-auto text-xs no-scrollbar">
        <span className="text-[11px] font-medium text-slate-400 flex items-center gap-1.5 flex-shrink-0">
          <Sparkles className="w-3.5 h-3.5 text-[#00ed64]" />
          <span>Demo Steps:</span>
        </span>

        <button
          onClick={() => {
            setSessionId('session-1');
            handleQuickPrompt(
              'Our team strictly enforces Node.js TypeScript with MongoDB native driver, no Mongoose, and all collections must have schema validation.'
            );
          }}
          className="whitespace-nowrap px-2.5 py-1 rounded-md bg-[#141824] hover:bg-[#1b2234] text-slate-300 hover:text-white border border-white/[0.08] hover:border-white/[0.16] transition text-[11px] flex items-center gap-1.5"
        >
          <span className="font-mono text-[10px] text-emerald-400 bg-emerald-500/10 px-1 rounded">1</span>
          <span>Set Strict Driver Policy</span>
        </button>

        <button
          onClick={() => {
            setSessionId('session-2');
            handleQuickPrompt('Write a database connection and user lookup function for our new API.');
          }}
          className="whitespace-nowrap px-2.5 py-1 rounded-md bg-[#141824] hover:bg-[#1b2234] text-slate-300 hover:text-white border border-white/[0.08] hover:border-white/[0.16] transition text-[11px] flex items-center gap-1.5"
        >
          <span className="font-mono text-[10px] text-sky-400 bg-sky-500/10 px-1 rounded">2</span>
          <span>Session 2 Recall Test</span>
        </button>

        <button
          onClick={() => {
            handleQuickPrompt('We have updated our team policy: we are migrating to Prisma ORM for all new services.');
          }}
          className="whitespace-nowrap px-2.5 py-1 rounded-md bg-[#141824] hover:bg-amber-950/40 text-amber-300 hover:text-amber-200 border border-amber-500/20 hover:border-amber-500/40 transition text-[11px] flex items-center gap-1.5"
        >
          <span className="font-mono text-[10px] text-amber-400 bg-amber-500/10 px-1 rounded">3</span>
          <span>Contradiction Test</span>
        </button>

        <button
          onClick={() => {
            handleQuickPrompt('Active war-room auth token: WAR-ROOM-9921. Expire this temporary memory in 60 seconds.');
          }}
          className="whitespace-nowrap px-2.5 py-1 rounded-md bg-[#141824] hover:bg-purple-950/40 text-purple-300 hover:text-purple-200 border border-purple-500/20 hover:border-purple-500/40 transition text-[11px] flex items-center gap-1.5"
        >
          <span className="font-mono text-[10px] text-purple-400 bg-purple-500/10 px-1 rounded">4</span>
          <span>Ephemeral TTL (60s)</span>
        </button>
      </div>

      {/* Messages Feed */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
            <div className="w-12 h-12 rounded-2xl bg-[#141824] border border-white/[0.08] flex items-center justify-center text-[#00ed64] mb-3 shadow-inner-glow">
              <Bot className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-semibold text-white">SynapseAgent Standby</h3>
            <p className="text-xs text-slate-400 max-w-sm mt-1 leading-relaxed">
              Feed guidelines, policies, or past incident runbooks. SynapseAgent embeds them in MongoDB, recalls them in subsequent sessions, detects contradictions, and respects TTL index expiration.
            </p>
          </div>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} className="space-y-2.5">
              {/* Message Header & Bubble */}
              <div
                className={`flex gap-3 ${
                  msg.role === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                {msg.role === 'assistant' && (
                  <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center text-[#00ed64] flex-shrink-0 mt-0.5">
                    <Bot className="w-3.5 h-3.5" />
                  </div>
                )}

                <div
                  className={`max-w-[85%] rounded-xl p-3.5 text-xs leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-gradient-to-r from-emerald-600 to-teal-700 text-white shadow-lg'
                      : 'bg-[#121622] border border-white/[0.08] text-slate-200 shadow-sm'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                </div>

                {msg.role === 'user' && (
                  <div className="w-7 h-7 rounded-lg bg-slate-800 border border-white/[0.1] flex items-center justify-center text-white flex-shrink-0 mt-0.5">
                    <User className="w-3.5 h-3.5" />
                  </div>
                )}
              </div>

              {/* Recalled Memories Pill / Attribution */}
              {msg.retrievedMemories && msg.retrievedMemories.length > 0 && (
                <div className="ml-10 mr-4 bg-[#111520] border border-white/[0.08] rounded-xl p-3 text-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-emerald-400 flex items-center gap-1.5 text-[11px] uppercase tracking-wider">
                      <Sparkles className="w-3.5 h-3.5" /> Recalled From MongoDB Memory ({msg.retrievedMemories.length})
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">Atlas Vector Search</span>
                  </div>

                  <div className="space-y-1.5">
                    {msg.retrievedMemories.map((rm, i) => (
                      <div
                        key={i}
                        onClick={() => onInspectMemory(rm)}
                        className="flex items-center justify-between p-2 rounded-lg bg-[#161c28] hover:bg-[#1c2434] border border-white/[0.06] hover:border-emerald-500/30 cursor-pointer transition group"
                      >
                        <div className="flex items-center gap-2 overflow-hidden">
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase bg-emerald-500/10 text-[#00ed64] border border-emerald-500/20 font-mono">
                            {rm.type}
                          </span>
                          <span className="truncate text-slate-200 text-xs font-medium">
                            {rm.title}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0 text-slate-400 group-hover:text-emerald-400">
                          <span className="text-[11px] font-mono text-emerald-400">
                            {Math.round((rm.similarityScore || 0) * 100)}% match
                          </span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Conflict Detected Alert Card */}
              {msg.detectedConflict && (
                <div className="ml-10 mr-4 bg-amber-950/30 border border-amber-500/30 rounded-xl p-3 text-xs space-y-1.5">
                  <div className="flex items-center gap-2 text-amber-400 font-semibold text-[11px] uppercase tracking-wider">
                    <AlertTriangle className="w-4 h-4" />
                    Contradiction Detected & Resolved
                  </div>
                  <p className="text-amber-200/90 text-xs">
                    {msg.detectedConflict.explanation}
                  </p>
                  <div className="p-2 rounded bg-amber-950/60 border border-amber-600/30 text-[11px] text-amber-300 font-mono">
                    Superseded: &ldquo;{msg.detectedConflict.previousMemory.title}&rdquo; &rarr; marked status: &apos;superseded&apos;
                  </div>
                </div>
              )}

              {/* Newly Formed Memory Card */}
              {msg.createdMemories && msg.createdMemories.length > 0 && (
                <div className="ml-10 mr-4 bg-[#111520] border border-emerald-500/30 rounded-xl p-2.5 text-xs flex items-center justify-between">
                  <div className="flex items-center gap-2 text-[#00ed64]">
                    <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
                    <span className="text-xs text-slate-200">
                      New Memory Indexed into MongoDB: <strong className="text-white">&ldquo;{msg.createdMemories[0].title}&rdquo;</strong>
                    </span>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/10 text-[#00ed64] font-medium border border-emerald-500/20 font-mono">
                    {msg.createdMemories[0].type}
                  </span>
                </div>
              )}
            </div>
          ))
        )}

        {isLoading && (
          <div className="flex items-center gap-2.5 text-emerald-400 text-xs py-2 ml-10">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00ed64] opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#00ed64]" />
            </span>
            <span className="font-medium text-slate-300">Consulting MongoDB Vector Index & synthesizing memory...</span>
          </div>
        )}
      </div>

      {/* Input Form */}
      <form onSubmit={handleSubmit} className="p-3 bg-[#111520] border-t border-white/[0.08] flex items-center gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={`Instruct agent in ${sessionId}... (guidelines, queries, incident fixes)`}
          className="flex-1 bg-[#161c28] text-white text-xs sm:text-sm rounded-xl px-4 py-2.5 border border-white/[0.08] focus:outline-none focus:border-[#00ed64] placeholder:text-slate-500 transition-colors"
          disabled={isLoading}
        />
        <button
          type="submit"
          disabled={!input.trim() || isLoading}
          className="bg-[#00ed64] hover:bg-[#00dc5c] disabled:opacity-40 text-[#08090d] font-bold p-2.5 rounded-xl transition shadow-emerald-glow active:scale-95 flex-shrink-0"
        >
          <Send className="w-4 h-4 stroke-[2.5]" />
        </button>
      </form>
    </div>
  );
}
