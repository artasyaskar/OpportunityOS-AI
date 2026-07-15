'use client';

import Link from 'next/link';

export default function TermsPage() {
  return (
    <div style={{ background: 'var(--bg-primary)', minHeight: '100vh', display: 'flex', flexDirection: 'column', color: 'white', fontFamily: 'Space Grotesk, sans-serif' }}>
      <div style={{ maxWidth: '800px', margin: '80px auto', padding: '0 24px', flex: 1 }}>
        <Link href="/" style={{ color: '#818cf8', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '8px', marginBottom: '32px' }}>
          ← Back to Home
        </Link>
        <h1 style={{ fontSize: '38px', fontWeight: 800, marginBottom: '24px' }}>Terms of Service</h1>
        <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '15px', lineHeight: 1.6, marginBottom: '16px' }}>
          Last updated: July 5, 2026.
        </p>
        <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '14px', lineHeight: 1.6, marginBottom: '20px' }}>
          By accessing and using OpportunityOS AI, you agree to these terms. Our software is designed to assist you with opportunity analysis. We do not guarantee admission, funding, or hiring outcomes.
        </p>
      </div>
    </div>
  );
}
