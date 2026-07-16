'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/components/auth/AuthProvider';
import { useProfile } from '@/components/auth/ProfileContext';
import EmailVerificationWall from '@/components/auth/EmailVerificationWall';

// ─────────────────────────────────────────────
// Loading Spinner
// ─────────────────────────────────────────────

function AuthLoadingScreen() {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: '#020408',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '24px',
        zIndex: 99999,
      }}
    >
      <div
        style={{
          width: '48px',
          height: '48px',
          border: '3px solid rgba(99,102,241,0.2)',
          borderTopColor: '#6366f1',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
        }}
      />
      <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '14px', fontFamily: 'Inter, sans-serif' }}>
        Verifying session...
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}


interface ProtectedRouteProps {
  children: React.ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { profile, isLoading: isProfileLoading } = useProfile();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      // Store the intended destination so we can redirect after login
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('oos_redirect_after_login', pathname);
      }
      router.replace('/login');
    } else if (!isLoading && isAuthenticated && !isProfileLoading) {
      if (!profile && pathname !== '/onboarding') {
        router.replace('/onboarding');
      }
    }
  }, [isLoading, isAuthenticated, isProfileLoading, profile, router, pathname]);

  // Still checking auth state
  if (isLoading || (isAuthenticated && isProfileLoading)) {
    return <AuthLoadingScreen />;
  }

  // Not authenticated — will redirect via the effect above
  if (!isAuthenticated || !user) {
    return <AuthLoadingScreen />;
  }

  return (
    <EmailVerificationWall>
      <div>
        {children}
      </div>
    </EmailVerificationWall>
  );
}
