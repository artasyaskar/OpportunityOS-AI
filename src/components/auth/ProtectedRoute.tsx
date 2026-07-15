'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/components/auth/AuthProvider';

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
  const router = useRouter();
  const pathname = usePathname();
  const [isResending, setIsResending] = useState(false);
  const [resendMessage, setResendMessage] = useState('');

  const handleResend = async () => {
    import('@/lib/firebase').then(({ auth }) => {
      import('firebase/auth').then(({ sendEmailVerification }) => {
        if (!auth.currentUser) return;
        setIsResending(true);
        setResendMessage('');
        sendEmailVerification(auth.currentUser).then(() => {
          setResendMessage('Verification email sent! Please check your spam folder.');
          setIsResending(false);
        }).catch((error: any) => {
          if (error.code === 'auth/too-many-requests') {
            setResendMessage('Too many requests. Please wait a moment and try again.');
          } else {
            setResendMessage(error.message);
          }
          setIsResending(false);
        });
      });
    });
  };

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      // Store the intended destination so we can redirect after login
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('oos_redirect_after_login', pathname);
      }
      router.replace('/login');
    }
  }, [isLoading, isAuthenticated, router, pathname]);

  // Still checking auth state
  if (isLoading) {
    return <AuthLoadingScreen />;
  }

  // Not authenticated — will redirect via the effect above
  if (!isAuthenticated || !user) {
    return <AuthLoadingScreen />;
  }

  // Enforce Email Verification Wall for email users
  if (user.provider === 'email' && !user.emailVerified) {
    return (
      <div style={{
        minHeight: '100vh', background: '#020408', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px'
      }}>
        <div className="card-magnetic" style={{ maxWidth: '440px', width: '100%', padding: '40px 32px', textAlign: 'center' }}>
          <span style={{ fontSize: '48px', marginBottom: '16px', display: 'block' }}>✉️</span>
          <h2 style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '24px', fontWeight: 800, color: 'white', marginBottom: '12px' }}>
            Verify Your Email
          </h2>
          <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.6)', lineHeight: 1.5, marginBottom: '32px' }}>
            To protect your API limits and secure your account, please click the verification link we sent to <strong style={{ color: 'white' }}>{user.email}</strong>.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <button 
              onClick={() => window.location.reload()}
              className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}
            >
              I Have Verified My Email
            </button>
            <button 
              onClick={handleResend}
              disabled={isResending}
              className="btn btn-secondary" style={{ width: '100%', justifyContent: 'center' }}
            >
              {isResending ? 'Sending...' : 'Resend Email'}
            </button>
            {resendMessage && (
              <p style={{ fontSize: '13px', color: '#10b981', marginTop: '8px', textAlign: 'center' }}>
                {resendMessage}
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div>
        {children}
      </div>
    </>
  );
}
