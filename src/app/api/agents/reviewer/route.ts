import { NextRequest, NextResponse } from 'next/server';
import { runApplicationReviewerAgent } from '@/services/ai/agents/applicationReviewerAgent';
import { type Opportunity } from '@/lib/gemini';
import { guardAgentRoute } from '@/lib/auth/agentGuard';

export async function POST(req: NextRequest) {
  const guard = await guardAgentRoute(req);
  if (guard instanceof NextResponse) return guard;
  const { uid: userId } = guard;
  try {
    const body = await req.json();
    const essayText = body.essay || body.submission || body.text || 'My goal is to advance scientific knowledge and leadership in emerging technologies...';
    const safeOpp = body.opportunity || {
      id: 'opp_general',
      title: 'Target Competitive Program',
      provider: 'Global Institution',
      description: 'Competitive scholarship and fellowship opportunity.'
    };
    const result = await runApplicationReviewerAgent(essayText, safeOpp, userId);
    return NextResponse.json(result);
  } catch (error: any) {
    if (error?.name === 'InsufficientCreditsError') return NextResponse.json({ requireUpgrade: true, error: 'Insufficient AI Credits' }, { status: 402 });
    console.error('Reviewer agent error:', error);
    return NextResponse.json({ error: 'AI review failed' }, { status: 500 });
  }
}
