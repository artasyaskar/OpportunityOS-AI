'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/components/auth/AuthProvider';
import { isUserAdmin } from '@/lib/permissions';
import { NotificationService } from '@/lib/services/NotificationService';
import { useProfile } from '@/components/auth/ProfileContext';
import { usePipeline } from '@/components/auth/PipelineContext';
import { SEED_OPPORTUNITIES } from '@/lib/opportunities';
interface SearchResult {
  title: string;
  category: string;
  href: string;
  badge?: string;
}

const SEARCH_DATABASE: SearchResult[] = [
  { title: 'Chevening Scholarship 2025-2026', category: 'Opportunities', href: '/dashboard/opportunities/chevening-2025', badge: 'Active' },
  { title: 'DAAD Graduate Scholarship', category: 'Opportunities', href: '/dashboard/opportunities/daad-2025', badge: 'Active' },
  { title: 'SOP Draft Statement (First Revision)', category: 'Documents', href: '/dashboard/builder' },
  { title: 'Scholarship Resume PDF', category: 'Portfolio', href: '/dashboard/portfolio' },
  { title: 'IELTS Prep Milestone', category: 'Execution Plan', href: '/dashboard/roadmap' },
  { title: 'AI Transparency Center', category: 'Settings', href: '/dashboard/settings' },
];

export default function DashboardHeader() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const { profile, openUpgradeModal } = useProfile() as any;
  const { pipeline: applications } = usePipeline();
  const [showSearch, setShowSearch] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  
  // Notification States
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);

  useEffect(() => {
    if (profile) {
      const proactive = NotificationService.generateProactiveNotifications(
        profile as any, 
        SEED_OPPORTUNITIES as any, 
        applications || []
      );
      setNotifications(proactive.map(n => ({ 
        id: n.id, 
        title: n.title, 
        text: n.message, 
        time: 'Just now', 
        unread: !n.read 
      })));
    }
  }, [profile, applications]);
  const isAdmin = user ? isUserAdmin(user.email) : false;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setShowSearch(true);
      }
      if (e.key === 'Escape') {
        setShowSearch(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const handleSearchChange = (val: string) => {
    setQuery(val);
    if (!val) {
      setResults([]);
      return;
    }
    const filtered = SEARCH_DATABASE.filter(item => 
      item.title.toLowerCase().includes(val.toLowerCase()) || 
      item.category.toLowerCase().includes(val.toLowerCase())
    );
    setResults(filtered);
  };

  const handleSelectResult = (href: string) => {
    setShowSearch(false);
    setQuery('');
    setResults([]);
    router.push(href);
  };

  const markAllRead = () => {
    setNotifications(notifications.map(n => ({ ...n, unread: false })));
  };

  const unreadCount = notifications.filter(n => n.unread).length;

  const handleLogout = async () => {
    try {
      await logout();
      router.push('/');
    } catch (e) {
      console.error('Logout failed', e);
    }
  };

  return (
    <>
      <header
        style={{
          height: '60px',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 24px',
          background: 'rgba(2, 4, 8, 0.3)',
          position: 'sticky',
          top: 0,
          zIndex: 10
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center' }}>
          {/* Mobile Sidebar Toggle */}
          <button
            onClick={() => document.documentElement.classList.toggle('sidebar-open')}
            className="mobile-sidebar-toggle"
            style={{
              background: 'transparent',
              border: 'none',
              color: 'white',
              fontSize: '20px',
              cursor: 'pointer',
              marginRight: '12px',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            ☰
          </button>

          {/* Search trigger */}
          <button
            onClick={() => setShowSearch(true)}
            className="search-trigger"
            style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '10px',
              color: 'rgba(255,255,255,0.4)',
              padding: '8px 16px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              fontSize: '13px',
              width: '280px',
              cursor: 'pointer',
              textAlign: 'left'
            }}
          >
            <span>🔍</span>
            <span style={{ flex: 1 }}>Search everything...</span>
            <span style={{ fontSize: '9px', background: 'rgba(255,255,255,0.08)', padding: '2px 6px', borderRadius: '4px', fontFamily: 'monospace' }}>Ctrl+K</span>
          </button>
        </div>

        {/* Notifications & Links */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          
          {/* AI Credits Pill */}
          {profile?.aiCredits !== undefined && (
            <button
              onClick={openUpgradeModal}
              style={{
                background: 'linear-gradient(135deg, rgba(99,102,241,0.1), rgba(168,85,247,0.1))',
                border: '1px solid rgba(99,102,241,0.3)',
                borderRadius: '20px',
                padding: '4px 12px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
              className="hover:border-indigo-400 hover:shadow-[0_0_10px_rgba(99,102,241,0.3)]"
            >
              <span style={{ fontSize: '12px' }}>⚡</span>
              <span style={{ fontSize: '13px', fontWeight: 600, color: '#e2e8f0' }}>{profile.aiCredits}</span>
              <span style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Credits</span>
            </button>
          )}

          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'white',
                fontSize: '18px',
                cursor: 'pointer',
                position: 'relative',
                display: 'flex',
                alignItems: 'center'
              }}
            >
              <span>🔔</span>
              {unreadCount > 0 && (
                <span
                  style={{
                    position: 'absolute',
                    top: '-4px',
                    right: '-4px',
                    width: '14px',
                    height: '14px',
                    borderRadius: '50%',
                    background: '#f43f5e',
                    color: 'white',
                    fontSize: '9px',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Notification Dropdown */}
            {showNotifications && (
              <div
                className="glass-panel"
                style={{
                  position: 'absolute',
                  top: '32px',
                  right: 0,
                  width: '320px',
                  borderRadius: '12px',
                  padding: '16px',
                  border: '1px solid rgba(255,255,255,0.08)',
                  boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
                  zIndex: 100,
                  background: 'rgba(10, 12, 16, 0.95)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                  <h4 style={{ fontSize: '13px', fontWeight: 700, color: 'white' }}>Inbox Notifications</h4>
                  <button onClick={markAllRead} style={{ background: 'transparent', border: 'none', color: '#818cf8', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}>Mark all read</button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {notifications.map(n => (
                    <div key={n.id} style={{ paddingBottom: '8px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <span style={{ fontSize: '12px', fontWeight: 700, color: n.unread ? '#818cf8' : 'white' }}>{n.title}</span>
                        <span style={{ fontSize: '8px', color: 'rgba(255,255,255,0.3)' }}>{n.time}</span>
                      </div>
                      <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', lineHeight: 1.3, marginTop: '3px' }}>{n.text}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <button onClick={handleLogout} className="btn btn-ghost btn-sm" style={{ color: 'rgba(244,63,94,0.8)', fontSize: '12px' }}>
            Logout
          </button>
        </div>
      </header>

      {/* CTRL+K Universal Search Overlay */}
      {showSearch && (
        <div
          onClick={() => setShowSearch(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(2, 4, 8, 0.85)',
            backdropFilter: 'blur(10px)',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'center',
            paddingTop: '100px',
            zIndex: 999
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            className="glass-panel"
            style={{
              width: '100%',
              maxWidth: '540px',
              borderRadius: '16px',
              padding: '16px',
              border: '1px solid rgba(255,255,255,0.12)',
              boxShadow: '0 24px 60px rgba(0,0,0,0.6)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
              <span style={{ fontSize: '20px' }}>🔍</span>
              <input
                type="text"
                placeholder="Search opportunities, essays, goals, notes..."
                autoFocus
                value={query}
                onChange={e => handleSearchChange(e.target.value)}
                style={{
                  flex: 1,
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  color: 'white',
                  fontSize: '16px'
                }}
              />
            </div>
            {results.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {results.map((r, i) => (
                  <div
                    key={i}
                    onClick={() => handleSelectResult(r.href)}
                    style={{
                      padding: '10px 12px',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      background: 'rgba(255,255,255,0.02)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      transition: 'all 0.1s ease'
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                  >
                    <div>
                      <span style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'white' }}>{r.title}</span>
                      <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', fontWeight: 600 }}>{r.category}</span>
                    </div>
                    {r.badge && <span className="badge badge-emerald" style={{ fontSize: '8px' }}>{r.badge}</span>}
                  </div>
                ))}
              </div>
            ) : query ? (
              <div style={{ textAlign: 'center', padding: '24px', color: 'rgba(255,255,255,0.4)', fontSize: '13px' }}>
                No coordinates found for "{query}".
              </div>
            ) : (
              <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', padding: '8px 4px' }}>
                Type to query opportunities, documents, or roadmap milestones. Press Esc to cancel.
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
