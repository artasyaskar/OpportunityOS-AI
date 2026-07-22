import { NextRequest, NextResponse } from 'next/server';
import { runPortfolioAgent } from '@/services/ai/agents/portfolioAgent';
import { type Application } from '@/lib/gemini';
import { guardAgentRoute } from '@/lib/auth/agentGuard';

export async function POST(req: NextRequest) {
  const guard = await guardAgentRoute(req);
  if (guard instanceof NextResponse) return guard;
  const { uid: userId } = guard;
  try {
    const body = await req.json();
    const applications = body.applications;
    const evidenceContext = body.evidenceContext as string | undefined;

    const result = await runPortfolioAgent(applications, evidenceContext, userId);
    return NextResponse.json(result);
  } catch (error: any) {
    if (error?.name === 'InsufficientCreditsError') return NextResponse.json({ requireUpgrade: true, error: 'Insufficient AI Credits' }, { status: 402 });
    console.error('Portfolio agent error:', error);
    return NextResponse.json({ error: 'AI portfolio analysis failed' }, { status: 500 });
  }
}
