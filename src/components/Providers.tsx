'use client';

import { AuthProvider } from '@/components/auth/AuthProvider';
import { ProfileProvider } from '@/components/auth/ProfileContext';
import { SubscriptionProvider } from '@/components/auth/SubscriptionContext';
import { PipelineProvider } from '@/components/auth/PipelineContext';
import { GlobalUpgradeModal } from '@/components/pricing/GlobalUpgradeModal';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <ProfileProvider>
        <SubscriptionProvider>
            <PipelineProvider>
              {children}
              <GlobalUpgradeModal />
            </PipelineProvider>
        </SubscriptionProvider>
      </ProfileProvider>
    </AuthProvider>
  );
}
