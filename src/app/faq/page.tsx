'use client';

import Link from 'next/link';

export default function FAQPage() {
  return (
    <div style={{ background: 'var(--bg-primary)', minHeight: '100vh', display: 'flex', flexDirection: 'column', color: 'white', fontFamily: 'Space Grotesk, sans-serif' }}>
      <div style={{ maxWidth: '800px', margin: '80px auto', padding: '0 24px', flex: 1 }}>
        <Link href="/" style={{ color: '#818cf8', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '8px', marginBottom: '32px' }}>
          ← Back to Home
        </Link>
        <h1 style={{ fontSize: '38px', fontWeight: 800, marginBottom: '24px' }}>Frequently Asked Questions</h1>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginTop: '32px' }}>
          {[
            { q: 'What is OpportunityOS AI?', a: 'OpportunityOS AI is an economic mobility operating system acting as your AI Chief Opportunity Officer. Unlike simple search engines or boards, it tracks, scores, and supports your entire document submission workflow to help you acquire elite opportunities.' },
            { q: 'How does the Opportunity Score work?', a: 'The score is generated dynamically through formulaic constraints mapping Eligibility match, connected document Readiness, ROI metrics, win Probability predictions, and Program Selectivity.' },
            { q: 'What is the Zero-Hallucination writing policy?', a: 'We strictly enforce evidence-first drafting. The AI will never invent stories, tragedies, publications, or credentials. It maps exact metrics from your onboarding profile directly into drafts, leaving placeholders for details you need to verify.' },
            { q: 'How does the Success Simulator calculate odds updates?', a: 'It dynamically measures the weight of credentials (e.g. increasing IELTS bands, adding publications) against historical benchmark admission curves to calculate potential probability uplifts.' }
          ].map(faq => (
            <div key={faq.q} className="card" style={{ padding: '24px' }}>
              <div style={{ fontSize: '16px', fontWeight: 700, color: 'white', marginBottom: '10px' }}>{faq.q}</div>
              <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.6)', lineHeight: 1.5 }}>{faq.a}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
