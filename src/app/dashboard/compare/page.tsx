'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { SubscriptionRecord } from '@/lib/subscription';
import { useSubscription } from '@/components/auth/SubscriptionContext';
import { getQuotaState, QuotaState } from '@/lib/costLimiter';
import { Activity, Rocket } from 'lucide-react';

interface CompareItem {
  id: string;
  name: string;
  country: string;
  funding: string;
  prestige: string;
  difficulty: string;
  livingCost: string;
  visaDifficulty: string;
  outcomeStats: string;
  aiScore: number;
  aiRecommendation: string;
}

const OPPORTUNITIES: CompareItem[] = [
  {
    id: 'chevening',
    name: 'Chevening Scholarship (UK)',
    country: 'United Kingdom',
    funding: 'Fully-Funded + £1,500/mo stipend',
    prestige: '★★★★★ (Global Elite)',
    difficulty: 'High (2.5% Acceptance)',
    livingCost: 'High (£1,200/mo average)',
    visaDifficulty: 'Moderate (Tier 4 Sponsor)',
    outcomeStats: '92% return rate to leadership roles',
    aiScore: 82,
    aiRecommendation: 'Recommended: Highest alignment with candidate\'s leadership track. Crucial to emphasize public policy engagement in SOP.',
  },
  {
    id: 'daad',
    name: 'DAAD Scholarship (Germany)',
    country: 'Germany',
    funding: 'Fully-Funded + €1,200/mo stipend',
    prestige: '★★★★☆ (Highly Reputable)',
    difficulty: 'Moderate (8% Acceptance)',
    livingCost: 'Moderate (€900/mo average)',
    visaDifficulty: 'Low (German Student Visa)',
    outcomeStats: '88% transition to local R&D centers',
    aiScore: 78,
    aiRecommendation: 'Strong Match: Highly recommended for candidate\'s technical/engineering background. Needs publication proof or thesis drafts.',
  },
  {
    id: 'erasmus',
    name: 'Erasmus Mundus Joint Masters',
    country: 'Europe (Multi-Country)',
    funding: 'Fully-Funded + €1,400/mo stipend',
    prestige: '★★★★★ (Top Consortium)',
    difficulty: 'High (1.8% Acceptance)',
    livingCost: 'Variable (€800 - €1,100/mo)',
    visaDifficulty: 'High (Multiple Schengen states)',
    outcomeStats: '95% employment rate post-graduation',
    aiScore: 74,
    aiRecommendation: 'Alternative Match: Excellent target if geographic mobility is preferred. Requires detailed descriptions of core subject courses.',
  },
];

export default function ComparePage() {
  const [leftId, setLeftId] = useState('chevening');
  const [rightId, setRightId] = useState('daad');
  const { subscription: sub } = useSubscription();
  const [quota, setQuota] = useState<QuotaState | null>(null);

  useEffect(() => {
    setQuota(getQuotaState());
  }, []);

  const leftItem = OPPORTUNITIES.find(o => o.id === leftId) || OPPORTUNITIES[0];
  const rightItem = OPPORTUNITIES.find(o => o.id === rightId) || OPPORTUNITIES[1];

  const isFree = !sub || sub.status === 'FREE';

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', paddingBottom: '60px', position: 'relative' }}>
      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <Link href="/dashboard/opportunities" style={{ textDecoration: 'none', color: 'rgba(255,255,255,0.4)', fontSize: '13px', display: 'block', marginBottom: '8px' }}>
          ← Back to Opportunity discovery
        </Link>
        <h1 style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '28px', fontWeight: 800, color: 'white', marginBottom: '8px' }}>
          <Activity size={28} className="inline mr-2 text-indigo-400" /> Opportunity Comparison Studio
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '14px' }}>
          Select and evaluate opportunities side-by-side with localized parameters and final AI CEO assessments.
        </p>
      </div>

      {/* Selectors Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px', filter: isFree ? 'blur(4px)' : 'none', pointerEvents: isFree ? 'none' : 'auto' }}>
        <div className="card" style={{ padding: '16px' }}>
          <label style={{ display: 'block', fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginBottom: '8px', fontWeight: 700 }}>OPPORTUNITY A</label>
          <select 
            value={leftId} 
            onChange={e => setLeftId(e.target.value)}
            style={{ width: '100%', padding: '10px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', color: 'white', outline: 'none' }}
          >
            {OPPORTUNITIES.map(o => <option key={o.id} value={o.id} style={{ background: '#0a0c10' }}>{o.name}</option>)}
          </select>
        </div>

        <div className="card" style={{ padding: '16px' }}>
          <label style={{ display: 'block', fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginBottom: '8px', fontWeight: 700 }}>OPPORTUNITY B</label>
          <select 
            value={rightId} 
            onChange={e => setRightId(e.target.value)}
            style={{ width: '100%', padding: '10px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', color: 'white', outline: 'none' }}
          >
            {OPPORTUNITIES.map(o => <option key={o.id} value={o.id} style={{ background: '#0a0c10' }}>{o.name}</option>)}
          </select>
        </div>
      </div>

      {/* Comparison Matrix Table */}
      <div style={{ position: 'relative' }}>
        <div style={{ filter: isFree ? 'blur(8px)' : 'none', pointerEvents: isFree ? 'none' : 'auto', transition: 'all 0.3s ease', padding: '24px' }} className="card">
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                <th style={{ width: '25%', padding: '12px 10px', textAlign: 'left', fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>METRIC</th>
                <th style={{ width: '37.5%', padding: '12px 10px', textAlign: 'left', fontSize: '14px', color: '#818cf8', fontWeight: 700 }}>{leftItem.name}</th>
                <th style={{ width: '37.5%', padding: '12px 10px', textAlign: 'left', fontSize: '14px', color: '#34d399', fontWeight: 700 }}>{rightItem.name}</th>
              </tr>
            </thead>
            <tbody>
              {[
                { label: 'Target Region', left: leftItem.country, right: rightItem.country },
                { label: 'Funding Value', left: leftItem.funding, right: rightItem.funding },
                { label: 'Global Prestige', left: leftItem.prestige, right: rightItem.prestige },
                { label: 'Acceptance Rate', left: leftItem.difficulty, right: rightItem.difficulty },
                { label: 'Cost of Living', left: leftItem.livingCost, right: rightItem.livingCost },
                { label: 'Visa Complexity', left: leftItem.visaDifficulty, right: rightItem.visaDifficulty },
                { label: 'Career Outcomes', left: leftItem.outcomeStats, right: rightItem.outcomeStats },
              ].map((row, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <td style={{ padding: '14px 10px', fontSize: '12px', color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>{row.label}</td>
                  <td style={{ padding: '14px 10px', fontSize: '13px', color: 'white' }}>{row.left}</td>
                  <td style={{ padding: '14px 10px', fontSize: '13px', color: 'white' }}>{row.right}</td>
                </tr>
              ))}
              {/* AI Fit Score Row */}
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', background: 'rgba(99,102,241,0.02)' }}>
                <td style={{ padding: '18px 10px', fontSize: '12px', color: 'rgba(255,255,255,0.6)', fontWeight: 700 }}>AI Match Probability</td>
                <td style={{ padding: '18px 10px', fontSize: '20px', fontWeight: 900, color: '#818cf8' }}>{leftItem.aiScore}%</td>
                <td style={{ padding: '18px 10px', fontSize: '20px', fontWeight: 900, color: '#34d399' }}>{rightItem.aiScore}%</td>
              </tr>
              {/* AI Advisor Assessment */}
              <tr>
                <td style={{ padding: '18px 10px', fontSize: '12px', color: 'rgba(255,255,255,0.6)', fontWeight: 700 }}>AI Strategic Assessment</td>
                <td style={{ padding: '18px 10px', fontSize: '12px', color: 'rgba(255,255,255,0.7)', lineHeight: 1.5 }}>{leftItem.aiRecommendation}</td>
                <td style={{ padding: '18px 10px', fontSize: '12px', color: 'rgba(255,255,255,0.7)', lineHeight: 1.5 }}>{rightItem.aiRecommendation}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* AI DECISION ENGINE CARD */}
        {!isFree && (
          <div className="card-magnetic glow-border" style={{ padding: '24px', marginTop: '24px', background: 'rgba(99,102,241,0.02)', borderLeft: '4px solid #818cf8' }}>
            <h3 style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '18px', fontWeight: 700, color: 'white', marginBottom: '16px' }}>
              <Activity size={18} className="inline mr-2 text-indigo-400" /> AI Decision Engine Recommendation
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <div className="glass-sm" style={{ padding: '14px' }}>
                <div style={{ fontSize: '9px', color: '#10b981', fontWeight: 700, letterSpacing: '0.5px' }}>BEST FINANCIAL ROI</div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: 'white', marginTop: '4px' }}>Chevening Scholarship</div>
                <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginTop: '4px', lineHeight: 1.3 }}>
                  Full fee waiver + higher monthly stipend. Highest financial support value.
                </p>
              </div>
              <div className="glass-sm" style={{ padding: '14px' }}>
                <div style={{ fontSize: '9px', color: '#818cf8', fontWeight: 700, letterSpacing: '0.5px' }}>BEST MATCH PROBABILITY</div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: 'white', marginTop: '4px' }}>DAAD Scholarship</div>
                <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginTop: '4px', lineHeight: 1.3 }}>
                  Admissions favor technical fields. Matches your GPA coordinates.
                </p>
              </div>
              <div className="glass-sm" style={{ padding: '14px' }}>
                <div style={{ fontSize: '9px', color: '#06b6d4', fontWeight: 700, letterSpacing: '0.5px' }}>BEST CAREER EXPANSION</div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: 'white', marginTop: '4px' }}>Erasmus Mundus</div>
                <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginTop: '4px', lineHeight: 1.3 }}>
                  Multi-university mobility paths across 3 EU countries.
                </p>
              </div>
            </div>
            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)', lineHeight: 1.5 }}>
              <strong>AI Decision Verdict:</strong> If immediate cash-flow stability is your primary metric, apply to **Chevening**. If academic research credentials are your focus, **DAAD** is your highest-probability pathway.
            </p>
          </div>
        )}

        {isFree && (
          <div style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(2, 4, 8, 0.45)',
            backdropFilter: 'blur(4px)',
            borderRadius: '16px',
            border: '1px solid rgba(255,255,255,0.08)',
            padding: '24px',
            zIndex: 5
          }}>
            <div className="card-magnetic glow-border glass-panel" style={{ maxWidth: '440px', width: '100%', padding: '32px', textAlign: 'center' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '12px' }}><Activity size={40} className="text-indigo-400" /></div>
              <h3 style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '18px', fontWeight: 800, color: 'white', marginBottom: '8px' }}>
                Unlock Opportunity Comparison Studio
              </h3>
              <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', lineHeight: 1.5, marginBottom: '20px' }}>
                Compare stipends, living cost adjustments, visa parameters, and prestige levels side-by-side to optimize your applications portfolio.
              </p>
              
              <div className="glass-sm" style={{ padding: '10px', borderRadius: '8px', display: 'flex', justifyItems: 'center', justifyContent: 'space-between', fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginBottom: '20px' }}>
                <span>Free Daily AI Quota Remaining:</span>
                <span style={{ fontWeight: 700, color: 'white' }}>{3 - (quota?.dailyRequests || 0)} / 3 Requests</span>
              </div>

              <Link href="/dashboard/settings" className="btn btn-primary" style={{ display: 'flex', justifyContent: 'center', padding: '12px' }}>
                <Rocket size={18} className="inline mr-2" /> Upgrade to Professional Tier
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
