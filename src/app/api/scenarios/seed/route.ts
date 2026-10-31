import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { storeMemory, clearInMemoryMemories } from '@/lib/memory-service';
import { MemoryDocument } from '@/types/memory';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action = 'seed_all', workspaceId = 'svnit-hackathon', userId = 'vansh' } = body;

    let isMongo = false;
    try {
      const db = await getDb();
      const collection = db.collection<MemoryDocument>('memories');
      if (action === 'reset') {
        await collection.deleteMany({ workspaceId });
      }
      isMongo = true;
    } catch {}

    if (action === 'reset') {
      clearInMemoryMemories(workspaceId);
      return NextResponse.json({ success: true, message: 'Workspace memories cleared.' });
    }

    if (action === 'seed_baseline' || action === 'seed_all') {
      clearInMemoryMemories(workspaceId);

      // 1. Architecture constraint memory
      await storeMemory({
        workspaceId,
        userId,
        type: 'constraint',
        title: 'Strict MongoDB Native Driver Policy',
        content:
          'Our backend strictly enforces Node.js TypeScript with the official MongoDB native driver. We never use Mongoose or external ORMs, and all connection strings must enforce TLS 1.3 with connection pooling.',
        summary: 'Enforce Node.js + MongoDB native driver; forbidden to use Mongoose or ORMs.',
        tags: ['architecture', 'mongodb', 'security'],
        source: {
          sessionId: 'session-arch-review',
          author: 'Lead Architect',
          rawText: 'Enforce native MongoDB driver, no ORMs allowed.',
        },
      });

      // 2. Incident Post-Mortem memory
      await storeMemory({
        workspaceId,
        userId,
        type: 'incident_fix',
        title: 'Incident INC-402: Connection Pool Starvation Fix',
        content:
          'During the Diwali peak traffic spike, the payments service crashed due to default connection pool saturation (poolSize=5). Resolved by setting maxPoolSize: 50, minPoolSize: 10, and configuring serverSelectionTimeoutMS: 5000.',
        summary: 'Incident INC-402 fix: Configure maxPoolSize=50 and minPoolSize=10 to prevent starvation.',
        tags: ['incident', 'performance', 'mongodb-pool'],
        source: {
          sessionId: 'session-incident-review',
          author: 'SRE Team',
          rawText: 'Post-mortem fix for INC-402 connection starvation.',
        },
      });

      // 3. Ephemeral TTL Memory (expires in 120 seconds for demonstration)
      await storeMemory({
        workspaceId,
        userId,
        type: 'fact',
        title: 'Temporary Incident War-Room Token (TTL 120s)',
        content:
          'Active Incident War-Room Bridge Token: "WAR-ROOM-TOKEN-SVNIT-2026". Expires automatically via MongoDB TTL index in 120 seconds.',
        summary: 'Ephemeral War-Room Token with 120-second TTL index auto-expiry.',
        tags: ['ephemeral', 'ttl', 'incident-bridge'],
        ttlSeconds: 120,
        source: {
          sessionId: 'session-sre-active',
          author: 'DevOps Bot',
          rawText: 'Temporary token expires in 120 seconds.',
        },
      });

      return NextResponse.json({
        success: true,
        message: 'Pre-seeded 3 rich demonstration memories (Constraint, Incident Fix, TTL Expiry).',
      });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error: any) {
    console.error('Seed API Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
