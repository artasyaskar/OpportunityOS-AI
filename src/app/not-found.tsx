import Link from 'next/link';
import PublicShell from '@/components/public/PublicShell';

export default function NotFound() {
  return (
    <PublicShell>
      <div style={{ textAlign: 'center', padding: '80px 0' }}>
        <div style={{ fontSize: 80, fontWeight: 800, color: '#818cf8' }}>404</div>
        <h1 style={{ fontSize: 32, fontWeight: 700, marginBottom: 12 }}>Page not found</h1>
        <p style={{ fontSize: 18, color: '#94a3b8', marginBottom: 32 }}>
          The page you’re looking for doesn’t exist or has moved.
        </p>
        <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link href="/" style={{ background: 'linear-gradient(135deg, #6366f1, #0ea5e9)', color: 'white', padding: '12px 24px', borderRadius: 12, textDecoration: 'none', fontWeight: 600 }}>
            Go home
          </Link>
          <Link href="/opportunities" style={{ border: '1px solid rgba(255,255,255,0.2)', color: 'white', padding: '12px 24px', borderRadius: 12, textDecoration: 'none', fontWeight: 600 }}>
            Browse opportunities
          </Link>
        </div>
      </div>
    </PublicShell>
  );
}
