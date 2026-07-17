import { checkRateLimit } from '@/lib/rateLimiter';
import { NextRequest, NextResponse } from 'next/server';
import { runComplianceAgent } from '@/services/ai/agents/complianceAgent';



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
    return NextResponse.json({ error: 'AI compliance check failed' }, { status: 500 });
  }
}
