// Firebase configuration and initialization
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore, getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'demo-api-key',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || 'opportunityos-ai.firebaseapp.com',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'opportunityos-ai',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'opportunityos-ai.appspot.com',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '917369350876',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '1:917369350876:web:b10de25c6eb9ae29372219',
};

// Initialize Firebase (avoid duplicate initialization)
const isNewApp = getApps().length === 0;
const app = isNewApp ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(app);

// Initialize Firestore with auto-detected long-polling. The default WebChannel
// transport fails on many networks (corporate proxies, VPNs, some mobile carriers)
// with "WebChannelConnection RPC 'Listen' stream transport errored". Auto-detecting
// long-polling lets the SDK fall back gracefully instead of erroring out.
// initializeFirestore must run before any getFirestore() call, so it is guarded to
// the first app initialization; subsequent imports reuse the existing instance.
export const db = isNewApp
  ? initializeFirestore(app, { experimentalAutoDetectLongPolling: true })
  : getFirestore(app);

export const storage = getStorage(app);
export default app;
