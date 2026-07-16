'use client';

import { useState } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';

export default function EmailVerificationWall({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
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

  // If the user doesn't need verification, just render the children
  if (!user || user.provider !== 'email' || user.emailVerified) {
    return <>{children}</>;
  }

  // Otherwise, show the verification wall
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
