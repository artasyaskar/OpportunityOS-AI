import { NextRequest, NextResponse } from 'next/server';
import { CreditManager } from '@/lib/services/CreditManager';
import { adminDb } from '@/lib/firebase-admin';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const uid = searchParams.get('uid');

    if (!uid) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 });
    }

    const creditInfo = await CreditManager.getBalance(uid);

    // Read subscription using adminDb (bypasses client Firestore rules on server)
    let subscription: any = { planId: 'free', status: 'FREE', startedAt: new Date().toISOString() };
    try {
      const subSnap = await adminDb.collection('subscriptions').doc(uid).get();
      if (subSnap.exists) {
        subscription = subSnap.data() || subscription;
      }
    } catch (subErr) {
      console.warn('[Credits API] Failed to fetch subscription via adminDb:', subErr);
    }

    const now = Date.now();
    const startedAt = subscription.startedAt ? new Date(subscription.startedAt).getTime() : now;
    const expiresAt = subscription.expiresAt 
      ? new Date(subscription.expiresAt).getTime() 
      : (startedAt + 30 * 24 * 60 * 60 * 1000);

    const status = (subscription.status || '').toUpperCase();
    const isMonthly = (subscription.planId || '').toLowerCase().includes('monthly');
    const isLifetime = status === 'LIFETIME' || (status === 'ACTIVE' && (subscription.planId || '').toLowerCase().includes('lifetime'));

    const isExpired = !isLifetime && (status === 'EXPIRED' || (status === 'ACTIVE' && now > expiresAt));

    return NextResponse.json({
      credits: creditInfo.credits,
      hoursUntilReset: creditInfo.hoursUntilReset,
      isUnlimited: Boolean(creditInfo.isUnlimited),
      subscription: {
        planId: subscription.planId || 'free',
        status: isExpired ? 'EXPIRED' : (subscription.status || 'FREE'),
        startedAt: subscription.startedAt || new Date().toISOString(),
        expiresAt: new Date(expiresAt).toISOString(),
        isExpired,
        isMonthly,
        isLifetime,
        inspirationMessage: isExpired 
          ? "Your Monthly Pro Plan has completed! Keep enhancing your future — God definitely has great plans for you! ✨"
          : null
      }
    }, {
      headers: {
        'Cache-Control': 'private, max-age=15, stale-while-revalidate=30'
      }
    });
  } catch (err: any) {
    console.error('[Credits API] Failed to fetch user credits:', err);
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { uid } = body;

    if (!uid) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 });
    }

    await adminDb.collection('profiles').doc(uid).set({
      aiCredits: CreditManager.FREE_TIER_DAILY_CREDITS,
      lastCreditReset: Date.now()
    }, { merge: true });

    return NextResponse.json({ 
      success: true, 
      credits: CreditManager.FREE_TIER_DAILY_CREDITS,
      hoursUntilReset: 24,
      isUnlimited: false
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to reset credits' }, { status: 500 });
  }
}
