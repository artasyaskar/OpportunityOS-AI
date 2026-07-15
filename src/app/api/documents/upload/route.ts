import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { checkRateLimit } from '@/lib/rateLimiter';
import { serverStorageProvider as storageProvider } from '@/lib/storage/ServerStorageProvider';
import { validateRequest } from '@/lib/auth/serverAuth';
import { z } from 'zod';

export const runtime = 'nodejs';

// Zod schema for validation
const uploadSchema = z.object({
  type: z.string().min(1),
});

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIME_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];

// Very simple magic bytes check (JPEG, PNG, PDF)
function validateMagicBytes(buffer: Buffer, mimeType: string): boolean {
  if (buffer.length < 4) return false;
  const hex = buffer.toString('hex', 0, 4).toUpperCase();
  
  if (mimeType === 'application/pdf') return hex.startsWith('25504446'); // %PDF
  if (mimeType === 'image/jpeg') return hex.startsWith('FFD8FF');
  if (mimeType === 'image/png') return hex.startsWith('89504E47');
  if (mimeType.includes('word')) return hex.startsWith('504B0304'); // PK ZIP (DOCX)
  
  return true; // Fallback for unsupported types
}

export async function POST(req: NextRequest) {
  // 1. Auth Validation
  const authResult = await validateRequest(req);
  if ('status' in authResult) return authResult; // Returns NextResponse if failed
  const { uid } = authResult as { uid: string };

  // 2. Rate Limiting
  const rateLimit = checkRateLimit(req, uid);
  if (!rateLimit.success) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429, headers: rateLimit.headers });
  }

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const type = formData.get('type') as string;

    // 3. Zod Validation
    const parsed = uploadSchema.safeParse({ type });
    if (!parsed.success || !file) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    // 4. File Validation
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'File too large' }, { status: 413 });
    }
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json({ error: 'Unsupported file type' }, { status: 415 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    
    // 5. Magic Bytes Check
    if (!validateMagicBytes(buffer, file.type)) {
      return NextResponse.json({ error: 'File signature does not match extension' }, { status: 415 });
    }
    
    // 6. SHA256 Hashing for Deduplication
    const hash = crypto.createHash('sha256').update(buffer).digest('hex');
    
    // 7. Upload to Cloudflare R2
    const storageKey = `users/${uid}/evidence/${hash}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    let fileUrl = '';
    
    const exists = await storageProvider.exists(storageKey);
    if (exists) {
      fileUrl = await storageProvider.generateDownloadUrl(storageKey);
    } else {
      await storageProvider.upload(storageKey, file);
      fileUrl = await storageProvider.generateDownloadUrl(storageKey);
    }
    
    return NextResponse.json({
      success: true,
      fileUrl,
      hash
    });

  } catch (error: any) {
    console.error('Upload Error:', error);
    return NextResponse.json({ error: 'Failed to upload document' }, { status: 500 });
  }
}
