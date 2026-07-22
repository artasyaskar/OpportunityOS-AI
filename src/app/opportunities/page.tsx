import type { Metadata } from 'next';
import Link from 'next/link';
import { buildMetadata, breadcrumbJsonLd } from '@/lib/seo';
import {
  allPublicOpportunities,
  categoryFacets,
  countryFacets,
  searchPublic,
} from '@/lib/catalog';
import PublicShell from '@/components/public/PublicShell';
import OpportunityCard from '@/components/public/OpportunityCard';
import Breadcrumbs from '@/components/public/Breadcrumbs';
import JsonLd from '@/components/JsonLd';

export const metadata: Metadata = buildMetadata({
  title: 'Browse Opportunities — Scholarships, Fellowships, Grants & More',
  description:
    'Explore verified scholarships, fellowships, grants, hackathons, remote jobs and accelerators from around the world. Filtered, matched and ranked by AI.',
  path: '/opportunities',
  keywords: ['scholarships', 'fellowships', 'grants', 'hackathons', 'remote jobs', 'accelerators'],
});

export default async function OpportunitiesIndex({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const opps = q ? searchPublic(q) : allPublicOpportunities();
  const categories = categoryFacets();
  const countries = countryFacets().slice(0, 16);

  return (
    <PublicShell>
      <Breadcrumbs items={[{ name: 'Home', path: '/' }, { name: 'Opportunities', path: '/opportunities' }]} />
      <JsonLd
        data={breadcrumbJsonLd([
          { name: 'Home', path: '/' },
          { name: 'Opportunities', path: '/opportunities' },
        ])}
      />

      <h1 style={{ fontSize: 40, fontWeight: 800, marginBottom: 12 }}>
        {q ? `Results for “${q}”` : 'Browse Opportunities'}
      </h1>
      <p style={{ fontSize: 18, color: '#94a3b8', marginBottom: 32, maxWidth: 720 }}>
        {opps.length} verified opportunities across scholarships, fellowships, grants, hackathons,
        remote jobs and accelerators — curated and structured for you.
      </p>

      {/* Category chips (internal links) */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 40 }}>
        {categories.map((c) => (
          <Link
            key={c.slug}
            href={`/opportunities/category/${c.slug}`}
            style={{
              fontSize: 13,
              color: '#cbd5e1',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: 999,
              padding: '6px 14px',
              textDecoration: 'none',
            }}
          >
            {c.label} ({c.count})
          </Link>
        ))}
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
          gap: 20,
        }}
      >
        {opps.map((opp) => (
          <OpportunityCard key={opp.id} opp={opp} />
        ))}
      </div>

      {/* Country hub links for crawl depth */}
      <section style={{ marginTop: 56 }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 16 }}>Explore by country</h2>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {countries.map((c) => (
            <Link
              key={c.slug}
              href={`/opportunities/country/${c.slug}`}
              style={{ fontSize: 13, color: '#94a3b8', textDecoration: 'none' }}
            >
              {c.label} ({c.count}) ·
            </Link>
          ))}
        </div>
      </section>
    </PublicShell>
  );
}
