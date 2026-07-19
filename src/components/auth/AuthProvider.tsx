'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { auth } from '@/lib/firebase';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  sendPasswordResetEmail,
  sendEmailVerification,
  updateProfile,
  signOut,
  User as FirebaseUser,
} from 'firebase/auth';
import { db } from '@/lib/firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

export type AuthMode = 'production' | 'development';

export interface AppUser {
  uid: string;
  email: string | null;
  emailVerified: boolean;
  displayName: string | null;
  photoURL: string | null;
  provider: 'google' | 'email';
  firebaseUser: FirebaseUser | null;
}

interface AuthContextType {
  user: AppUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  authMode: AuthMode;
  error: string | null;
  // Actions
  loginWithEmail: (email: string, password: string) => Promise<void>;
  signupWithEmail: (email: string, password: string, name: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;

  resetPassword: (email: string) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
  getIdToken: (forceRefresh?: boolean) => Promise<string>;
}

// ─────────────────────────────────────────────
// Context
// ─────────────────────────────────────────────

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ─────────────────────────────────────────────
// Helper: convert Firebase User → AppUser
// ─────────────────────────────────────────────

function firebaseUserToAppUser(fbUser: FirebaseUser): AppUser {
  const providerData = fbUser.providerData[0];
  const provider = providerData?.providerId === 'google.com' ? 'google' : 'email';

  return {
    uid: fbUser.uid,
    email: fbUser.email,
    emailVerified: fbUser.emailVerified,
    displayName: fbUser.displayName,
    photoURL: fbUser.photoURL,
    provider,
    firebaseUser: fbUser,
  };
}

// ─────────────────────────────────────────────
// Helper: Friendly error messages
// ─────────────────────────────────────────────

function getFriendlyError(err: unknown): string {
  const code = (err as any)?.code || (err as any)?.message || '';
  if (code.includes('user-not-found')) return 'No account found with that email address.';
  if (code.includes('wrong-password') || code.includes('invalid-credential')) return 'Incorrect password. Please try again.';
  if (code.includes('invalid-email')) return 'Please enter a valid email address.';
  if (code.includes('too-many-requests')) return 'Too many attempts. Please try again later.';
  if (code.includes('email-already-in-use')) return 'An account already exists with this email.';
  if (code.includes('weak-password')) return 'Password is too weak. Please use at least 6 characters.';
  if (code.includes('popup-closed-by-user')) return 'Google sign-in was cancelled.';
  if (code.includes('network-request-failed')) return 'Network error. Please check your connection.';
  return 'An unexpected error occurred. Please try again.';
}

// ─────────────────────────────────────────────
// Determine auth mode from environment
// ─────────────────────────────────────────────

function getAuthMode(): AuthMode {
  const demoMode = process.env.NEXT_PUBLIC_DEMO_MODE;
  const hasFirebaseKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY
    && process.env.NEXT_PUBLIC_FIREBASE_API_KEY !== 'demo-api-key';

  if (!hasFirebaseKey) return 'development';
  return 'production';
}

function updateTelemetry(event: 'signup' | 'signin') {
  if (typeof window === 'undefined') return;
  try {
    const data = JSON.parse(localStorage.getItem('admin_telemetry') || '{"totalUsers":0,"paidUsers":0,"totalRevenue":0,"signIns":0,"signUps":0}');
    if (event === 'signup') {
      data.signUps = (data.signUps || 0) + 1;
      data.totalUsers = (data.totalUsers || 0) + 1;
    } else {
      data.signIns = (data.signIns || 0) + 1;
    }
    localStorage.setItem('admin_telemetry', JSON.stringify(data));
  } catch(e) {}
}

// ─────────────────────────────────────────────
// Provider Component
// ─────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const authMode = getAuthMode();

  // Listen to Firebase auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUserToAppUser(firebaseUser));
      } else {
        setUser(null);
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // ── Actions ──

  const loginWithEmail = useCallback(async (email: string, password: string) => {
    setError(null);
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      setUser(firebaseUserToAppUser(cred.user));
      updateTelemetry('signin');
    } catch (err) {
      const msg = getFriendlyError(err);
      setError(msg);
      throw new Error(msg);
    }
  }, []);

  const signupWithEmail = useCallback(async (email: string, password: string, name: string) => {
    setError(null);
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(cred.user, { displayName: name });
      await sendEmailVerification(cred.user);
      
      // Assign a Free 'Hackathon Pro Trial' to demonstrate the business model authentically
      const subRef = doc(db, 'subscriptions', cred.user.uid);
      await setDoc(subRef, {
        state: 'TRIAL',
        planId: 'hackathon_pro_trial',
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(), // 14-day trial
        paymentProvider: 'trial_grant'
      }, { merge: true });

      setUser(firebaseUserToAppUser(cred.user));
      updateTelemetry('signup');
    } catch (err) {
      const msg = getFriendlyError(err);
      setError(msg);
      throw new Error(msg);
    }
  }, []);

  const loginWithGoogle = useCallback(async () => {
    setError(null);
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      
      // Assign a Free 'Hackathon Pro Trial' to demonstrate the business model authentically
      const subRef = doc(db, 'subscriptions', result.user.uid);
      await setDoc(subRef, {
        state: 'TRIAL',
        planId: 'hackathon_pro_trial',
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
        paymentProvider: 'trial_grant'
      }, { merge: true });

      setUser(firebaseUserToAppUser(result.user));
      updateTelemetry('signin'); // Treating Google popup as a sign in for simplicity
    } catch (err) {
      const msg = getFriendlyError(err);
      setError(msg);
      throw new Error(msg);
    }
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    setError(null);
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (err) {
      const msg = getFriendlyError(err);
      setError(msg);
      throw new Error(msg);
    }
  }, []);

  const logout = useCallback(async () => {
    setError(null);
    try {
      await signOut(auth);
      setUser(null);
    } catch (err) {
      console.error('Logout failed:', err);
    }
  }, []);

  const clearError = useCallback(() => setError(null), []);

  const getIdToken = useCallback(async (forceRefresh?: boolean) => {
    if (!auth.currentUser) throw new Error('No user signed in');
    return await auth.currentUser.getIdToken(forceRefresh);
  }, []);

  const value: AuthContextType = {
    user,
    isAuthenticated: user !== null,
    isLoading,
    authMode,
    error,
    loginWithEmail,
    signupWithEmail,
    loginWithGoogle,
    resetPassword,
    logout,
    clearError,
    getIdToken,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ─────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
