import { db } from '../firebase';
import { collection, doc, getDoc, getDocs, query, where, setDoc, updateDoc, orderBy, serverTimestamp, runTransaction } from 'firebase/firestore';

export enum PaymentStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED'
}

export enum PaymentProvider {
  MANUAL = 'manual',
  STRIPE = 'stripe',
  LEMONSQUEEZY = 'lemonsqueezy',
  PADDLE = 'paddle',
  EASYPAISA = 'easypaisa',
  JAZZCASH = 'jazzcash'
}

export interface PaymentRequest {
  id: string; // Document ID
  uid: string;
  userEmail: string;
  userName: string;
  planId: string;
  amount?: number;
  currency?: string;
  provider: PaymentProvider | string;
  paymentReference?: string;
  paymentProofUrl?: string;
  status: PaymentStatus;
  submittedAt: string | number; // ISO string or timestamp
  reviewedAt?: string | number;
  adminNotes?: string;
  rejectReason?: string;
  promoCode?: string;
}

export class PaymentRequestRepository {
  static async createRequest(requestData: Omit<PaymentRequest, 'id' | 'status' | 'submittedAt'>): Promise<string> {
    const reqRef = doc(collection(db, 'payment_requests'));
    const newRequest: PaymentRequest = {
      ...requestData,
      id: reqRef.id,
      status: PaymentStatus.PENDING,
      submittedAt: new Date().toISOString()
    };
    
    // Firestore does not allow undefined values. Remove them.
    const sanitizedData = Object.fromEntries(
      Object.entries(newRequest).filter(([_, v]) => v !== undefined)
    );
    
    await setDoc(reqRef, sanitizedData);
    return reqRef.id;
  }

  static async getUserRequests(uid: string): Promise<PaymentRequest[]> {
    const q = query(
      collection(db, 'payment_requests'), 
      where('uid', '==', uid)
    );
    const snap = await getDocs(q);
    const results = snap.docs.map(d => ({ ...d.data(), id: d.id } as PaymentRequest));
    results.sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
    return results;
  }

  static async getPendingRequests(): Promise<PaymentRequest[]> {
    const q = query(
      collection(db, 'payment_requests'),
      where('status', '==', PaymentStatus.PENDING)
    );
    const snap = await getDocs(q);
    const results = snap.docs.map(d => ({ ...d.data(), id: d.id } as PaymentRequest));
    results.sort((a, b) => new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime());
    return results;
  }

  static async getAllRequests(): Promise<PaymentRequest[]> {
    const q = query(collection(db, 'payment_requests'));
    const snap = await getDocs(q);
    const results = snap.docs.map(d => ({ ...d.data(), id: d.id } as PaymentRequest));
    results.sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
    return results;
  }

  static async hasPendingRequest(uid: string): Promise<boolean> {
    const q = query(
      collection(db, 'payment_requests'), 
      where('uid', '==', uid),
      where('status', '==', PaymentStatus.PENDING)
    );
    const snap = await getDocs(q);
    return !snap.empty;
  }

  static async approvePaymentRequest(reqId: string, adminNotes?: string): Promise<void> {
    const reqRef = doc(db, 'payment_requests', reqId);
    
    await runTransaction(db, async (transaction) => {
      const reqDoc = await transaction.get(reqRef);
      if (!reqDoc.exists()) throw new Error('Payment Request not found');
      
      const data = reqDoc.data() as PaymentRequest;
      if (data.status !== PaymentStatus.PENDING) throw new Error('Payment Request is not pending');

      const uid = data.uid;
      const subRef = doc(db, 'subscriptions', uid);
      const subDoc = await transaction.get(subRef);
      
      const isLifetime = data.planId === 'founder_lifetime';
      let endDate: string | null = null;
      if (!isLifetime) {
        const end = new Date();
        if (data.planId.endsWith('yearly')) {
          end.setFullYear(end.getFullYear() + 1);
        } else {
          end.setMonth(end.getMonth() + 1);
        }
        endDate = end.toISOString();
      }

      // Update Subscription
      transaction.set(subRef, {
        ...(subDoc.exists() ? subDoc.data() : {}),
        planId: data.planId,
        status: isLifetime ? 'LIFETIME' : 'ACTIVE',
        paymentProvider: data.provider,
        paymentReference: data.paymentReference,
        expiresAt: endDate,
        startedAt: new Date().toISOString()
      }, { merge: true });

      // Update Request
      transaction.update(reqRef, {
        status: PaymentStatus.APPROVED,
        reviewedAt: new Date().toISOString(),
        adminNotes: adminNotes || ''
      });

      // Notify User
      const notifRef = doc(collection(db, 'notifications'));
      transaction.set(notifRef, {
        userId: uid,
        title: 'Payment Approved! 🎉',
        message: `Your payment for ${data.planId} has been successfully verified. Welcome to Premium!`,
        type: 'PAYMENT_APPROVED',
        read: false,
        createdAt: new Date().toISOString(),
        link: '/dashboard/settings'
      });

      // Audit Log
      const auditRef = doc(collection(db, 'audit_logs'));
      transaction.set(auditRef, {
        action: 'APPROVE_PAYMENT',
        adminId: 'admin', // or from context
        targetUserId: uid,
        targetRequestId: reqId,
        details: `Approved ${data.planId} for ${uid}`,
        timestamp: new Date().toISOString()
      });
    });
  }

  static async rejectPaymentRequest(reqId: string, reason: string): Promise<void> {
    const reqRef = doc(db, 'payment_requests', reqId);
    
    await runTransaction(db, async (transaction) => {
      const reqDoc = await transaction.get(reqRef);
      if (!reqDoc.exists()) throw new Error('Payment Request not found');
      
      const data = reqDoc.data() as PaymentRequest;
      if (data.status !== PaymentStatus.PENDING) throw new Error('Payment Request is not pending');

      const uid = data.uid;
      const subRef = doc(db, 'subscriptions', uid);
      const subDoc = await transaction.get(subRef);
      
      // Update Subscription (revert to FREE if it was UNDER_REVIEW, else leave alone)
      if (subDoc.exists() && subDoc.data().status === 'UNDER_REVIEW') {
        transaction.update(subRef, {
          status: 'FREE',
          planId: 'free',
          expiresAt: null
        });
      }

      // Update Request
      transaction.update(reqRef, {
        status: PaymentStatus.REJECTED,
        reviewedAt: new Date().toISOString(),
        rejectReason: reason
      });

      // Notify User
      const notifRef = doc(collection(db, 'notifications'));
      transaction.set(notifRef, {
        userId: uid,
        title: 'Payment Verification Failed',
        message: `Your recent payment upload was rejected. Reason: ${reason}. Please upload a valid receipt.`,
        type: 'PAYMENT_REJECTED',
        read: false,
        createdAt: new Date().toISOString(),
        link: '/dashboard/settings'
      });

      // Audit Log
      const auditRef = doc(collection(db, 'audit_logs'));
      transaction.set(auditRef, {
        action: 'REJECT_PAYMENT',
        adminId: 'admin', // or from context
        targetUserId: uid,
        targetRequestId: reqId,
        details: `Rejected payment for ${uid}. Reason: ${reason}`,
        timestamp: new Date().toISOString()
      });
    });
  }
}
