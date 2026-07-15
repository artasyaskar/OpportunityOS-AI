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
    const docRef = doc(db, 'profiles', uid);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data() as UserProfileData;
    }
    return null;
  }

  static async saveProfile(uid: string, profile: Partial<UserProfileData>): Promise<void> {
    const docRef = doc(db, 'profiles', uid);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      await updateDoc(docRef, profile);
    } else {
      await setDoc(docRef, { aiCredits: 500, ...profile, userId: uid }, { merge: true });
    }
  }
}
