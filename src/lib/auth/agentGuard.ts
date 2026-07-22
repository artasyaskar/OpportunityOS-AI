import { NextRequest, NextResponse } from 'next/server';
import { validateRequest } from './serverAuth';
import { checkRateLimit } from '@/lib/rateLimiter';

/**
 * Shared guard 
 * for AI agent API routes.
 *
 * 1. Verifies the Firebase ID token (Authorization: Bearer <token>).
 * 2. Applies rate limiting keyed on the VERIFIED uid (not a spoofable IP).
 *
 * Returns the verified `{ uid }` on success, or a ready-to-return NextResponse
 * (401 / 429) on failure. Callers must derive userId from this uid and never
 * trust a userId supplied in the request body.
 *
 * Usage:
 *   const guard = await guardAgentRoute(req);
 *   if ('status' in guard) return guard;
 *   const { uid } = guard;
 */
export async function guardAgentRoute(
  req: NextRequest
): Promise<{ uid: string } | NextResponse> {
  const authResult = await validateRequest(req);
  if (authResult instanceof NextResponse) {
    return authResult;
  }
  const { uid } = authResult;

  const rateLimit = checkRateLimit(req, uid);
  if (!rateLimit.success) {
    return NextResponse.json(
      { error: 'Rate limit exceeded. Please slow down.' },
      { status: 429, headers: rateLimit.headers }
    );
  }

  return { uid };
}
