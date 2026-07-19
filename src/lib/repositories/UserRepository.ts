import { db } from '../firebase';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { EvidenceNode } from '../services/EvidenceEngine';

export interface UserGoals {
  primaryGoal: string;
  targetDegree: 'Bachelors' | 'Masters' | 'PhD' | 'Postdoc' | 'Other';
  targetCountries: string[];
  targetFields: string[];
}

export interface UserPreferences {
  fundingPreference: 'Fully Funded' | 'Partial' | 'Self Funded';
  notifications: boolean;
  weeklyDigest: boolean;
  shareData: boolean;
}

export interface UserProfileData {
  name: string;
  email: string;
  // Deprecated flat fields:
  country?: string;
  education?: string;
  gpa?: string;
  field?: string;
  skills?: string;
  ielts?: string;
  
  // New Strict Domains
  goals?: UserGoals;
  preferences?: UserPreferences;
  verifiedEvidence?: EvidenceNode[];
  aiCredits?: number;
  
  [key: string]: any;
}

export class UserRepository {
  static async getProfile(uid: string): Promise<UserProfileData | null> {
    try {
      const docRef = doc(db, 'users', uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return docSnap.data() as UserProfileData;
      }
      return null;
    } catch (e: any) {
      console.error("[UserRepository] getProfile failed:", e);
      if (e.code === 'unavailable' || e.message?.includes('offline')) {
        console.warn("[UserRepository] Client is offline. Returning null profile temporarily.");
        return null;
      }
      throw e;
    }
  }

  static async saveProfile(uid: string, profile: Partial<UserProfileData>): Promise<void> {
    try {
      const docRef = doc(db, 'users', uid);
      // We use setDoc with merge: true for an idempotent, offline-capable write.
      // This avoids the 'getDoc' offline connection issues that were crashing the UI.
      await setDoc(docRef, { ...profile, userId: uid }, { merge: true });
    } catch (e: any) {
      console.error("[UserRepository] saveProfile failed:", e);
      // Graceful error handling for the offline scenario instead of throwing and crashing context
      if (e.code === 'unavailable' || e.message?.includes('offline')) {
        console.warn("[UserRepository] Client is offline. Changes will sync when reconnected.");
        // We do not throw here, allowing optimistic UI to persist.
      } else {
        throw e;
      }
    }
  }
}
