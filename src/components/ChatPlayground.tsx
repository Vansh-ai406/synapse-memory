'use client';

import React, { useState } from 'react';
import { Send, Bot, User, Sparkles, AlertTriangle, CheckCircle2, ChevronRight, Layers, HelpCircle } from 'lucide-react';
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
    <div className="flex flex-col h-full bg-[#001721] rounded-2xl border border-emerald-950/80 shadow-2xl overflow-hidden">
      {/* Session Header / Multi-session switcher */}
      <div className="px-5 py-3 border-b border-emerald-950/60 bg-[#001c27] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-[#00ed64]" />
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">
            Active Session:
          </span>
          <select
            value={sessionId}
            onChange={(e) => setSessionId(e.target.value)}
            className="bg-[#002738] text-white text-xs border border-emerald-900/80 rounded-lg px-2.5 py-1 font-medium focus:outline-none focus:border-[#00ed64]"
          >
            <option value="session-1">Session 1 (Arch Setup & Guidelines)</option>
            <option value="session-2">Session 2 (Feature Development)</option>
            <option value="session-3">Session 3 (SRE / Incident Room)</option>
          </select>
        </div>

        <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
          <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
          <span>Persistent across sessions</span>
        </div>
      </div>

      {/* Suggested Demo Prompts bar */}
      <div className="px-4 py-2 bg-[#00141d] border-b border-emerald-950/40 flex items-center gap-2 overflow-x-auto text-xs no-scrollbar">
        <span className="text-[11px] font-semibold text-emerald-400 flex items-center gap-1 flex-shrink-0">
          <Sparkles className="w-3 h-3" /> Quick Demo:
        </span>
        <button
          onClick={() => {
            setSessionId('session-1');
            handleQuickPrompt(
              'Our team strictly enforces Node.js TypeScript with MongoDB native driver, no Mongoose, and all collections must have schema validation.'
            );
          }}
          className="whitespace-nowrap px-2.5 py-1 rounded-md bg-[#002b3d] hover:bg-[#003850] text-slate-200 border border-emerald-900/50 hover:border-emerald-500/50 transition text-[11px]"
        >
          1. Set Strict MongoDB Constraint
        </button>

        <button
          onClick={() => {
            setSessionId('session-2');
            handleQuickPrompt('Write a database connection and user lookup function for our new API.');
          }}
          className="whitespace-nowrap px-2.5 py-1 rounded-md bg-[#002b3d] hover:bg-[#003850] text-slate-200 border border-emerald-900/50 hover:border-emerald-500/50 transition text-[11px]"
        >
          2. Later Session Recall Test
        </button>

        <button
          onClick={() => {
            handleQuickPrompt('We have updated our team policy: we are migrating to Prisma ORM for all new services.');
          }}
          className="whitespace-nowrap px-2.5 py-1 rounded-md bg-amber-950/60 hover:bg-amber-900/80 text-amber-200 border border-amber-800/60 transition text-[11px]"
        >
          3. Conflict & Contradiction Test
        </button>

        <button
          onClick={() => {
            handleQuickPrompt('Active war-room auth token: WAR-ROOM-9921. Expire this temporary memory in 60 seconds.');
          }}
          className="whitespace-nowrap px-2.5 py-1 rounded-md bg-[#002b3d] hover:bg-[#003850] text-purple-200 border border-purple-900/50 transition text-[11px]"
        >
          4. Ephemeral TTL Auto-Expiry
        </button>
      </div>

      {/* Messages Feed */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
            <div className="w-12 h-12 rounded-2xl bg-emerald-950/60 border border-emerald-500/20 flex items-center justify-center text-[#00ed64] mb-3">
              <Bot className="w-6 h-6" />
            </div>
            <h3 className="text-base font-semibold text-slate-200">SynapseAgent Ready</h3>
            <p className="text-xs text-slate-400 max-w-sm mt-1">
              Give the agent instructions, preferences, or rules. It will store them in MongoDB, retrieve them in later sessions, detect contradictions, and respect TTL expiry!
            </p>
          </div>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} className="space-y-3">
              {/* Message Header & Bubble */}
              <div
                className={`flex gap-3 ${
                  msg.role === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                {msg.role === 'assistant' && (
                  <div className="w-8 h-8 rounded-lg bg-[#00ed64]/10 border border-[#00ed64]/30 flex items-center justify-center text-[#00ed64] flex-shrink-0 mt-0.5">
                    <Bot className="w-4 h-4" />
                  </div>
                )}

                <div
                  className={`max-w-[85%] rounded-2xl p-4 text-xs sm:text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-gradient-to-r from-emerald-600 to-teal-700 text-white shadow-lg'
                      : 'bg-[#002433] border border-emerald-950/90 text-slate-200 shadow-md'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                </div>

                {msg.role === 'user' && (
                  <div className="w-8 h-8 rounded-lg bg-slate-700 flex items-center justify-center text-white flex-shrink-0 mt-0.5">
                    <User className="w-4 h-4" />
                  </div>
                )}
              </div>

              {/* Recalled Memories Pill / Attribution */}
              {msg.retrievedMemories && msg.retrievedMemories.length > 0 && (
                <div className="ml-11 mr-4 bg-[#001e2b] border border-emerald-900/60 rounded-xl p-3 text-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-emerald-400 flex items-center gap-1.5 text-[11px] uppercase tracking-wider">
                      <Sparkles className="w-3.5 h-3.5" /> Recalled From MongoDB Memory ({msg.retrievedMemories.length})
                    </span>
                    <span className="text-[10px] text-slate-400">Vector Search Match</span>
                  </div>

                  <div className="space-y-1.5">
                    {msg.retrievedMemories.map((rm, i) => (
                      <div
                        key={i}
                        onClick={() => onInspectMemory(rm)}
                        className="flex items-center justify-between p-2 rounded-lg bg-[#002b3d] hover:bg-[#00364d] border border-emerald-950/60 cursor-pointer transition group"
                      >
                        <div className="flex items-center gap-2 overflow-hidden">
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-medium uppercase bg-emerald-950 text-[#00ed64] border border-emerald-500/20">
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
                <div className="ml-11 mr-4 bg-amber-950/40 border border-amber-500/40 rounded-xl p-3 text-xs space-y-1.5">
                  <div className="flex items-center gap-2 text-amber-400 font-semibold text-[11px] uppercase tracking-wider">
                    <AlertTriangle className="w-4 h-4" />
                    Contradiction Detected & Resolved
                  </div>
                  <p className="text-amber-200/90 text-xs">
                    {msg.detectedConflict.explanation}
                  </p>
                  <div className="p-2 rounded bg-amber-950/80 border border-amber-600/30 text-[11px] text-amber-300 font-mono">
                    Superseded: &ldquo;{msg.detectedConflict.previousMemory.title}&rdquo; &rarr; marked status: &apos;superseded&apos;
                  </div>
                </div>
              )}

              {/* Newly Formed Memory Card */}
              {msg.createdMemories && msg.createdMemories.length > 0 && (
                <div className="ml-11 mr-4 bg-emerald-950/30 border border-emerald-500/30 rounded-xl p-2.5 text-xs flex items-center justify-between">
                  <div className="flex items-center gap-2 text-[#00ed64]">
                    <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
                    <span className="text-xs text-slate-200">
                      New Memory Indexed into MongoDB: <strong className="text-white">&ldquo;{msg.createdMemories[0].title}&rdquo;</strong>
                    </span>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-950 text-[#00ed64] font-medium border border-emerald-500/30">
                    {msg.createdMemories[0].type}
                  </span>
                </div>
              )}
            </div>
          ))
        )}

        {isLoading && (
          <div className="flex items-center gap-2 text-emerald-400 text-xs py-2 ml-11">
            <span className="w-2 h-2 rounded-full bg-[#00ed64] animate-ping" />
            <span>Consulting MongoDB Vector Index & reasoning...</span>
          </div>
        )}
      </div>

      {/* Input Form */}
      <form onSubmit={handleSubmit} className="p-3 bg-[#001c27] border-t border-emerald-950/80 flex items-center gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={`Instruct agent in ${sessionId}... (rules, queries, incident fixes)`}
          className="flex-1 bg-[#002738] text-white text-xs sm:text-sm rounded-xl px-4 py-3 border border-emerald-950/80 focus:outline-none focus:border-[#00ed64] placeholder:text-slate-500"
          disabled={isLoading}
        />
        <button
          type="submit"
          disabled={!input.trim() || isLoading}
          className="bg-[#00ed64] hover:bg-[#00c954] disabled:opacity-40 text-[#001e2b] font-bold p-3 rounded-xl transition shadow-lg shadow-emerald-500/20 active:scale-95 flex-shrink-0"
        >
          <Send className="w-4 h-4 stroke-[2.5]" />
        </button>
      </form>
    </div>
  );
}
