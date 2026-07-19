'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { SubscriptionService } from '@/lib/services/SubscriptionService';
import { SubscriptionRecord } from '@/lib/repositories/SubscriptionRepository';
import { db } from '@/lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';

interface SubscriptionContextType {
  subscription: SubscriptionRecord | null;
  isLoading: boolean;
  error: string | null;
  updateSubscription: (updates: Partial<SubscriptionRecord>) => Promise<void>;
  reloadSubscription: () => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [subscription, setSubscription] = useState<SubscriptionRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated || !user?.uid) {
      setSubscription(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    const unsub = onSnapshot(
      doc(db, 'subscriptions', user.uid),
      (docSnap) => {
        if (docSnap.exists()) {
          setSubscription(docSnap.data() as SubscriptionRecord);
        } else {
          // No subscription doc yet, could default to null or free
          setSubscription(null);
        }
        setIsLoading(false);
      },
      (err) => {
        console.error('Failed to listen to subscription:', err);
        setError('Failed to load subscription.');
        setIsLoading(false);
      }
    );

    return () => unsub();
  }, [user, isAuthenticated, authLoading]);

  const updateSubscription = async (updates: Partial<SubscriptionRecord>) => {
    if (!user?.uid || !subscription) return;
    const newSubscription = { ...subscription, ...updates };
    setSubscription(newSubscription); // optimistic update
    try {
      await SubscriptionService.saveSubscription(user.uid, newSubscription);
    } catch (err: any) {
      console.error('Failed to save subscription:', err);
      setError('Failed to save subscription.');
      // rollback
      setSubscription(subscription);
    }
  };

  return (
    <SubscriptionContext.Provider value={{ subscription, isLoading: isLoading || authLoading, error, updateSubscription, reloadSubscription: async () => {} }}>
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  const context = useContext(SubscriptionContext);
  if (context === undefined) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return context;
}
