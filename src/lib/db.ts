import { db } from './firebase';
import { doc, getDoc, setDoc, updateDoc, collection, getDocs, deleteDoc } from 'firebase/firestore';

export interface UserProfileData {
  name: string;
  email: string;
  country: string;
  education: string;
  gpa: string;
  field: string;
  skills: string;
  ielts?: string;
  notifications?: boolean;
  weeklyDigest?: boolean;
  shareData?: boolean;
  [key: string]: any;
}

export interface ApplicationData {
  id: string;
  opportunityId: string;
  status: string;
  progress: number;
  lastEdited: string;
  title: string;
  deadline?: string;
  requirements?: string[];
  answers?: Record<string, string>;
  documents?: Record<string, string>;
  tasks?: any[];
  [key: string]: any;
}

// ─────────────────────────────────────────────
// Profile Methods
// ─────────────────────────────────────────────

export async function fetchUserProfile(uid: string): Promise<UserProfileData | null> {
  const docRef = doc(db, 'profiles', uid);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    return docSnap.data() as UserProfileData;
  }
  return null;
}

export async function saveUserProfile(uid: string, profile: Partial<UserProfileData>): Promise<void> {
  const docRef = doc(db, 'profiles', uid);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    await updateDoc(docRef, profile);
  } else {
    await setDoc(docRef, profile);
  }
}

// ─────────────────────────────────────────────
// Applications Methods
// ─────────────────────────────────────────────

import { query, where } from 'firebase/firestore';

export async function fetchUserApplications(uid: string): Promise<ApplicationData[]> {
  const appsRef = collection(db, 'applications');
  const q = query(appsRef, where('userId', '==', uid));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ ...d.data(), id: d.id } as ApplicationData));
}

export async function saveUserApplication(uid: string, app: ApplicationData): Promise<void> {
  const appRef = doc(db, 'applications', app.id);
  await setDoc(appRef, { ...app, userId: uid }, { merge: true });
}

export async function deleteUserApplication(uid: string, appId: string): Promise<void> {
  const appRef = doc(db, 'applications', appId);
  await deleteDoc(appRef);
}

// Convenience method to save multiple at once (migration/bulk updates)
export async function saveUserApplicationsBulk(uid: string, apps: ApplicationData[]): Promise<void> {
  for (const app of apps) {
    await saveUserApplication(uid, app);
  }
}

// ─────────────────────────────────────────────
// Subscription Methods
// ─────────────────────────────────────────────

import { SubscriptionRecord } from './subscription';
import { PaymentMerchantConfig, DEFAULT_MERCHANTS } from './paymentAdapter';
import { storage } from './firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

export async function fetchUserSubscription(uid: string): Promise<SubscriptionRecord | null> {
  const docRef = doc(db, 'subscriptions', uid);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    return docSnap.data() as SubscriptionRecord;
  }
  return null;
}

export async function saveUserSubscription(uid: string, subscription: Partial<SubscriptionRecord>): Promise<void> {
  const docRef = doc(db, 'subscriptions', uid);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    await updateDoc(docRef, subscription);
  } else {
    await setDoc(docRef, { ...subscription, userId: uid });
  }
}

export async function fetchPaymentMerchants(): Promise<PaymentMerchantConfig[]> {
  const docRef = doc(db, 'app_config', 'payment_merchants');
  const docSnap = await getDoc(docRef);
  if (docSnap.exists() && docSnap.data().merchants) {
    return docSnap.data().merchants as PaymentMerchantConfig[];
  }
  return DEFAULT_MERCHANTS;
}

// Re-export query / where (imported above)

export async function uploadPaymentReceipt(uid: string, file: File): Promise<string> {
  // Use Base64 encoding to store directly in Firestore, bypassing Firebase Storage
  // which requires a paid plan or tedious setup.
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
    reader.readAsDataURL(file);
  });
}

export async function fetchPendingSubscriptions(): Promise<{uid: string, sub: SubscriptionRecord}[]> {
  const subsRef = collection(db, 'subscriptions');
  const q = query(subsRef, where('state', '==', 'UNDER_REVIEW'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ uid: d.data().userId || d.id, sub: d.data() as SubscriptionRecord }));
}

export async function adminApproveSubscription(uid: string, currentSub: SubscriptionRecord): Promise<void> {
  const isLifetime = currentSub.planId === 'founder_lifetime';
  let endDate: string | null = null;
  if (!isLifetime) {
    const end = new Date();
    if (currentSub.planId.endsWith('yearly')) {
      end.setFullYear(end.getFullYear() + 1);
    } else {
      end.setMonth(end.getMonth() + 1);
    }
    endDate = end.toISOString();
  }
  
  await saveUserSubscription(uid, {
    ...currentSub,
    state: isLifetime ? 'LIFETIME' : 'ACTIVE',
    endDate
  });
}

export async function adminRejectSubscription(uid: string): Promise<void> {
  await saveUserSubscription(uid, {
    state: 'FREE',
    planId: 'free',
    endDate: null,
  });
}

export async function adminUpdateMerchants(configs: PaymentMerchantConfig[]): Promise<void> {
  const docRef = doc(db, 'app_config', 'payment_merchants');
  await setDoc(docRef, { merchants: configs });
}
