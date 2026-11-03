'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Sidebar, { StudioView } from '@/components/Sidebar';
import TopBar from '@/components/TopBar';
import ChatPlayground from '@/components/ChatPlayground';
import MemoryExplorer from '@/components/MemoryExplorer';
import ContextInspector from '@/components/ContextInspector';
import MemoryGraphCanvas from '@/components/MemoryGraphCanvas';
import MultiAgentView from '@/components/MultiAgentView';
import CodeReviewerView from '@/components/CodeReviewerView';
import IncidentSimulatorView from '@/components/IncidentSimulatorView';
import MemoryDecayView from '@/components/MemoryDecayView';
import ExplainabilityModal from '@/components/ExplainabilityModal';
import { MemoryDocument, ChatMessage, RetrievedMemory } from '@/types/memory';

export default function Home() {
  const [workspaceId, setWorkspaceId] = useState('svnit-hackathon');
  const [sessionId, setSessionId] = useState('session-1');
  const [activeView, setActiveView] = useState<StudioView>('chat');
  const [showDrawer, setShowDrawer] = useState(true);
  const [memories, setMemories] = useState<MemoryDocument[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [inspectingMemory, setInspectingMemory] = useState<RetrievedMemory | null>(null);
  const [fullscreenModalMemory, setFullscreenModalMemory] = useState<RetrievedMemory | null>(null);
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
              '🎉 **Hackathon Demonstration Baseline Loaded into MongoDB!**\n\n' +
              '3 core memory documents have been indexed:\n' +
              '• **Strict MongoDB Native Driver Policy** (Constraint)\n' +
              '• **Incident INC-402 Connection Starvation Fix** (Incident Fix)\n' +
              '• **Temporary War-Room Auth Token** (Ephemeral TTL 120s)\n\n' +
              'Use the sidebar navigation to test how these memories inform the **PR Guard**, **Multi-Agent Room**, and **SRE Outage** automations.',
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

  // Update / Correct memory in MongoDB
  const handleUpdateMemory = async (id: string, updates: Partial<MemoryDocument>) => {
    try {
      const res = await fetch('/api/memories', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, updates }),
      });
      if (res.ok) {
        const data = await res.json();
        if (inspectingMemory && inspectingMemory._id === id) {
          setInspectingMemory((prev) => (prev ? { ...prev, ...data.memory } : null));
        }
        fetchMemories();
      }
    } catch (err) {
      console.error('Update memory error:', err);
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#07090e] text-slate-100">
      {/* Studio Navigation Sidebar */}
      <Sidebar
        activeView={activeView}
        setActiveView={setActiveView}
        isStreaming={isStreaming}
        onSeedDemo={handleSeedDemo}
        onReset={handleReset}
        workspaceId={workspaceId}
        setWorkspaceId={setWorkspaceId}
        totalMemoriesCount={memories.length}
      />

      {/* Main Studio Viewport */}
      <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden">
        {/* Top Context & Action Bar */}
        <TopBar
          activeView={activeView}
          sessionId={sessionId}
          setSessionId={setSessionId}
          showDrawer={showDrawer}
          setShowDrawer={setShowDrawer}
          totalMemoriesCount={memories.length}
        />

        {/* Center Stage + Optional Docked Memory Drawer */}
        <div className="flex-1 flex p-3 sm:p-4 gap-4 overflow-hidden min-h-0">
          {/* Main Content Area */}
          <main className="flex-1 h-full min-w-0 overflow-hidden flex flex-col">
            {activeView === 'chat' && (
              <ChatPlayground
                messages={messages}
                onSendMessage={handleSendMessage}
                isLoading={isLoading}
                sessionId={sessionId}
                setSessionId={setSessionId}
                onInspectMemory={(mem) => {
                  setInspectingMemory(mem);
                  setShowDrawer(true);
                }}
              />
            )}

            {activeView === 'multi-agent' && (
              <MultiAgentView
                workspaceId={workspaceId}
                onInspectMemory={(mem) => {
                  setInspectingMemory(mem);
                  setShowDrawer(true);
                }}
              />
            )}

            {activeView === 'code-review' && (
              <CodeReviewerView
                workspaceId={workspaceId}
                onInspectMemory={(mem) => {
                  setInspectingMemory(mem);
                  setShowDrawer(true);
                }}
              />
            )}

            {activeView === 'incident' && (
              <IncidentSimulatorView
                workspaceId={workspaceId}
                onInspectMemory={(mem) => {
                  setInspectingMemory(mem);
                  setShowDrawer(true);
                }}
                onRefreshMemories={fetchMemories}
              />
            )}

            {activeView === 'decay' && (
              <MemoryDecayView
                workspaceId={workspaceId}
                onRefreshMemories={fetchMemories}
              />
            )}

            {activeView === 'graph' && (
              <div className="flex-1 h-full rounded-2xl border border-white/[0.08] bg-[#0d1017]/90 backdrop-blur-xl p-3 shadow-2xl overflow-hidden">
                <MemoryGraphCanvas
                  memories={memories}
                  onInspectNode={(mem) => {
                    setInspectingMemory(mem as RetrievedMemory);
                    setShowDrawer(true);
                  }}
                  lastUpdatedId={lastUpdatedId}
                />
              </div>
            )}

            {activeView === 'explorer' && (
              <div className="flex-1 h-full">
                <MemoryExplorer
                  memories={memories}
                  onInspect={(mem) => {
                    setInspectingMemory(mem);
                    setShowDrawer(true);
                  }}
                  onDelete={handleDeleteMemory}
                  onAddManual={handleAddManual}
                  lastUpdatedId={lastUpdatedId}
                />
              </div>
            )}
          </main>

          {/* Right Side Docked Context Inspector Panel (3-Pane Studio Layout) */}
          {showDrawer && activeView !== 'explorer' && (
            <aside className="w-80 lg:w-[420px] flex-shrink-0 h-full hidden md:flex flex-col animate-in fade-in slide-in-from-right-4 duration-200">
              <ContextInspector
                memories={memories}
                activeInspectedMemory={inspectingMemory}
                onSelectMemory={(mem) => setInspectingMemory(mem)}
                onUpdateMemory={handleUpdateMemory}
                onDeleteMemory={handleDeleteMemory}
                onAddManual={handleAddManual}
                onExpandModal={(mem) => setFullscreenModalMemory(mem)}
                lastUpdatedId={lastUpdatedId}
              />
            </aside>
          )}
        </div>
      </div>

      {/* Vector Explainability Modal (only shown when explicitly expanded) */}
      {fullscreenModalMemory && (
        <ExplainabilityModal
          memory={fullscreenModalMemory}
          onClose={() => setFullscreenModalMemory(null)}
        />
      )}
    </div>
  );
}
