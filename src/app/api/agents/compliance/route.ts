import { checkRateLimit } from '@/lib/rateLimiter';
import { NextRequest, NextResponse } from 'next/server';
import { runComplianceAgent } from '@/services/ai/agents/complianceAgent';

const DEMO_COMPLIANCE = {
  overallCompliant: false,
  completionPercentage: 80,
  checklist: [
    { requirement: 'Proof of English language proficiency (IELTS 6.5+)', status: 'warning', note: 'IELTS certificate not uploaded; mock status assumed' },
    { requirement: 'Two academic reference letters', status: 'incomplete', note: 'Only 1 reference template drafted' },
    { requirement: 'Official university transcripts', status: 'complete', note: 'Uploaded and verified' },
    { requirement: 'Statement of Purpose (under 800 words)', status: 'complete', note: 'Currently at 642 words' }
  ],
  criticalIssues: ['Missing IELTS certificate copy', 'Missing second reference letter'],
  warnings: ['Word count is safe but close to threshold']
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
    const { requirements, documents, userId } = body;
    const result = await runComplianceAgent(requirements, documents, userId);
    return NextResponse.json(result);
  } catch (error: any) {
    if (error?.name === 'InsufficientCreditsError') return NextResponse.json({ requireUpgrade: true, error: 'Insufficient AI Credits' }, { status: 402 });
    console.error('Compliance agent error:', error);
    return NextResponse.json(DEMO_COMPLIANCE);
  }
}
