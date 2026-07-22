'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { getProbabilityColor } from '@/lib/scoring';
import { OpportunityRepository } from '@/lib/repositories/OpportunityRepository';
import { UserRepository } from '@/lib/repositories/UserRepository';
import { generatePersonalizedFeed, type CategorizedFeed, type OpportunityWithScore } from '@/lib/recommendationEngine';
import { SemanticSearchService } from '@/lib/services/SemanticSearchService';
import { useAuth } from '@/components/auth/AuthProvider';
import { useSubscription } from '@/components/auth/SubscriptionContext';
import { UserProfile } from '@/lib/gemini';
import { GraduationCap, Landmark, DollarSign, Laptop, Briefcase, Rocket, Trophy, Flame, Bot, Globe, Mic, Lightbulb, Plane, Heart, Wrench, Star, Target, Clock, Folder, Search, AlertTriangle, Inbox, Check, X, Info, Telescope, Brain, Sparkles, MapPin, Shield, Lock, Microscope } from 'lucide-react';

const TYPE_ICONS: Record<string, React.ReactNode> = {
  'scholarships': <GraduationCap size={16} />, 'fellowships': <Landmark size={16} />, 'grants': <DollarSign size={16} />,
  'remote jobs': <Laptop size={16} />, 'internships': <Briefcase size={16} />, 'accelerators': <Rocket size={16} />, 
  'competitions': <Trophy size={16} />, 'hackathons': <Laptop size={16} />, 'bootcamps': <Flame size={16} />,
  'ai challenges': <Bot size={16} />, 'climate programs': <Globe size={16} />, 'conferences': <Mic size={16} />,
  'entrepreneurship programs': <Lightbulb size={16} />, 'exchange programs': <Plane size={16} />,
  'government funding': <Landmark size={16} />, 'graduate programs': <GraduationCap size={16} />, 
  'incubators': <Flame size={16} />, 'innovation programs': <Lightbulb size={16} />, 
  'ngo opportunities': <Briefcase size={16} />, 'research programs': <Microscope size={16} />,
  'volunteer programs': <Heart size={16} />, 'workshops': <Wrench size={16} />
};

const TYPE_COLORS: Record<string, string> = {
  'scholarships': '#6366f1', 'fellowships': '#8b5cf6', 'grants': '#06b6d4',
  'remote jobs': '#10b981', 'internships': '#10b981', 'accelerators': '#f59e0b', 
  'competitions': '#f43f5e', 'hackathons': '#ec4899', 'bootcamps': '#f97316',
  'ai challenges': '#3b82f6', 'climate programs': '#22c55e', 'conferences': '#8b5cf6',
  'entrepreneurship programs': '#f59e0b', 'exchange programs': '#06b6d4',
  'government funding': '#64748b', 'graduate programs': '#6366f1',
  'incubators': '#f59e0b', 'innovation programs': '#ec4899',
  'ngo opportunities': '#14b8a6', 'research programs': '#8b5cf6',
  'volunteer programs': '#ef4444', 'workshops': '#8b5cf6'
};

const FEED_TABS = [
  { id: 'recommended', label: <><Star size={14} className="inline mr-2 text-yellow-400" /> Recommended For You</>, desc: 'Highly compatible with your profile' },
  { id: 'easyWins', label: <><Target size={14} className="inline mr-2 text-indigo-400" /> Easy Wins</>, desc: 'High compatibility, low competition' },
  { id: 'closingSoon', label: <><Clock size={14} className="inline mr-2 text-indigo-400" /> Closing Soon</>, desc: 'Deadlines within 45 days' },
  { id: 'dreamOpportunities', label: <><Rocket size={14} className="inline mr-2 text-indigo-400" /> Dream Opportunities</>, desc: 'High prestige or full funding' },
  { id: 'allRanked', label: <><Folder size={14} className="inline mr-2 text-indigo-400" /> All Opportunities</>, desc: 'Ranked by AI compatibility' },
];

export default function OpportunitiesPage() {
  const { user } = useAuth();
  const { subscription } = useSubscription();
  const [feed, setFeed] = useState<CategorizedFeed | null>(null);
  const [activeTab, setActiveTab] = useState<keyof CategorizedFeed>('recommended');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [expandedExplain, setExpandedExplain] = useState<Record<string, boolean>>({});

  const loadFeed = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
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
      setLoadError("We couldn't load opportunities right now. Please try again.");
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    loadFeed();
  }, [loadFeed]);

  const toggleExplain = (id: string) => {
    setExpandedExplain(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const currentOpportunities = feed ? feed[activeTab] : [];

  // Search behaviour:
  //  - Empty query  → show the personalized, ranked feed for the active tab.
  //  - With a query → run the semantic/NL parser across the FULL ranked corpus
  //    (so "fully funded AI scholarships in Germany" works, not just substrings),
  //    preserving each opportunity's compatibility score + explainability, and
  //    surfacing WHY it matched the query.
  const semanticMatches = search.trim() && feed
    ? SemanticSearchService.search(search, feed.allRanked)
    : null;

  const filteredList: OpportunityWithScore[] = semanticMatches
    ? semanticMatches.map(m => {
        const base = m.opportunity as OpportunityWithScore;
        return {
          ...base,
          explainability: {
            ...base.explainability,
            reasons: [
              ...m.matchReasons.map(r => `🔎 ${r}`),
              ...(base.explainability?.reasons || []),
            ],
          },
        };
      })
    : currentOpportunities;

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '28px', fontWeight: 800, color: 'white', marginBottom: '8px' }}>
          <Telescope size={28} className="inline mr-2 text-indigo-400" /> AI Opportunity Intelligence
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '14px' }}>
          {loading
            ? 'Analyzing your profile across global opportunities...'
            : loadError
              ? 'Something went wrong loading your feed.'
              : `Found ${feed?.allRanked.length ?? 0} opportunities. Ranked by your unique Evidence Graph.`}
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

      {/* Semantic / Natural-Language Search */}
      <div style={{ marginBottom: '24px' }}>
        <input
          className="input"
          placeholder={'🔍 Try: "fully funded AI scholarships in Germany closing this month"'}
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ width: '100%', maxWidth: '560px' }}
        />
        {semanticMatches && (
          <div style={{ padding: '12px 16px', background: 'rgba(99,102,241,0.05)', borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: '12px', color: '#818cf8', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Brain size={14} /> Natural-language search across all {feed?.allRanked.length ?? 0} opportunities · {filteredList.length} match{filteredList.length === 1 ? '' : 'es'}
          </div>
        )}
      </div>

      {loading ? (
        <div className="two-col-grid" style={{ gap: '16px' }}>
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="card" style={{ padding: '24px', height: '180px', background: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.05)', animation: 'pulse 2s infinite' }} />
          ))}
        </div>
      ) : loadError ? (
        <div className="card" style={{ padding: '40px', textAlign: 'center', background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(239,68,68,0.3)' }}>
          <div style={{ fontSize: '32px', marginBottom: '16px', display: 'flex', justifyContent: 'center' }}><AlertTriangle size={32} className="text-yellow-400" /></div>
          <h3 style={{ color: 'white', marginBottom: '8px' }}>Couldn't load opportunities</h3>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '14px', maxWidth: '400px', margin: '0 auto 16px' }}>{loadError}</p>
          <button className="btn btn-outline" style={{ fontSize: '13px', padding: '8px 16px' }} onClick={() => loadFeed()}>Try again</button>
        </div>
      ) : filteredList.length === 0 ? (
        <div className="card" style={{ padding: '40px', textAlign: 'center', background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.1)' }}>
          <div style={{ fontSize: '32px', marginBottom: '16px', display: 'flex', justifyContent: 'center' }}><Inbox size={32} className="text-indigo-400" /></div>
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
          const typeIcon = TYPE_ICONS[typeLower] || <Sparkles size={20} />;
          const isExpanded = expandedExplain[opp.id] || false;

          if (isLocked) {
            return (
              <div key={opp.id} className="card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', background: 'rgba(255,255,255,0.01)', border: '1px dashed rgba(255,255,255,0.1)' }}>
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', flexDirection: 'column', gap: '12px', padding: '20px 0' }}>
                  <div style={{ display: 'flex', justifyContent: 'center' }}><Lock size={24} className="text-indigo-400" /></div>
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
                          <Globe size={10} className="inline mr-1" /> {opp.region}
                        </span>
                      )}
                      {opp.fundingAmount ? (
                        <span className="badge" style={{ fontSize: '10px', background: 'rgba(16,185,129,0.1)', color: '#10b981', border: '1px solid rgba(16,185,129,0.2)', fontWeight: 700 }}>
                          <DollarSign size={10} className="inline" /> {opp.currency === 'USD' ? '$' : opp.currency === 'EUR' ? '€' : opp.currency === 'GBP' ? '£' : ''}{(opp.fundingAmount/1000).toFixed(0)}k
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
                    <Bot size={14} className="text-indigo-400" /> Why am I a {opp.compatibilityScore >= 80 ? 'great' : 'moderate'} match?
                  </span>
                  <span>{isExpanded ? '▲' : '▼'}</span>
                </button>
                {isExpanded && (
                  <div style={{ padding: '0 12px 12px 12px', fontSize: '12px', color: 'rgba(255,255,255,0.6)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {opp.explainability.reasons.map((reason, i) => {
                      const firstChar = reason.charAt(0);
                      let Icon = <Info size={12} />;
                      let color = '#f59e0b';
                      if (firstChar === '✓') { Icon = <Check size={12} />; color = '#10b981'; }
                      else if (firstChar === '✗') { Icon = <X size={12} />; color = '#f43f5e'; }
                      else if (firstChar === '🔎') { Icon = <Search size={12} />; color = '#6366f1'; }
                      return (
                        <div key={i} style={{ display: 'flex', gap: '6px', alignItems: 'flex-start' }}>
                          <span style={{ color }}>{Icon}</span>
                          <span>{reason.substring(1).trim()}</span>
                        </div>
                      );
                    })}
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
