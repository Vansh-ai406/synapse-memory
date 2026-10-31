import { NextRequest, NextResponse } from 'next/server';
import { simulateIncidentRemediation } from '@/lib/simulator-service';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { incidentType = 'connection_pool_exhaustion', workspaceId = 'svnit-hackathon' } = body;

    const report = await simulateIncidentRemediation(incidentType, workspaceId);

    return NextResponse.json(report);
  } catch (error: any) {
    console.error('Incident Simulation Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
