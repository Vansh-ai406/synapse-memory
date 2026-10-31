import { NextRequest } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { MemoryDocument } from '@/types/memory';

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
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      };

      sendEvent('connected', { message: 'Subscribed to MongoDB Change Stream', workspaceId });

      let changeStream: any = null;
      let pollInterval: NodeJS.Timeout | null = null;

      try {
        const db = await getDb();
        const collection = db.collection<MemoryDocument>('memories');

        // Attempt MongoDB Change Stream (works on Atlas clusters and replica sets)
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

        changeStream.on('error', (err: any) => {
          console.warn('Change Stream error (likely standalone MongoDB, switching to polling fallback):', err.message);
          startPollingFallback();
        });
      } catch (err: any) {
        console.warn('Cannot open Change Stream directly, using resilient polling fallback:', err.message);
        startPollingFallback();
      }

      function startPollingFallback() {
        if (pollInterval) return;
        let lastCheck = new Date().toISOString();

        pollInterval = setInterval(async () => {
          if (isClosed) return;
          try {
            const db = await getDb();
            const collection = db.collection<MemoryDocument>('memories');
            const recent = await collection
              .find({
                workspaceId,
                updatedAt: { $gt: lastCheck },
              })
              .toArray();

            if (recent.length > 0) {
              lastCheck = new Date().toISOString();
              for (const doc of recent) {
                sendEvent('memory_change', {
                  operationType: 'update',
                  documentKey: { _id: doc._id },
                  fullDocument: { ...doc, _id: doc._id?.toString() },
                  timestamp: new Date().toISOString(),
                  source: 'polling_fallback',
                });
              }
            }
          } catch {
            // Ignore temporary polling errors
          }
        }, 2000);
      }

      req.signal.addEventListener('abort', () => {
        isClosed = true;
        if (changeStream) changeStream.close().catch(() => {});
        if (pollInterval) clearInterval(pollInterval);
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
