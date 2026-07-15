import * as admin from 'firebase-admin';

if (!admin.apps.length) {
  try {
    // Attempt to initialize from FIREBASE_SERVICE_ACCOUNT_KEY env var if it exists
    const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    if (serviceAccountKey) {
      admin.initializeApp({
        credential: admin.credential.cert(JSON.parse(serviceAccountKey)),
      });
    } else {
      // Fallback: Initialize with default credentials or just projectId if emulated
      admin.initializeApp({
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'opportunityos-ai',
      });
    }
    console.log('Firebase Admin initialized successfully.');
  } catch (error) {
    console.error('Firebase Admin initialization error', error);
  }
}

export const adminDb = admin.firestore();
export const adminAuth = admin.auth();
export const adminStorage = admin.storage();
