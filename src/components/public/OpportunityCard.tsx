import Link from 'next/link';
import type { Opportunity } from '@/lib/gemini';

function formatFunding(o: Opportunity): string | null {
  if (o.fundingLevel) return o.fundingLevel;
  if (typeof o.fundingAmount === 'number' && o.fundingAmount > 0) {
    return `${o.currency || 'USD'} ${o.fundingAmount.toLocaleString()}`;
  }
  return null;
}

function formatDeadline(d?: string): string | null {
  if (!d) return null;
  const date = new Date(d);
  if (isNaN(date.getTime())) return null;
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

export default function OpportunityCard({ opp }: { opp: Opportunity }) {
  const funding = formatFunding(opp);
  const deadline = formatDeadline(opp.deadline);
  return (
    <article
      style={{
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 16,
        padding: 24,
        background: 'rgba(255,255,255,0.02)',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        height: '100%',
      }}
    >
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <span
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: '#818cf8',
            background: 'rgba(99,102,241,0.12)',
            padding: '4px 10px',
            borderRadius: 999,
          }}
        >
          {String(opp.type)}
        </span>
        {opp.country && (
          <span style={{ fontSize: 12, color: '#94a3b8', padding: '4px 0' }}>{opp.country}</span>
        )}
      </div>
      <h3 style={{ fontSize: 18, fontWeight: 700, lineHeight: 1.3, margin: 0 }}>
        <Link href={`/opportunities/${opp.id}`} style={{ color: 'white', textDecoration: 'none' }}>
          {opp.title}
        </Link>
      </h3>
      <p style={{ fontSize: 14, color: '#94a3b8', margin: 0 }}>{opp.provider}</p>
      <p style={{ fontSize: 14, color: '#cbd5e1', margin: 0, lineHeight: 1.5, flex: 1 }}>
        {opp.description.length > 140 ? `${opp.description.slice(0, 140)}…` : opp.description}
      </p>
      <div style={{ display: 'flex', gap: 16, fontSize: 13, color: '#e2e8f0', flexWrap: 'wrap' }}>
        {funding && <span>💰 {funding}</span>}
        {deadline && <span>📅 {deadline}</span>}
      </div>
    </article>
  );
}
