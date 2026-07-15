'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { SubscriptionService } from '@/lib/services/SubscriptionService';
import { SubscriptionRecord } from '@/lib/repositories/SubscriptionRepository';

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

  const loadSubscription = async () => {
    if (authLoading) return;
    if (!isAuthenticated || !user?.uid) {
      setSubscription(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const data = await SubscriptionService.getSubscription(user.uid);
      setSubscription(data);
    } catch (err: any) {
      console.error('Failed to load subscription:', err);
      setError('Failed to load subscription.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSubscription();
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
    <SubscriptionContext.Provider value={{ subscription, isLoading: isLoading || authLoading, error, updateSubscription, reloadSubscription: loadSubscription }}>
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
