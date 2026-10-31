import { NextRequest } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { MemoryDocument } from '@/types/memory';
import { memoryEventBus } from '@/lib/memory-service';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const workspaceId = searchParams.get('workspaceId') || 'svnit-hackathon';

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      let isClosed = false;

      const sendEvent = (event: string, data: any) => {
        if (isClosed) return;
        try {
          controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
        } catch {}
      };

      sendEvent('connected', { message: 'Subscribed to MongoDB Change Stream', workspaceId });

      // Subscribe to memoryEventBus for instant in-process changes
      const unsubscribeBus = memoryEventBus.subscribe((data) => {
        sendEvent('memory_change', data);
      });

      let changeStream: any = null;

      try {
        const db = await getDb();
        const collection = db.collection<MemoryDocument>('memories');

        changeStream = collection.watch([
          {
            $match: {
              $or: [
                { 'fullDocument.workspaceId': workspaceId },
                { operationType: 'delete' },
              ],
            },
          },
        ]);

        changeStream.on('change', (change: any) => {
          sendEvent('memory_change', {
            operationType: change.operationType,
            documentKey: change.documentKey,
            fullDocument: change.fullDocument
              ? { ...change.fullDocument, _id: change.fullDocument._id?.toString() }
              : null,
            updateDescription: change.updateDescription,
            timestamp: new Date().toISOString(),
          });
        });

        changeStream.on('error', () => {
          // Handled gracefully via in-process event bus
        });
      } catch {
        // Handled gracefully via in-process event bus
      }

      req.signal.addEventListener('abort', () => {
        isClosed = true;
        unsubscribeBus();
        if (changeStream) changeStream.close().catch(() => {});
        try {
          controller.close();
        } catch {}
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}
