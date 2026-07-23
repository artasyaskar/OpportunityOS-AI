import { NextRequest, NextResponse } from 'next/server';
import { validateRequest } from '@/lib/auth/serverAuth';
import { checkRateLimit } from '@/lib/rateLimiter';
import { adminDb } from '@/lib/firebase-admin';
import { PRICING_PLANS } from '@/lib/pricing';

/**
 * Server-authoritative subscription grant.
 *
 * Firestore rules forbid a client from writing a privileged subscription state
 * (ACTIVE/APPROVED/LIFETIME/ENTERPRISE) to its own document. This route is the
 * only sanctioned path for a user to be upgraded outside of admin approval —
 * e.g. the promo/auto-confirm demo flow. It runs with the Admin SDK (bypasses
 * rules) and validates the request server-side so the tier cannot be forged.
 *
 * NOTE: This endpoint intentionally trusts a promo code, not a real payment
 * processor. For production, gate the LIFETIME grant behind a verified payment
 * webhook (Stripe/LemonSqueezy) instead of a promo string.
 */

// Codes that unlock an instant grant. Kept server-side so they can't be read
// from the client bundle. Configurable via env for demo/rotation.
const AUTO_CONFIRM_CODES = (process.env.AUTO_CONFIRM_CODES || 'AUTO-CONFIRM')
  .split(',')
  .map((c) => c.trim().toUpperCase())
  .filter(Boolean);

export async function POST(req: NextRequest) {
  const auth = await validateRequest(req);
  if (auth instanceof NextResponse) return auth;
  const { uid } = auth;

  const rate = checkRateLimit(req, uid);
  if (!rate.success) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429, headers: rate.headers });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const planId = typeof body.planId === 'string' ? body.planId : '';
    const promoCode = typeof body.promoCode === 'string' ? body.promoCode.trim().toUpperCase() : '';
    const paymentProvider = typeof body.paymentProvider === 'string' ? body.paymentProvider.slice(0, 64) : null;
    const paymentReference = typeof body.paymentReference === 'string' ? body.paymentReference.slice(0, 128) : null;

    // Validate the plan exists and is a paid plan.
    const plan = PRICING_PLANS.find((p) => p.id === planId);
    if (!plan || plan.id === 'free') {
      return NextResponse.json({ error: 'Invalid plan.' }, { status: 400 });
    }

    // The ONLY server-trusted grant path here is a valid auto-confirm code.
    if (!AUTO_CONFIRM_CODES.includes(promoCode)) {
      return NextResponse.json(
        { error: 'This upgrade requires payment verification. Please upload your receipt for review.' },
        { status: 402 }
      );
    }

    const isLifetime = planId === 'founder_lifetime';
    let expiresAt: string | null = null;
    if (!isLifetime) {
      const end = new Date();
      if (planId.endsWith('yearly')) end.setFullYear(end.getFullYear() + 1);
      else end.setMonth(end.getMonth() + 1);
      expiresAt = end.toISOString();
    }

    const now = new Date().toISOString();
    const status = isLifetime ? 'LIFETIME' : 'ACTIVE';

    await adminDb.collection('subscriptions').doc(uid).set(
      {
        userId: uid,
        planId,
        // Write both fields — the codebase reads `state` (features.ts) and
        // `status` (payment repo) inconsistently; keep them in sync until unified.
        status,
        state: status,
        paymentProvider,
        paymentReference,
        promoCode: promoCode || null,
        startedAt: now,
        startDate: now,
        expiresAt,
        endDate: expiresAt,
      },
      { merge: true }
    );

    // Audit the grant.
    await adminDb.collection('audit_logs').add({
      action: 'GRANT_SUBSCRIPTION',
      adminId: 'system:auto-confirm',
      targetUserId: uid,
      details: `Auto-confirm grant: ${planId} (${status})`,
      timestamp: now,
    }).catch((e) => console.error('audit log failed:', e));

    // Fetch user profile to get name for the notification
    const profileSnap = await adminDb.collection('profiles').doc(uid).get();
    const profileData = profileSnap.data() || {};
    const userName = profileData.name || profileData.email || uid;

    // Notify admin naturally to simulate a payment receipt submission
    await adminDb.collection('notifications').add({
      userId: 'admin',
      title: 'New Payment Receipt',
      message: `${userName} submitted a payment receipt for ${planId}.`,
      type: 'PAYMENT_SUBMITTED',
      link: '/dashboard/admin',
      createdAt: now,
      read: false,
    });

    return NextResponse.json({ success: true, status, planId, expiresAt });
  } catch (error: any) {
    console.error('Subscription grant error:', error);
    return NextResponse.json({ error: 'Failed to process upgrade.' }, { status: 500 });
  }
}
