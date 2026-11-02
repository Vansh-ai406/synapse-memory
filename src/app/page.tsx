'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Header, { AppViewMode } from '@/components/Header';
import ChatPlayground from '@/components/ChatPlayground';
import MemoryExplorer from '@/components/MemoryExplorer';
import MultiAgentView from '@/components/MultiAgentView';
import CodeReviewerView from '@/components/CodeReviewerView';
import IncidentSimulatorView from '@/components/IncidentSimulatorView';
import MemoryDecayView from '@/components/MemoryDecayView';
import ExplainabilityModal from '@/components/ExplainabilityModal';
import { MemoryDocument, ChatMessage, RetrievedMemory } from '@/types/memory';

export default function Home() {
  const [workspaceId, setWorkspaceId] = useState('svnit-hackathon');
  const [sessionId, setSessionId] = useState('session-1');
  const [activeView, setActiveView] = useState<AppViewMode>('chat');
  const [memories, setMemories] = useState<MemoryDocument[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [inspectingMemory, setInspectingMemory] = useState<RetrievedMemory | null>(null);
  const [lastUpdatedId, setLastUpdatedId] = useState<string | null>(null);

  // Fetch all memories from MongoDB API
  const fetchMemories = useCallback(async () => {
    try {
      const res = await fetch(`/api/memories?workspaceId=${workspaceId}`);
      if (res.ok) {
        const data = await res.json();
        setMemories(data.memories || []);
      }
    } catch (err) {
      console.error('Failed to load memories:', err);
    }
  }, [workspaceId]);

  useEffect(() => {
    fetchMemories();
  }, [fetchMemories]);

  // Connect to MongoDB Change Stream SSE
  useEffect(() => {
    let eventSource: EventSource | null = null;
    try {
      eventSource = new EventSource(`/api/memories/stream?workspaceId=${workspaceId}`);

      eventSource.addEventListener('connected', () => {
        setIsStreaming(true);
      });

      eventSource.addEventListener('memory_change', (event) => {
        setIsStreaming(true);
        fetchMemories();
        try {
          const payload = JSON.parse(event.data);
          if (payload.fullDocument?._id) {
            setLastUpdatedId(payload.fullDocument._id);
            setTimeout(() => setLastUpdatedId(null), 3000);
          }
        } catch {}
      });

      eventSource.onerror = () => {
        setIsStreaming(false);
      };
    } catch (err) {
      console.warn('SSE connection failed:', err);
    }

    return () => {
      if (eventSource) eventSource.close();
    };
  }, [workspaceId, fetchMemories]);

  // Handle sending a chat message
  const handleSendMessage = async (text: string) => {
    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          workspaceId,
          sessionId,
          userId: 'vansh',
          history: messages.map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setMessages((prev) => [...prev, data.message]);
        fetchMemories();
      } else {
        const err = await res.json();
        setMessages((prev) => [
          ...prev,
          {
            id: `err-${Date.now()}`,
            role: 'assistant',
            content: `⚠️ Error: ${err.error || 'Failed to generate response'}`,
            timestamp: new Date().toISOString(),
          },
        ]);
      }
    } catch (error: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: 'assistant',
          content: `⚠️ Network error: ${error.message}`,
          timestamp: new Date().toISOString(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  // Seed demo scenarios
  const handleSeedDemo = async () => {
    try {
      const res = await fetch('/api/scenarios/seed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'seed_baseline', workspaceId, userId: 'vansh' }),
      });
      if (res.ok) {
        fetchMemories();
        setMessages([
          {
            id: 'init-msg',
            role: 'assistant',
            content:
              '🎉 **Hackathon Demonstration Scenarios Loaded!**\n\n' +
              '3 core memory documents have been indexed into MongoDB:\n' +
              '• **Strict MongoDB Native Driver Policy** (Constraint)\n' +
              '• **Incident INC-402 Connection Starvation Fix** (Incident Fix)\n' +
              '• **Temporary Incident War-Room Token** (Ephemeral TTL 120s)\n\n' +
              'Explore the **PR Guard**, **Multi-Agent Room**, and **SRE Outage** tabs to test how these memories are actively recalled.',
            timestamp: new Date().toISOString(),
          },
        ]);
      }
    } catch (err) {
      console.error('Seed error:', err);
    }
  };

  // Reset workspace memories
  const handleReset = async () => {
    if (!confirm('Are you sure you want to clear all memories in this workspace?')) return;
    try {
      await fetch('/api/scenarios/seed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reset', workspaceId }),
      });
      setMessages([]);
      fetchMemories();
    } catch (err) {
      console.error('Reset error:', err);
    }
  };

  // Delete single memory
  const handleDeleteMemory = async (id: string) => {
    try {
      await fetch(`/api/memories?id=${id}`, { method: 'DELETE' });
      fetchMemories();
    } catch (err) {
      console.error('Delete error:', err);
    }
  };

  // Add manual memory
  const handleAddManual = async (data: Partial<MemoryDocument>) => {
    try {
      await fetch('/api/memories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, workspaceId, userId: 'vansh' }),
      });
      fetchMemories();
    } catch (err) {
      console.error('Add manual error:', err);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#08090d] text-slate-100 selection:bg-[#00ed64]/20 selection:text-[#00ed64]">
      <Header
        isStreaming={isStreaming}
        onReset={handleReset}
        onSeedDemo={handleSeedDemo}
        workspaceId={workspaceId}
        setWorkspaceId={setWorkspaceId}
        activeView={activeView}
        setActiveView={setActiveView}
      />

      <main className="flex-1 p-3 sm:p-5 lg:p-6 grid grid-cols-1 lg:grid-cols-12 gap-5 max-w-[1750px] w-full mx-auto">
        {/* Left Column: Active Mode View (7 cols) */}
        <section className="lg:col-span-7 h-[calc(100vh-6.2rem)] min-h-[580px] flex flex-col">
          {activeView === 'chat' && (
            <ChatPlayground
              messages={messages}
              onSendMessage={handleSendMessage}
              isLoading={isLoading}
              sessionId={sessionId}
              setSessionId={setSessionId}
              onInspectMemory={(mem) => setInspectingMemory(mem)}
            />
          )}

          {activeView === 'multi-agent' && (
            <MultiAgentView
              workspaceId={workspaceId}
              onInspectMemory={(mem) => setInspectingMemory(mem)}
            />
          )}

          {activeView === 'code-review' && (
            <CodeReviewerView
              workspaceId={workspaceId}
              onInspectMemory={(mem) => setInspectingMemory(mem)}
            />
          )}

          {activeView === 'incident' && (
            <IncidentSimulatorView
              workspaceId={workspaceId}
              onInspectMemory={(mem) => setInspectingMemory(mem)}
              onRefreshMemories={fetchMemories}
            />
          )}

          {activeView === 'decay' && (
            <MemoryDecayView
              workspaceId={workspaceId}
              onRefreshMemories={fetchMemories}
            />
          )}
        </section>

        {/* Right Column: MongoDB Memory Bank & Live Visualizer (5 cols) */}
        <section className="lg:col-span-5 h-[calc(100vh-6.2rem)] min-h-[580px] flex flex-col">
          <MemoryExplorer
            memories={memories}
            onInspect={(mem) => setInspectingMemory(mem)}
            onDelete={handleDeleteMemory}
            onAddManual={handleAddManual}
            lastUpdatedId={lastUpdatedId}
          />
        </section>
      </main>

      {/* Explainability Modal */}
      {inspectingMemory && (
        <ExplainabilityModal
          memory={inspectingMemory}
          onClose={() => setInspectingMemory(null)}
        />
      )}
    </div>
  );
}
