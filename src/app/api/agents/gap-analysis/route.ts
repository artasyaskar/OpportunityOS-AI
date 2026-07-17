import { checkRateLimit } from '@/lib/rateLimiter';
import { NextRequest, NextResponse } from 'next/server';
import { runGapAnalysisAgent } from '@/services/ai/agents/gapAnalysisAgent';
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
    const opportunity = body.opportunity;
    const evidenceContext = body.evidenceContext as string | undefined;

    const result = await runGapAnalysisAgent(profile, opportunity, evidenceContext);
    return NextResponse.json(result);
  } catch (error: any) {
    if (error?.name === 'InsufficientCreditsError') return NextResponse.json({ requireUpgrade: true, error: 'Insufficient AI Credits' }, { status: 402 });
    console.error('Gap analysis agent error:', error);
    return NextResponse.json({ error: 'AI analysis failed' }, { status: 500 });
  }
}
