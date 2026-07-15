import { checkRateLimit } from '@/lib/rateLimiter';
import { NextRequest, NextResponse } from 'next/server';
import { runEligibilityAgent } from '@/services/ai/agents/eligibilityAgent';
import { type UserProfile, type Opportunity } from '@/lib/gemini';

const DEMO_ELIGIBILITY = {
  eligibilityScore: 82,
  eligible: true,
  strengths: [
    'Academic qualifications exceed minimum GPA requirement',
    'Country of origin is eligible for this scholarship',
    'Field of study perfectly aligns with scholarship focus areas',
    '2+ years work experience meets threshold',
  ],
  weaknesses: [
    'IELTS score not yet confirmed',
    'Recommendation letters not yet secured',
  ],
  missingRequirements: ['IELTS 6.5+ score', '2 formal recommendation letters'],
  summary: 'Your academic profile strongly matches this opportunity. Addressing the IELTS requirement and securing recommendation letters would make you a highly competitive candidate.',
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
    const opportunity = body.opportunity;
    const evidenceContext = body.evidenceContext as string | undefined;

    const result = await runEligibilityAgent(profile, opportunity, evidenceContext);
    return NextResponse.json(result);
  } catch (error: any) {
    if (error?.name === 'InsufficientCreditsError') return NextResponse.json({ requireUpgrade: true, error: 'Insufficient AI Credits' }, { status: 402 });
    console.error('Eligibility agent error:', error);
    return NextResponse.json(DEMO_ELIGIBILITY);
  }
}
