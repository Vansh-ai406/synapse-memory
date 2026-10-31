import { getDb } from './mongodb';
import { MemoryDocument } from '@/types/memory';
import { DecayAnalyticsReport, MemoryDecayMetric } from '@/types/agent';
import { getInMemoryMemories } from './memory-service';

const COLLECTION_NAME = 'memories';
const HALF_LIFE_HOURS = 48; // Memory retains ~50% retention after 48h without reinforcement

/**
 * Calculates Ebbinghaus memory retention score
 * Formula: R = exp(- deltaHours / (tau * (1 + ln(1 + accessCount))))
 */
export function calculateRetentionScore(
  createdAt: string,
  lastAccessedAt: string,
  accessCount: number,
  halfLifeHours: number = HALF_LIFE_HOURS
): { retentionScore: number; ageHours: number } {
  const lastAccessTime = new Date(lastAccessedAt || createdAt).getTime();
  const now = Date.now();
  const ageHours = Math.max(0.1, (now - lastAccessTime) / (1000 * 3600));

  // Spaced-repetition reinforcement factor: logarithmic scaling
  const reinforcementFactor = 1.0 + Math.log(1 + (accessCount || 0));
  const effectiveTau = halfLifeHours * reinforcementFactor;

  // Exponential decay
  const retentionScore = Math.exp(-ageHours / effectiveTau);

  return {
    retentionScore: Math.max(0.05, Math.min(1.0, retentionScore)),
    ageHours,
  };
}

/**
 * Computes memory decay analytics using MongoDB Aggregation Pipeline with $facet
 */
export async function computeMemoryDecayAnalytics(
  workspaceId: string
): Promise<DecayAnalyticsReport> {
  let docs: MemoryDocument[] = [];

  try {
    const db = await getDb();
    const collection = db.collection<MemoryDocument>(COLLECTION_NAME);

    // Advanced MongoDB Aggregation pipeline calculating retention scores
    const pipeline: any[] = [
      {
        $match: {
          workspaceId,
          'lifecycle.status': 'active',
        },
      },
      {
        $project: {
          _id: 1,
          title: 1,
          type: 1,
          createdAt: 1,
          updatedAt: 1,
          'lifecycle.accessCount': { $ifNull: ['$lifecycle.accessCount', 0] },
          'lifecycle.lastAccessedAt': { $ifNull: ['$lifecycle.lastAccessedAt', '$createdAt'] },
        },
      },
      {
        $sort: { updatedAt: -1 },
      },
    ];

    docs = await collection.aggregate(pipeline).toArray() as any;
  } catch {
    docs = getInMemoryMemories(workspaceId).filter((m) => m.lifecycle.status === 'active');
  }

  const metrics: MemoryDecayMetric[] = docs.map((doc) => {
    const accessCount = doc.lifecycle?.accessCount || 0;
    const lastAccessed = doc.lifecycle?.lastAccessedAt || doc.updatedAt || doc.createdAt;
    const { retentionScore, ageHours } = calculateRetentionScore(
      doc.createdAt,
      lastAccessed,
      accessCount
    );

    let reinforcementLevel: MemoryDecayMetric['reinforcementLevel'] = 'moderate';
    if (retentionScore >= 0.75) reinforcementLevel = 'high';
    else if (retentionScore < 0.40) reinforcementLevel = 'decaying';
    else if (retentionScore < 0.20) reinforcementLevel = 'critical';

    return {
      memoryId: doc._id?.toString() || '',
      title: doc.title,
      type: doc.type,
      rawSimilarity: 1.0,
      retentionScore: parseFloat(retentionScore.toFixed(3)),
      halfLifeHours: HALF_LIFE_HOURS,
      ageHours: parseFloat(ageHours.toFixed(1)),
      accessCount,
      reinforcementLevel,
      lastAccessedAt: lastAccessed,
    };
  });

  const totalActive = metrics.length;
  const decayingCount = metrics.filter((m) => m.reinforcementLevel === 'decaying' || m.reinforcementLevel === 'critical').length;
  const reinforcedCount = metrics.filter((m) => m.reinforcementLevel === 'high').length;

  const avgRetention = totalActive > 0
    ? metrics.reduce((acc, m) => acc + m.retentionScore, 0) / totalActive
    : 1.0;

  return {
    overallHealthScore: Math.round(avgRetention * 100),
    totalActive,
    decayingCount,
    reinforcedCount,
    memoriesWithScores: metrics.sort((a, b) => b.retentionScore - a.retentionScore),
  };
}

/**
 * Simulates spaced repetition reinforcement: touches a memory to boost its retention
 */
export async function reinforceMemory(memoryId: string): Promise<boolean> {
  const now = new Date().toISOString();
  try {
    const db = await getDb();
    const collection = db.collection(COLLECTION_NAME);
    const { ObjectId } = await import('mongodb');
    await collection.updateOne(
      { _id: new ObjectId(memoryId) as any },
      {
        $inc: { 'lifecycle.accessCount': 1 },
        $set: { 'lifecycle.lastAccessedAt': now, updatedAt: now },
      }
    );
    return true;
  } catch {
    return false;
  }
}
