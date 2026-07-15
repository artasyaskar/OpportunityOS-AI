export type SubscriptionState = 
  | 'FREE' 
  | 'PENDING_PAYMENT' 
  | 'UNDER_REVIEW' 
  | 'ACTIVE' 
  | 'EXPIRED' 
  | 'CANCELLED' 
  | 'LIFETIME' 
  | 'ENTERPRISE';

export interface SubscriptionRecord {
  state: SubscriptionState;
  planId: string;
  startDate: string;
  endDate: string | null;
  paymentReference: string | null;
  paymentProofUrl: string | null;
  paymentProvider: string | null;
  promoCode: string | null;
}

export const DEFAULT_SUB: SubscriptionRecord = {
  state: 'FREE',
  planId: 'free',
  startDate: new Date().toISOString(),
  endDate: null,
  paymentReference: null,
  paymentProofUrl: null,
  paymentProvider: null,
  promoCode: null,
};

// Subscription manipulation logic has been migrated to src/hooks/useUserData.ts and src/lib/db.ts
// This file only maintains the Types and Defaults.

