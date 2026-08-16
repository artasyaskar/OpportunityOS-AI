import { guardAgentRoute } from '@/lib/auth/agentGuard';
import { NextRequest, NextResponse } from 'next/server';
import { runReadinessAgent } from '@/services/ai/agents/readinessAgent';
import { type UserProfile } from '@/lib/gemini';

export async function POST(req: NextRequest) {
  const guard = await guardAgentRoute(req);
  if ('status' in guard) return guard;
  const { uid } = guard;
  try {
    const body = await req.json();
    const profile = (body.profile || { name: 'Applicant' }) as UserProfile;
    profile.userId = uid;
    const evidenceContext = body.evidenceContext as string | undefined;
    const result = await runReadinessAgent(profile, evidenceContext);
    return NextResponse.json(result);
  } catch (error: any) {
    if (error?.name === 'InsufficientCreditsError') return NextResponse.json({ requireUpgrade: true, error: 'Insufficient AI Credits' }, { status: 402 });
    console.error('Readiness agent error:', error);
    return NextResponse.json({ error: 'AI readiness check failed' }, { status: 500 });
  }
}
