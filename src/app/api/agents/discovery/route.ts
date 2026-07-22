import { NextRequest, NextResponse } from 'next/server';
import { guardAgentRoute } from '@/lib/auth/agentGuard';
import { runDiscoveryAgent } from '@/services/ai/agents/discoveryAgent';
import { type UserProfile } from '@/lib/gemini';
import { SEED_OPPORTUNITIES } from '@/lib/opportunities';

export async function POST(req: NextRequest) {
  const guard = await guardAgentRoute(req);
  if (guard instanceof NextResponse) return guard;
  const { uid } = guard;
  try {
    const body = await req.json();
    const profile = body.profile as UserProfile;
    profile.userId = uid;
    const evidenceContext = body.evidenceContext as string | undefined;

    const opportunities = await runDiscoveryAgent(profile, evidenceContext);
    return NextResponse.json({ opportunities, source: 'ai' });
  } catch (error: any) {
    if (error?.name === 'InsufficientCreditsError') return NextResponse.json({ requireUpgrade: true, error: 'Insufficient AI Credits' }, { status: 402 });
    console.error('Discovery agent error:', error);
    return NextResponse.json(
      { error: 'Discovery agent failed', opportunities: SEED_OPPORTUNITIES, source: 'seed' },
      { status: 200 }
    );
  }
}
