import { checkRateLimit } from '@/lib/rateLimiter';
import { NextRequest, NextResponse } from 'next/server';
import { runPortfolioAgent } from '@/services/ai/agents/portfolioAgent';
import { type Application } from '@/lib/gemini';

const DEMO_PORTFOLIO_ANALYSIS = {
  healthScore: 72,
  diversityScore: 68,
  stats: {
    total: 8,
    applied: 3,
    pending: 3,
    accepted: 1,
    rejected: 1,
    potentialValue: '$1,250,000'
  },
  analysis: 'Your portfolio contains a healthy balance of stretch opportunities (Gates Cambridge) and safety targets (Commonwealth). Geographic diversity is strong.',
  recommendations: [
    'Add at least 1 regional funding opportunity to further mitigate risk',
    'Follow up on outstanding reference letters to stabilize draft statuses'
  ],
  riskLevel: 'medium',
  topOpportunity: 'DAAD Scholarship Germany'
};

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
    return NextResponse.json(DEMO_PORTFOLIO_ANALYSIS);
  }
}
