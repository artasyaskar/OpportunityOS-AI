'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getProbabilityColor } from '@/lib/scoring';
import { OpportunityRepository } from '@/lib/repositories/OpportunityRepository';
import { UserRepository } from '@/lib/repositories/UserRepository';
import { generatePersonalizedFeed, type CategorizedFeed, type OpportunityWithScore } from '@/lib/recommendationEngine';
import { useAuth } from '@/components/auth/AuthProvider';
import { useSubscription } from '@/components/auth/SubscriptionContext';
import { UserProfile } from '@/lib/gemini';

const TYPE_ICONS: Record<string, string> = {
  scholarship: '🎓', fellowship: '🏛️', grant: '💰',
  job: '💻', accelerator: '🚀', competition: '🏆',
  hackathon: '💻', bootcamp: '🔥', internship: '💼',
};

const TYPE_COLORS: Record<string, string> = {
  scholarship: '#6366f1', fellowship: '#8b5cf6', grant: '#06b6d4',
  job: '#10b981', accelerator: '#f59e0b', competition: '#f43f5e',
};

const FEED_TABS = [
  { id: 'recommended', label: '⭐ Recommended For You', desc: 'Highly compatible with your profile' },
  { id: 'easyWins', label: '🎯 Easy Wins', desc: 'High compatibility, low competition' },
  { id: 'closingSoon', label: '⏳ Closing Soon', desc: 'Deadlines within 45 days' },
  { id: 'dreamOpportunities', label: '🚀 Dream Opportunities', desc: 'High prestige or full funding' },
  { id: 'allRanked', label: '📁 All Opportunities', desc: 'Ranked by AI compatibility' },
];

export default function OpportunitiesPage() {
  const { user } = useAuth();
  const { subscription } = useSubscription();
  const [feed, setFeed] = useState<CategorizedFeed | null>(null);
  const [activeTab, setActiveTab] = useState<keyof CategorizedFeed>('recommended');
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [expandedExplain, setExpandedExplain] = useState<Record<string, boolean>>({});

  useEffect(() => {
    async function loadFeed() {
      setLoading(true);
      try {
        let profile = null;
        if (user) {
          profile = await UserRepository.getProfile(user.uid) as UserProfile;
        }
        const allOpps = await OpportunityRepository.getAllOpportunities();
        const categorizedFeed = generatePersonalizedFeed(profile, allOpps);
        setFeed(categorizedFeed);
      } catch (e) {
        console.error("Failed to load feed:", e);
      }
      setLoading(false);
    }
    loadFeed();
  }, [user]);

  const toggleExplain = (id: string) => {
    setExpandedExplain(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const currentOpportunities = feed ? feed[activeTab] : [];
  
  // Local search filter on top of the categorized feed
  const filteredList = currentOpportunities.filter(opp => {
    if (!search) return true;
    const q = search.toLowerCase();
    return opp.title.toLowerCase().includes(q) || 
           opp.provider.toLowerCase().includes(q) ||
           opp.type?.toLowerCase().includes(q);
  });

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '28px', fontWeight: 800, color: 'white', marginBottom: '8px' }}>
          🔭 AI Opportunity Intelligence
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '14px' }}>
          {loading ? 'Analyzing your profile across 500+ global opportunities...' : `Found ${feed?.allRanked.length} opportunities. Ranked by your unique Evidence Graph.`}
        </p>
      </div>

      {/* Feed Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', flexWrap: 'wrap' }}>
        {FEED_TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as keyof CategorizedFeed)}
            style={{
              padding: '10px 16px',
              background: activeTab === tab.id ? 'rgba(99,102,241,0.1)' : 'rgba(255,255,255,0.02)',
              border: activeTab === tab.id ? '1px solid rgba(99,102,241,0.5)' : '1px solid rgba(255,255,255,0.05)',
              borderRadius: '8px',
              color: activeTab === tab.id ? '#818cf8' : 'rgba(255,255,255,0.6)',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
              gap: '4px',
              transition: 'all 0.2s ease',
              minWidth: '180px'
            }}
          >
            <span>{tab.label}</span>
            <span style={{ fontSize: '10px', color: activeTab === tab.id ? 'rgba(129,140,248,0.8)' : 'rgba(255,255,255,0.4)', fontWeight: 400 }}>
              {feed ? feed[tab.id as keyof CategorizedFeed].length : 0} {tab.desc}
            </span>
          </button>
        ))}
      </div>

      {/* Search */}
      <div style={{ marginBottom: '24px' }}>
        <input
          className="input"
          placeholder={`🔍 Search in ${FEED_TABS.find(t => t.id === activeTab)?.label.replace(/[^a-zA-Z ]/g, "").trim()}...`}
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ width: '100%', maxWidth: '400px' }}
        />
      </div>

      {loading ? (
        <div className="two-col-grid" style={{ gap: '16px' }}>
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="card" style={{ padding: '24px', height: '180px', background: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.05)', animation: 'pulse 2s infinite' }} />
          ))}
        </div>
      ) : filteredList.length === 0 ? (
        <div className="card" style={{ padding: '40px', textAlign: 'center', background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.1)' }}>
          <div style={{ fontSize: '32px', marginBottom: '16px' }}>📭</div>
          <h3 style={{ color: 'white', marginBottom: '8px' }}>No matches found in this feed</h3>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '14px', maxWidth: '400px', margin: '0 auto' }}>
            Try updating your profile with more evidence (GPA, Skills, Experience) or check the "All Opportunities" feed.
          </p>
        </div>
      ) : (
        <div className="two-col-grid" style={{ gap: '16px' }}>
        {filteredList.map((opp, index) => {
          const isFree = !subscription || subscription.status === 'FREE' || subscription.planId === 'free';
          const isLocked = isFree && index >= 5; // Show top 5 for free users

          const typeLower = (opp.type || '').toLowerCase();
          const probColor = getProbabilityColor(opp.compatibilityScore);
          const typeColor = TYPE_COLORS[typeLower] || '#6366f1';
          const typeIcon = TYPE_ICONS[typeLower] || '✨';
          const isExpanded = expandedExplain[opp.id] || false;

          if (isLocked) {
            return (
              <div key={opp.id} className="card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', background: 'rgba(255,255,255,0.01)', border: '1px dashed rgba(255,255,255,0.1)' }}>
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', flexDirection: 'column', gap: '12px', padding: '20px 0' }}>
                  <div style={{ fontSize: '24px' }}>🔒</div>
                  <h4 style={{ color: 'rgba(255,255,255,0.5)', fontSize: '14px', fontWeight: 500 }}>Unlock Premium to see {filteredList.length - 5} more AI matches</h4>
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
                border: opp.compatibilityScore >= 80 ? '1px solid rgba(16,185,129,0.3)' : '1px solid var(--border-color)',
                background: opp.compatibilityScore >= 80 ? 'rgba(16,185,129,0.03)' : 'var(--card-bg)'
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
                      {opp.region && (
                        <span className="badge" style={{ fontSize: '10px', background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.6)' }}>
                          🌍 {opp.region}
                        </span>
                      )}
                      {opp.fundingAmount ? (
                        <span className="badge" style={{ fontSize: '10px', background: 'rgba(16,185,129,0.1)', color: '#10b981', border: '1px solid rgba(16,185,129,0.2)', fontWeight: 700 }}>
                          💰 {opp.currency === 'USD' ? '$' : opp.currency === 'EUR' ? '€' : opp.currency === 'GBP' ? '£' : ''}{(opp.fundingAmount/1000).toFixed(0)}k
                        </span>
                      ) : null}
                    </div>
                    <div style={{ fontSize: '16px', fontWeight: 700, color: 'white', marginTop: '6px', lineHeight: 1.3 }}>{opp.title}</div>
                  </div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '24px', fontWeight: 800, color: probColor, lineHeight: 1 }}>
                    {opp.compatibilityScore}%
                  </div>
                  <div style={{ fontSize: '10px', color: probColor, opacity: 0.8, fontWeight: 600 }}>
                    AI Match Score
                  </div>
                </div>
              </div>

              {/* Explainability Accordion */}
              <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)', overflow: 'hidden' }}>
                <button 
                  onClick={() => toggleExplain(opp.id)}
                  style={{ width: '100%', padding: '10px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'transparent', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.7)', fontSize: '12px', fontWeight: 600 }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    🤖 Why am I a {opp.compatibilityScore >= 80 ? 'great' : 'moderate'} match?
                  </span>
                  <span>{isExpanded ? '▲' : '▼'}</span>
                </button>
                {isExpanded && (
                  <div style={{ padding: '0 12px 12px 12px', fontSize: '12px', color: 'rgba(255,255,255,0.6)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {opp.explainability.reasons.map((reason, i) => (
                      <div key={i} style={{ display: 'flex', gap: '6px', alignItems: 'flex-start' }}>
                        <span style={{ color: reason.startsWith('✓') ? '#10b981' : reason.startsWith('✗') ? '#f43f5e' : '#f59e0b' }}>
                          {reason.charAt(0)}
                        </span>
                        <span>{reason.substring(1).trim()}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Description & Requirements */}
              <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', lineHeight: 1.5 }}>
                {opp.aiGeneratedSummary || opp.description.slice(0, 120) + '...'}
              </p>

              {/* Meta */}
              <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginTop: 'auto' }}>
                <div>
                  <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', marginBottom: '2px' }}>PROVIDER</div>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: 'rgba(255,255,255,0.7)' }}>{opp.provider}</div>
                </div>
                <div>
                  <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', marginBottom: '2px' }}>DEADLINE</div>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: opp.deadline ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.3)' }}>{opp.deadline || 'Rolling'}</div>
                </div>
                <div>
                  <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', marginBottom: '2px' }}>COMPETITION</div>
                  <span className={`badge ${opp.competitionLevel === 'high' ? 'badge-rose' : opp.competitionLevel === 'medium' ? 'badge-amber' : 'badge-emerald'}`} style={{ textTransform: 'capitalize' }}>
                    {opp.competitionLevel || 'Unknown'}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="card-actions" style={{ gap: '10px', marginTop: '8px' }}>
                <Link
                  href={`/dashboard/opportunities/${opp.id}`}
                  className="btn btn-primary btn-sm"
                  style={{ flex: 1, justifyContent: 'center' }}
                >
                  Analyze & Apply
                </Link>
                {opp.url && (
                  <a
                    href={opp.url}
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-secondary btn-sm"
                  >
                    Site ↗
                  </a>
                )}
              </div>
            </div>
          );
        })}
      </div>
      )}
    </div>
  );
}
