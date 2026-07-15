import { checkRateLimit } from '@/lib/rateLimiter';
import { NextRequest, NextResponse } from 'next/server';
import { runApplicationReviewerAgent } from '@/services/ai/agents/applicationReviewerAgent';
import { type Opportunity } from '@/lib/gemini';

const DEMO_REVIEW = {
  overallScore: 84,
  scores: { relevance: 88, clarity: 82, impact: 86, authenticity: 90, structure: 75 },
  strengths: [
    'Compelling childhood narrative creates immediate emotional connection',
    'Concrete impact metrics (12,000 farmers) demonstrate real-world results',
    'Clear alignment between personal background and scholarship goals',
    'Authentic voice that distinguishes from generic applications',
  ],
  improvements: [
    'Add one more non-academic leadership example to strengthen the leadership narrative',
    'The conclusion could more specifically reference the scholarship network value',
    'Include a clearer timeline for post-scholarship milestones',
  ],
  specificFeedback: [
    {
      quote: 'where electricity cuts interrupted my evenings yet never my curiosity',
      suggestion: 'Excellent opening hook. Consider adding one specific example of what you studied or built during those evenings.',
    },
    {
      quote: 'I am not simply applying for funding',
      suggestion: 'Strong closing line. Tie it more specifically to the scholarship\'s stated mission of building global leaders.',
    },
  ],
  verdict: 'strong',
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
    const { essay, opportunity, userId } = body;
    const result = await runApplicationReviewerAgent(essay, opportunity, userId);
    return NextResponse.json(result);
  } catch (error: any) {
    if (error?.name === 'InsufficientCreditsError') return NextResponse.json({ requireUpgrade: true, error: 'Insufficient AI Credits' }, { status: 402 });
    console.error('Reviewer agent error:', error);
    return NextResponse.json(DEMO_REVIEW);
  }
}
