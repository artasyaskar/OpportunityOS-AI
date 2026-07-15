import { checkRateLimit } from '@/lib/rateLimiter';
import { NextRequest, NextResponse } from 'next/server';
import { runRejectionLearningAgent } from '@/services/ai/agents/rejectionLearningAgent';
import { type UserProfile, type Opportunity } from '@/lib/gemini';

const DEMO_REJECTION = {
  likelyCauses: [
    'Academic thesis was not fully aligned with supervisor focus area',
    'Lack of explicit community leadership metrics in personal statement',
    'High candidate volume in computer science field'
  ],
  primaryWeakness: 'Leadership representation: essays described leadership roles, but did not quantify the scale of community impact or specific outcomes.',
  improvementStrategy: [
    { area: 'Leadership section', action: 'Rewrite to highlight quantified metrics (e.g. number of beneficiaries, budget managed)', timeline: '2 weeks' },
    { area: 'Academic proposal', action: 'Align research questions directly with UK-Pakistan bilateral development priorities', timeline: '4 weeks' }
  ],
  reapplyRecommendation: 'with_changes',
  alternativeOpportunities: [
    'DAAD Scholarship Germany (Development focus)',
    'Commonwealth Scholarship UK'
  ],
  motivationalNote: 'Rejection is redirection. Your core profile is strong, and with these adjustments to your leadership narrative, your probability of success will increase significantly.'
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
    const { rejection, profile, opportunity } = await req.json() as { rejection: string; profile: UserProfile; opportunity: Opportunity };
    const result = await runRejectionLearningAgent(rejection, profile, opportunity);
    return NextResponse.json(result);
  } catch (error: any) {
    if (error?.name === 'InsufficientCreditsError') return NextResponse.json({ requireUpgrade: true, error: 'Insufficient AI Credits' }, { status: 402 });
    console.error('Rejection learning agent error:', error);
    return NextResponse.json(DEMO_REJECTION);
  }
}
