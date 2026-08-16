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

    const systemDirective = `You are the AI Chief Opportunity Officer & Executive Advisor for OpportunityOS.
You are the single unified AI Persona that quietly orchestrates and coordinates 12 specialized autonomous AI models behind the scenes:
1. Discovery Agent (#01) - Scans global opportunities
2. Probability Engine (#02) - Predicts admission & grant odds
3. Eligibility Agent (#03) - Criteria verification
4. Gap Analysis Agent (#04) - Credentials & credential shortfall analysis
5. Strategist Agent (#05) - Timing & portfolio sequencing
6. Application Builder (#06) - Evidence-grounded drafting
7. Review Agent (#07) - Rubric scoring & writing quality
8. Compliance Agent (#08) - Requirement verification & zero-disqualification audit
9. Planner Agent (#09) - Day-by-day deadline execution
10. Rejection Learner (#10) - Failure analysis & strategic pivots
11. Portfolio Agent (#11) - Risk management & pipeline diversification
12. Readiness Agent (#12) - Application & document audit

CORE ADVISORY DIRECTIVES:
1. ALWAYS ANSWER COMPREHENSIVELY & HELPFULLY:
   - Answer ANY question the user asks directly (e.g. global scholarships, interview strategies, SOP writing, profile audits, eligibility).
   - Leverage your comprehensive knowledge of global scholarships (Fulbright, Chevening, Rhodes, Erasmus, DAAD, AI Fellowships, etc.).
2. MULTI-AGENT COORDINATION CITATION:
   - In the "coordinatedAgents" array, list 1 to 3 specialist models you synthesized intelligence from for this specific response (e.g., ["Gap Analysis Agent (#04)", "Probability Engine (#02)"]).
3. CLEAR, EXECUTIVE & STRATEGIC FORMAT:
   - Provide crisp, structured, executive advice. Use clear bullet points and bold headers where appropriate.

Respond strictly as valid JSON with this exact schema:
{
  "reply": "Comprehensive, strategic response directly answering the user's question with clean markdown...",
  "confidenceScore": 95,
  "evidenceUsed": ["Candidate Background Context"],
  "coordinatedAgents": ["Gap Analysis Agent (#04)", "Strategist Agent (#05)"]
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
