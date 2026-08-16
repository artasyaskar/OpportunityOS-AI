import { NextRequest, NextResponse } from 'next/server';
import { runApplicationBuilderAgent } from '@/services/ai/agents/applicationBuilderAgent';
import { type UserProfile, type Opportunity } from '@/lib/gemini';
import { EvidenceEngine, HallucinationError } from '@/lib/services/EvidenceEngine';
import { adminDb } from '@/lib/firebase-admin';
import { guardAgentRoute } from '@/lib/auth/agentGuard';

export async function POST(req: NextRequest) {
  const guard = await guardAgentRoute(req);
  if (guard instanceof NextResponse) return guard;
  const { uid: userId } = guard;
  try {
    const { type, opportunity, instructions, profile } = await req.json() as {
      type: string;
      opportunity: Opportunity;
      instructions: string;
      profile: UserProfile;
    };
    const safeProfile = profile || ({ name: 'Applicant', userId } as any);
    if (safeProfile) safeProfile.userId = userId;

    const safeOpp = opportunity || {
      id: 'opp_general',
      title: 'Global Scholarship & Fellowship Program',
      provider: 'Global Institution',
      type: 'Scholarship',
      description: 'Competitive international program requiring personalized application materials.'
    };

    // Fetch actual evidence from verified documents
    let evidence: any[] = [];
    if (userId) {
      try {
        const evidenceSnapshot = await adminDb.collection('evidence').where('userId', '==', userId).get();
        const docs = evidenceSnapshot.docs.map(doc => doc.data() as any);
        evidence = EvidenceEngine.extractFromDocuments(docs);
      } catch (err) {
        console.warn('Could not fetch evidence from adminDb, relying on profile object:', err);
      }
    }

    const result = await runApplicationBuilderAgent(type || 'Personal Statement', safeOpp, safeProfile, instructions || '', evidence);
    return NextResponse.json({
      content: result.essayText,
      explanations: result.explanations,
      confidence: result.confidence,
      evidenceUsed: result.evidenceUsed
    });
  } catch (error: any) {
    console.error('Builder agent error:', error);
    
    if (error?.name === 'InsufficientCreditsError' || error?.message?.includes('daily free credits') || error?.message?.includes('exhausted')) {
      return NextResponse.json(
        { requireUpgrade: true, error: 'Insufficient AI Credits', message: error.message },
        { status: 402 }
      );
    }

    if (error.name === 'HallucinationError') {
      return NextResponse.json(
        { 
          error: 'Hallucination detected and blocked.', 
          message: error.message,
          content: 'The AI attempted to generate content that violated our strict Evidence-Only policy. Please provide more instructions or update your profile.'
        },
        { status: 400 }
      );
    }

    return NextResponse.json({ error: 'AI generation failed. Please try again.' }, { status: 500 });
  }
}
