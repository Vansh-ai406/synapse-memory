import { ObjectId } from 'mongodb';
import { getDb } from './mongodb';
import { getEmbedding, cosineSimilarity } from './ai';
import { MemoryDocument, RetrievedMemory, MemoryType, MemoryStatus } from '@/types/memory';

const COLLECTION_NAME = 'memories';

// In-memory fallback cache in case MongoDB is temporarily offline or connection string is pending
const inMemoryStore: MemoryDocument[] = [];
export const memoryEventBus = {
  listeners: [] as Array<(event: any) => void>,
  subscribe(fn: (event: any) => void) {
    this.listeners.push(fn);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== fn);
    };
  },
  emit(event: any) {
    this.listeners.forEach((fn) => {
      try {
        fn(event);
      } catch {}
    });
  },
};

export interface StoreMemoryParams {
  workspaceId: string;
  userId: string;
  agentId?: string;
  type: MemoryType;
  title: string;
  content: string;
  summary?: string;
  tags?: string[];
  ttlSeconds?: number | null;
  source?: {
    sessionId?: string;
    turnIndex?: number;
    rawText?: string;
    author?: string;
  };
  privacy?: 'team' | 'private';
}

/**
 * Stores a new memory into MongoDB with vector embedding, lifecycle metrics, and conflict checking.
 */
export async function storeMemory(params: StoreMemoryParams): Promise<{
  memory: MemoryDocument;
  conflictedMemory?: MemoryDocument | null;
}> {
  const embedding = await getEmbedding(`${params.title}: ${params.content}`);
  const now = new Date().toISOString();

  // Calculate TTL date if provided
  let expiresAt: Date | null = null;
  if (params.ttlSeconds && params.ttlSeconds > 0) {
    expiresAt = new Date(Date.now() + params.ttlSeconds * 1000);
  }

  let existingActive: MemoryDocument[] = [];
  let isMongoActive = false;

  try {
    const db = await getDb();
    const collection = db.collection<MemoryDocument>(COLLECTION_NAME);
    existingActive = await collection
      .find({
        workspaceId: params.workspaceId,
        'lifecycle.status': 'active',
      })
      .toArray();
    isMongoActive = true;
  } catch (err) {
    console.warn('MongoDB connection pending or offline, using fallback store:', (err as any).message);
    existingActive = inMemoryStore.filter(
      (m) => m.workspaceId === params.workspaceId && m.lifecycle.status === 'active'
    );
  }

  let conflictedMemory: MemoryDocument | null = null;

  for (const existing of existingActive) {
    if (existing.embedding && existing.embedding.length > 0) {
      const sim = cosineSimilarity(embedding, existing.embedding);
      if (sim > 0.70) {
        const isContradiction = checkContradictionWords(existing.content, params.content);
        if (isContradiction) {
          conflictedMemory = existing;
          break;
        }
      }
    }
  }

  const newDoc: MemoryDocument = {
    _id: `mem-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
    workspaceId: params.workspaceId,
    userId: params.userId,
    agentId: params.agentId || 'copilot-v1',
    type: params.type,
    title: params.title,
    content: params.content,
    summary: params.summary || params.content.slice(0, 120),
    embedding,
    source: params.source || {
      rawText: params.content,
      author: params.userId,
    },
    lifecycle: {
      status: 'active',
      confidence: 0.95,
      accessCount: 0,
      lastAccessedAt: now,
      conflictReason: conflictedMemory ? `Supersedes previous memory: ${conflictedMemory.title}` : null,
    },
    privacy: params.privacy || 'team',
    tags: params.tags || ['general'],
    expiresAt,
    createdAt: now,
    updatedAt: now,
  };

  if (isMongoActive) {
    try {
      const db = await getDb();
      const collection = db.collection<MemoryDocument>(COLLECTION_NAME);
      const { _id, ...insertPayload } = newDoc;
      const result = await collection.insertOne(insertPayload as any);
      newDoc._id = result.insertedId.toString();

      if (conflictedMemory && conflictedMemory._id) {
        await collection.updateOne(
          { _id: new ObjectId(conflictedMemory._id) as any },
          {
            $set: {
              'lifecycle.status': 'superseded' as MemoryStatus,
              'lifecycle.supersededBy': newDoc._id,
              'lifecycle.supersededReason': `Replaced by updated constraint/rule: "${newDoc.title}"`,
              updatedAt: now,
            },
          }
        );
      }
    } catch {
      // In-memory fallback
      saveToInMemory(newDoc, conflictedMemory, now);
    }
  } else {
    saveToInMemory(newDoc, conflictedMemory, now);
  }

  memoryEventBus.emit({
    operationType: 'insert',
    fullDocument: newDoc,
    timestamp: now,
  });

  return {
    memory: newDoc,
    conflictedMemory,
  };
}

function saveToInMemory(newDoc: MemoryDocument, conflictedMemory: MemoryDocument | null, now: string) {
  inMemoryStore.unshift(newDoc);
  if (conflictedMemory) {
    const idx = inMemoryStore.findIndex((m) => m._id === conflictedMemory._id);
    if (idx !== -1) {
      inMemoryStore[idx].lifecycle.status = 'superseded';
      inMemoryStore[idx].lifecycle.supersededBy = newDoc._id;
      inMemoryStore[idx].lifecycle.supersededReason = `Replaced by updated constraint: "${newDoc.title}"`;
      inMemoryStore[idx].updatedAt = now;
    }
  }
}

/**
 * Checks for semantic contradiction indicators
 */
function checkContradictionWords(oldText: string, newText: string): boolean {
  const o = oldText.toLowerCase();
  const n = newText.toLowerCase();

  const pairs = [
    ['aws privatelink', 'google cloud'],
    ['aws', 'gcp'],
    ['postgres', 'mongo'],
    ['prisma', 'native driver'],
    ['mongoose', 'native'],
    ['no orm', 'prisma'],
    ['port 27017', 'port 5432'],
    ['strict', 'allow'],
    ['never', 'always'],
  ];

  for (const [a, b] of pairs) {
    if ((o.includes(a) && n.includes(b)) || (o.includes(b) && n.includes(a))) {
      return true;
    }
  }

  if (n.includes('migrated to') || n.includes('replaced with') || n.includes('no longer') || n.includes('instead of')) {
    return true;
  }

  return false;
}

export interface RecallOptions {
  workspaceId: string;
  limit?: number;
  types?: MemoryType[];
  minScore?: number;
}

/**
 * Recalls memories using MongoDB Vector Search or Cosine Similarity fallback.
 */
export async function recallMemories(
  query: string,
  options: RecallOptions
): Promise<RetrievedMemory[]> {
  const queryVector = await getEmbedding(query);
  const limit = options.limit || 4;
  const minScore = options.minScore || 0.25;

  let retrieved: RetrievedMemory[] = [];
  let candidateDocs: MemoryDocument[] = [];

  try {
    const db = await getDb();
    const collection = db.collection<MemoryDocument>(COLLECTION_NAME);

    // Attempt Atlas Vector Search aggregation
    try {
      const vectorPipeline: any[] = [
        {
          $vectorSearch: {
            index: 'vector_index',
            path: 'embedding',
            queryVector,
            numCandidates: 50,
            limit,
            filter: {
              workspaceId: options.workspaceId,
              'lifecycle.status': 'active',
            },
          },
        },
        {
          $project: {
            _id: 1,
            workspaceId: 1,
            userId: 1,
            agentId: 1,
            type: 1,
            title: 1,
            content: 1,
            summary: 1,
            tags: 1,
            lifecycle: 1,
            privacy: 1,
            source: 1,
            expiresAt: 1,
            createdAt: 1,
            updatedAt: 1,
            score: { $meta: 'vectorSearchScore' },
          },
        },
      ];

      const results = await collection.aggregate(vectorPipeline).toArray();
      if (results && results.length > 0) {
        retrieved = results.map((r: any) => ({
          ...r,
          _id: r._id.toString(),
          similarityScore: r.score,
          retrievalReason: `Atlas Vector Search match (score: ${(r.score * 100).toFixed(1)}%)`,
        }));
      }
    } catch {}

    if (retrieved.length === 0) {
      const filterQuery: any = {
        workspaceId: options.workspaceId,
        'lifecycle.status': 'active',
      };
      if (options.types && options.types.length > 0) {
        filterQuery.type = { $in: options.types };
      }
      candidateDocs = await collection.find(filterQuery).toArray();
    }
  } catch (err) {
    // MongoDB offline: use in-memory store
    purgeExpiredInMemory();
    candidateDocs = inMemoryStore.filter(
      (m) => m.workspaceId === options.workspaceId && m.lifecycle.status === 'active'
    );
  }

  // Calculate similarity ranking
  if (retrieved.length === 0 && candidateDocs.length > 0) {
    const scored = candidateDocs
      .map((doc) => {
        let sim = 0;
        if (doc.embedding && doc.embedding.length > 0) {
          sim = cosineSimilarity(queryVector, doc.embedding);
        } else {
          const qWords = query.toLowerCase().split(/\s+/);
          const cWords = (doc.title + ' ' + doc.content).toLowerCase();
          const matches = qWords.filter((w) => cWords.includes(w)).length;
          sim = matches / Math.max(qWords.length, 1);
        }

        const ageHours = (Date.now() - new Date(doc.updatedAt).getTime()) / (1000 * 3600);
        const recencyBonus = Math.max(0, 0.05 - ageHours * 0.001);

        return {
          ...doc,
          _id: doc._id?.toString(),
          similarityScore: Math.min(1.0, sim + recencyBonus),
          retrievalReason: `Semantic cosine recall (score: ${((sim + recencyBonus) * 100).toFixed(1)}%)`,
        };
      })
      .filter((doc) => (doc.similarityScore || 0) >= minScore)
      .sort((a, b) => (b.similarityScore || 0) - (a.similarityScore || 0))
      .slice(0, limit);

    retrieved = scored;
  }

  return retrieved;
}

function purgeExpiredInMemory() {
  const now = Date.now();
  for (let i = inMemoryStore.length - 1; i >= 0; i--) {
    const m = inMemoryStore[i];
    if (m.expiresAt && new Date(m.expiresAt).getTime() <= now) {
      inMemoryStore.splice(i, 1);
    }
  }
}

export function getInMemoryMemories(workspaceId: string): MemoryDocument[] {
  purgeExpiredInMemory();
  return inMemoryStore.filter((m) => m.workspaceId === workspaceId);
}

export function clearInMemoryMemories(workspaceId: string) {
  for (let i = inMemoryStore.length - 1; i >= 0; i--) {
    if (inMemoryStore[i].workspaceId === workspaceId) {
      inMemoryStore.splice(i, 1);
    }
  }
}
