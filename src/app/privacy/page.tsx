'use client';

import Link from 'next/link';

export default function PrivacyPage() {
  return (
    <div style={{ background: 'var(--bg-primary)', minHeight: '100vh', display: 'flex', flexDirection: 'column', color: 'white', fontFamily: 'Space Grotesk, sans-serif' }}>
      <div style={{ maxWidth: '800px', margin: '80px auto', padding: '0 24px', flex: 1 }}>
        <Link href="/" style={{ color: '#818cf8', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '8px', marginBottom: '32px' }}>
          ← Back to Home
        </Link>
        <h1 style={{ fontSize: '38px', fontWeight: 800, marginBottom: '24px' }}>Privacy Policy</h1>
        <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '15px', lineHeight: 1.6, marginBottom: '16px' }}>
          Last updated: July 5, 2026.
        </p>
        <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '14px', lineHeight: 1.6, marginBottom: '20px' }}>
          OpportunityOS AI values your privacy. All documents (resumes, transcripts, LinkedIn URLs) uploaded to our servers are stored securely and processed solely to evaluate credentials matches and generate application documents. We do not sell or share your data with third parties.
        </p>
      </div>
    </div>
  );
}
