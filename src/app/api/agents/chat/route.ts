import { checkRateLimit } from '@/lib/rateLimiter';
import { NextRequest, NextResponse } from 'next/server';
import { aiRouter } from '@/services/ai/router';

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
    const { message, profile, userId } = body;

    const systemPrompt = `You are the Executive Advisor for OpportunityOS. 
You are speaking with ${profile?.name || 'the candidate'}. 
You have access to their profile: ${JSON.stringify(profile)}.
Keep your answers brief, professional, and strategic. 
CRITICAL: You must output your response as perfectly formatted JSON with the following schema:
{
  "reply": "Your strategic response here",
  "confidenceScore": 95,
  "evidenceUsed": ["Profile Goal: ...", "GPA: ..."]
}
If you don't know the answer, say so. DO NOT HALLUCINATE.`;

    const response = await aiRouter.runWithRetry<any>(
      'ChatAdvisor',
      async (provider) => {
        return provider.generateJSON<any>(message, systemPrompt);
      },
      { format: 'json', userId, taskType: 'fast_chat' }
    );

    return NextResponse.json(response.content);
  } catch (error: any) {
    if (error?.name === 'InsufficientCreditsError') return NextResponse.json({ requireUpgrade: true, error: 'Insufficient AI Credits' }, { status: 402 });
    console.error('Chat agent error:', error);
    return NextResponse.json({ error: 'AI chat failed' }, { status: 500 });
  }
}
