import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit } from '@/lib/rateLimiter';
import { serverStorageProvider } from '@/lib/storage/ServerStorageProvider';
import { DocumentStatus } from '@/lib/repositories/EvidenceRepository';
import { runParserAgent } from '@/services/ai/agents/parserAgent';
import { adminDb } from '@/lib/firebase-admin';
import { validateRequest } from '@/lib/auth/serverAuth';

// Polyfill DOM APIs required by pdf-parse / pdf.js in Node.js environments
if (typeof global !== 'undefined') {
  if (typeof (global as any).DOMMatrix === 'undefined') (global as any).DOMMatrix = class DOMMatrix {};
  if (typeof (global as any).ImageData === 'undefined') (global as any).ImageData = class ImageData {};
  if (typeof (global as any).Path2D === 'undefined') (global as any).Path2D = class Path2D {};
}
const pdf = require('pdf-parse');

export const runtime = 'nodejs'; // Required for pdf-parse

export async function POST(req: NextRequest) {
  // 1. Auth Validation
  const authResult = await validateRequest(req);
  if ('status' in authResult) return authResult;
  const { uid } = authResult as { uid: string };

  // 2. Rate Limiting
  const rateLimit = checkRateLimit(req, uid);
  if (!rateLimit.success) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429, headers: rateLimit.headers });
  }

  try {
    const { documentId } = await req.json();

    if (!documentId) {
      return NextResponse.json({ error: 'Missing documentId' }, { status: 400 });
    }

    // 1. Fetch document record (ensure ownership)
    let docData: any = null;
    let docRef: FirebaseFirestore.DocumentReference | null = null;
    try {
      const docQuery = await adminDb.collection('evidence')
        .where('userId', '==', uid) // strict ownership check
        .where('id', '==', documentId)
        .limit(1)
        .get();
        
      if (docQuery.empty) {
        return NextResponse.json({ error: 'Document not found or unauthorized' }, { status: 404 });
      }
      docRef = docQuery.docs[0].ref;
      docData = docQuery.docs[0].data();
    } catch (err) {
      console.warn("Could not read from adminDb. Attempting fallback.", err);
      return NextResponse.json({ error: 'Admin DB error' }, { status: 500 });
    }

    // Update status to PROCESSING
    docData.status = DocumentStatus.PROCESSING;
    try {
      if (docRef) await docRef.update({ status: DocumentStatus.PROCESSING });
    } catch (e) {}

    // Background async parsing (Fire and forget - Pseudo Queue)
    const processDocument = async () => {
      try {
        // 2. Download from Storage via ServerStorageProvider
        let buffer: Buffer;
        if (serverStorageProvider.getFileBuffer) {
           buffer = await serverStorageProvider.getFileBuffer(docData.storageKey);
        } else {
           const blob = await serverStorageProvider.download(docData.storageKey);
           buffer = Buffer.from(await blob.arrayBuffer());
        }

        // 3. Extract clean text using pdf-parse
        let extractedText = '';
        try {
          const pdfData = await pdf(buffer);
          extractedText = pdfData.text;
        } catch (e) {
          console.error('PDF Parse failed:', e);
          if (docRef) await docRef.update({ status: DocumentStatus.REJECTED }).catch(() => {});
          return;
        }

        // 4. Send clean text to Gemini (ParserAgent)
        let aiResult;
        try {
          aiResult = await runParserAgent(extractedText, docData.type);
        } catch (e: any) {
          if (docRef) await docRef.update({ status: DocumentStatus.REJECTED }).catch(() => {});
          return;
        }

        // 5. Update Evidence Document with extracted data
        if (docRef) {
          await docRef.update({
            extractedData: aiResult,
            status: DocumentStatus.NEEDS_REVIEW,
            aiConfidence: 85,
            parserUsed: `${docData.type.charAt(0).toUpperCase() + docData.type.slice(1)} Parser (Gemini)`,
            extractionVersion: 'v1',
            whoVerified: 'AI'
          }).catch(() => {});
        }
      } catch (err) {
        console.error("Background parsing failed:", err);
        if (docRef) await docRef.update({ status: DocumentStatus.REJECTED }).catch(() => {});
      }
    };
    
    // Start background process
    processDocument();

    return NextResponse.json({ success: true, status: 'PROCESSING' });
  } catch (error: any) {
    console.error('Parse setup error:', error);
    return NextResponse.json({ error: 'Parse setup failed' }, { status: 500 });
  }
}
