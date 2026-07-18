import { checkRateLimit } from '@/lib/rateLimiter';
import { NextRequest, NextResponse } from 'next/server';
import { runRejectionLearningAgent } from '@/services/ai/agents/rejectionLearningAgent';
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
    const { rejection, profile, opportunity } = await req.json() as { rejection: string; profile: UserProfile; opportunity: Opportunity };
    const result = await runRejectionLearningAgent(rejection, profile, opportunity);
    return NextResponse.json(result);
  } catch (error: any) {
    if (error?.name === 'InsufficientCreditsError') return NextResponse.json({ requireUpgrade: true, error: 'Insufficient AI Credits' }, { status: 402 });
    console.error('Rejection learning agent error:', error);
    return NextResponse.json({ error: 'AI rejection analysis failed' }, { status: 500 });
  }
}
