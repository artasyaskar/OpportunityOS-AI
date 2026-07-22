import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { buildMetadata, breadcrumbJsonLd } from '@/lib/seo';
import { countryFacets, opportunitiesByCountrySlug, facetLabel } from '@/lib/catalog';
import PublicShell from '@/components/public/PublicShell';
import OpportunityCard from '@/components/public/OpportunityCard';
import Breadcrumbs from '@/components/public/Breadcrumbs';
import JsonLd from '@/components/JsonLd';

export function generateStaticParams() {
  return countryFacets().map((f) => ({ slug: f.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const label = facetLabel(countryFacets(), slug);
  if (!label) return buildMetadata({ title: 'Not found', description: '', path: `/opportunities/country/${slug}`, noindex: true });
  const count = opportunitiesByCountrySlug(slug).length;
  return buildMetadata({
    title: `Opportunities in ${label} — ${count} Verified Programs`,
    description: `Discover ${count} verified scholarships, fellowships, grants and programs in ${label}. AI-matched by OpportunityOS AI.`,
    path: `/opportunities/country/${slug}`,
    keywords: [`scholarships in ${label}`, `study in ${label}`, `grants ${label}`, `fellowships ${label}`],
  });
}

export default async function CountryHub({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const label = facetLabel(countryFacets(), slug);
  const opps = opportunitiesByCountrySlug(slug);
  if (!label || opps.length === 0) notFound();

  const crumbs = [
    { name: 'Home', path: '/' },
    { name: 'Opportunities', path: '/opportunities' },
    { name: label, path: `/opportunities/country/${slug}` },
  ];

  return (
    <PublicShell>
      <Breadcrumbs items={crumbs} />
      <JsonLd data={breadcrumbJsonLd(crumbs)} />
      <h1 style={{ fontSize: 40, fontWeight: 800, marginBottom: 12 }}>Opportunities in {label}</h1>
      <p style={{ fontSize: 18, color: '#94a3b8', marginBottom: 40, maxWidth: 720 }}>
        {opps.length} verified opportunities in {label} — scholarships, fellowships, grants and more,
        curated and structured by OpportunityOS AI.
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20 }}>
        {opps.map((opp) => (
          <OpportunityCard key={opp.id} opp={opp} />
        ))}
      </div>
    </PublicShell>
  );
}
