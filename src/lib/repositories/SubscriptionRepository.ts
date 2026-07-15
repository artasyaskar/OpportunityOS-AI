import { db } from '../firebase';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';

export interface SubscriptionRecord {
  planId: string;
  status: 'FREE' | 'CHECKOUT_STARTED' | 'PAYMENT_PENDING' | 'UNDER_REVIEW' | 'APPROVED' | 'ACTIVE' | 'EXPIRED' | 'CANCELLED' | 'REFUNDED' | 'REJECTED' | 'LIFETIME' | 'ENTERPRISE';
  startedAt: string;
  expiresAt?: string;
  paymentReference?: string;
  paymentProofUrl?: string;
  paymentProvider?: string;
  promoCode?: string;
}

export class SubscriptionRepository {
  static async getSubscription(uid: string): Promise<SubscriptionRecord | null> {
    const docRef = doc(db, 'subscriptions', uid);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data() as SubscriptionRecord;
    }
    return null;
  }

  static async saveSubscription(uid: string, subscription: SubscriptionRecord): Promise<void> {
    const docRef = doc(db, 'subscriptions', uid);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      await updateDoc(docRef, { ...subscription });
    } else {
      await setDoc(docRef, { ...subscription, userId: uid }, { merge: true });
    }
  }
}
