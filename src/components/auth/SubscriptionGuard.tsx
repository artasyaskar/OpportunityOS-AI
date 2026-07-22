'use client';

import React from 'react';
import { useSubscription } from './SubscriptionContext';
import Link from 'next/link';
import { Lock } from 'lucide-react';

interface SubscriptionGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  requiredPlan?: 'pro' | 'enterprise'; // if undefined, requires any active paid plan
}

export function SubscriptionGuard({ children, fallback, requiredPlan }: SubscriptionGuardProps) {
  const { subscription, isLoading } = useSubscription();

  if (isLoading) {
    return <div className="animate-pulse glass-panel p-4 rounded-lg">Loading...</div>;
  }

  const isFree = !subscription || subscription.status === 'FREE' || subscription.planId === 'free';
  const hasAccess = !isFree; // Expand logic here if we have multiple paid tiers

  if (!hasAccess) {
    if (fallback) return <>{fallback}</>;

    return (
      <div className="card-magnetic glow-border" style={{ padding: '32px', textAlign: 'center', background: 'rgba(99,102,241,0.05)', border: '1px solid rgba(99,102,241,0.2)' }}>
        <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'white', marginBottom: '12px' }}>
          <Lock size={18} className="inline mr-2" /> Premium Feature Locked
        </h3>
        <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.7)', marginBottom: '24px', maxWidth: '400px', margin: '0 auto 24px' }}>
          Upgrade to OpportunityOS Pro to unlock the AI Application Builder, advanced analytics, and unlimited opportunity tracking.
        </p>
        <Link href="/dashboard/settings/billing" className="btn btn-primary" style={{ display: 'inline-flex', padding: '12px 24px' }}>
          Upgrade to Pro
        </Link>
      </div>
    );
  }

  return <>{children}</>;
}
