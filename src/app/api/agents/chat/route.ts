import { NextRequest, NextResponse } from 'next/server';
import { aiRouter } from '@/services/ai/router';
import { guardAgentRoute } from '@/lib/auth/agentGuard';
import { constructSecurePrompt } from '@/lib/prompts';

export async function POST(req: NextRequest) {
  const guard = await guardAgentRoute(req);
  if (guard instanceof NextResponse) return guard;
  const { uid } = guard;
  try {
    const body = await req.json();
    const { message, profile } = body;

    if (typeof message !== 'string' || !message.trim()) {
      return NextResponse.json({ error: 'A message is required.' }, { status: 400 });
    }

    // Fence the user profile as untrusted EVIDENCE and the message as the USER_REQUEST.
    // constructSecurePrompt instructs the model to ignore instructions inside the
    // evidence block, defeating prompt-injection via profile fields or the message.
    const evidence = [
      `Candidate Name: ${profile?.name || 'Unknown'}`,
      `Field: ${profile?.field || 'Unknown'}`,
      `Education Level: ${profile?.level || 'Unknown'}`,
      `Country: ${profile?.country || 'Unknown'}`,
      `Skills: ${Array.isArray(profile?.skills) ? profile.skills.join(', ') : (profile?.skills || 'Unknown')}`,
      `Goals: ${profile?.goals || 'Unknown'}`,
    ].join('\n');

    const systemDirective = `You are the Executive Advisor for OpportunityOS.
Keep answers brief, professional, and strategic, grounded ONLY in the candidate evidence.
Respond as valid JSON with this exact schema:
{ "reply": "your strategic response", "confidenceScore": 0-100, "evidenceUsed": ["..."] }
If the evidence does not support an answer, say so honestly in "reply" and set a low confidenceScore.`;

    const prompt = constructSecurePrompt(systemDirective, evidence, message);

    const response = await aiRouter.runWithRetry<any>(
      'ChatAdvisor',
      async (provider) => provider.generateJSON<any>(prompt),
      { format: 'json', userId: uid, taskType: 'fast_chat' }
    );

    return NextResponse.json(response.content);
  } catch (error: any) {
    if (error?.name === 'InsufficientCreditsError') {
      return NextResponse.json({ requireUpgrade: true, error: 'Insufficient AI Credits' }, { status: 402 });
    }
    console.error('Chat agent error:', error);
    return NextResponse.json({ error: 'AI chat failed' }, { status: 500 });
  }
}
