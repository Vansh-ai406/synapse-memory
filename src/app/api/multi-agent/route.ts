import { NextRequest, NextResponse } from 'next/server';
import { runMultiAgentDeliberation } from '@/lib/multi-agent-orchestrator';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { goal, workspaceId = 'svnit-hackathon' } = body;

    if (!goal || typeof goal !== 'string') {
      return NextResponse.json({ error: 'Goal is required' }, { status: 400 });
    }

    const result = await runMultiAgentDeliberation(goal, workspaceId);

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Multi-Agent API Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

