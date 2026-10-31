import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getDb } from '@/lib/mongodb';
import { storeMemory, getInMemoryMemories, deleteInMemoryMemory, memoryEventBus } from '@/lib/memory-service';
import { MemoryDocument } from '@/types/memory';

const COLLECTION_NAME = 'memories';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const workspaceId = searchParams.get('workspaceId') || 'svnit-hackathon';
    const status = searchParams.get('status');
    const type = searchParams.get('type');
    const search = searchParams.get('search');

    try {
      const db = await getDb();
      const collection = db.collection<MemoryDocument>(COLLECTION_NAME);

      const filter: any = { workspaceId };
      if (status && status !== 'all') {
        filter['lifecycle.status'] = status;
      }
      if (type && type !== 'all') {
        filter.type = type;
      }
      if (search) {
        filter.$or = [
          { title: { $regex: search, $options: 'i' } },
          { content: { $regex: search, $options: 'i' } },
          { tags: { $in: [new RegExp(search, 'i')] } },
        ];
      }

      const memories = await collection
        .find(filter)
        .sort({ updatedAt: -1 })
        .limit(100)
        .toArray();

      const formatted = memories.map((m) => ({
        ...m,
        _id: m._id?.toString(),
      }));

      return NextResponse.json({ memories: formatted });
    } catch {
      // Fallback
      let memories = getInMemoryMemories(workspaceId);
      if (status && status !== 'all') {
        memories = memories.filter((m) => m.lifecycle.status === status);
      }
      if (type && type !== 'all') {
        memories = memories.filter((m) => m.type === type);
      }
      if (search) {
        const q = search.toLowerCase();
        memories = memories.filter(
          (m) =>
            m.title.toLowerCase().includes(q) ||
            m.content.toLowerCase().includes(q) ||
            (m.tags || []).some((t) => t.toLowerCase().includes(q))
        );
      }
      return NextResponse.json({ memories });
    }
  } catch (error: any) {
    console.error('Fetch Memories Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      workspaceId = 'svnit-hackathon',
      userId = 'vansh',
      type = 'fact',
      title,
      content,
      tags = [],
      ttlSeconds = null,
      privacy = 'team',
    } = body;

    if (!title || !content) {
      return NextResponse.json(
        { error: 'Title and content are required' },
        { status: 400 }
      );
    }

    const result = await storeMemory({
      workspaceId,
      userId,
      type,
      title,
      content,
      tags,
      ttlSeconds,
      privacy,
      source: {
        rawText: content,
        author: userId,
      },
    });

    return NextResponse.json({ memory: result.memory, conflictedMemory: result.conflictedMemory });
  } catch (error: any) {
    console.error('Store Memory Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    deleteInMemoryMemory(id);

    try {
      const db = await getDb();
      const collection = db.collection<MemoryDocument>(COLLECTION_NAME);
      const filter = ObjectId.isValid(id) ? { _id: new ObjectId(id) as any } : { _id: id as any };
      const result = await collection.deleteOne(filter);
      memoryEventBus.emit({ operationType: 'delete', documentKey: { _id: id } });
      return NextResponse.json({ success: true, deletedCount: result.deletedCount });
    } catch {
      memoryEventBus.emit({ operationType: 'delete', documentKey: { _id: id } });
      return NextResponse.json({ success: true, deletedCount: 1 });
    }
  } catch (error: any) {
    console.error('Delete Memory Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
