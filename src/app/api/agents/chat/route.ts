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

    // Candidate Profile Context for Personalization
    const evidence = [
      `Candidate Name: ${profile?.name || 'Applicant'}`,
      `Field of Study / Career: ${profile?.field || 'General Opportunities'}`,
      `Education Level: ${profile?.level || 'Undergraduate / Graduate'}`,
      `Country: ${profile?.country || 'Global'}`,
      `Skills: ${Array.isArray(profile?.skills) ? profile.skills.join(', ') : (profile?.skills || 'None specified')}`,
      `Goals: ${profile?.goals || 'Global Scholarships & Career Growth'}`,
    ].join('\n');

    const systemDirective = `You are the Executive AI Advisor & Opportunity Strategist for OpportunityOS.
Your mission is to help applicants win top global scholarships, fellowships, internships, grants, and admissions opportunities worldwide (e.g. Fulbright, Chevening, Rhodes, Erasmus, DAAD, DeepLearning.AI, Tech Fellowships, etc.).

CORE ADVISORY DIRECTIVES:
1. ALWAYS ANSWER COMPREHENSIVELY & HELPFULLY:
   - Answer ANY question the user asks directly (e.g. "What is the Fulbright Scholarship?", "How do I write an SOP?", "What are the eligibility criteria?").
   - NEVER refuse to answer a question simply because it isn't listed in the candidate profile evidence! You have vast knowledge of global opportunities and admissions strategies.
2. PERSONALIZE WITH CANDIDATE CONTEXT WHEN HELPFUL:
   - Use the candidate's background details (Field, Education Level, Country) to tailor your advice specifically to their profile.
3. CLEAR, EXECUTIVE & STRATEGIC FORMAT:
   - Provide crisp, structured, executive advice. Use clear bullet points and bold headers where appropriate.

Respond strictly as valid JSON with this exact schema:
{
  "reply": "Comprehensive, strategic response directly answering the user's question with clean markdown...",
  "confidenceScore": 95,
  "evidenceUsed": ["Candidate Background Context"]
}`;

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
