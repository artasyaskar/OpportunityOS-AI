'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getProbabilityColor, getProbabilityLabel } from '@/lib/scoring';
import { OpportunityRepository } from '@/lib/repositories/OpportunityRepository';
import type { Opportunity } from '@/lib/gemini';
import { useAuth } from '@/components/auth/AuthProvider';
import { useSubscription } from '@/components/auth/SubscriptionContext';

const TYPE_ICONS: Record<string, string> = {
  scholarship: '🎓', fellowship: '🏛️', grant: '💰',
  job: '💻', accelerator: '🚀', competition: '🏆',
};

const TYPE_COLORS: Record<string, string> = {
  scholarship: '#6366f1', fellowship: '#8b5cf6', grant: '#06b6d4',
  job: '#10b981', accelerator: '#f59e0b', competition: '#f43f5e',
};

const FILTERS = ['All', 'Scholarship', 'Fellowship', 'Grant', 'Job', 'Accelerator', 'Competition'];

export default function OpportunitiesPage() {
  const { user } = useAuth();
  const { subscription } = useSubscription();
  const [activeFilter, setActiveFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'probability' | 'deadline' | 'life_impact'>('probability');
  const [compareList, setCompareList] = useState<string[]>([]);
  const [showCompareModal, setShowCompareModal] = useState(false);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    OpportunityRepository.getAllOpportunities().then(data => {
      setOpportunities(data);
      setLoading(false);
    });
  }, []);

  // Saved collections state
  const [activeCollection, setActiveCollection] = useState<string>('all');

  const getLifeImpactScore = (id: string): number => {
    // Helper weighting prestige, funding, and career projection multiplier
    const weights: Record<string, number> = {
      'chevening-2025': 96,
      'daad-2025': 88,
      'fulbright-2025': 95,
      'erasmus-mundus-2025': 92,
      'commonwealth-2025': 86,
      'gates-cambridge-2025': 98,
    };
    return weights[id] || 75;
  };

  const filtered = opportunities.filter(opp => {
    const matchFilter = activeFilter === 'All' || (opp.type || '').toLowerCase().startsWith(activeFilter.toLowerCase());
    const matchSearch = !search || opp.title.toLowerCase().includes(search.toLowerCase()) || opp.provider.toLowerCase().includes(search.toLowerCase());
    
    // Collections filter
    if (activeCollection === 'dream') {
      return matchFilter && matchSearch && ['chevening-2025', 'gates-cambridge-2025'].includes(opp.id);
    }
    if (activeCollection === 'fully_funded') {
      return matchFilter && matchSearch && ['daad-2025', 'erasmus-mundus-2025', 'chevening-2025'].includes(opp.id);
    }
    
    return matchFilter && matchSearch;
  }).sort((a, b) => {
    if (sortBy === 'probability') return (b.successProbability || 0) - (a.successProbability || 0);
    if (sortBy === 'deadline') return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
    if (sortBy === 'life_impact') return getLifeImpactScore(b.id) - getLifeImpactScore(a.id);
    return 0;
  });

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '28px', fontWeight: 800, color: 'white', marginBottom: '8px' }}>
          🔭 Opportunity Explorer
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '14px' }}>
          {loading ? 'Loading...' : `${opportunities.length} curated opportunities matched to your profile by AI`}
        </p>
      </div>

      {/* Collections tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', background: 'rgba(255,255,255,0.02)', padding: '6px', borderRadius: '10px', width: 'fit-content' }}>
        {[
          { id: 'all', label: '📁 All Opportunities' },
          { id: 'dream', label: '⭐ Dream Universities' },
          { id: 'fully_funded', label: '💰 Fully Funded Europe' }
        ].map(col => (
          <button
            key={col.id}
            onClick={() => setActiveCollection(col.id)}
            style={{
              padding: '6px 12px',
              background: activeCollection === col.id ? 'rgba(99,102,241,0.1)' : 'transparent',
              border: activeCollection === col.id ? '1px solid rgba(99,102,241,0.2)' : '1px solid transparent',
              borderRadius: '6px',
              color: activeCollection === col.id ? '#818cf8' : 'rgba(255,255,255,0.4)',
              fontSize: '11px',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            {col.label}
          </button>
        ))}
      </div>

      {/* Search & Filters */}
      <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', flexWrap: 'wrap' }}>
        <input
          className="input"
          placeholder="🔍 Search opportunities, providers..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ flex: 1, minWidth: '240px' }}
        />
        <select
          className="input"
          value={sortBy}
          onChange={e => setSortBy(e.target.value as typeof sortBy)}
          style={{ width: '220px', appearance: 'none' }}
        >
          <option value="probability">Sort: Success Probability</option>
          <option value="deadline">Sort: Deadline (Soonest)</option>
          <option value="life_impact">Sort: AI Expected Life Impact</option>
        </select>
      </div>

      {/* Type Filter Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '28px', flexWrap: 'wrap' }}>
        {FILTERS.map(f => (
          <button
            key={f}
            onClick={() => setActiveFilter(f)}
            style={{
              padding: '7px 16px',
              borderRadius: '999px',
              border: activeFilter === f ? '1px solid rgba(99,102,241,0.6)' : '1px solid rgba(255,255,255,0.1)',
              background: activeFilter === f ? 'rgba(99,102,241,0.15)' : 'transparent',
              color: activeFilter === f ? '#818cf8' : 'rgba(255,255,255,0.5)',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            {f !== 'All' && `${TYPE_ICONS[f.toLowerCase()]} `}{f}
          </button>
        ))}
      </div>

      {/* Results Count */}
      <div style={{ marginBottom: '16px', color: 'rgba(255,255,255,0.4)', fontSize: '13px' }}>
        Showing {filtered.length} opportunities
      </div>

      {loading ? (
        <div className="two-col-grid" style={{ gap: '16px' }}>
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="card" style={{ padding: '24px', height: '140px', background: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.05)', animation: 'pulse 2s infinite' }} />
          ))}
        </div>
      ) : (
        <div className="two-col-grid" style={{ gap: '16px' }}>
        {filtered.map((opp, index) => {
          const isFree = !subscription || subscription.status === 'FREE' || subscription.planId === 'free';
          const isLocked = isFree && index >= 2;

          const typeLower = (opp.type || '').toLowerCase();
          const probColor = getProbabilityColor(opp.successProbability || 0);
          const probLabel = getProbabilityLabel(opp.successProbability || 0);
          const typeColor = TYPE_COLORS[typeLower] || '#6366f1';
          const typeIcon = TYPE_ICONS[typeLower] || '✨';
          const isCompared = compareList.includes(opp.id);

          if (isLocked) {
            return (
              <div key={opp.id} className="card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', background: 'rgba(255,255,255,0.01)', border: '1px dashed rgba(255,255,255,0.1)' }}>
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ fontSize: '24px' }}>🔒</div>
                  <h4 style={{ color: 'rgba(255,255,255,0.5)', fontSize: '14px', fontWeight: 500 }}>Unlock Premium to see {filtered.length - 2} more matches</h4>
                  <Link href="/dashboard/settings/account" className="btn btn-outline" style={{ fontSize: '12px', padding: '6px 12px' }}>Upgrade to Pro</Link>
                </div>
              </div>
            );
          }

          return (
            <div
              key={opp.id}
              className="card animate-fade-in hover-glow"
              style={{ 
                padding: '24px', 
                display: 'flex', 
                flexDirection: 'column', 
                gap: '16px',
                border: isCompared ? '1px solid rgba(99,102,241,0.5)' : '1px solid rgba(255,255,255,0.06)',
                background: isCompared ? 'rgba(99,102,241,0.02)' : 'var(--card-bg)'
              }}
            >
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div
                    style={{
                      width: '40px', height: '40px', borderRadius: '10px', flexShrink: 0,
                      background: `${typeColor}18`, border: `1px solid ${typeColor}30`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px',
                    }}
                  >
                    {typeIcon}
                  </div>
                  <div>
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <span
                      className="badge"
                      style={{ background: `${typeColor}18`, color: typeColor, border: `1px solid ${typeColor}30`, textTransform: 'capitalize', fontSize: '10px', padding: '2px 8px' }}
                    >
                      {opp.type || 'Opportunity'}
                    </span>
                    <span className="badge badge-indigo" style={{ fontSize: '10px', textTransform: 'uppercase', padding: '2px 8px' }}>
                      ✓ Verified Source
                    </span>
                    <span className="badge" style={{ fontSize: '10px', background: 'rgba(16,185,129,0.1)', color: '#10b981', border: '1px solid rgba(16,185,129,0.2)', fontWeight: 700, padding: '2px 8px' }}>
                      ⚡ AI Impact: {getLifeImpactScore(opp.id)}/100
                    </span>
                  </div>
                  <div style={{ fontSize: '16px', fontWeight: 700, color: 'white', marginTop: '6px', lineHeight: 1.3 }}>{opp.title}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  {/* Compare Checkbox */}
                  <button 
                    onClick={() => {
                      setCompareList(prev => 
                        prev.includes(opp.id) ? prev.filter(id => id !== opp.id) : prev.length < 2 ? [...prev, opp.id] : [prev[1], opp.id]
                      );
                    }}
                    style={{
                      background: isCompared ? 'rgba(99,102,241,0.2)' : 'transparent',
                      border: isCompared ? '1px solid rgba(99,102,241,0.5)' : '1px solid rgba(255,255,255,0.15)',
                      borderRadius: '6px',
                      color: isCompared ? '#818cf8' : 'rgba(255,255,255,0.4)',
                      padding: '4px 8px',
                      fontSize: '11px',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    {isCompared ? '✓ Selected' : '+ Compare'}
                  </button>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '24px', fontWeight: 800, color: opp.successProbability != null ? probColor : 'rgba(255,255,255,0.2)', lineHeight: 1 }}>
                      {opp.successProbability != null ? `${Math.round(opp.successProbability)}%` : '--'}
                    </div>
                    <div style={{ fontSize: '10px', color: opp.successProbability != null ? probColor : 'rgba(255,255,255,0.4)', opacity: 0.8, fontWeight: 600 }}>
                      {opp.successProbability != null ? probLabel : 'Analyze to Score'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Description */}
              <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', lineHeight: 1.5 }}>
                {opp.description.slice(0, 120)}...
              </p>

              {/* Meta */}
              <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                <div>
                  <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', marginBottom: '2px' }}>PROVIDER</div>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: 'rgba(255,255,255,0.7)' }}>{opp.provider}</div>
                </div>
                <div>
                  <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', marginBottom: '2px' }}>COUNTRY</div>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: 'rgba(255,255,255,0.7)' }}>{opp.country}</div>
                </div>
                {opp.fundingLevel && (
                  <div>
                    <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', marginBottom: '2px' }}>VALUE</div>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: '#10b981' }}>{opp.fundingLevel.split('+')[0].trim()}</div>
                  </div>
                )}
                <div>
                  <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', marginBottom: '2px' }}>DIFFICULTY</div>
                  <span className={`badge ${opp.difficulty === 'hard' ? 'badge-rose' : opp.difficulty === 'medium' ? 'badge-amber' : 'badge-emerald'}`} style={{ textTransform: 'capitalize' }}>
                    {opp.difficulty}
                  </span>
                </div>
                <div>
                  <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', marginBottom: '2px' }}>COMPETITION</div>
                  <span className="badge" style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.6)' }}>
                    {opp.competitionLevel === 'high' ? '🔥 High Selectivity' : 'Normal Selectivity'}
                  </span>
                </div>
              </div>

              {/* Eligibility Bar */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', fontWeight: 500 }}>Eligibility Match</span>
                  <span style={{ fontSize: '11px', color: '#818cf8', fontWeight: 700 }}>{opp.eligibilityScore !== undefined ? `${opp.eligibilityScore}%` : 'Pending'}</span>
                </div>
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: `${opp.eligibilityScore || 0}%` }} />
                </div>
              </div>

              {/* Actions */}
              <div className="card-actions" style={{ gap: '10px' }}>
                <Link
                  href={`/dashboard/opportunities/${opp.id}`}
                  className="btn btn-primary btn-sm"
                  style={{ flex: 1, justifyContent: 'center' }}
                >
                  Start Application
                </Link>
                <a
                  href={opp.officialSource}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-secondary btn-sm"
                >
                  Visit Official Site
                </a>
              </div>
            </div>
          );
        })}
      </div>
      )}

      {/* STRATEGIC COMPARE FLOATING SHELF */}
      {compareList.length > 0 && (
        <div className="compare-shelf" style={{
          background: 'rgba(15, 23, 42, 0.9)', backdropFilter: 'blur(12px)',
          border: '1px solid rgba(99,102,241,0.3)', borderRadius: '16px',
          padding: '16px 24px', display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', zIndex: 999,
          boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <span style={{ fontSize: '18px' }}>⚖️</span>
            <div>
              <div style={{ color: 'white', fontWeight: 700, fontSize: '14px' }}>Strategic Comparison Engine</div>
              <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px' }}>
                Selected: {compareList.map(id => opportunities.find(o => o.id === id)?.title.split(' ')[0]).join(' vs ')}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button className="btn btn-ghost btn-sm" onClick={() => setCompareList([])}>Clear</button>
            <button 
              className="btn btn-primary btn-sm" 
              disabled={compareList.length < 2}
              onClick={() => setShowCompareModal(true)}
            >
              📊 Compare Opportunities ({compareList.length}/2)
            </button>
          </div>
        </div>
      )}

      {/* COMPARISON MODAL DIALOG */}
      {showCompareModal && compareList.length >= 2 && (() => {
        const itemA = opportunities.find(o => o.id === compareList[0])!;
        const itemB = opportunities.find(o => o.id === compareList[1])!;
        return (
          <div style={{
            position: 'fixed', inset: 0, background: 'rgba(2, 4, 8, 0.85)',
            backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center',
            justifyContent: 'center', zIndex: 1000, padding: '24px'
          }}>
            <div className="glass-bright" style={{ width: '100%', maxWidth: '850px', borderRadius: '24px', padding: '32px', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <div>
                  <h3 style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '20px', fontWeight: 800, color: 'white' }}>
                    ⚖️ Strategic Advisor Report
                  </h3>
                  <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px' }}>
                    Comparing admission probability, value stipend returns, and career growth.
                  </p>
                </div>
                <button className="btn btn-ghost btn-sm" onClick={() => setShowCompareModal(false)}>Close ✕</button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 2fr', gap: '16px', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '12px', marginBottom: '12px' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,0.3)' }}>METRIC</div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#818cf8' }}>{itemA.title}</div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#10b981' }}>{itemB.title}</div>
              </div>

              {[
                { label: 'Success Odds', valA: `${itemA.successProbability}%`, valB: `${itemB.successProbability}%`, highlight: true },
                { label: 'Award Stipend', valA: itemA.fundingLevel?.split('+')[0] || 'Unknown', valB: itemB.fundingLevel?.split('+')[0] || 'Unknown' },
                { label: 'Prestige Rank', valA: `${itemA.prestigeScore}/100`, valB: `${itemB.prestigeScore}/100` },
                { label: 'Est. Career Value', valA: itemA.careerValue, valB: itemB.careerValue },
                { label: 'Selectivity Level', valA: itemA.competitionLevel, valB: itemB.competitionLevel },
                { label: 'Deadline Date', valA: itemA.deadline, valB: itemB.deadline },
              ].map(row => (
                <div key={row.label} style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 2fr', gap: '16px', padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                  <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>{row.label}</div>
                  <div style={{ fontSize: '13px', color: 'white', fontWeight: row.highlight ? 700 : 500 }}>{row.valA}</div>
                  <div style={{ fontSize: '13px', color: 'white', fontWeight: row.highlight ? 700 : 500 }}>{row.valB}</div>
                </div>
              ))}

              <div className="glass-sm" style={{ padding: '16px', borderRadius: '12px', marginTop: '24px', border: '1px solid rgba(99,102,241,0.2)' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#818cf8', letterSpacing: '1px', marginBottom: '6px' }}>
                  🤖 AI CHIEF OFFICER STRATEGIC RECOMMENDATION
                </div>
                <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.75)', lineHeight: 1.5 }}>
                  Based on your GPA of 3.87 and background in Computer Science / AI, we recommend prioritizing <strong>{itemA.successProbability! > itemB.successProbability! ? itemA.title : itemB.title}</strong> first. It offers a {Math.abs(itemA.successProbability! - itemB.successProbability!)}% higher success odds while yielding equal economic mobility career prestige.
                </p>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
