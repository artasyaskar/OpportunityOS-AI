import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit } from '@/lib/rateLimiter';
import { serverStorageProvider as storageProvider } from '@/lib/storage/ServerStorageProvider';
import { validateRequest } from '@/lib/auth/serverAuth';

export const runtime = 'nodejs';

/**
 * Detect a file's MIME type from its magic bytes, restricted to the formats we
 * accept for document/receipt uploads (PDF + common images). Returns null for
 * anything unrecognized so callers can reject it. This is a defense against a
 * client lying in the Content-Type header to smuggle executables/HTML.
 */
function sniffMimeType(buf: Buffer): string | null {
  if (buf.length < 4) return null;

  // PDF: "%PDF"
  if (buf[0] === 0x25 && buf[1] === 0x50 && buf[2] === 0x44 && buf[3] === 0x46) return 'application/pdf';
  // PNG: 89 50 4E 47
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return 'image/png';
  // JPEG: FF D8 FF
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'image/jpeg';
  // GIF: "GIF8"
  if (buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x38) return 'image/gif';
  // WEBP: "RIFF"...."WEBP"
  if (buf.length >= 12 &&
      buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46 &&
      buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50) return 'image/webp';
  // DOCX (and other OOXML) is a ZIP container: "PK\x03\x04". We can't distinguish
  // a docx from a generic zip by magic bytes alone, so we accept the ZIP signature
  // as docx here (the allowlist only permits docx among ZIP-based types).
  if (buf[0] === 0x50 && buf[1] === 0x4b && buf[2] === 0x03 && buf[3] === 0x04) {
    return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  }

  return null;
}

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

    if (arrayBuffer.byteLength === 0) {
      return NextResponse.json({ error: 'Empty file' }, { status: 400 });
    }

    // Strict 2MB check as requested for Cloudflare Free Tier
    if (arrayBuffer.byteLength > 2 * 1024 * 1024) {
        return NextResponse.json({ error: 'File size exceeds 2MB limit' }, { status: 413 });
    }

    const buffer = Buffer.from(arrayBuffer);
    const declaredType = (req.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();

    // Server-side content validation: don't trust the client's declared type.
    // Sniff magic bytes and require the sniffed type to match an allowlist.
    const sniffed = sniffMimeType(buffer);
    if (!sniffed) {
      return NextResponse.json({ error: 'Unsupported or unrecognized file type' }, { status: 415 });
    }
    // If the client declared a type, it must agree with what the bytes actually are.
    if (declaredType && declaredType !== sniffed) {
      return NextResponse.json({ error: 'File content does not match its declared type' }, { status: 415 });
    }
    const contentType = sniffed;

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
