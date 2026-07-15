import { checkRateLimit } from '@/lib/rateLimiter';
import { NextRequest, NextResponse } from 'next/server';
import { runParserAgent } from '@/services/ai/agents/parserAgent';

export async function POST(req: NextRequest) {
  const rateLimit = checkRateLimit(req);
  if (!rateLimit.success) {
    return NextResponse.json(
      { error: 'Rate limit exceeded' },
      { status: 429, headers: rateLimit.headers }
    );
  }
  
  try {
    const { documentText, documentType } = await req.json();
    
    if (!documentText || !documentType) {
      return NextResponse.json(
        { error: 'Missing documentText or documentType' },
        { status: 400 }
      );
    }

    const result = await runParserAgent(documentText, documentType);
    
    return NextResponse.json(result);
  } catch (error: any) {
    if (error?.name === 'InsufficientCreditsError') return NextResponse.json({ requireUpgrade: true, error: 'Insufficient AI Credits' }, { status: 402 });
    console.error('Parser agent error:', error);
    return NextResponse.json(
      { error: 'Failed to parse document' },
      { status: 500 }
    );
  }
}
