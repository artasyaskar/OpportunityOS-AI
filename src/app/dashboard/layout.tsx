'use client';

import Sidebar from '@/components/layout/Sidebar';
import ExecutiveAdvisorWidget from '@/components/ui/ExecutiveAdvisorWidget';
import DashboardHeader from '@/components/layout/DashboardHeader';
import ExpiredPlanBanner from '@/components/subscription/ExpiredPlanBanner';
import ProtectedRoute from '@/components/auth/ProtectedRoute';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      <div className="dashboard-layout">
        <Sidebar />
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
          <DashboardHeader />
          <ExpiredPlanBanner />
          <main className="dashboard-content" style={{ flex: 1, overflowY: 'auto' }}>{children}</main>
        </div>
        <ExecutiveAdvisorWidget />
      </div>
    </ProtectedRoute>
  );
}
