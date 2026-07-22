import { NextRequest, NextResponse } from 'next/server';
import { adminDb, adminAuth } from '@/lib/firebase-admin';
import { PRICING_PLANS } from '@/lib/pricing';

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized: Missing token' }, { status: 401 });
    }
    const token = authHeader.split('Bearer ')[1];
    
    let decodedToken;
    try {
      decodedToken = await adminAuth.verifyIdToken(token);
    } catch (e) {
      return NextResponse.json({ error: 'Unauthorized: Invalid token' }, { status: 401 });
    }

    if (decodedToken.email !== 'artasyaskar@gmail.com') {
      return NextResponse.json({ error: 'Forbidden: Admin access only' }, { status: 403 });
    }

    const body = await req.json();
    const { userId, planId, userEmail, userName } = body;

    if (!userId || !planId) {
      return NextResponse.json({ error: 'Missing userId or planId' }, { status: 400 });
    }

    const plan = PRICING_PLANS.find(p => p.id === planId);
    if (!plan) {
      return NextResponse.json({ error: 'Invalid planId' }, { status: 400 });
    }

    const now = new Date().toISOString();

    // Update Subscription Document natively
    await adminDb.collection('subscriptions').doc(userId).set({
      planId: planId,
      status: 'ACTIVE',
      startedAt: now,
    }, { merge: true });

    // Create an APPROVED payment request so it adds to authentic revenue metrics instantly
    await adminDb.collection('payment_requests').add({
      uid: userId,
      userEmail: userEmail || 'Unknown',
      userName: userName || 'Unknown',
      planId: planId,
      status: 'APPROVED',
      provider: 'admin_grant',
      paymentReference: 'MANUAL_GRANT',
      submittedAt: now,
      reviewedAt: now,
      adminNotes: 'Ad-hoc grant by administrator.'
    });

    return NextResponse.json({ success: true, message: `Successfully granted ${plan.name} to ${userEmail || userId}` });
  } catch (error: any) {
    console.error('Grant Plan API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
