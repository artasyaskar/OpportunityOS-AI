'use client';

import Link from 'next/link';

export default function AboutPage() {
  return (
    <div style={{ background: 'var(--bg-primary)', minHeight: '100vh', display: 'flex', flexDirection: 'column', color: 'white', fontFamily: 'Space Grotesk, sans-serif' }}>
      <div style={{ maxWidth: '800px', margin: '80px auto', padding: '0 24px', flex: 1 }}>
        <Link href="/" style={{ color: '#818cf8', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '8px', marginBottom: '32px' }}>
          ← Back to Home
        </Link>
        <h1 style={{ fontSize: '38px', fontWeight: 800, marginBottom: '24px' }}>About OpportunityOS AI</h1>
        <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '18px', lineHeight: 1.6, marginBottom: '24px' }}>
          OpportunityOS AI is the first Economic Mobility Operating System. We are building an AI Chief Opportunity Officer that helps people systematically discover, evaluate, prioritize, prepare for, and acquire life-changing scholarships, fellowships, accelerators, and career opportunities.
        </p>
        <h2 style={{ fontSize: '22px', fontWeight: 700, margin: '40px 0 16px' }}>Our Mission</h2>
        <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '15px', lineHeight: 1.6, marginBottom: '24px' }}>
          The distribution of talent is global, but the distribution of opportunity is highly local. OpportunityOS AI bridges this gap by offering elite strategy parameters, dynamic risk analysis, and credentials mapping to individuals regardless of their geographic coordinates.
        </p>
      </div>
    </div>
  );
}
