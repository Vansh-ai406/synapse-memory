import { NextRequest, NextResponse } from 'next/server';
import { recallMemories, storeMemory } from '@/lib/memory-service';
import { analyzeAndExtractMemory, generateMemoryAwareResponse } from '@/lib/ai';
import { ChatMessage, MemoryDocument } from '@/types/memory';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      message,
      workspaceId = 'svnit-hackathon',
      userId = 'vansh',
      sessionId = 'session-1',
      history = [],
    } = body;

    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    // 1. Recall relevant memories from MongoDB Vector Search
    const retrievedMemories = await recallMemories(message, {
      workspaceId,
      limit: 4,
      minScore: 0.25,
    });

    // 2. Generate memory-aware response
    const assistantReplyText = await generateMemoryAwareResponse(
      message,
      retrievedMemories.map((m) => ({
        title: m.title,
        content: m.content,
        type: m.type,
        summary: m.summary,
      })),
      history
    );

    // 3. Extract new durable memories or rules from user message
    const extraction = await analyzeAndExtractMemory(message);
    const createdMemories: MemoryDocument[] = [];
    let detectedConflict: any = null;

    if (extraction && extraction.shouldRemember) {
      const result = await storeMemory({
        workspaceId,
        userId,
        type: extraction.type,
        title: extraction.title,
        content: extraction.content,
        summary: extraction.summary,
        tags: extraction.tags,
        ttlSeconds: extraction.ttlSeconds,
        source: {
          sessionId,
          rawText: message,
          author: userId,
        },
      });

      createdMemories.push(result.memory);

      if (result.conflictedMemory) {
        detectedConflict = {
          previousMemory: result.conflictedMemory,
          newMemoryContent: result.memory.content,
          explanation: `Semantic contradiction detected with active rule "${result.conflictedMemory.title}". The previous rule has been marked as SUPERSEDED.`,
        };
      }
    }

    const assistantMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: 'assistant',
      content: assistantReplyText,
      timestamp: new Date().toISOString(),
      retrievedMemories,
      createdMemories,
      detectedConflict,
    };

    return NextResponse.json({
      message: assistantMessage,
      retrievedMemories,
      createdMemories,
      detectedConflict,
    });
  } catch (error: any) {
    console.error('Chat API Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
