import { guardAgentRoute } from '@/lib/auth/agentGuard';
import { NextRequest, NextResponse } from 'next/server';
import { runGapAnalysisAgent } from '@/services/ai/agents/gapAnalysisAgent';
import { type UserProfile, type Opportunity } from '@/lib/gemini';



export async function POST(req: NextRequest) {
  const guard = await guardAgentRoute(req);
  if ('status' in guard) return guard;
  const { uid } = guard;
  try {
    const body = await req.json();
    const profile = body.profile as UserProfile;
    if (!profile) {
      return NextResponse.json({ error: 'Missing profile' }, { status: 400 });
    }
    profile.userId = uid;
    const opportunity = body.opportunity as Opportunity | undefined;
    if (!opportunity?.id) {
      return NextResponse.json({ error: 'Missing or invalid opportunity' }, { status: 400 });
    }
    const evidenceContext = body.evidenceContext as string | undefined;

    const result = await runGapAnalysisAgent(profile, opportunity, evidenceContext);
    return NextResponse.json(result);
  } catch (error: any) {
    if (error?.name === 'InsufficientCreditsError') return NextResponse.json({ requireUpgrade: true, error: 'Insufficient AI Credits' }, { status: 402 });
    console.error('Gap analysis agent error:', error);
    return NextResponse.json({ error: 'AI analysis failed' }, { status: 500 });
  }
}
