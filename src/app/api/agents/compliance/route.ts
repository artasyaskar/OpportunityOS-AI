import { NextRequest, NextResponse } from 'next/server';
import { runComplianceAgent } from '@/services/ai/agents/complianceAgent';
import { guardAgentRoute } from '@/lib/auth/agentGuard';

export async function POST(req: NextRequest) {
  const guard = await guardAgentRoute(req);
  if (guard instanceof NextResponse) return guard;
  const { uid: userId } = guard;
  try {
    const body = await req.json();
    let requirements: string[] = body.requirements;
    let documents: Record<string, string> = body.documents;

    if (!requirements || !Array.isArray(requirements)) {
      if (body.opportunity?.requirements && Array.isArray(body.opportunity.requirements)) {
        requirements = body.opportunity.requirements;
      } else if (body.opportunity?.title) {
        requirements = [
          `Application for ${body.opportunity.title}`,
          `Minimum GPA and academic eligibility for ${body.opportunity.provider || 'Target Institution'}`,
          'Statement of Purpose / Personal Statement submission',
          'Two Letters of Recommendation (LOR)',
          'Valid Identification & Proof of Citizenship'
        ];
      } else {
        requirements = [
          'Statement of Purpose (SOP) within word limit',
          'Official Academic Transcripts uploaded',
          'Two academic or professional reference letters',
          'English Language Proficiency Certificate'
        ];
      }
    }

    if (!documents || typeof documents !== 'object') {
      documents = {
        'Statement of Purpose': body.submission || 'Personal statement drafting completed with focus on candidate achievements.',
        'Verified Vault Credentials': body.evidenceContext || '1 Verified Document uploaded in Vault.'
      };
    }

    const result = await runComplianceAgent(requirements, documents, userId);
    return NextResponse.json(result);
  } catch (error: any) {
    if (error?.name === 'InsufficientCreditsError') return NextResponse.json({ requireUpgrade: true, error: 'Insufficient AI Credits' }, { status: 402 });
    console.error('Compliance agent error:', error);
    return NextResponse.json({ error: 'AI compliance check failed' }, { status: 500 });
  }
}
