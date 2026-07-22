import { NextRequest, NextResponse } from 'next/server';
import { runResearchAgent } from '@/services/ai/agents/researchAgent';
import { guardAgentRoute } from '@/lib/auth/agentGuard';

// @ts-ignore
import pdf from 'pdf-parse';

export async function POST(req: NextRequest) {
  const guard = await guardAgentRoute(req);
  if (guard instanceof NextResponse) return guard;

  try {
    const { url } = await req.json();
    
    if (!url) {
      return NextResponse.json({ error: 'Missing url' }, { status: 400 });
    }

    // Fetch the URL content on the server to avoid CORS
    const response = await fetch(url);
    if (!response.ok) {
      return NextResponse.json({ error: `Failed to fetch URL: ${response.statusText}` }, { status: 400 });
    }

    const contentType = response.headers.get('content-type') || '';
    let documentText = '';

    if (contentType.includes('application/pdf')) {
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const parsed = await pdf(buffer);
      documentText = parsed.text;
    } else {
      // For HTML or plain text, Gemini handles raw HTML fine, but we'll extract text
      const rawText = await response.text();
      // Simple tag stripper to reduce token usage
      documentText = rawText.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    }

    if (!documentText) {
      return NextResponse.json({ error: 'No readable text found at URL.' }, { status: 400 });
    }

    const result = await runResearchAgent(documentText);
    
    return NextResponse.json(result);
  } catch (error: any) {
    if (error?.name === 'InsufficientCreditsError') return NextResponse.json({ requireUpgrade: true, error: 'Insufficient AI Credits' }, { status: 402 });
    console.error('Research agent error:', error);
    return NextResponse.json(
      { error: 'Failed to analyze URL' },
      { status: 500 }
    );
  }
}
