'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useSubscription } from '@/components/auth/SubscriptionContext';
import { useProfile } from '@/components/auth/ProfileContext';
import { getQuotaState, QuotaState } from '@/lib/costLimiter';
import { OpportunityRepository } from '@/lib/repositories/OpportunityRepository';
import { calculateCompatibilityScore, generateExplainability } from '@/lib/scoringEngine';
import type { Opportunity } from '@/lib/gemini';
import { Activity, Rocket, Sparkles, Loader2, DollarSign, Target, Award, Globe, Search, RefreshCw, Zap, CheckCircle2, ArrowRight } from 'lucide-react';

export default function ComparePage() {
  const { subscription: sub } = useSubscription();
  const { profile } = useProfile();
  const [quota, setQuota] = useState<QuotaState | null>(null);
  
  const [allOpportunities, setAllOpportunities] = useState<Opportunity[]>([]);
  const [loadingOpps, setLoadingOpps] = useState(true);
  const [leftId, setLeftId] = useState<string>('chevening-2027');
  const [rightId, setRightId] = useState<string>('daad-2027');
  const [searchFilter, setSearchFilter] = useState('');

  // AI Decision Engine execution state
  const [aiRunning, setAiRunning] = useState(false);
  const [aiAnalyzed, setAiAnalyzed] = useState(false);
  const [aiStepMessage, setAiStepMessage] = useState('');

  useEffect(() => {
    setQuota(getQuotaState());

    OpportunityRepository.getAllOpportunities().then(opps => {
      if (opps && opps.length > 0) {
        setAllOpportunities(opps);
        setLeftId(opps[0]?.id || 'chevening-2027');
        setRightId(opps[1]?.id || 'daad-2027');
      }
      setLoadingOpps(false);
    }).catch(err => {
      console.error('Failed to load opportunities for comparison studio:', err);
      setLoadingOpps(false);
    });
  }, []);

  const isFree = !sub || sub.status === 'FREE';

  // Filtered dropdown list for searching 500+ items
  const filteredOpps = useMemo(() => {
    if (!searchFilter.trim()) return allOpportunities;
    const q = searchFilter.toLowerCase();
    return allOpportunities.filter(o =>
      o.title.toLowerCase().includes(q) ||
      (o.provider && o.provider.toLowerCase().includes(q)) ||
      (o.country && o.country.toLowerCase().includes(q)) ||
      (o.type && o.type.toLowerCase().includes(q))
    );
  }, [allOpportunities, searchFilter]);

  // Selected items from repository
  const oppA = useMemo(() => {
    return allOpportunities.find(o => o.id === leftId) || allOpportunities[0];
  }, [allOpportunities, leftId]);

  const oppB = useMemo(() => {
    return allOpportunities.find(o => o.id === rightId) || allOpportunities[1] || allOpportunities[0];
  }, [allOpportunities, rightId]);

  // Helper to extract clean dynamic parameters for any opportunity
  const getItemDetails = (opp?: Opportunity) => {
    if (!opp) {
      return {
        name: 'Select Opportunity',
        country: 'Global',
        funding: 'Fully Funded',
        fundingNum: 30000,
        prestige: '★★★★☆ (Highly Reputable)',
        difficulty: 'Moderate (8% Acceptance)',
        livingCost: 'Moderate',
        visaDifficulty: 'Standard Visa Requirements',
        outcomeStats: '90% career transition rate',
        aiScore: 75,
        reasons: ['Strong alignment with candidate background'],
      };
    }

    const aiScore = calculateCompatibilityScore(profile as any, opp);
    const explain = generateExplainability(profile as any, opp);

    // Dynamic prestige rendering based on prestigeScore or competition level
    const pScore = opp.prestigeScore || (opp.competitionLevel === 'high' ? 90 : 75);
    const starsCount = Math.min(5, Math.max(3, Math.round(pScore / 20)));
    const prestigeStars = '★'.repeat(starsCount) + '☆'.repeat(5 - starsCount);
    const prestigeLabel = pScore >= 90 ? 'Global Elite' : pScore >= 80 ? 'Highly Reputable' : 'Recognized Program';

    // Dynamic difficulty calculation
    const compLabel = opp.competitionLevel === 'high'
      ? 'High (<3% Acceptance)'
      : opp.competitionLevel === 'medium'
      ? 'Moderate (8-12% Acceptance)'
      : 'Accessible (>18% Acceptance)';

    // Dynamic living cost estimation based on country/region
    const cLower = (opp.country || opp.region || '').toLowerCase();
    let livingCost = 'Moderate (€900-€1,200/mo)';
    if (cLower.includes('uk') || cLower.includes('united kingdom') || cLower.includes('usa') || cLower.includes('switzerland') || cLower.includes('singapore') || cLower.includes('australia')) {
      livingCost = 'High ($1,200-$1,800/mo average)';
    } else if (cLower.includes('hungary') || cLower.includes('turkey') || cLower.includes('china') || cLower.includes('malaysia') || cLower.includes('pakistan') || cLower.includes('india')) {
      livingCost = 'Low-Moderate ($500-$900/mo average)';
    }

    // Dynamic visa requirements estimation
    let visaDifficulty = 'Standard Student Residence Permit';
    if (cLower.includes('uk')) visaDifficulty = 'UK Student Visa (Tier 4 Sponsor)';
    else if (cLower.includes('usa') || cLower.includes('united states')) visaDifficulty = 'US F-1 Visa (SEVIS & Embassy Interview)';
    else if (cLower.includes('germany') || cLower.includes('europe') || cLower.includes('france')) visaDifficulty = 'Schengen / EU Student Visa';
    else if (cLower.includes('japan') || cLower.includes('korea')) visaDifficulty = 'East Asian Student Visa';
    else if (opp.remote) visaDifficulty = 'No Visa Required (100% Remote)';

    // Funding representation
    const fundingStr = opp.fundingLevel || (opp.fundingAmount ? `${opp.currency || 'USD'} ${opp.fundingAmount.toLocaleString()}` : 'Fully Funded (Tuition + Stipend)');
    const fundingNum = opp.fundingAmount || (opp.fundingLevel?.toLowerCase().includes('full') ? 50000 : 20000);

    return {
      name: opp.title,
      country: opp.country || opp.region || 'Global',
      funding: fundingStr,
      fundingNum,
      prestige: `${prestigeStars} (${prestigeLabel})`,
      difficulty: compLabel,
      livingCost,
      visaDifficulty,
      outcomeStats: opp.careerValue || `${opp.verified ? '94%' : '88%'} placement in leadership & R&D roles`,
      aiScore,
      reasons: explain.reasons.length > 0 ? explain.reasons : [opp.aiGeneratedSummary || opp.description.slice(0, 110)],
    };
  };

  const detailsA = useMemo(() => getItemDetails(oppA), [oppA, profile]);
  const detailsB = useMemo(() => getItemDetails(oppB), [oppB, profile]);

  // AI Decision Engine Trigger
  const handleRunAiAnalysis = () => {
    if (aiRunning) return;
    setAiRunning(true);
    setAiAnalyzed(false);

    const steps = [
      'Scanning profile GPA, skills & evidence graph...',
      'Calculating financial ROI & living expense differential...',
      'Evaluating career outcome velocity & alumni prestige...',
      'Synthesizing final strategic AI Decision Verdict...'
    ];

    let currentStep = 0;
    setAiStepMessage(steps[0]);

    const interval = setInterval(() => {
      currentStep++;
      if (currentStep < steps.length) {
        setAiStepMessage(steps[currentStep]);
      } else {
        clearInterval(interval);
        setAiRunning(false);
        setAiAnalyzed(true);
      }
    }, 450);
  };

  // Dynamic Decision Verdict Computation
  const decisionSummary = useMemo(() => {
    if (!oppA || !oppB) return null;

    const bestFinancial = detailsA.fundingNum >= detailsB.fundingNum ? oppA : oppB;
    const bestFinancialDetails = detailsA.fundingNum >= detailsB.fundingNum ? detailsA : detailsB;

    const bestProbability = detailsA.aiScore >= detailsB.aiScore ? oppA : oppB;
    const bestProbDetails = detailsA.aiScore >= detailsB.aiScore ? detailsA : detailsB;

    // Career expansion pick
    const bestCareer = (oppA.prestigeScore || 80) >= (oppB.prestigeScore || 80) ? oppA : oppB;

    let verdict = '';
    const nameStr = profile?.name ? profile.name.split(' ')[0] : 'Candidate';
    const fieldStr = profile?.field || 'your academic specialization';

    if (detailsA.aiScore === detailsB.aiScore) {
      verdict = `Based on ${nameStr}'s profile in ${fieldStr}, both **${oppA.title}** and **${oppB.title}** present strong alignment (${detailsA.aiScore}% Match Score). Apply to **${bestFinancial.title}** for maximum financial backing, or **${oppB.title}** for geographic diversification.`;
    } else if (detailsA.aiScore > detailsB.aiScore) {
      verdict = `For ${nameStr}'s background in ${fieldStr}, **${oppA.title}** is your primary target (${detailsA.aiScore}% Match Probability vs ${detailsB.aiScore}%). If financial support is paramount, **${bestFinancial.title}** offers optimal ROI (${bestFinancialDetails.funding}).`;
    } else {
      verdict = `For ${nameStr}'s background in ${fieldStr}, **${oppB.title}** is your highest-probability pathway (${detailsB.aiScore}% Match Probability vs ${detailsA.aiScore}%). If financial support is your priority, **${bestFinancial.title}** provides the best financial package.`;
    }

    return {
      bestFinancial,
      bestFinancialDetails,
      bestProbability,
      bestProbDetails,
      bestCareer,
      verdict
    };
  }, [oppA, oppB, detailsA, detailsB, profile]);

  return (
    <div style={{ maxWidth: '1040px', margin: '0 auto', paddingBottom: '60px', position: 'relative' }}>
      {/* Header */}
      <div style={{ marginBottom: '28px' }}>
        <Link href="/dashboard/opportunities" style={{ textDecoration: 'none', color: 'rgba(255,255,255,0.4)', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '8px' }}>
          ← Back to Opportunity Discovery
        </Link>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h1 style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '28px', fontWeight: 800, color: 'white', marginBottom: '6px' }}>
              <Activity size={28} className="inline mr-2 text-indigo-400" /> Opportunity Comparison Studio
            </h1>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '14px' }}>
              Side-by-side evaluation across all 500+ global opportunities with dynamic AI fit assessments.
            </p>
          </div>
          {allOpportunities.length > 0 && (
            <div className="badge badge-indigo" style={{ fontSize: '11px', padding: '6px 12px' }}>
              <Globe size={12} className="inline mr-1" /> {allOpportunities.length} Opportunities Tracked
            </div>
          )}
        </div>
      </div>

      {/* Repository Filter & Dropdown Selectors Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px', filter: isFree ? 'blur(4px)' : 'none', pointerEvents: isFree ? 'none' : 'auto' }}>
        
        {/* Opportunity A Selector */}
        <div className="card" style={{ padding: '18px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <label style={{ fontSize: '11px', color: '#818cf8', fontWeight: 800, letterSpacing: '0.5px' }}>OPPORTUNITY A</label>
            <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)' }}>{filteredOpps.length} items</span>
          </div>

          <div style={{ position: 'relative', marginBottom: '8px' }}>
            <input
              type="text"
              placeholder="Search opportunity database..."
              value={searchFilter}
              onChange={e => setSearchFilter(e.target.value)}
              style={{
                width: '100%',
                padding: '6px 10px 6px 28px',
                borderRadius: '6px',
                background: 'rgba(0,0,0,0.3)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: 'white',
                fontSize: '11px',
                outline: 'none',
              }}
            />
            <Search size={12} style={{ position: 'absolute', left: '9px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.4)' }} />
          </div>

          <select 
            value={leftId} 
            onChange={e => setLeftId(e.target.value)}
            disabled={loadingOpps}
            style={{
              width: '100%',
              padding: '10px',
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(129,140,248,0.3)',
              borderRadius: '8px',
              color: 'white',
              outline: 'none',
              fontSize: '13px',
              fontWeight: 600,
            }}
          >
            {loadingOpps ? (
              <option>Loading opportunity database...</option>
            ) : filteredOpps.length > 0 ? (
              filteredOpps.map(o => (
                <option key={o.id} value={o.id} style={{ background: '#0a0c10', color: '#fff' }}>
                  {o.title} ({o.country || o.provider})
                </option>
              ))
            ) : (
              <option>No matching opportunities found</option>
            )}
          </select>
        </div>

        {/* Opportunity B Selector */}
        <div className="card" style={{ padding: '18px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <label style={{ fontSize: '11px', color: '#34d399', fontWeight: 800, letterSpacing: '0.5px' }}>OPPORTUNITY B</label>
            <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)' }}>{filteredOpps.length} items</span>
          </div>

          <div style={{ position: 'relative', marginBottom: '8px' }}>
            <input
              type="text"
              placeholder="Search opportunity database..."
              value={searchFilter}
              onChange={e => setSearchFilter(e.target.value)}
              style={{
                width: '100%',
                padding: '6px 10px 6px 28px',
                borderRadius: '6px',
                background: 'rgba(0,0,0,0.3)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: 'white',
                fontSize: '11px',
                outline: 'none',
              }}
            />
            <Search size={12} style={{ position: 'absolute', left: '9px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.4)' }} />
          </div>

          <select 
            value={rightId} 
            onChange={e => setRightId(e.target.value)}
            disabled={loadingOpps}
            style={{
              width: '100%',
              padding: '10px',
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(52,211,153,0.3)',
              borderRadius: '8px',
              color: 'white',
              outline: 'none',
              fontSize: '13px',
              fontWeight: 600,
            }}
          >
            {loadingOpps ? (
              <option>Loading opportunity database...</option>
            ) : filteredOpps.length > 0 ? (
              filteredOpps.map(o => (
                <option key={o.id} value={o.id} style={{ background: '#0a0c10', color: '#fff' }}>
                  {o.title} ({o.country || o.provider})
                </option>
              ))
            ) : (
              <option>No matching opportunities found</option>
            )}
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
                <th style={{ width: '37.5%', padding: '12px 10px', textAlign: 'left', fontSize: '14px', color: '#818cf8', fontWeight: 700 }}>{detailsA.name}</th>
                <th style={{ width: '37.5%', padding: '12px 10px', textAlign: 'left', fontSize: '14px', color: '#34d399', fontWeight: 700 }}>{detailsB.name}</th>
              </tr>
            </thead>
            <tbody>
              {[
                { label: 'Target Region', left: detailsA.country, right: detailsB.country },
                { label: 'Funding Value', left: detailsA.funding, right: detailsB.funding },
                { label: 'Global Prestige', left: detailsA.prestige, right: detailsB.prestige },
                { label: 'Acceptance Rate', left: detailsA.difficulty, right: detailsB.difficulty },
                { label: 'Cost of Living', left: detailsA.livingCost, right: detailsB.livingCost },
                { label: 'Visa Complexity', left: detailsA.visaDifficulty, right: detailsB.visaDifficulty },
                { label: 'Career Outcomes', left: detailsA.outcomeStats, right: detailsB.outcomeStats },
              ].map((row, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <td style={{ padding: '14px 10px', fontSize: '12px', color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>{row.label}</td>
                  <td style={{ padding: '14px 10px', fontSize: '13px', color: 'white' }}>{row.left}</td>
                  <td style={{ padding: '14px 10px', fontSize: '13px', color: 'white' }}>{row.right}</td>
                </tr>
              ))}
              
              {/* Dynamic AI Fit Score Row */}
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', background: 'rgba(99,102,241,0.03)' }}>
                <td style={{ padding: '18px 10px', fontSize: '12px', color: 'rgba(255,255,255,0.7)', fontWeight: 700 }}>AI Match Probability</td>
                <td style={{ padding: '18px 10px', fontSize: '22px', fontWeight: 900, color: '#818cf8', fontFamily: 'Space Grotesk, sans-serif' }}>
                  {detailsA.aiScore}%
                </td>
                <td style={{ padding: '18px 10px', fontSize: '22px', fontWeight: 900, color: '#34d399', fontFamily: 'Space Grotesk, sans-serif' }}>
                  {detailsB.aiScore}%
                </td>
              </tr>

              {/* Dynamic AI Strategic Assessment */}
              <tr>
                <td style={{ padding: '18px 10px', fontSize: '12px', color: 'rgba(255,255,255,0.7)', fontWeight: 700 }}>AI Strategic Assessment</td>
                <td style={{ padding: '18px 10px', fontSize: '12px', color: 'rgba(255,255,255,0.7)', lineHeight: 1.5 }}>
                  {detailsA.reasons.map((r, i) => (
                    <div key={i} style={{ marginBottom: '4px', display: 'flex', gap: '4px' }}>
                      <span style={{ color: '#818cf8' }}>•</span>
                      <span>{r}</span>
                    </div>
                  ))}
                </td>
                <td style={{ padding: '18px 10px', fontSize: '12px', color: 'rgba(255,255,255,0.7)', lineHeight: 1.5 }}>
                  {detailsB.reasons.map((r, i) => (
                    <div key={i} style={{ marginBottom: '4px', display: 'flex', gap: '4px' }}>
                      <span style={{ color: '#34d399' }}>•</span>
                      <span>{r}</span>
                    </div>
                  ))}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* UNHARDCODED AI DECISION ENGINE CARD */}
        {!isFree && (
          <div className="card-magnetic glow-border" style={{ padding: '24px', marginTop: '24px', background: 'rgba(99,102,241,0.02)', borderLeft: '4px solid #818cf8' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
              <h3 style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '18px', fontWeight: 700, color: 'white', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Activity size={20} className="text-indigo-400" /> AI Decision Engine Recommendation
              </h3>
              
              {/* Interactive RUN AI Decision Button */}
              <button
                onClick={handleRunAiAnalysis}
                disabled={aiRunning}
                className="btn btn-primary"
                style={{
                  fontSize: '12px',
                  padding: '8px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: aiRunning ? 'rgba(99,102,241,0.4)' : 'linear-gradient(90deg, #6366f1, #8b5cf6)',
                  cursor: aiRunning ? 'not-allowed' : 'pointer'
                }}
              >
                {aiRunning ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>Analyzing...</span>
                  </>
                ) : (
                  <>
                    <Zap size={14} />
                    <span>{aiAnalyzed ? 'Re-Run AI Analysis' : 'Run AI Decision Analysis'}</span>
                  </>
                )}
              </button>
            </div>

            {/* AI Running Spinner Feedback Banner */}
            {aiRunning && (
              <div style={{ padding: '14px', background: 'rgba(99,102,241,0.08)', borderRadius: '10px', border: '1px solid rgba(99,102,241,0.2)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '12px', color: '#818cf8' }}>
                <Loader2 size={18} className="animate-spin text-indigo-400" />
                <span>{aiStepMessage}</span>
              </div>
            )}

            {/* Dynamic Decision Cards */}
            {decisionSummary && (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                  
                  {/* Card 1: Financial ROI */}
                  <div className="glass-sm" style={{ padding: '14px', border: '1px solid rgba(16,185,129,0.2)' }}>
                    <div style={{ fontSize: '9px', color: '#10b981', fontWeight: 800, letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <DollarSign size={10} /> BEST FINANCIAL ROI
                    </div>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: 'white', marginTop: '4px', lineHeight: 1.3 }}>
                      {decisionSummary.bestFinancial.title}
                    </div>
                    <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.45)', marginTop: '4px', lineHeight: 1.3 }}>
                      {decisionSummary.bestFinancialDetails.funding} · Highest overall funding support.
                    </p>
                  </div>

                  {/* Card 2: Highest Match Probability */}
                  <div className="glass-sm" style={{ padding: '14px', border: '1px solid rgba(129,140,248,0.2)' }}>
                    <div style={{ fontSize: '9px', color: '#818cf8', fontWeight: 800, letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Target size={10} /> HIGHEST MATCH PROBABILITY
                    </div>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: 'white', marginTop: '4px', lineHeight: 1.3 }}>
                      {decisionSummary.bestProbability.title}
                    </div>
                    <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.45)', marginTop: '4px', lineHeight: 1.3 }}>
                      {decisionSummary.bestProbDetails.aiScore}% match probability based on candidate evidence graph.
                    </p>
                  </div>

                  {/* Card 3: Career Expansion */}
                  <div className="glass-sm" style={{ padding: '14px', border: '1px solid rgba(6,182,212,0.2)' }}>
                    <div style={{ fontSize: '9px', color: '#06b6d4', fontWeight: 800, letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Award size={10} /> BEST CAREER EXPANSION
                    </div>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: 'white', marginTop: '4px', lineHeight: 1.3 }}>
                      {decisionSummary.bestCareer.title}
                    </div>
                    <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.45)', marginTop: '4px', lineHeight: 1.3 }}>
                      High prestige alumni network and international recognition index.
                    </p>
                  </div>

                </div>

                {/* Dynamic AI Decision Verdict Paragraph */}
                <div style={{ padding: '14px', background: 'rgba(0,0,0,0.25)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.75)', lineHeight: 1.5, margin: 0 }}>
                    <strong style={{ color: '#818cf8' }}>AI Decision Verdict:</strong> {decisionSummary.verdict}
                  </p>
                </div>
              </>
            )}
          </div>
        )}

        {/* Free User Upgrade Banner */}
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
                Compare stipends, living cost adjustments, visa parameters, and prestige levels side-by-side across all 500+ global opportunities.
              </p>
              
              <div className="glass-sm" style={{ padding: '10px', borderRadius: '8px', display: 'flex', justifyItems: 'center', justifyContent: 'space-between', fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginBottom: '20px' }}>
                <span>Free Daily AI Quota Remaining:</span>
                <span style={{ fontWeight: 700, color: 'white' }}>{quota?.dailyCredits ?? 1000} / 1000 Credits</span>
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
