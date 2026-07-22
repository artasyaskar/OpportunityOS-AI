import { NextRequest, NextResponse } from 'next/server';
import { runComplianceAgent } from '@/services/ai/agents/complianceAgent';
import { guardAgentRoute } from '@/lib/auth/agentGuard';

export async function POST(req: NextRequest) {
  const guard = await guardAgentRoute(req);
  if (guard instanceof NextResponse) return guard;
  const { uid: userId } = guard;
  try {
    const body = await req.json();
    const { requirements, documents } = body;
    const result = await runComplianceAgent(requirements, documents, userId);
    return NextResponse.json(result);
  } catch (error: any) {
    if (error?.name === 'InsufficientCreditsError') return NextResponse.json({ requireUpgrade: true, error: 'Insufficient AI Credits' }, { status: 402 });
    console.error('Compliance agent error:', error);
    return NextResponse.json({ error: 'AI compliance check failed' }, { status: 500 });
  }
}
