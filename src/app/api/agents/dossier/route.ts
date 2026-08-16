import { NextRequest, NextResponse } from 'next/server';
import { guardAgentRoute } from '@/lib/auth/agentGuard';
import { runFleetDossierAgent } from '@/services/ai/agents/fleetDossierAgent';
import { type UserProfile, type Opportunity } from '@/lib/gemini';

export const maxDuration = 300;

export async function POST(req: NextRequest) {
  const guard = await guardAgentRoute(req);
  if (guard instanceof NextResponse) return guard;
  const { uid: userId } = guard;

  try {
    const body = await req.json();
    const profile = (body.profile || { name: 'Applicant' }) as UserProfile;
    if (profile) profile.userId = userId;
    const opportunity = body.opportunity as Opportunity;
    const evidenceContext = body.evidenceContext as string | undefined;

    const result = await runFleetDossierAgent(profile, opportunity, evidenceContext, userId);
    return NextResponse.json(result);
  } catch (error: any) {
    if (error?.name === 'InsufficientCreditsError') {
      return NextResponse.json({ requireUpgrade: true, error: 'Insufficient AI Credits' }, { status: 402 });
    }
    console.error('Fleet dossier error:', error);
    return NextResponse.json({ error: 'AI fleet dossier generation failed' }, { status: 500 });
  }
}
