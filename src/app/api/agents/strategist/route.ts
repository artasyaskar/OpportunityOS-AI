import { checkRateLimit } from '@/lib/rateLimiter';
import { NextRequest, NextResponse } from 'next/server';
import { runStrategistAgent } from '@/services/ai/agents/strategistAgent';
import { type UserProfile, type Opportunity } from '@/lib/gemini';

const DEMO_STRATEGY = [
  {
    opportunityId: 'chevening-2025',
    recommendation: 'apply',
    priority: 9,
    reasoning: 'Strong GPA and academic background align perfectly with UK priority areas. High funding value justifies application effort.',
    bestTimeToApply: 'Now',
    winProbabilityRank: 2
  },
  {
    opportunityId: 'daad-2025',
    recommendation: 'apply',
    priority: 8,
    reasoning: 'Matches development focus criteria. High probability of selection due to specific industry match.',
    bestTimeToApply: 'In 1 month',
    winProbabilityRank: 1
  },
  {
    opportunityId: 'gates-cambridge-2025',
    recommendation: 'wait',
    priority: 4,
    reasoning: 'Extremely high academic competition. We recommend focusing on other applications first, then attempting this as a stretch goal.',
    bestTimeToApply: 'Next cycle or after publishing another paper',
    winProbabilityRank: 7
  }
];

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
    const opportunities = body.opportunities as Opportunity[];
    const evidenceContext = body.evidenceContext as string | undefined;

    const result = await runStrategistAgent(profile, opportunities, evidenceContext);
    return NextResponse.json(result);
  } catch (error: any) {
    if (error?.name === 'InsufficientCreditsError') return NextResponse.json({ requireUpgrade: true, error: 'Insufficient AI Credits' }, { status: 402 });
    console.error('Strategist agent error:', error);
    return NextResponse.json(DEMO_STRATEGY);
  }
}
