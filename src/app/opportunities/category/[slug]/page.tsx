import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { buildMetadata, breadcrumbJsonLd } from '@/lib/seo';
import { categoryFacets, opportunitiesByCategorySlug, facetLabel } from '@/lib/catalog';
import PublicShell from '@/components/public/PublicShell';
import OpportunityCard from '@/components/public/OpportunityCard';
import Breadcrumbs from '@/components/public/Breadcrumbs';
import JsonLd from '@/components/JsonLd';

export function generateStaticParams() {
  return categoryFacets().map((f) => ({ slug: f.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const label = facetLabel(categoryFacets(), slug);
  if (!label) return buildMetadata({ title: 'Not found', description: '', path: `/opportunities/category/${slug}`, noindex: true });
  const count = opportunitiesByCategorySlug(slug).length;
  return buildMetadata({
    title: `${label} — ${count} Verified Opportunities`,
    description: `Browse ${count} verified ${label.toLowerCase()} from around the world. AI-matched and ranked by OpportunityOS AI to help you discover and win.`,
    path: `/opportunities/category/${slug}`,
    keywords: [label, `${label} 2027`, `apply for ${label.toLowerCase()}`],
  });
}

export default async function CategoryHub({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const label = facetLabel(categoryFacets(), slug);
  const opps = opportunitiesByCategorySlug(slug);
  if (!label || opps.length === 0) notFound();

  const crumbs = [
    { name: 'Home', path: '/' },
    { name: 'Opportunities', path: '/opportunities' },
    { name: label, path: `/opportunities/category/${slug}` },
  ];

  return (
    <PublicShell>
      <Breadcrumbs items={crumbs} />
      <JsonLd
        data={[
          breadcrumbJsonLd(crumbs),
          {
            '@context': 'https://schema.org',
            '@type': 'CollectionPage',
            name: `${label} Opportunities`,
            description: `${opps.length} verified ${label.toLowerCase()}.`,
            numberOfItems: opps.length,
          },
        ]}
      />
      <h1 style={{ fontSize: 40, fontWeight: 800, marginBottom: 12 }}>{label}</h1>
      <p style={{ fontSize: 18, color: '#94a3b8', marginBottom: 40, maxWidth: 720 }}>
        {opps.length} verified {label.toLowerCase()} curated by OpportunityOS AI. Each opportunity is
        structured with deadlines, funding, eligibility and requirements to help you apply with confidence.
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20 }}>
        {opps.map((opp) => (
          <OpportunityCard key={opp.id} opp={opp} />
        ))}
      </div>
    </PublicShell>
  );
}
