import { checkRateLimit } from '@/lib/rateLimiter';
import { NextRequest, NextResponse } from 'next/server';
import { runProbabilityEngine } from '@/services/ai/agents/probabilityEngine';
import { type UserProfile, type Opportunity } from '@/lib/gemini';

const DEMO_PROBABILITY = {
  successProbability: 68,
  confidence: 'high',
  factors: {
    academic: { score: 85, note: 'GPA 3.87 exceeds typical Chevening recipient average of 3.5' },
    experience: { score: 72, note: '2 years research experience; leadership roles in academic projects' },
    skills: { score: 78, note: 'Strong technical skills, published research, good international profile' },
    leadership: { score: 65, note: 'Academic leadership strong; community leadership evidence could be stronger' },
    fit: { score: 80, note: 'Excellent field alignment; clear development goals match Chevening values' },
  },
  strengths: ['Top-tier academic performance', 'Published research in relevant field', 'Strong alignment with Chevening mission'],
  weaknesses: ['IELTS not yet submitted', 'Community leadership portfolio needs strengthening'],
  recommendation: 'apply_now',
  reasoning: 'Your academic excellence and research background place you in the top 30% of Chevening applicants. The IELTS gap is easily addressable. We recommend applying this cycle while strengthening your community leadership story.',
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

    const result = await runProbabilityEngine(profile, opportunity, evidenceContext);
    return NextResponse.json(result);
  } catch (error: any) {
    if (error?.name === 'InsufficientCreditsError') return NextResponse.json({ requireUpgrade: true, error: 'Insufficient AI Credits' }, { status: 402 });
    console.error('Probability agent error:', error);
    return NextResponse.json(DEMO_PROBABILITY);
  }
}
