import { NextRequest, NextResponse } from 'next/server';
import { computeMemoryDecayAnalytics, reinforceMemory } from '@/lib/decay-service';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const workspaceId = searchParams.get('workspaceId') || 'svnit-hackathon';

    const analytics = await computeMemoryDecayAnalytics(workspaceId);

    return NextResponse.json(analytics);
  } catch (error: any) {
    console.error('Decay Analytics Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { memoryId } = body;

    if (!memoryId) {
      return NextResponse.json({ error: 'memoryId is required' }, { status: 400 });
    }

    const success = await reinforceMemory(memoryId);

    return NextResponse.json({ success, message: 'Memory reinforced (retention boosted).' });
  } catch (error: any) {
    console.error('Reinforce Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
