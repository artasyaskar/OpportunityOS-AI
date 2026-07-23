import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit } from '@/lib/rateLimiter';
import { serverStorageProvider as storageProvider } from '@/lib/storage/ServerStorageProvider';
import { validateRequest } from '@/lib/auth/serverAuth';
import { adminDb } from '@/lib/firebase-admin';
import { z } from 'zod';
import { DocumentStatus } from '@/lib/repositories/EvidenceRepository';

export const runtime = 'nodejs'; // force recompile route

const presignSchema = z.object({
  filename: z.string().min(1),
  contentType: z.string().min(1),
  size: z.number().max(2 * 1024 * 1024), // 2MB strict limit for Hackathon!
  hash: z.string().length(64),
  type: z.string().min(1)
});

const ALLOWED_MIME_TYPES = [
  'application/pdf', 
  'image/jpeg', 
  'image/png', 
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
];

export async function POST(req: NextRequest) {
  console.log('HIT /api/documents/presign POST route');
  // 1. Auth Validation
  const authResult = await validateRequest(req);
  if ('status' in authResult) return authResult;
  const { uid } = authResult as { uid: string };

  // 2. Rate Limiting (Strict)
  const rateLimit = await checkRateLimit(req, uid);
  if (!rateLimit.success) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429, headers: rateLimit.headers });
  }

  try {
    const body = await req.json();
    
    // 3. Zod Validation
    const parsed = presignSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid payload or file too large (Max 2MB)' }, { status: 400 });
    }
    
    const { filename, contentType, size, hash, type } = parsed.data;

    // 4. File Validation
    if (!ALLOWED_MIME_TYPES.includes(contentType)) {
      return NextResponse.json({ error: 'Unsupported file type' }, { status: 415 });
    }

    // 5. Cloudflare R2 Upload Path
    const safeFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
    const storageKey = `users/${uid}/evidence/${hash}_${safeFilename}`;
    
    // Bypass slow R2 exists check (HeadObject takes 25s to timeout on 404/403)
    // We will just always allow the upload, as Cloudflare R2 is free and fast.
    const downloadUrl = '';
    const uploadUrl = `/api/documents/upload-stream?key=${encodeURIComponent(storageKey)}`;

    // 6. Pre-register the document in Firestore as UPLOADED
    const docId = `doc_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const docRef = adminDb.collection('evidence').doc(docId);
    
    await docRef.set({
      id: docId,
      userId: uid,
      type,
      storageKey,
      fileName: safeFilename,
      status: DocumentStatus.UPLOADED, // Wait for parsing
      uploadedAt: new Date().toISOString(),
      lastUpdatedAt: new Date().toISOString(),
      size: size,
      mimeType: contentType,
      version: 1,
      source: 'user_upload',
      usedInApplications: [],
      aiConfidence: 0
    });

    return NextResponse.json({
      success: true,
      documentId: docId,
      uploadUrl,
      downloadUrl,
      storageKey
    }, { status: 200 });

  } catch (error: any) {
    console.error('Presign Error:', error);
    return NextResponse.json({ error: 'Failed to generate upload URL' }, { status: 500 });
  }
}
