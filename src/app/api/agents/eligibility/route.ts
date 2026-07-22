import { guardAgentRoute } from '@/lib/auth/agentGuard';
import { NextRequest, NextResponse } from 'next/server';
import { runEligibilityAgent } from '@/services/ai/agents/eligibilityAgent';
import { type UserProfile, type Opportunity } from '@/lib/gemini';

export async function POST(req: NextRequest) {
  const guard = await guardAgentRoute(req);
  if ('status' in guard) return guard;
  const { uid } = guard;
  try {
    const body = await req.json();
    const profile = body.profile as UserProfile;
    profile.userId = uid;
    const opportunity = body.opportunity;
    const evidenceContext = body.evidenceContext as string | undefined;

    const result = await runEligibilityAgent(profile, opportunity, evidenceContext);
    return NextResponse.json(result);
  } catch (error: any) {
    if (error?.name === 'InsufficientCreditsError') return NextResponse.json({ requireUpgrade: true, error: 'Insufficient AI Credits' }, { status: 402 });
    console.error('Eligibility agent error:', error);
    return NextResponse.json({ error: 'AI eligibility check failed' }, { status: 500 });
  }
}
