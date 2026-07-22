import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { buildMetadata, breadcrumbJsonLd, opportunityJsonLd, toSlug } from '@/lib/seo';
import {
  allPublicOpportunities,
  getOpportunityBySlug,
  relatedOpportunities,
} from '@/lib/catalog';
import PublicShell from '@/components/public/PublicShell';
import OpportunityCard from '@/components/public/OpportunityCard';
import Breadcrumbs from '@/components/public/Breadcrumbs';
import JsonLd from '@/components/JsonLd';

// Pre-render every opportunity at build time (static, ISR-friendly).
export function generateStaticParams() {
  return allPublicOpportunities().map((o) => ({ slug: o.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const opp = getOpportunityBySlug(slug);
  if (!opp) return buildMetadata({ title: 'Opportunity not found', description: '', path: `/opportunities/${slug}`, noindex: true });

  const funding =
    opp.fundingLevel ||
    (opp.fundingAmount ? `${opp.currency || 'USD'} ${opp.fundingAmount.toLocaleString()}` : '');
  const title = `${opp.title} — ${opp.provider}`;
  const description = `${opp.description.slice(0, 155)}${funding ? ` Funding: ${funding}.` : ''}`.slice(0, 160);

  return buildMetadata({
    title,
    description,
    path: `/opportunities/${opp.id}`,
    ogType: 'article',
    keywords: [String(opp.type), opp.country, opp.provider, ...(opp.tags || [])].filter(Boolean) as string[],
  });
}

export default async function OpportunityDetail({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const opp = getOpportunityBySlug(slug);
  if (!opp) notFound();

  const related = relatedOpportunities(opp);
  const categorySlug = toSlug(String(opp.type));
  const countrySlug = opp.country ? toSlug(opp.country) : '';

  const crumbs = [
    { name: 'Home', path: '/' },
    { name: 'Opportunities', path: '/opportunities' },
    { name: String(opp.type), path: `/opportunities/category/${categorySlug}` },
    { name: opp.title, path: `/opportunities/${opp.id}` },
  ];

  const funding =
    opp.fundingLevel ||
    (opp.fundingAmount ? `${opp.currency || 'USD'} ${opp.fundingAmount.toLocaleString()}` : null);
  const deadline = opp.deadline
    ? new Date(opp.deadline).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : null;

  const facts: { label: string; value: React.ReactNode }[] = [
    { label: 'Type', value: <Link href={`/opportunities/category/${categorySlug}`} style={{ color: '#818cf8', textDecoration: 'none' }}>{String(opp.type)}</Link> },
    ...(opp.country ? [{ label: 'Country', value: <Link href={`/opportunities/country/${countrySlug}`} style={{ color: '#818cf8', textDecoration: 'none' }}>{opp.country}</Link> }] : []),
    { label: 'Provider', value: opp.provider },
    ...(funding ? [{ label: 'Funding', value: funding }] : []),
    ...(deadline ? [{ label: 'Deadline', value: deadline }] : []),
    ...(opp.educationLevel?.length ? [{ label: 'Level', value: opp.educationLevel.join(', ') }] : []),
    ...(opp.remote !== undefined ? [{ label: 'Remote', value: opp.remote ? 'Yes' : 'No' }] : []),
  ];

  return (
    <PublicShell>
      <Breadcrumbs items={crumbs} />
      <JsonLd data={[opportunityJsonLd(opp), breadcrumbJsonLd(crumbs)]} />

      <span
        style={{
          fontSize: 13, fontWeight: 600, color: '#818cf8',
          background: 'rgba(99,102,241,0.12)', padding: '4px 12px', borderRadius: 999,
        }}
      >
        {String(opp.type)}
      </span>
      <h1 style={{ fontSize: 38, fontWeight: 800, margin: '16px 0 8px', lineHeight: 1.2 }}>{opp.title}</h1>
      <p style={{ fontSize: 18, color: '#94a3b8', marginBottom: 32 }}>{opp.provider}</p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16, marginBottom: 40 }}>
        {facts.map((f) => (
          <div key={f.label} style={{ border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: 16 }}>
            <div style={{ fontSize: 12, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>{f.label}</div>
            <div style={{ fontSize: 15, fontWeight: 600 }}>{f.value}</div>
          </div>
        ))}
      </div>

      <section style={{ marginBottom: 40 }}>
        <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 12 }}>About this opportunity</h2>
        <p style={{ fontSize: 16, color: '#cbd5e1', lineHeight: 1.7 }}>{opp.description}</p>
      </section>

      {opp.requirements?.length ? (
        <section style={{ marginBottom: 40 }}>
          <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 12 }}>Requirements</h2>
          <ul style={{ color: '#cbd5e1', lineHeight: 1.8, paddingLeft: 20 }}>
            {opp.requirements.map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ul>
        </section>
      ) : null}

      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 56 }}>
        <Link
          href="/signup"
          style={{
            background: 'linear-gradient(135deg, #6366f1, #0ea5e9)', color: 'white',
            padding: '14px 28px', borderRadius: 12, textDecoration: 'none', fontWeight: 600,
          }}
        >
          Get AI help winning this →
        </Link>
        {opp.url && (
          <a
            href={opp.url}
            target="_blank"
            rel="noopener noreferrer nofollow"
            style={{ border: '1px solid rgba(255,255,255,0.2)', color: 'white', padding: '14px 28px', borderRadius: 12, textDecoration: 'none', fontWeight: 600 }}
          >
            Official source ↗
          </a>
        )}
      </div>

      {related.length > 0 && (
        <section>
          <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 20 }}>Related opportunities</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20 }}>
            {related.map((r) => (
              <OpportunityCard key={r.id} opp={r} />
            ))}
          </div>
        </section>
      )}
    </PublicShell>
  );
}
