import { checkRateLimit } from '@/lib/rateLimiter';
import { NextRequest, NextResponse } from 'next/server';
import { runDiscoveryAgent } from '@/services/ai/agents/discoveryAgent';
import { type UserProfile } from '@/lib/gemini';
import { SEED_OPPORTUNITIES } from '@/lib/opportunities';

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
