import { NextRequest, NextResponse } from 'next/server';
import { runRejectionLearningAgent } from '@/services/ai/agents/rejectionLearningAgent';
import { type UserProfile, type Opportunity } from '@/lib/gemini';
import { guardAgentRoute } from '@/lib/auth/agentGuard';

export async function POST(req: NextRequest) {
  const guard = await guardAgentRoute(req);
  if (guard instanceof NextResponse) return guard;
  const { uid } = guard;
  try {
    const { rejection, profile, opportunity } = await req.json() as { rejection: string; profile: UserProfile; opportunity: Opportunity };
    if (profile) profile.userId = uid;
    const result = await runRejectionLearningAgent(rejection, profile, opportunity);
    return NextResponse.json(result);
  } catch (error: any) {
    if (error?.name === 'InsufficientCreditsError') return NextResponse.json({ requireUpgrade: true, error: 'Insufficient AI Credits' }, { status: 402 });
    console.error('Rejection learning agent error:', error);
    return NextResponse.json({ error: 'AI rejection analysis failed' }, { status: 500 });
  }
}
