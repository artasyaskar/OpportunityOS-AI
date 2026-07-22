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
    const { essay, opportunity } = body;
    const result = await runApplicationReviewerAgent(essay, opportunity, userId);
    return NextResponse.json(result);
  } catch (error: any) {
    if (error?.name === 'InsufficientCreditsError') return NextResponse.json({ requireUpgrade: true, error: 'Insufficient AI Credits' }, { status: 402 });
    console.error('Reviewer agent error:', error);
    return NextResponse.json({ error: 'AI review failed' }, { status: 500 });
  }
}
