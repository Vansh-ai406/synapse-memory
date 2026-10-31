import { NextRequest, NextResponse } from 'next/server';
import { reviewCodeAgainstMemory } from '@/lib/simulator-service';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { code, workspaceId = 'svnit-hackathon' } = body;

    if (!code || typeof code !== 'string') {
      return NextResponse.json({ error: 'Code is required' }, { status: 400 });
    }

    const result = await reviewCodeAgainstMemory(code, workspaceId);

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Code Review API Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

