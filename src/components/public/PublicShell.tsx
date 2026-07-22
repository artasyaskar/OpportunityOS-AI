import Link from 'next/link';
import { SITE_NAME } from '@/lib/seo';
import { categoryFacets, countryFacets } from '@/lib/catalog';

/**
 * Server-rendered shell for public, indexable pages. Provides a
 * semantic header and a link-rich footer so no page is orphaned —
 * every hub links to top categories and countries (internal linking).
 */
export default function PublicShell({ children }: { children: React.ReactNode }) {
  const topCategories = categoryFacets().slice(0, 8);
  const topCountries = countryFacets().slice(0, 8);

  return (
    <div style={{ minHeight: '100vh', background: '#020408', color: 'white' }}>
      <header
        style={{
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          padding: '16px 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          maxWidth: 1200,
          margin: '0 auto',
        }}
      >
        <Link href="/" style={{ color: 'white', textDecoration: 'none', fontWeight: 700, fontSize: 18 }}>
          {SITE_NAME}
        </Link>
        <nav style={{ display: 'flex', gap: 20, fontSize: 14 }}>
          <Link href="/opportunities" style={{ color: '#cbd5e1', textDecoration: 'none' }}>Opportunities</Link>
          <Link href="/pricing" style={{ color: '#cbd5e1', textDecoration: 'none' }}>Pricing</Link>
          <Link href="/about" style={{ color: '#cbd5e1', textDecoration: 'none' }}>About</Link>
          <Link href="/signup" style={{ color: '#818cf8', textDecoration: 'none', fontWeight: 600 }}>Get started</Link>
        </nav>
      </header>

      <main style={{ maxWidth: 1200, margin: '0 auto', padding: '40px 24px 80px' }}>{children}</main>

      <footer
        style={{
          borderTop: '1px solid rgba(255,255,255,0.08)',
          padding: '48px 24px',
          background: 'rgba(255,255,255,0.02)',
        }}
      >
        <div
          style={{
            maxWidth: 1200,
            margin: '0 auto',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: 32,
          }}
        >
          <div>
            <div style={{ fontWeight: 700, marginBottom: 12 }}>{SITE_NAME}</div>
            <p style={{ fontSize: 13, color: '#94a3b8', lineHeight: 1.6 }}>
              The AI Opportunity Operating System. Discover and win scholarships, fellowships,
              grants, hackathons, remote jobs and accelerators.
            </p>
          </div>
          <div>
            <div style={{ fontWeight: 600, marginBottom: 12, fontSize: 14 }}>Browse by category</div>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {topCategories.map((c) => (
                <li key={c.slug}>
                  <Link href={`/opportunities/category/${c.slug}`} style={{ color: '#94a3b8', textDecoration: 'none', fontSize: 13 }}>
                    {c.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <div style={{ fontWeight: 600, marginBottom: 12, fontSize: 14 }}>Browse by country</div>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {topCountries.map((c) => (
                <li key={c.slug}>
                  <Link href={`/opportunities/country/${c.slug}`} style={{ color: '#94a3b8', textDecoration: 'none', fontSize: 13 }}>
                    {c.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <div style={{ fontWeight: 600, marginBottom: 12, fontSize: 14 }}>Company</div>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                { href: '/about', label: 'About' },
                { href: '/pricing', label: 'Pricing' },
                { href: '/faq', label: 'FAQ' },
                { href: '/privacy', label: 'Privacy' },
                { href: '/terms', label: 'Terms' },
              ].map((l) => (
                <li key={l.href}>
                  <Link href={l.href} style={{ color: '#94a3b8', textDecoration: 'none', fontSize: 13 }}>
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </footer>
    </div>
  );
}
