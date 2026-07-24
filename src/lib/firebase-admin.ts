import dns from 'dns';
if (dns.setDefaultResultOrder) {
  dns.setDefaultResultOrder('ipv4first');
}
import * as admin from 'firebase-admin';

if (!admin.apps.length) {
  const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

  if (serviceAccountKey) {
    // Preferred path: full service-account credentials. Required for verifying
    // ID tokens and performing privileged writes in production.
    try {
      admin.initializeApp({
        credential: admin.credential.cert(JSON.parse(serviceAccountKey)),
      });
      console.log('Firebase Admin initialized with service account.');
    } catch (error) {
      // A malformed key is a hard configuration error — never swallow it.
      console.error('Firebase Admin: FIREBASE_SERVICE_ACCOUNT_KEY is present but invalid.', error);
      throw new Error('Invalid FIREBASE_SERVICE_ACCOUNT_KEY: could not initialize Firebase Admin.');
    }
  } else if (process.env.NODE_ENV === 'production') {
    // In production, running without real credentials means token verification
    // and privileged writes are unreliable. Fail fast rather than degrade silently.
    throw new Error(
      'Firebase Admin credentials missing in production. Set FIREBASE_SERVICE_ACCOUNT_KEY.'
    );
  } else {
    // Local/dev fallback: allow emulator/project-id-only init so developers can
    // run without a service-account key. Not used in production (guarded above).
    console.warn(
      'Firebase Admin initializing without a service account (dev only). ' +
      'Token verification may be limited. Set FIREBASE_SERVICE_ACCOUNT_KEY for full functionality.'
    );
    admin.initializeApp({
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'opportunityos-ai',
    });
  }
}

export const adminDb = admin.firestore();
export const adminAuth = admin.auth();
export const adminStorage = admin.storage();
