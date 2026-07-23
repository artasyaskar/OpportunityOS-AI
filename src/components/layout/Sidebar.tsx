'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/components/auth/AuthProvider';
import { useProfile } from '@/components/auth/ProfileContext';
import { useSubscription } from '@/components/auth/SubscriptionContext';
import { navIcons } from '@/lib/uiIcons';
import { Crown, Settings, X } from 'lucide-react';

// Maps the real subscription state to a short, human label for the user card.
const PLAN_LABELS: Record<string, string> = {
  FREE: 'Free Plan',
  PENDING_PAYMENT: 'Payment Pending',
  UNDER_REVIEW: 'Under Review',
  ACTIVE: 'Pro Plan',
  EXPIRED: 'Expired',
  CANCELLED: 'Cancelled',
  LIFETIME: 'Lifetime',
  ENTERPRISE: 'Enterprise',
};

const NAV_ITEMS = [
  { label: 'Mission Control', href: '/dashboard' },
  { label: 'Opportunities', href: '/dashboard/opportunities' },
  { label: 'Applications', href: '/dashboard/applications' },
  { label: 'Application Studio', href: '/dashboard/builder' },
  { label: 'Evidence Vault', href: '/dashboard/vault' },
  { label: 'Execution Plan', href: '/dashboard/roadmap' },
  { label: 'Opportunity Portfolio', href: '/dashboard/portfolio' },
  { label: 'AI Chief Officer', href: '/dashboard/agents' },
  { label: 'Opportunity DNA', href: '/dashboard/settings' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuth();
  const { profile } = useProfile();
  const { subscription } = useSubscription();
  const planLabel = PLAN_LABELS[subscription?.status ?? 'FREE'] ?? 'Free Plan';

  const [userName, setUserName] = useState('User Profile');
  const [userInitial, setUserInitial] = useState('U');

  useEffect(() => {
    // Priority: AuthProvider user -> Firestore/Local profile -> Defaults
    if (user?.displayName) {
      setUserName(user.displayName);
      setUserInitial(user.displayName.charAt(0).toUpperCase());
      return;
    }

    if (profile?.name) {
      setUserName(profile.name);
      setUserInitial(profile.name.charAt(0).toUpperCase());
    }
  }, [user, profile]);

  const closeSidebar = () => {
    document.documentElement.classList.remove('sidebar-open');
  };

  return (
    <>
      <div className="sidebar-backdrop" onClick={closeSidebar} aria-hidden="true" />
      <aside className="sidebar" id="dashboard-sidebar" aria-label="Primary navigation">
        {/* Logo */}
      <div
        style={{
          padding: '24px 20px 20px',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start'
        }}
      >
        <Link
          href="/"
          style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '10px' }}
          onClick={closeSidebar}
        >
          <div
            style={{
              width: '32px',
              height: '32px',
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              borderRadius: '9px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '15px',
              fontWeight: '900',
              color: 'white',
              boxShadow: '0 0 16px rgba(99,102,241,0.4)',
              flexShrink: 0,
            }}
          >
            O
          </div>
          <div>
            <div
              style={{
                fontFamily: 'Space Grotesk, sans-serif',
                fontWeight: 700,
                fontSize: '15px',
                color: 'white',
                lineHeight: 1.2,
              }}
            >
              OpportunityOS
            </div>
            <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.35)', fontWeight: 500 }}>
              AI Chief Officer
            </div>
          </div>
        </Link>
        <button
          className="mobile-sidebar-close"
          onClick={closeSidebar}
          aria-label="Close sidebar"
          style={{
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '8px',
            color: 'rgba(255,255,255,0.7)',
            cursor: 'pointer',
            padding: '6px',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <X size={18} aria-hidden="true" />
        </button>
      </div>

      {/* Navigation */}
      <div style={{ padding: '16px 12px', flex: 1, overflowY: 'auto' }}>
        <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', fontWeight: 600, letterSpacing: '1px', padding: '0 4px', marginBottom: '8px' }}>
          MAIN MENU
        </div>
        {NAV_ITEMS.map(item => {
          const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
          const Icon = navIcons[item.href];
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`sidebar-nav-item ${isActive ? 'active' : ''}`}
              style={{ marginBottom: '2px' }}
              onClick={closeSidebar}
            >
              <span style={{ width: '20px', display: 'inline-flex', justifyContent: 'center', flexShrink: 0 }}>
                {Icon && <Icon size={18} aria-hidden="true" />}
              </span>
              <span>{item.label}</span>
              {isActive && (
                <span
                  style={{
                    marginLeft: 'auto',
                    width: '5px',
                    height: '5px',
                    borderRadius: '50%',
                    background: '#818cf8',
                  }}
                />
              )}
            </Link>
          );
        })}

        {/* Admin Section (Conditionally Rendered) */}
        {user?.email === 'artasyaskar@gmail.com' && (
          <Link
            href="/dashboard/admin"
            className={`sidebar-nav-item ${pathname.startsWith('/dashboard/admin') ? 'active' : ''}`}
            style={{ marginBottom: '2px', border: '1px solid rgba(239,68,68,0.2)' }}
            onClick={closeSidebar}
          >
            <span style={{ width: '20px', display: 'inline-flex', justifyContent: 'center', flexShrink: 0, color: '#ef4444' }}>
              <Crown size={18} aria-hidden="true" />
            </span>
            <span style={{ color: '#fca5a5' }}>Admin Dashboard</span>
            {pathname.startsWith('/dashboard/admin') && (
              <span
                style={{
                  marginLeft: 'auto',
                  width: '5px',
                  height: '5px',
                  borderRadius: '50%',
                  background: '#ef4444',
                }}
              />
            )}
          </Link>
        )}

        {/* AI Agents Section */}
        <div
          style={{
            marginTop: '24px',
            fontSize: '10px',
            color: 'rgba(255,255,255,0.3)',
            fontWeight: 600,
            letterSpacing: '1px',
            padding: '0 4px',
            marginBottom: '8px',
          }}
        >
          AI AGENTS
        </div>

        {[
          { label: 'Discovery' },
          { label: 'Probability Engine' },
          { label: 'Gap Analysis' },
          { label: 'Application Builder' },
        ].map(agent => (
          <div
            key={agent.label}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '8px 16px',
              borderRadius: '8px',
              marginBottom: '2px',
            }}
          >
            {/* Availability indicator — agents run on-demand from your evidence, not a live background feed. */}
            <span className="agent-status-dot idle" title="Ready" />
            <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.45)', fontWeight: 500 }}>
              {agent.label}
            </span>
          </div>
        ))}
      </div>

      {/* Bottom User Card */}
      <div
        style={{
          padding: '16px 12px',
          borderTop: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <div
          className="glass-sm"
          style={{
            padding: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}
        >
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '13px',
              fontWeight: 700,
              color: 'white',
              flexShrink: 0,
            }}
          >
            {userInitial}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '13px', fontWeight: 600, color: 'white', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
              {userName}
            </div>
            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>{planLabel}</div>
          </div>
          <Link href="/dashboard/settings" style={{ color: 'rgba(255,255,255,0.4)', display: 'inline-flex', textDecoration: 'none' }} onClick={closeSidebar} aria-label="Settings">
            <Settings size={16} aria-hidden="true" />
          </Link>
        </div>
      </div>
      </aside>
    </>
  );
}
