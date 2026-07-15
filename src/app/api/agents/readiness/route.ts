import { checkRateLimit } from '@/lib/rateLimiter';
import { NextRequest, NextResponse } from 'next/server';
import { runReadinessAgent } from '@/services/ai/agents/readinessAgent';
import { type UserProfile } from '@/lib/gemini';

const DEMO_READINESS = {
  readinessScore: 65,
  confidence: 'high',
  analysis: 'Your core academic profiles are strong, but the actual materials (SOP, resume structure, letters) are only partially prepared.',
  breakdown: {
    resume: { score: 70, status: 'needs_updates', details: 'Ensure project impact metrics are highlighted' },
    transcript: { score: 95, status: 'complete', details: 'Verified and uploaded' },
    essays: { score: 30, status: 'drafting', details: 'SOP draft is incomplete and requires refinement' },
    recommendations: { score: 50, status: 'pending', details: 'Need to secure formal commitment from 2 referees' }
  },
  recommendations: [
    'Update resume to focus on leadership achievements',
    'Generate draft of Statement of Purpose using Application Builder',
    'Follow up with recommendation letter writers'
  ]
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
    const profile = body.profile as UserProfile;
    profile.userId = body.userId;
    const result = await runReadinessAgent(profile);
    return NextResponse.json(result);
  } catch (error: any) {
    if (error?.name === 'InsufficientCreditsError') return NextResponse.json({ requireUpgrade: true, error: 'Insufficient AI Credits' }, { status: 402 });
    console.error('Readiness agent error:', error);
    return NextResponse.json(DEMO_READINESS);
  }
}
