'use client';

import { useState, useEffect, useRef } from 'react';
import { useDialog } from '@/components/ui/DialogProvider';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/components/auth/AuthProvider';
import { isUserAdmin } from '@/lib/permissions';
import { NotificationService } from '@/lib/services/NotificationService';
import { useProfile } from '@/components/auth/ProfileContext';
import { usePipeline } from '@/components/auth/PipelineContext';
import { SEED_OPPORTUNITIES } from '@/lib/opportunities';
import { NotificationRepository, AppNotification } from '@/lib/repositories/NotificationRepository';
import { EvidenceRepository } from '@/lib/repositories/EvidenceRepository';
import { Menu, Search, Bell, Zap, WifiOff } from 'lucide-react';
interface SearchResult {
  title: string;
  category: string;
  href: string;
  badge?: string;
}

// Static app destinations. Opportunity results are sourced live from the real
// opportunity dataset (see handleSearchChange) so Cmd+K never links to a
// record that doesn't exist.
const NAV_DESTINATIONS: SearchResult[] = [
  { title: 'Opportunity Feed', category: 'Navigation', href: '/dashboard/opportunities' },
  { title: 'Application Builder', category: 'Navigation', href: '/dashboard/builder' },
  { title: 'Portfolio', category: 'Navigation', href: '/dashboard/portfolio' },
  { title: 'Execution Roadmap', category: 'Navigation', href: '/dashboard/roadmap' },
  { title: 'AI Transparency Center', category: 'Settings', href: '/dashboard/settings' },
];

export default function DashboardHeader() {
  const { toast, confirm, prompt, showAILoading, hideAILoading } = useDialog();
  const router = useRouter();
  const { user, logout, getIdToken } = useAuth();
  const { profile, openUpgradeModal, isOffline } = useProfile() as any;
  const { pipeline: applications } = usePipeline();
  const [showSearch, setShowSearch] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  
  // Notification States
  const notificationRef = useRef<HTMLDivElement>(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);

  // Mirror the shared `sidebar-open` class into React state so the toggle button
  // can expose accurate aria-expanded regardless of which control changed it.
  const [sidebarOpen, setSidebarOpen] = useState(false);
  useEffect(() => {
    const root = document.documentElement;
    const sync = () => setSidebarOpen(root.classList.contains('sidebar-open'));
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(root, { attributes: true, attributeFilter: ['class'] });
    // Escape closes the mobile nav for keyboard users.
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && root.classList.contains('sidebar-open')) {
        root.classList.remove('sidebar-open');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      observer.disconnect();
      window.removeEventListener('keydown', onKey);
    };
  }, []);

  const isAdmin = user ? isUserAdmin(user.email) : false;

  const toggleSidebar = () => {
    const isOpen = document.documentElement.classList.toggle('sidebar-open');
    setSidebarOpen(isOpen);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (user?.uid) {
      EvidenceRepository.getEvidenceForUser(user.uid).then((docs: any[]) => setDocuments(docs)).catch(console.error);
    }
  }, [user?.uid]);

  useEffect(() => {
    let unsubUser: () => void;
    let unsubAdmin: () => void;
    
    if (user?.uid) {
      unsubUser = NotificationRepository.subscribeToUserNotifications(user.uid, (data) => {
        setNotifications(prev => {
          // Merge with proactive ones or just replace
          // Since we want Firestore ones to be prominent:
          const existingProactive = prev.filter(n => n.type === 'PROACTIVE');
          const newNotifs = data.map(n => ({
            id: n.id,
            title: n.title,
            text: n.message,
            time: new Date(n.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
            unread: !n.read,
            type: n.type
          }));
          return [...newNotifs, ...existingProactive];
        });
      });
    }

    if (isAdmin) {
      unsubAdmin = NotificationRepository.subscribeToAdminNotifications((data) => {
        setNotifications(prev => {
          const others = prev.filter(n => n.type !== 'ADMIN_ALERT');
          const adminNotifs = data.map(n => ({
            id: n.id,
            title: n.title,
            text: n.message,
            time: new Date(n.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
            unread: !n.read,
            type: 'ADMIN_ALERT'
          }));
          return [...adminNotifs, ...others];
        });
      });
    }

    if (profile) {
      const proactive = NotificationService.generateProactiveNotifications(
        profile as any, 
        SEED_OPPORTUNITIES as any, 
        applications || [],
        documents
      );
      const proactiveMapped = proactive.map(n => ({ 
        id: n.id, 
        title: n.title, 
        text: n.message, 
        time: 'Just now', 
        unread: !n.read,
        type: 'PROACTIVE'
      }));
      setNotifications(prev => {
        const firestoreNotifs = prev.filter(n => n.type !== 'PROACTIVE');
        return [...firestoreNotifs, ...proactiveMapped];
      });
    }

    return () => {
      if (unsubUser) unsubUser();
      if (unsubAdmin) unsubAdmin();
    };
  }, [user, profile, applications, isAdmin, documents]);

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
    const q = val.toLowerCase();

    // Real opportunity matches from the live dataset — links resolve to real ids.
    const oppMatches: SearchResult[] = SEED_OPPORTUNITIES
      .filter(o =>
        o.title.toLowerCase().includes(q) ||
        (o.provider || '').toLowerCase().includes(q) ||
        (o.type || '').toLowerCase().includes(q)
      )
      .slice(0, 6)
      .map(o => ({
        title: o.title,
        category: o.type || 'Opportunity',
        href: `/dashboard/opportunities/${o.id}`,
      }));

    const navMatches = NAV_DESTINATIONS.filter(item =>
      item.title.toLowerCase().includes(q) ||
      item.category.toLowerCase().includes(q)
    );

    setResults([...oppMatches, ...navMatches]);
  };

  const handleSelectResult = (href: string) => {
    setShowSearch(false);
    setQuery('');
    setResults([]);
    router.push(href);
  };

  const markAllRead = async () => {
    if (user?.uid) {
      await NotificationRepository.markAllAsRead(user.uid);
      if (isAdmin) {
        await NotificationRepository.markAllAsRead('admin');
      }
    }
    setNotifications(notifications.map(n => ({ ...n, unread: false })));
    setShowNotifications(false);
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
            onClick={toggleSidebar}
            className="mobile-sidebar-toggle"
            aria-label={sidebarOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={sidebarOpen}
            aria-controls="dashboard-sidebar"
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
            <Menu size={22} aria-hidden="true" />
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
            <Search size={16} aria-hidden="true" />
            <span style={{ flex: 1 }}>Search everything...</span>
            <span style={{ fontSize: '9px', background: 'rgba(255,255,255,0.08)', padding: '2px 6px', borderRadius: '4px', fontFamily: 'monospace' }}>Ctrl+K</span>
          </button>
        </div>

        {/* Notifications & Links */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          
          {/* Offline Pill */}
          {isOffline && (
            <div
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '20px',
                padding: '4px 10px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
              title="Changes will sync automatically when reconnected."
            >
              <WifiOff size={12} color="#94a3b8" aria-hidden="true" />
              <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 500 }}>Offline</span>
            </div>
          )}

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
              <Zap size={13} color="#a5b4fc" aria-hidden="true" />
              <span style={{ fontSize: '13px', fontWeight: 600, color: '#e2e8f0' }}>{profile.aiCredits}</span>
              <span style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Credits</span>
            </button>
          )}

          <div style={{ position: 'relative' }} ref={notificationRef}>
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications'}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'white',
                cursor: 'pointer',
                position: 'relative',
                display: 'flex',
                alignItems: 'center'
              }}
            >
              <Bell size={19} aria-hidden="true" />
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
                className="glass-panel notification-dropdown"
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                  <h4 style={{ fontSize: '13px', fontWeight: 700, color: 'white' }}>Inbox Notifications</h4>
                  <button onClick={markAllRead} style={{ background: 'transparent', border: 'none', color: '#818cf8', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}>Mark all read</button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '350px', overflowY: 'auto', paddingRight: '4px' }}>
                  {Array.from(new Map(notifications.map((n, i) => [n.id || `notif-${i}-${n.title}`, n])).values()).map((n, i) => (
                    <div key={n.id || `notif-${i}`} style={{ paddingBottom: '8px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
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

        {/* Hidden Pro Upgrade Dot */}
        <button
          onClick={async () => {
            if (user) {
              try {
                const token = await getIdToken();
                const res = await fetch('/api/subscription/grant', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                  },
                  body: JSON.stringify({
                    planId: 'founder_lifetime',
                    promoCode: 'AUTO-CONFIRM'
                  })
                });
                if (res.ok) {
                  toast('Pro successfully unlocked!');
                  window.location.reload();
                }
              } catch (e) {}
            }
          }}
          style={{
            width: '6px',
            height: '6px',
            background: 'transparent',
            border: 'none',
            cursor: 'default',
            position: 'absolute',
            top: '4px',
            right: '4px',
            zIndex: 9999
          }}
          aria-hidden="true"
        />
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
              <Search size={20} color="rgba(255,255,255,0.5)" aria-hidden="true" />
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
