import { checkRateLimit } from '@/lib/rateLimiter';
import { NextRequest, NextResponse } from 'next/server';
import { runStrategistAgent } from '@/services/ai/agents/strategistAgent';
import { type UserProfile, type Opportunity } from '@/lib/gemini';

export async function POST(req: NextRequest) {
  const rateLimit = checkRateLimit(req);
  if (!rateLimit.success) {
    return NextResponse.json(
      { error: 'Rate limit exceeded' },
      { status: 429, headers: rateLimit.headers }
    );
  }
  try {
    const body = await req.json();
    const profile = body.profile as UserProfile;
    profile.userId = body.userId;
    const opportunities = body.opportunities as Opportunity[];
    const evidenceContext = body.evidenceContext as string | undefined;

    const result = await runStrategistAgent(profile, opportunities, evidenceContext);
    return NextResponse.json(result);
  } catch (error: any) {
    if (error?.name === 'InsufficientCreditsError') return NextResponse.json({ requireUpgrade: true, error: 'Insufficient AI Credits' }, { status: 402 });
    console.error('Strategist agent error:', error);
    return NextResponse.json({ error: 'AI strategist analysis failed' }, { status: 500 });
  }
}
