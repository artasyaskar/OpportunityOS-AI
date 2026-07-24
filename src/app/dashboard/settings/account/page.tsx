'use client';

import { useState } from 'react';
import { useDialog } from '@/components/ui/DialogProvider';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth/AuthProvider';
import { auth, db } from '@/lib/firebase';
import { sendPasswordResetEmail, deleteUser, signOut, updatePassword, reauthenticateWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { doc, deleteDoc, getDoc } from 'firebase/firestore';
import { Eye, EyeOff } from 'lucide-react';

export default function AccountCenterPage() {
  const { toast, confirm, prompt, showAILoading, hideAILoading } = useDialog();
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  if (!user) return null;

  const hasPasswordProvider = user.firebaseUser?.providerData.some((p: any) => p.providerId === 'password');

  const handlePasswordReset = async () => {
    if (!user.email) return;
    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, user.email);
      toast(`A secure password reset link has been sent to ${user.email}. Please check your inbox and your spam/junk folder.`);
      setAlert({ type: 'success', message: `Password reset link sent to ${user.email}` });
    } catch (err: any) {
      setAlert({ type: 'error', message: err.message || 'Failed to send reset email.' });
    } finally {
      setLoading(false);
    }
  };

  const handleSetPassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      setAlert({ type: 'error', message: 'Password must be at least 6 characters long.' });
      return;
    }
    setLoading(true);
    try {
      await updatePassword(auth.currentUser!, newPassword);
      setAlert({ type: 'success', message: 'Password set successfully! You can now log in with your email and this password.' });
      setNewPassword('');
      await auth.currentUser!.reload();
    } catch (err: any) {
      if (err.code === 'auth/requires-recent-login') {
        try {
          // Reauthenticate and retry
          const provider = new GoogleAuthProvider();
          await reauthenticateWithPopup(auth.currentUser!, provider);
          await updatePassword(auth.currentUser!, newPassword);
          setAlert({ type: 'success', message: 'Password set successfully! You can now log in with your email and this password.' });
          setNewPassword('');
          await auth.currentUser!.reload();
        } catch (reauthErr: any) {
          setAlert({ type: 'error', message: 'Failed to reauthenticate. Please log out and log back in.' });
        }
      } else {
        setAlert({ type: 'error', message: err.message || 'Failed to set password.' });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleExportData = async () => {
    setLoading(true);
    try {
      const profileSnap = await getDoc(doc(db, 'users', user.uid));
      const subSnap = await getDoc(doc(db, 'subscriptions', user.uid));

      const data = {
        profile: profileSnap.exists() ? profileSnap.data() : null,
        subscription: subSnap.exists() ? subSnap.data() : null,
        account: {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
        }
      };

      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `opportunityos-data-${user.uid}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setAlert({ type: 'success', message: 'Data exported successfully.' });
    } catch (err: any) {
      setAlert({ type: 'error', message: 'Failed to export data.' });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!await confirm('Are you sure you want to permanently delete your account and all associated data? This cannot be undone.')) return;

    setLoading(true);
    try {
      // 1. Delete Firestore Data
      await deleteDoc(doc(db, 'users', user.uid));
      await deleteDoc(doc(db, 'subscriptions', user.uid));

      await deleteUser(auth.currentUser!);

      // 3. Log out and redirect
      await signOut(auth);
      router.push('/');
    } catch (err: any) {
      if (err.code === 'auth/requires-recent-login') {
        try {
          const provider = new GoogleAuthProvider();
          await reauthenticateWithPopup(auth.currentUser!, provider);
          await deleteDoc(doc(db, 'users', user.uid));
          await deleteDoc(doc(db, 'subscriptions', user.uid));
          await deleteUser(auth.currentUser!);
          await signOut(auth);
          router.push('/');
        } catch (reauthErr: any) {
          setAlert({ type: 'error', message: 'Failed to reauthenticate. Please log out and log back in before deleting your account.' });
        }
      } else {
        setAlert({ type: 'error', message: err.message || 'Failed to delete account.' });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', paddingBottom: '60px' }}>
      {/* Alert */}
      {alert && (
        <div style={{
          marginBottom: '24px',
          padding: '16px',
          borderRadius: '12px',
          background: alert.type === 'success' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(244, 63, 94, 0.1)',
          border: alert.type === 'success' ? '1px solid rgba(16, 185, 129, 0.2)' : '1px solid rgba(244, 63, 94, 0.2)',
          color: alert.type === 'success' ? '#10b981' : '#f43f5e',
          fontSize: '14px',
          fontWeight: 600
        }}>
          {alert.message}
        </div>
      )}

      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <button onClick={() => router.push('/dashboard/settings')} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', marginBottom: '16px', fontSize: '13px', fontWeight: 600 }}>
          ← Back to Settings
        </button>
        <h1 style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '28px', fontWeight: 800, color: 'white', marginBottom: '8px' }}>
          🔒 Account Center
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '14px' }}>
          Manage your security preferences, download your data, and control your account footprint.
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

        {/* Security & Password */}
        <div className="card" style={{ padding: '24px' }}>
          <h2 style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '18px', fontWeight: 700, color: 'white', marginBottom: '16px' }}>
            Authentication & Security
          </h2>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '16px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <div>
              <div style={{ fontSize: '14px', fontWeight: 600, color: 'white' }}>Email Address</div>
              <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', marginTop: '4px' }}>{user.email}</div>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.05)', padding: '6px 12px', borderRadius: '8px', fontSize: '12px', color: 'rgba(255,255,255,0.6)' }}>
              Primary Identity
            </div>
          </div>

          {hasPasswordProvider ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '16px' }}>
              <div>
                <div style={{ fontSize: '14px', fontWeight: 600, color: 'white' }}>Password Reset</div>
                <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', marginTop: '4px' }}>We will email you a secure link to reset your password.</div>
              </div>
              <button
                onClick={handlePasswordReset}
                disabled={loading}
                className="btn btn-ghost"
                style={{ padding: '8px 16px', fontSize: '13px' }}
              >
                Send Reset Link
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '16px' }}>
              <div style={{ flex: 1, paddingRight: '20px' }}>
                <div style={{ fontSize: '14px', fontWeight: 600, color: 'white' }}>Set Password</div>
                <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', marginTop: '4px', marginBottom: '12px' }}>You signed in with Google. Set a password to also log in using your email address.</div>
                <div style={{ position: 'relative', width: '100%', maxWidth: '300px' }}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password"
                    style={{
                      width: '100%',
                      padding: '8px 40px 8px 12px',
                      borderRadius: '8px',
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      color: 'white',
                      fontSize: '13px',
                      outline: 'none'
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: 'absolute',
                      right: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      color: 'rgba(255,255,255,0.4)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <button
                onClick={handleSetPassword}
                disabled={loading || !newPassword}
                className="btn btn-primary btn-sm"
                style={{ padding: '8px 16px', fontSize: '13px' }}
              >
                Save Password
              </button>
            </div>
          )}
        </div>

        {/* Data Portability (GDPR) */}
        <div className="card" style={{ padding: '24px' }}>
          <h2 style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '18px', fontWeight: 700, color: 'white', marginBottom: '16px' }}>
            Data & Privacy
          </h2>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: '14px', fontWeight: 600, color: 'white' }}>Export My Data</div>
              <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', marginTop: '4px', maxWidth: '400px', lineHeight: 1.5 }}>
                Download a JSON archive of your personal profile, saved opportunities, and subscription history.
              </div>
            </div>
            <button
              onClick={handleExportData}
              disabled={loading}
              className="btn btn-primary btn-sm"
              style={{ padding: '8px 16px', fontSize: '13px' }}
            >
              Download Archive
            </button>
          </div>
        </div>



      </div>
    </div>
  );
}
