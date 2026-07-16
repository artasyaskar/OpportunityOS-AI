import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit } from '@/lib/rateLimiter';
import { serverStorageProvider as storageProvider } from '@/lib/storage/ServerStorageProvider';
import { validateRequest } from '@/lib/auth/serverAuth';

export const runtime = 'nodejs';

export async function PUT(req: NextRequest) {
  // 1. Auth Validation
  const authResult = await validateRequest(req);
  if ('status' in authResult) return authResult;
  const { uid } = authResult as { uid: string };

  // 2. Rate Limiting
  const rateLimit = checkRateLimit(req, uid);
  if (!rateLimit.success) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429, headers: rateLimit.headers });
  }

  const key = req.nextUrl.searchParams.get('key');
  if (!key) return NextResponse.json({ error: 'Missing key' }, { status: 400 });

  // 3. Security: Ensure the key contains the user's UID to prevent arbitrary uploads
  if (!key.startsWith(`users/${uid}/`)) {
    return NextResponse.json({ error: 'Unauthorized key' }, { status: 403 });
  }

  try {
    // Read raw body bypassing Next.js slow multipart/form-data parser
    const arrayBuffer = await req.arrayBuffer();
    
    // Strict 2MB check as requested for Cloudflare Free Tier
    if (arrayBuffer.byteLength > 2 * 1024 * 1024) {
        return NextResponse.json({ error: 'File size exceeds 2MB limit' }, { status: 413 });
    }

    const buffer = Buffer.from(arrayBuffer);
    const contentType = req.headers.get('content-type') || 'application/octet-stream';
    
    // CloudflareR2Provider expects a File or Blob, so we mock it for the buffer
    const mockFile = {
      type: contentType,
      arrayBuffer: async () => buffer,
    } as any;

    await storageProvider.upload(key, mockFile);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Stream Upload Error:', err);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}
