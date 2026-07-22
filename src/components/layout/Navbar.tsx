'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { Menu, X } from 'lucide-react';

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handler);
    
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setIsAuthenticated(!!user);
    });
    
    return () => {
      window.removeEventListener('scroll', handler);
      unsubscribe();
    };
  }, []);

  return (
    <nav
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        padding: '0 24px',
        height: '64px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: scrolled ? 'rgba(2, 4, 8, 0.85)' : 'transparent',
        backdropFilter: scrolled ? 'blur(20px)' : 'none',
        borderBottom: scrolled ? '1px solid rgba(255,255,255,0.06)' : 'none',
        transition: 'all 0.3s ease',
      }}
    >
      {/* Logo */}
      <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div
          style={{
            width: '34px',
            height: '34px',
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '16px',
            fontWeight: '900',
            color: 'white',
            boxShadow: '0 0 20px rgba(99,102,241,0.5)',
          }}
        >
          O
        </div>
        <span
          style={{
            fontFamily: 'Space Grotesk, sans-serif',
            fontWeight: 700,
            fontSize: '18px',
            color: 'white',
          }}
        >
          Opportunity<span className="gradient-text">OS</span>
        </span>
      </Link>

      {/* Desktop Nav links */}
      <div className="desktop-nav">
        {['Features', 'Agents', 'Pricing'].map(item => (
          <a
            key={item}
            href={`#${item.toLowerCase()}`}
            style={{
              color: 'rgba(255,255,255,0.65)',
              textDecoration: 'none',
              fontSize: '14px',
              fontWeight: 500,
              padding: '6px 14px',
              borderRadius: '8px',
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => {
              (e.target as HTMLElement).style.color = 'white';
              (e.target as HTMLElement).style.background = 'rgba(255,255,255,0.06)';
            }}
            onMouseLeave={e => {
              (e.target as HTMLElement).style.color = 'rgba(255,255,255,0.65)';
              (e.target as HTMLElement).style.background = 'transparent';
            }}
          >
            {item}
          </a>
        ))}

        {isAuthenticated ? (
          <Link
            href="/dashboard"
            className="btn btn-primary btn-sm"
            style={{ padding: '9px 20px' }}
          >
            Go to Dashboard
          </Link>
        ) : (
          <>
            <Link href="/login" className="btn btn-ghost btn-sm" style={{ color: 'rgba(255,255,255,0.7)' }}>
              Sign In
            </Link>
            <Link
              href="/signup"
              className="btn btn-primary btn-sm"
              style={{ padding: '9px 20px' }}
            >
              Get Started Free
            </Link>
          </>
        )}
      </div>

      {/* Mobile Menu Button */}
      <button 
        className="mobile-menu-btn"
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        aria-label="Toggle mobile menu"
        aria-expanded={mobileMenuOpen}
      >
        {mobileMenuOpen ? <X size={22} aria-hidden="true" /> : <Menu size={22} aria-hidden="true" />}
      </button>

      {/* Mobile Nav Overlay */}
      {mobileMenuOpen && (
        <div
          style={{
            position: 'absolute',
            top: '64px',
            left: 0,
            right: 0,
            background: 'rgba(2, 4, 8, 0.95)',
            backdropFilter: 'blur(20px)',
            borderBottom: '1px solid rgba(255,255,255,0.1)',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            zIndex: 99,
          }}
        >
          {['Features', 'Agents', 'Pricing'].map(item => (
            <a
              key={item}
              href={`#${item.toLowerCase()}`}
              onClick={() => setMobileMenuOpen(false)}
              style={{
                color: 'white',
                textDecoration: 'none',
                fontSize: '18px',
                fontWeight: 600,
                padding: '12px 0',
                borderBottom: '1px solid rgba(255,255,255,0.05)',
              }}
            >
              {item}
            </a>
          ))}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '8px' }}>
            {isAuthenticated ? (
              <Link href="/dashboard" onClick={() => setMobileMenuOpen(false)} className="btn btn-primary btn-lg" style={{ width: '100%' }}>
                Go to Dashboard
              </Link>
            ) : (
              <>
                <Link href="/login" onClick={() => setMobileMenuOpen(false)} className="btn btn-secondary btn-lg" style={{ width: '100%' }}>
                  Sign In
                </Link>
                <Link href="/signup" onClick={() => setMobileMenuOpen(false)} className="btn btn-primary btn-lg" style={{ width: '100%' }}>
                  Get Started Free
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
