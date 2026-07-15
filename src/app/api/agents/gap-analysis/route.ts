import { checkRateLimit } from '@/lib/rateLimiter';
import { NextRequest, NextResponse } from 'next/server';
import { runGapAnalysisAgent } from '@/services/ai/agents/gapAnalysisAgent';
import { type UserProfile, type Opportunity } from '@/lib/gemini';

const DEMO_GAP = {
  currentState: 'Strong academic profile with research publications. Missing English language certification and formal leadership documentation.',
  targetState: 'Complete application package with all required documents and demonstrated leadership impact.',
  gaps: [
    { item: 'IELTS Score (6.5+)', priority: 'critical', timeEstimate: '3 months' },
    { item: '3 Recommendation Letters', priority: 'high', timeEstimate: '6 weeks' },
    { item: 'Leadership Evidence Documentation', priority: 'high', timeEstimate: '4 weeks' },
    { item: 'Research Statement', priority: 'medium', timeEstimate: '2 weeks' },
  ],
  actionPlan: [
    { step: 1, action: 'Register for IELTS exam at British Council', timeline: 'Week 1', resources: ['ielts.org', 'british council website'] },
    { step: 2, action: 'Email 4 potential referees with application details', timeline: 'Week 1', resources: ['Email template in dashboard'] },
    { step: 3, action: 'Compile community leadership portfolio with evidence', timeline: 'Week 2-4', resources: ['Photos, certificates, impact metrics'] },
    { step: 4, action: 'Draft research statement draft 1', timeline: 'Week 3', resources: ['Application Builder agent'] },
    { step: 5, action: 'Take IELTS exam', timeline: 'Month 2', resources: ['Preparation materials'] },
    { step: 6, action: 'Begin scholarship essays', timeline: 'Month 3', resources: ['OpportunityOS Builder'] },
  ],
  readinessPercentage: 58,
  estimatedTimeToReady: '3-4 months',
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

    const result = await runGapAnalysisAgent(profile, opportunity, evidenceContext);
    return NextResponse.json(result);
  } catch (error: any) {
    if (error?.name === 'InsufficientCreditsError') return NextResponse.json({ requireUpgrade: true, error: 'Insufficient AI Credits' }, { status: 402 });
    console.error('Gap analysis agent error:', error);
    return NextResponse.json(DEMO_GAP);
  }
}
