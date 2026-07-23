import { NextRequest, NextResponse } from 'next/server';
import { runParserAgent } from '@/services/ai/agents/parserAgent';
import { guardAgentRoute } from '@/lib/auth/agentGuard';

// @ts-ignore
import pdf from 'pdf-parse';

export const maxDuration = 300;

export async function POST(req: NextRequest) {
  const guard = await guardAgentRoute(req);
  if (guard instanceof NextResponse) return guard;

  try {
    const contentType = req.headers.get('content-type') || '';
    let documentText = '';
    let documentType = '';

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const file = formData.get('file') as Blob | null;
      if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 });

      documentType = file.type || 'unknown';
      if (documentType === 'application/pdf') {
        const buffer = Buffer.from(await file.arrayBuffer());
        const parsed = await pdf(buffer);
        documentText = parsed.text;
      } else {
        documentText = await file.text();
      }
    } else {
      const body = await req.json();
      documentText = body.documentText;
      documentType = body.documentType;
    }

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
