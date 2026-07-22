import { NextRequest, NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase-admin';
import { ADMIN_WHITELIST } from '@/lib/permissions';

export async function validateRequest(req: NextRequest): Promise<{ uid: string; email?: string } | NextResponse> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Missing or invalid Authorization header' }, { status: 401 });
  }

  const token = authHeader.split('Bearer ')[1];
  try {
    const decodedToken = await adminAuth.verifyIdToken(token);
    return { uid: decodedToken.uid, email: decodedToken.email };
  } catch (error) {
    console.error('Auth verification error:', error);
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}

/**
 * Verifies the request carries a valid Firebase ID token AND that the token's
 * email is on the server-side admin whitelist. Returns 401 for a bad/missing
 * token and 403 for an authenticated non-admin. Admin gating happens entirely
 * server-side — never trust a client-supplied "isAdmin" flag or a shared secret.
 */
export async function validateAdminRequest(req: NextRequest): Promise<{ uid: string; email: string } | NextResponse> {
  const result = await validateRequest(req);
  if (result instanceof NextResponse) return result;

  const email = (result.email || '').toLowerCase().trim();
  if (!email || !ADMIN_WHITELIST.includes(email)) {
    return NextResponse.json({ error: 'Forbidden: admin access required' }, { status: 403 });
  }
  return { uid: result.uid, email };
}
