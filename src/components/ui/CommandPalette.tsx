'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { SEED_OPPORTUNITIES } from '@/lib/opportunities';
import { Home, BarChart, Globe, Archive, Settings, Target, Rocket, GraduationCap, Search } from 'lucide-react';

export function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    } else {
      setQuery('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const closePalette = () => setIsOpen(false);

  // Static routes index
  const staticRoutes = [
    { label: 'Dashboard Home', url: '/dashboard', type: 'Route', icon: <Home size={18} /> },
    { label: 'My Applications Pipeline', url: '/dashboard/applications', type: 'Route', icon: <BarChart size={18} /> },
    { label: 'Opportunity Database', url: '/dashboard/opportunities', type: 'Route', icon: <Globe size={18} /> },
    { label: 'Evidence Vault', url: '/dashboard/vault', type: 'Route', icon: <Archive size={18} /> },
    { label: 'Settings', url: '/dashboard/settings', type: 'Route', icon: <Settings size={18} /> },
    { label: 'Personal Preferences', url: '/dashboard/settings/preferences', type: 'Route', icon: <Target size={18} /> },
    { label: 'AI Builder', url: '/dashboard/builder', type: 'Route', icon: <Rocket size={18} /> },
  ];

  const opportunityResults = SEED_OPPORTUNITIES
    .filter(opp => opp.title.toLowerCase().includes(query.toLowerCase()) || opp.country.toLowerCase().includes(query.toLowerCase()))
    .map(opp => ({
      label: opp.title,
      url: `/dashboard/opportunities/${opp.id}/workspace`,
      type: 'Opportunity',
      icon: <GraduationCap size={18} />
    }));

  const routeResults = staticRoutes.filter(route => 
    route.label.toLowerCase().includes(query.toLowerCase())
  );

  const results = [...routeResults, ...opportunityResults];

  const handleSelect = (url: string) => {
    router.push(url);
    closePalette();
  };

  return (
    <div className="fixed inset-0" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: '10vh' }}>
      {/* Backdrop */}
      <div 
        onClick={closePalette} 
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
      />
      
      {/* Palette */}
      <div className="card-magnetic glow-border" style={{ position: 'relative', width: '100%', maxWidth: '640px', background: '#0a0c10', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' }}>
        <div style={{ padding: '16px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ color: 'rgba(255,255,255,0.4)', display: 'flex', alignItems: 'center' }}><Search size={18} /></span>
          <input
            ref={inputRef}
            type="text"
            placeholder="Search opportunities, documents, or type a command..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{ width: '100%', background: 'transparent', border: 'none', color: 'white', fontSize: '16px', outline: 'none' }}
          />
          <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', background: 'rgba(255,255,255,0.1)', padding: '2px 6px', borderRadius: '4px' }}>ESC</div>
        </div>

        <div style={{ maxHeight: '400px', overflowY: 'auto', padding: '12px' }}>
          {results.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {results.slice(0, 10).map((result, i) => (
                <button
                  key={i}
                  onClick={() => handleSelect(result.url)}
                  style={{ display: 'flex', alignItems: 'center', gap: '12px', width: '100%', padding: '12px', background: 'transparent', border: 'none', borderRadius: '8px', cursor: 'pointer', textAlign: 'left', transition: 'background 0.2s' }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(99,102,241,0.1)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  <span style={{ display: 'flex', alignItems: 'center', color: 'rgba(255,255,255,0.8)' }}>{result.icon}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: 'white' }}>{result.label}</div>
                  </div>
                  <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', background: 'rgba(255,255,255,0.05)', padding: '2px 8px', borderRadius: '12px' }}>
                    {result.type}
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <div style={{ padding: '40px 20px', textAlign: 'center', color: 'rgba(255,255,255,0.4)' }}>
              No results found for "{query}".
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
