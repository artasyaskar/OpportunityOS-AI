'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { useProfile } from '@/components/auth/ProfileContext';
import { Sparkles, Crown, ArrowRight, X } from 'lucide-react';

export default function ExpiredPlanBanner() {
  const { user } = useAuth();
  const { openUpgradeModal } = useProfile() as any;
  const [subData, setSubData] = useState<any>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!user?.uid) return;
    
    // Check if dismissed in current browser session
    const isSessionDismissed = sessionStorage.getItem(`dismissed_expired_banner_${user.uid}`);
    if (isSessionDismissed === 'true') {
      setDismissed(true);
      return;
    }

    fetch(`/api/user/credits?uid=${user.uid}`)
      .then(async (res) => {
        if (!res.ok) return null;
        try {
          return await res.json();
        } catch {
          return null;
        }
      })
      .then(data => {
        if (data?.subscription) {
          setSubData(data.subscription);
        }
      })
      .catch(() => {});
  }, [user?.uid]);

  const handleDismiss = () => {
    setDismissed(true);
    if (user?.uid) {
      sessionStorage.setItem(`dismissed_expired_banner_${user.uid}`, 'true');
    }
  };

  if (dismissed || !subData?.isExpired) return null;

  return (
    <div 
      className="expired-banner-container"
      style={{
        background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.18), rgba(168, 85, 247, 0.18))',
        border: '1px solid rgba(168, 85, 247, 0.35)',
        borderRadius: '16px',
        padding: '18px 20px',
        margin: '12px 16px 0 16px',
        boxShadow: '0 8px 32px rgba(168, 85, 247, 0.15)',
        backdropFilter: 'blur(12px)',
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '16px',
        transition: 'all 0.3s ease'
      }}
    >
      {/* Close Cross Button (Top Right) */}
      <button
        onClick={handleDismiss}
        aria-label="Close message and continue with Free plan"
        title="Close & continue with Free Plan"
        style={{
          position: 'absolute',
          top: '12px',
          right: '12px',
          background: 'rgba(255, 255, 255, 0.08)',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          borderRadius: '50%',
          width: '28px',
          height: '28px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#cbd5e1',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          zIndex: 5
        }}
        className="hover:bg-white/20 hover:text-white"
      >
        <X size={15} />
      </button>

      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: '1 1 280px', minWidth: 0, paddingRight: '24px' }}>
        <div style={{
          width: '46px',
          height: '46px',
          borderRadius: '12px',
          background: 'linear-gradient(135deg, #a855f7, #6366f1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 14px rgba(168, 85, 247, 0.4)',
          flexShrink: 0
        }}>
          <Crown size={24} color="#ffffff" />
        </div>

        <div style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#ffffff', margin: 0 }}>
              Your Monthly Pro Plan Has Completed
            </h3>
            <span style={{
              background: 'rgba(239, 68, 68, 0.2)',
              border: '1px solid rgba(239, 68, 68, 0.4)',
              color: '#f87171',
              fontSize: '10px',
              fontWeight: 700,
              padding: '2px 8px',
              borderRadius: '12px',
              textTransform: 'uppercase'
            }}>
              Completed
            </span>
          </div>
          <p style={{ fontSize: '12px', color: '#e2e8f0', margin: '4px 0 2px 0', lineHeight: '1.4' }}>
            {subData?.inspirationMessage || "Keep enhancing your future — God has the right plans for you! Definitely great things ahead."}
          </p>
          <p style={{ fontSize: '11px', color: '#a5b4fc', margin: 0, fontWeight: 500 }}>
            ✨ Currently active on <strong>Free Plan</strong> (1,000 daily credits, renewed every 24 hours).
          </p>
        </div>
      </div>

      <div className="banner-actions" style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
        <button
          onClick={() => {
            window.location.href = '/dashboard/settings?tab=billing';
          }}
          style={{
            background: 'linear-gradient(135deg, #a855f7, #6366f1)',
            border: 'none',
            borderRadius: '10px',
            color: '#ffffff',
            fontWeight: 700,
            fontSize: '12px',
            padding: '9px 16px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            boxShadow: '0 4px 14px rgba(168, 85, 247, 0.3)',
            transition: 'all 0.2s ease',
            whiteSpace: 'nowrap'
          }}
          className="hover:scale-105"
        >
          <Sparkles size={14} />
          <span>Renew Pro / Upgrade</span>
          <ArrowRight size={14} />
        </button>

        <button
          onClick={handleDismiss}
          style={{
            background: 'rgba(255, 255, 255, 0.08)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            borderRadius: '10px',
            color: '#cbd5e1',
            fontSize: '12px',
            fontWeight: 600,
            padding: '9px 14px',
            cursor: 'pointer',
            whiteSpace: 'nowrap'
          }}
          className="hover:bg-white/20 hover:text-white"
        >
          Continue Free
        </button>
      </div>

      <style jsx>{`
        @media (max-width: 640px) {
          .expired-banner-container {
            margin: 10px 10px 0 10px !important;
            padding: 14px 16px !important;
            flex-direction: column !important;
            align-items: stretch !important;
          }
          .banner-actions {
            width: 100% !important;
            justify-content: stretch !important;
          }
          .banner-actions button {
            flex: 1 1 auto !important;
            justify-content: center !important;
          }
        }
      `}</style>
    </div>
  );
}
