import { checkRateLimit } from '@/lib/rateLimiter';
import { NextRequest, NextResponse } from 'next/server';
import { runPortfolioAgent } from '@/services/ai/agents/portfolioAgent';
import { type Application } from '@/lib/gemini';

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
    const applications = body.applications;
    const evidenceContext = body.evidenceContext as string | undefined;
    const userId = body.userId as string | undefined;

    const result = await runPortfolioAgent(applications, evidenceContext, userId);
    return NextResponse.json(result);
  } catch (error: any) {
    if (error?.name === 'InsufficientCreditsError') return NextResponse.json({ requireUpgrade: true, error: 'Insufficient AI Credits' }, { status: 402 });
    console.error('Portfolio agent error:', error);
    return NextResponse.json({ error: 'AI portfolio analysis failed' }, { status: 500 });
  }
}
