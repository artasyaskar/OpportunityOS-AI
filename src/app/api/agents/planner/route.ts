import { guardAgentRoute } from '@/lib/auth/agentGuard';
import { NextRequest, NextResponse } from 'next/server';
import { runSubmissionPlannerAgent } from '@/services/ai/agents/submissionPlannerAgent';
import { type Opportunity } from '@/lib/gemini';

export async function POST(req: NextRequest) {
  const guard = await guardAgentRoute(req);
  if ('status' in guard) return guard;
  const { uid: userId } = guard;
  try {
    const body = await req.json();
    const { daysUntilDeadline } = body;
    let { opportunity } = body;

    // Fallback if missing (for robust testing)
    if (!opportunity || !opportunity.id) {
      opportunity = {
        id: 'demo-fallback-opp',
        title: 'Demo Fellowship',
        organization: 'Global Foundation',
        deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        description: 'A mock fellowship used for fallback testing.',
      };
    }
    const result = await runSubmissionPlannerAgent(opportunity, daysUntilDeadline, userId);
    return NextResponse.json(result);
  } catch (error: any) {
    if (error?.name === 'InsufficientCreditsError') return NextResponse.json({ requireUpgrade: true, error: 'Insufficient AI Credits' }, { status: 402 });
    console.error('Planner agent error:', error);
    return NextResponse.json({ error: 'AI planner failed' }, { status: 500 });
  }
}
