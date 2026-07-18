import { checkRateLimit } from '@/lib/rateLimiter';
import { NextRequest, NextResponse } from 'next/server';
import { runApplicationReviewerAgent } from '@/services/ai/agents/applicationReviewerAgent';
import { type Opportunity } from '@/lib/gemini';

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
    const { essay, opportunity, userId } = body;
    const result = await runApplicationReviewerAgent(essay, opportunity, userId);
    return NextResponse.json(result);
  } catch (error: any) {
    if (error?.name === 'InsufficientCreditsError') return NextResponse.json({ requireUpgrade: true, error: 'Insufficient AI Credits' }, { status: 402 });
    console.error('Reviewer agent error:', error);
    return NextResponse.json({ error: 'AI review failed' }, { status: 500 });
  }
}
