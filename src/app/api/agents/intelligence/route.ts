import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { validateRequest } from '@/lib/auth/serverAuth';
import { checkRateLimit } from '@/lib/rateLimiter';
import { PROMPTS } from '@/lib/gemini';
import { aiRouter } from '@/services/ai/router';
import { OpportunityRepository } from '@/lib/repositories/OpportunityRepository';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const authResult = await validateRequest(req);
    if ('status' in authResult) return authResult;
    const { uid } = authResult as { uid: string };

    const rateLimit = await checkRateLimit(req, uid);
    if (!rateLimit.success) {
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429, headers: rateLimit.headers });
    }

    const body = await req.json();
    const { opportunityId } = body;

    if (!opportunityId) {
      return NextResponse.json({ error: 'Opportunity ID is required' }, { status: 400 });
    }

    // 1. Fetch User Profile
    const userDoc = await adminDb.collection('users').doc(uid).get();
    const profile = userDoc.exists ? userDoc.data() : null;

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // 2. Fetch Opportunity
    const opportunity = await OpportunityRepository.getOpportunityById(opportunityId);
    if (!opportunity) {
      return NextResponse.json({ error: 'Opportunity not found' }, { status: 404 });
    }

    // 3. Generate Intelligence via the resilient AI router (Gemini -> Groq,
    //    retries, caching, and credit metering) instead of the legacy client.
    const prompt = PROMPTS.INTELLIGENCE_FIT(profile as any, opportunity);
    const response = await aiRouter.runWithRetry<any>(
      'IntelligenceAgent',
      async (provider) => provider.generateJSON<any>(prompt, 'You are the Opportunity Intelligence Agent for OpportunityOS AI.'),
      { format: 'json', taskType: 'complex_reasoning', userId: uid, cacheKey: `intel_${uid}_${opportunityId}` }
    );

    return NextResponse.json({ success: true, intelligence: response.content }, { status: 200 });

  } catch (error: any) {
    if (error?.name === 'InsufficientCreditsError') {
      return NextResponse.json({ requireUpgrade: true, error: 'Insufficient AI Credits' }, { status: 402 });
    }
    console.error('Intelligence Agent Error:', error);
    return NextResponse.json({
      error: 'Failed to generate intelligence',
      details: error.message
    }, { status: 500 });
  }
}
