import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { validateRequest } from '@/lib/auth/serverAuth';
import { generateJSON, PROMPTS } from '@/lib/gemini';
import { OpportunityRepository } from '@/lib/repositories/OpportunityRepository';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const authResult = await validateRequest(req);
    if ('status' in authResult) return authResult;
    const { uid } = authResult as { uid: string };

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

    // 3. Generate Intelligence
    const prompt = PROMPTS.INTELLIGENCE_FIT(profile as any, opportunity);
    const intelligence = await generateJSON<any>(prompt);

    return NextResponse.json({ success: true, intelligence }, { status: 200 });

  } catch (error: any) {
    console.error('Intelligence Agent Error:', error);
    return NextResponse.json({ 
      error: 'Failed to generate intelligence',
      details: error.message 
    }, { status: 500 });
  }
}
