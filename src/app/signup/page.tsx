'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth/AuthProvider';
import { useProfile } from '@/components/auth/ProfileContext';
import AuthModal from '@/components/auth/AuthModal';
import Toast, { ToastType } from '@/components/auth/Toast';

export default function SignupPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'terms' | 'privacy'>('terms');
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [toastType, setToastType] = useState<ToastType>('success');

  const router = useRouter();
  const { signupWithEmail, loginWithGoogle, isAuthenticated, authMode } = useAuth();
  const { profile, isLoading: isProfileLoading } = useProfile();

  // If already authenticated, redirect
  useEffect(() => {
    if (isAuthenticated && !isProfileLoading) {
      if (!profile) {
        router.replace('/onboarding');
      } else {
        const redirect = sessionStorage.getItem('oos_redirect_after_login') || '/dashboard';
        sessionStorage.removeItem('oos_redirect_after_login');
        router.replace(redirect);
      }
    }
  }, [isAuthenticated, isProfileLoading, profile, router]);

  const showToast = (msg: string, type: ToastType) => {
    setToastMsg(msg);
    setToastType(type);
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    
    // Check strength
    const hasUpper = /[A-Z]/.test(password);
    const hasNum = /[0-9]/.test(password);
    const hasSym = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    if (password.length < 8 || !hasUpper || !hasNum || !hasSym) {
      setError('Password must be at least 8 characters and include uppercase, number, and symbol.');
      return;
    }

    setLoading(true);
    try {
      await signupWithEmail(email, password, name);
      // Redirect happens via the useEffect above when isAuthenticated becomes true
    } catch (err: unknown) {
      showToast((err as Error).message, 'error');
      // ✅ NO CATCH-BLOCK REDIRECT — failed signup stays on signup page
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setLoading(true);
    try {
      await loginWithGoogle();
      // Redirect happens via the useEffect above when isAuthenticated becomes true
    } catch (err: unknown) {
      showToast((err as Error).message, 'error');
      // ✅ NO CATCH-BLOCK REDIRECT — failed Google signup stays on signup page
    } finally {
      setLoading(false);
    }
  };



  return (
    <>
      <div className="auth-bg-container" />
      <Toast message={toastMsg} type={toastType} onClose={() => setToastMsg(null)} />

      <AuthModal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={modalType === 'terms' ? 'Terms of Service' : 'Privacy Policy'}>
        {modalType === 'terms' ? (
          <div>
            <h3>1. Acceptance of Terms</h3>
            <p style={{ marginBottom: '16px' }}>By accessing and using OpportunityOS AI, you accept and agree to be bound by the terms and provision of this agreement.</p>
            <h3>2. Description of Service</h3>
            <p style={{ marginBottom: '16px' }}>OpportunityOS provides AI-driven career and opportunity matching tools. We do not guarantee acquisition of any opportunity.</p>
            <h3>3. User Conduct</h3>
            <p style={{ marginBottom: '16px' }}>You agree to use our services only for lawful purposes. Any unauthorized automation or scraping of our platform is strictly prohibited.</p>
          </div>
        ) : (
          <div>
            <h3>1. Information We Collect</h3>
            <p style={{ marginBottom: '16px' }}>We collect information you provide directly to us, including but not limited to your name, email address, and uploaded documents.</p>
            <h3>2. How We Use Information</h3>
            <p style={{ marginBottom: '16px' }}>We use the information we collect to provide, maintain, and improve our services, to develop new ones, and to protect OpportunityOS and our users.</p>
            <h3>3. Data Security</h3>
            <p style={{ marginBottom: '16px' }}>We implement appropriate technical and organizational measures to protect your personal data against unauthorized or unlawful processing, accidental loss, destruction or damage.</p>
          </div>
        )}
      </AuthModal>

      <div className="scene">
        <div className="chassis">
          <h1>Get Started Free</h1>

          <button className="btn-google" onClick={handleGoogle} type="button" disabled={loading}>
            <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" /><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" /><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" /><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" /></svg>
            {loading ? 'Connecting...' : 'Continue with Google'}
          </button>



          <div className="separator">or with email</div>

          <form onSubmit={handleSignup}>
            <label>Full Name</label>
            <input
              type="text"
              className="milled-input"
              placeholder="Your full name"
              value={name}
              onChange={e => setName(e.target.value)}
              required
            />

            <label>Email Address</label>
            <input
              type="email"
              className="milled-input"
              placeholder="you@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />

            <label>Password</label>
            <input
              type="password"
              className="milled-input"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />

            {/* Password Strength Indicator */}
            {password.length > 0 && (
              <div style={{ marginTop: '8px', marginBottom: '16px', display: 'flex', gap: '4px' }}>
                <div style={{ height: '4px', flex: 1, borderRadius: '2px', background: password.length >= 8 ? '#10b981' : '#f43f5e' }} />
                <div style={{ height: '4px', flex: 1, borderRadius: '2px', background: /[A-Z]/.test(password) ? '#10b981' : 'rgba(255,255,255,0.1)' }} />
                <div style={{ height: '4px', flex: 1, borderRadius: '2px', background: /[0-9]/.test(password) ? '#10b981' : 'rgba(255,255,255,0.1)' }} />
                <div style={{ height: '4px', flex: 1, borderRadius: '2px', background: /[!@#$%^&*(),.?":{}|<>]/.test(password) ? '#10b981' : 'rgba(255,255,255,0.1)' }} />
              </div>
            )}
            {password.length > 0 && (
              <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginTop: '-8px', marginBottom: '16px', display: 'flex', justifyContent: 'space-between' }}>
                <span>Length (8+)</span>
                <span>Uppercase</span>
                <span>Number</span>
                <span>Symbol</span>
              </div>
            )}

            <label>Confirm Password</label>
            <input
              type="password"
              className="milled-input"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              required
            />

            {error && (
              <div style={{ background: 'rgba(244,63,94,0.12)', border: '1px solid rgba(244,63,94,0.3)', borderRadius: '8px', padding: '10px 14px', fontSize: '13px', color: '#fb7185', marginTop: '16px' }}>
                {error}
              </div>
            )}

            <button type="submit" className="btn-primary-3d" disabled={loading} style={{ opacity: loading ? 0.7 : 1 }}>
              {loading ? 'Creating account...' : 'Create Free Account'}
              <span className="rocket-prop" style={{ animation: loading ? 'rocket-pulse 0.5s ease-in-out infinite alternate' : 'none' }}>🚀</span>
            </button>
          </form>

          <div className="footer-text">
            By signing up, you agree to our{' '}
            <button type="button" onClick={() => { setModalType('terms'); setModalOpen(true); }} style={{ background: 'none', border: 'none', color: '#8b5cf6', cursor: 'pointer', padding: 0 }}>Terms</button>
            {' & '}
            <button type="button" onClick={() => { setModalType('privacy'); setModalOpen(true); }} style={{ background: 'none', border: 'none', color: '#8b5cf6', cursor: 'pointer', padding: 0 }}>Privacy Policy</button>
          </div>
          <div className="sign-in">
            Already have an account? <Link href="/login">Sign in</Link>
          </div>
        </div>
      </div>
    </>
  );
}
