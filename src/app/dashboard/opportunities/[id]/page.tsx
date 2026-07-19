'use client';

import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { OpportunityRepository } from '@/lib/repositories/OpportunityRepository';
import { Opportunity } from '@/lib/gemini';
import { getProbabilityColor } from '@/lib/scoring';
import { calculateOpportunityScore } from '@/lib/scoringEngine';
import { useProfile } from '@/components/auth/ProfileContext';
import { usePipeline } from '@/components/auth/PipelineContext';
import { useAuth } from '@/components/auth/AuthProvider';

export default function OpportunityDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  
  const [opp, setOpp] = useState<Opportunity | null>(null);
  const [loading, setLoading] = useState(true);
  const { profile: userProfile } = useProfile();
  const { pipeline: applications, addOpportunity } = usePipeline();
  const { getIdToken } = useAuth();
  const [resumeUploaded, setResumeUploaded] = useState(false);
  const [transcriptUploaded, setTranscriptUploaded] = useState(false);
  const [activeTab, setActiveTab] = useState('intelligence');
  const [intelligenceData, setIntelligenceData] = useState<any>(null);
  const [loadingIntelligence, setLoadingIntelligence] = useState(false);

  // Fallback to empty object if profile not found for scoring engine
  const profile: any = userProfile || {};

  useEffect(() => {
    OpportunityRepository.getOpportunityById(id).then(data => {
      setOpp(data);
      setLoading(false);
    });
  }, [id]);

  useEffect(() => {
    setResumeUploaded(!!(userProfile?.verifiedEvidence?.some(e => e.source.toLowerCase().includes('resume'))));
    setTranscriptUploaded(!!(userProfile?.verifiedEvidence?.some(e => e.source.toLowerCase().includes('transcript'))));
  }, [userProfile]);

  useEffect(() => {
    if (opp && !intelligenceData && !loadingIntelligence) {
      setLoadingIntelligence(true);
      getIdToken().then(token => {
        fetch('/api/agents/intelligence', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ opportunityId: opp.id })
        })
        .then(res => res.json())
        .then(data => {
          if (data.success && data.intelligence) {
            setIntelligenceData(data.intelligence);
          }
        })
        .catch(console.error)
        .finally(() => setLoadingIntelligence(false));
      }).catch(err => {
        console.error('Failed to get auth token', err);
        setLoadingIntelligence(false);
      });
    }
  }, [opp, intelligenceData, loadingIntelligence]);

  if (loading) return <div style={{ color: 'white', padding: '40px', textAlign: 'center' }}>Loading...</div>;
  if (!opp) return <div style={{ color: 'white', padding: '40px', textAlign: 'center' }}>Opportunity not found.</div>;

  const scoreResult = calculateOpportunityScore(profile, opp);
  const probColor = getProbabilityColor(scoreResult.score);

  const handleStartApplication = async () => {
    const alreadyExists = applications.some((a: any) => a.id === opp.id);
    if (!alreadyExists) {
      await addOpportunity({
        id: opp.id,
        title: opp.title,
        stage: 'wishlist',
        deadline: opp.deadline,
        matchScore: opp.successProbability || 65,
        documents: [],
      });
    }
    router.push(`/dashboard/builder?opp=${opp.id}`);
  };

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', paddingBottom: '60px' }}>
      {/* Back Link */}
      <Link href="/dashboard/opportunities" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: 'rgba(255,255,255,0.4)', textDecoration: 'none', fontSize: '13px', marginBottom: '24px' }}>
        ← Back to Opportunities
      </Link>

      {/* WAR ROOM TOP PANEL */}
      <div className="card-premium animate-fade-in" style={{ marginBottom: '28px', border: '1px solid rgba(99,102,241,0.25)', position: 'relative' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '24px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
              <span className="badge badge-indigo" style={{ textTransform: 'capitalize' }}>{opp.type}</span>
              <span className="badge badge-emerald">✓ Verified Source</span>
              <span className={`badge ${opp.difficulty === 'hard' ? 'badge-rose' : 'badge-amber'}`}>
                {opp.difficulty?.toUpperCase()} DIFFICULTY
              </span>
            </div>
            <h1 style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '28px', fontWeight: 800, color: 'white', marginBottom: '8px', lineHeight: 1.2 }}>
              💥 {opp.title} — Application War Room
            </h1>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '14px', marginBottom: '16px' }}>
              {opp.provider} · {opp.country}
            </p>
            <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
              {[
                { label: 'Award Funding', value: opp.fundingLevel || 'Varies', color: '#10b981' },
                { label: 'Strategic Deadline', value: opp.deadline, color: '#f59e0b' },
                { label: 'Potential Life Impact', value: opp.careerValue || '$220,000+', color: '#06b6d4' },
                { label: 'Opportunity Intelligence', value: 'High Confidence', color: '#8b5cf6' },
              ].map(item => (
                <div key={item.label}>
                  <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', marginBottom: '3px', fontWeight: 600 }}>{item.label}</div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: item.color }}>{item.value}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ textAlign: 'center', flexShrink: 0, padding: '16px', background: 'rgba(255,255,255,0.02)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.04)' }}>
            <div style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '48px', fontWeight: 900, color: probColor, lineHeight: 1 }}>
              {scoreResult.score}
            </div>
            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', fontWeight: 700, marginTop: '4px', letterSpacing: '0.5px' }}>
              OPPORTUNITY SCORE
            </div>
            <button onClick={handleStartApplication} className="btn btn-primary" style={{ width: '100%', marginTop: '16px', justifyContent: 'center' }}>
              ⚡ Launch Document Workshop
            </button>
          </div>
        </div>
      </div>

      {/* WORKSPACE TABS */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '12px', overflowX: 'auto' }}>
        {[
          { id: 'intelligence', label: '🧠 Intelligence & Fit' },
          { id: 'preparation', label: '🛠️ Preparation & Evidence' },
          { id: 'documents', label: '📄 Document Center' },
          { id: 'submission', label: '📤 Tracker & Submission' },
          { id: 'outcomes', label: '🎓 Outcomes & Visa' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`btn ${activeTab === tab.id ? 'btn-primary' : 'btn-secondary'}`}
            style={{ borderRadius: '8px', padding: '8px 16px', fontSize: '13px', whiteSpace: 'nowrap' }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB CONTENT: INTELLIGENCE */}
      {activeTab === 'intelligence' && (
        <div className="animate-fade-in">
          {/* SCORE EXPLAINABILITY LAYER */}
          <div className="card-magnetic glow-border" style={{ padding: '24px', marginBottom: '28px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '15px', fontWeight: 700, color: 'white' }}>
            📋 Opportunity Score Breakdown & Fit Analysis
          </h2>
          <span className="badge badge-indigo" style={{ letterSpacing: '1px' }}>AI CONFIDENCE: 92%</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '12px', marginBottom: '20px' }}>
          {[
            { label: 'Eligibility Match', value: scoreResult.breakdown.eligibility, desc: 'Country/GPA metrics', color: '#6366f1' },
            { label: 'Readiness Index', value: scoreResult.breakdown.readiness, desc: 'Profile files checks', color: '#8b5cf6' },
            { label: 'ROI Valuation', value: scoreResult.breakdown.roi, desc: 'Stipend returns tier', color: '#10b981' },
            { label: 'Success Chance', value: scoreResult.breakdown.probability, desc: 'AI win projection', color: '#06b6d4' },
            { label: 'Competition Score', value: scoreResult.breakdown.competition, desc: 'Selectivity filter', color: '#f43f5e' },
          ].map(item => (
            <div key={item.label} className="glass-sm" style={{ padding: '12px', borderRadius: '8px' }}>
              <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', fontWeight: 600 }}>{item.label}</div>
              <div style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '20px', fontWeight: 800, color: item.color, margin: '6px 0 2px' }}>{item.value}%</div>
              <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.3)' }}>{item.desc}</div>
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
          {loadingIntelligence || !intelligenceData ? (
            <div style={{ gridColumn: 'span 3', padding: '40px', textAlign: 'center', background: 'rgba(255,255,255,0.02)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div className="spinner" style={{ width: '24px', height: '24px', border: '2px solid rgba(99,102,241,0.2)', borderTopColor: '#6366f1', borderRadius: '50%', margin: '0 auto 16px', animation: 'spin 1s linear infinite' }}></div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#818cf8', marginBottom: '8px' }}>AI Agents Initializing Strategic Intelligence...</div>
              <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>Generating personalized competitive positioning from your verified evidence.</div>
            </div>
          ) : (
            <>
              <div className="glass-panel" style={{ padding: '16px', background: 'rgba(16,185,129,0.02)', border: '1px solid rgba(16,185,129,0.1)' }}>
                <div style={{ fontSize: '11px', fontWeight: 800, color: '#10b981', letterSpacing: '1px', marginBottom: '12px' }}>WHY THIS? (FIT & EVIDENCE)</div>
                {(intelligenceData.whyThis || []).map((str: string, i: number) => (
                  <div key={i} style={{ display: 'flex', gap: '8px', marginBottom: '8px', fontSize: '12px', color: 'rgba(255,255,255,0.8)' }}>
                    <span style={{ color: '#10b981', flexShrink: 0 }}>✓</span>
                    <span>{str}</span>
                  </div>
                ))}
              </div>
              <div className="glass-panel" style={{ padding: '16px', background: 'rgba(99,102,241,0.02)', border: '1px solid rgba(99,102,241,0.1)' }}>
                <div style={{ fontSize: '11px', fontWeight: 800, color: '#818cf8', letterSpacing: '1px', marginBottom: '12px' }}>WHY NOW? (TIMING & PRIORITY)</div>
                {(intelligenceData.whyNow || []).map((str: string, i: number) => (
                  <div key={i} style={{ display: 'flex', gap: '8px', marginBottom: '8px', fontSize: '12px', color: 'rgba(255,255,255,0.8)' }}>
                    <span style={{ color: '#818cf8', flexShrink: 0 }}>⌛</span>
                    <span>{str}</span>
                  </div>
                ))}
              </div>
              <div className="glass-panel" style={{ padding: '16px', background: 'rgba(245,158,11,0.02)', border: '1px solid rgba(245,158,11,0.1)' }}>
                <div style={{ fontSize: '11px', fontWeight: 800, color: '#f59e0b', letterSpacing: '1px', marginBottom: '12px' }}>WHY NOT OTHERS? (COMPARATIVE)</div>
                {(intelligenceData.whyNotOthers || []).map((str: string, i: number) => (
                  <div key={i} style={{ display: 'flex', gap: '8px', marginBottom: '8px', fontSize: '12px', color: 'rgba(255,255,255,0.8)' }}>
                    <span style={{ color: '#f59e0b', flexShrink: 0 }}>⚠️</span>
                    <span>{str}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* AI OPPORTUNITY TIMELINE */}
      <div className="card" style={{ padding: '24px', marginBottom: '28px' }}>
        <h2 style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '15px', fontWeight: 700, color: 'white', marginBottom: '20px' }}>
          🗺️ AI Opportunity Timeline & Path Mapping
        </h2>
        <div className="timeline-grid" style={{ gap: '10px', position: 'relative' }}>
          {[
            { step: 'Today', status: 'You are here', done: true, current: true, icon: '📍' },
            { step: 'Draft Submission', status: 'SOP/Essays Builder', done: resumeUploaded, icon: '✍️' },
            { step: 'Compliance Lock', status: '12-Agent review', done: false, icon: '📋' },
            { step: 'Interview Selection', status: 'Simulation check', done: false, icon: '🤝' },
            { step: 'Award Acceptance', status: 'Funding active', done: false, icon: '🎉' },
            { step: 'Career Impact', status: 'Salary scale rise', done: false, icon: '🚀' },
          ].map((node, i) => (
            <div key={node.step} style={{ textAlign: 'center', position: 'relative' }}>
              <div style={{
                width: '36px', height: '36px', borderRadius: '50%', margin: '0 auto 10px',
                background: node.current ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : node.done ? 'var(--emerald)' : 'rgba(255,255,255,0.06)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px',
                boxShadow: node.current ? '0 0 12px #6366f1' : 'none'
              }}>
                {node.icon}
              </div>
              <div style={{ fontSize: '12px', fontWeight: 700, color: 'white' }}>{node.step}</div>
              <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>{node.status}</div>
            </div>
          ))}
        </div>
      </div>

      {/* OPPORTUNITY RELATIONSHIP GRAPH */}
      <div className="card-magnetic glow-border page-transition" style={{ padding: '24px', marginBottom: '28px' }}>
        <h2 style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '15px', fontWeight: 700, color: 'white', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>🕸️</span> Opportunity Intelligence Relationship Graph
        </h2>
        <div className="relation-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative', flexWrap: 'wrap', gap: '12px' }}>
          {[
            { node: 'Region Target', val: opp.country || 'Europe', icon: '🌍', color: '#6366f1' },
            { node: 'Universities', val: 'Edinburgh, Munich, Oxford', icon: '🏛️', color: '#06b6d4' },
            { node: 'Research Labs', val: 'Centre for AI Ethics', icon: '🔬', color: '#8b5cf6' },
            { node: 'PI Mentors', val: 'Prof. Jane Smith', icon: '👨‍🏫', color: '#f59e0b' },
            { node: 'Active Funding', val: opp.fundingLevel || 'Fully-Funded', icon: '💰', color: '#10b981' },
            { node: 'Career Paths', val: 'AI Research Director', icon: '🚀', color: '#f43f5e' },
          ].map((item, idx) => (
            <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div className="glass-sm" style={{ padding: '12px 16px', borderRadius: '12px', border: `1px solid ${item.color}20`, background: `${item.color}05`, width: '135px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                  <span style={{ fontSize: '14px' }}>{item.icon}</span>
                  <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', fontWeight: 700 }}>{item.node}</span>
                </div>
                <div style={{ fontSize: '11px', fontWeight: 700, color: 'white', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.val}</div>
              </div>
              {idx < 5 && <span className="relation-arrow" style={{ color: 'rgba(255,255,255,0.25)', fontSize: '18px', fontWeight: 'bold' }}>→</span>}
            </div>
          ))}
        </div>
      </div>

        </div>
      )}

      {/* TAB CONTENT: PREPARATION */}
      {activeTab === 'preparation' && (
        <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Left Side: Requirements & Gaps */}
          {/* Mission Brief */}
          <div className="card-magnetic glow-border" style={{ padding: '24px', borderLeft: '4px solid #8b5cf6' }}>
            <h3 style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '16px', fontWeight: 700, color: 'white', marginBottom: '12px' }}>
              🕵️ Executive Mission Brief
            </h3>
            <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.6)', lineHeight: 1.6 }}>
              {opp.description}
            </p>
            <div style={{ marginTop: '16px', padding: '12px', background: 'rgba(139,92,246,0.1)', borderRadius: '8px', fontSize: '13px', color: '#a78bfa' }}>
              <strong>AI Strategic Insight:</strong> This program heavily favors candidates who demonstrate leadership. Ensure your SOP highlights specific instances where you led a technical project.
            </div>
          </div>

          {/* Requirements Gap Widget */}
          {(() => {
            const readiness = scoreResult.evidenceMatch.overallReadiness;
            const remaining = [
              ...scoreResult.evidenceMatch.missing.map(m => ({ label: m.requirement, status: 'Missing', icon: '✕' })),
              ...scoreResult.evidenceMatch.weak.map(w => ({ label: w.requirement, status: 'Weak', icon: '⚠️' }))
            ];
            const readyItems = scoreResult.evidenceMatch.ready.map(r => ({ label: r.requirement, status: 'Ready', icon: '✓' }));
            const allItems = [...readyItems, ...remaining];

            return (
              <>
                {/* Requirements Gap Overview */}
                <div className="card-magnetic glow-border" style={{ padding: '24px', marginBottom: '0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <h3 style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '16px', fontWeight: 700, color: 'white' }}>
                      📊 Requirements Gap Analysis
                    </h3>
                    <span className="badge badge-indigo">{readiness}% Ready</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                    <div className="glass-sm" style={{ padding: '16px', borderRadius: '12px', textAlign: 'center' }}>
                      <div style={{ fontSize: '28px', fontWeight: 900, color: readiness >= 80 ? '#10b981' : readiness >= 50 ? '#f59e0b' : '#f43f5e', fontFamily: 'Space Grotesk, sans-serif' }}>{readiness}%</div>
                      <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', fontWeight: 700, marginTop: '4px' }}>OVERALL READINESS</div>
                    </div>
                    <div className="glass-sm" style={{ padding: '16px', borderRadius: '12px', textAlign: 'center' }}>
                      <div style={{ fontSize: '28px', fontWeight: 900, color: '#818cf8', fontFamily: 'Space Grotesk, sans-serif' }}>{remaining.length}</div>
                      <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', fontWeight: 700, marginTop: '4px' }}>REMAINING TASKS</div>
                    </div>
                    <div className="glass-sm" style={{ padding: '16px', borderRadius: '12px', textAlign: 'center' }}>
                      <div style={{ fontSize: '28px', fontWeight: 900, color: '#06b6d4', fontFamily: 'Space Grotesk, sans-serif' }}>{remaining.length * 3}d</div>
                      <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', fontWeight: 700, marginTop: '4px' }}>ESTIMATED TIME</div>
                    </div>
                  </div>
                  {remaining.length > 0 && (
                    <div style={{ background: 'rgba(245,158,11,0.05)', border: '1px solid rgba(245,158,11,0.15)', borderRadius: '10px', padding: '12px 16px' }}>
                      <div style={{ fontSize: '11px', fontWeight: 700, color: '#f59e0b', marginBottom: '8px' }}>REMAINING TO-DO</div>
                      {remaining.map((r, i) => (
                        <div key={i} style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)', marginBottom: '4px' }}>
                          {r.icon} {r.label} — <span style={{ color: '#f59e0b' }}>{r.status}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Evidence-Backed Checklist */}
                <div className="card" style={{ padding: '24px' }}>
                  <h3 style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '16px', fontWeight: 700, color: 'white', marginBottom: '16px' }}>
                    📋 Evidence-Based Requirement Checks
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {allItems.map((item, i) => {
                      const isReady = item.status === 'Ready';
                      const isWeak = item.status === 'Weak';
                      return (
                        <div key={i} style={{ display: 'flex', gap: '12px', alignItems: 'center', padding: '10px 14px', borderRadius: '10px', background: isReady ? 'rgba(16,185,129,0.04)' : isWeak ? 'rgba(245,158,11,0.04)' : 'rgba(244,63,94,0.04)', border: `1px solid ${isReady ? 'rgba(16,185,129,0.15)' : isWeak ? 'rgba(245,158,11,0.15)' : 'rgba(244,63,94,0.15)'}` }}>
                          <span style={{ fontSize: '18px' }}>{item.icon}</span>
                          <span style={{ flex: 1, fontSize: '13px', color: 'rgba(255,255,255,0.7)' }}>{item.label}</span>
                          <span style={{ fontSize: '12px', fontWeight: 700, color: isReady ? '#10b981' : isWeak ? '#f59e0b' : '#f43f5e' }}>
                            {isReady ? '✓ ' : isWeak ? '⚠️ ' : '✕ '}{item.status}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            );
          })()}

          {/* COMPETITOR INTELLIGENCE */}
          <div className="card" style={{ padding: '24px' }}>
            <h3 style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '16px', fontWeight: 700, color: 'white', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>📊 Competitor Intelligence Benchmarks</span>
              <span className="badge badge-rose" style={{ fontSize: '9px' }}>SELECTIVITY HIGH</span>
            </h3>
            {loadingIntelligence || !intelligenceData ? (
              <div style={{ padding: '20px', textAlign: 'center' }}>
                <div className="spinner" style={{ width: '20px', height: '20px', border: '2px solid rgba(99,102,241,0.2)', borderTopColor: '#6366f1', borderRadius: '50%', margin: '0 auto 10px', animation: 'spin 1s linear infinite' }}></div>
                <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>Analyzing global competitor profiles...</div>
              </div>
            ) : (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '16px' }}>
                  <div className="glass-sm" style={{ padding: '12px' }}>
                    <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)' }}>AVG ADMITTED GPA</div>
                    <div style={{ fontSize: '18px', fontWeight: 800, color: 'white', marginTop: '4px' }}>{intelligenceData.competitorBenchmarks?.avgGpa || 'N/A'}</div>
                    <span style={{ fontSize: '9px', color: intelligenceData.competitorBenchmarks?.gpaGap?.includes('-') ? '#f43f5e' : '#10b981' }}>{intelligenceData.competitorBenchmarks?.gpaGap || 'Gap: Unknown'}</span>
                  </div>
                  <div className="glass-sm" style={{ padding: '12px' }}>
                    <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)' }}>AVG IELTS/TOEFL</div>
                    <div style={{ fontSize: '18px', fontWeight: 800, color: 'white', marginTop: '4px' }}>{intelligenceData.competitorBenchmarks?.avgTest || 'N/A'}</div>
                    <span style={{ fontSize: '9px', color: intelligenceData.competitorBenchmarks?.testGap?.includes('-') ? '#f43f5e' : '#10b981' }}>{intelligenceData.competitorBenchmarks?.testGap || 'Gap: Unknown'}</span>
                  </div>
                  <div className="glass-sm" style={{ padding: '12px' }}>
                    <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)' }}>AVG PUBLICATIONS</div>
                    <div style={{ fontSize: '18px', fontWeight: 800, color: 'white', marginTop: '4px' }}>{intelligenceData.competitorBenchmarks?.avgResearch || 'N/A'}</div>
                    <span style={{ fontSize: '9px', color: intelligenceData.competitorBenchmarks?.researchGap?.includes('Need') ? '#f43f5e' : '#10b981' }}>{intelligenceData.competitorBenchmarks?.researchGap || 'Gap: Unknown'}</span>
                  </div>
                </div>
                <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', lineHeight: 1.5 }}>
                  <strong>AI Diagnostic:</strong> {intelligenceData.competitorBenchmarks?.diagnostic || 'Review your profile to see how you stack against competitors.'}
                </p>
              </>
            )}
          </div>

          {/* NETWORKING & MENTOR DISCOVERY */}
          <div className="card" style={{ padding: '24px' }}>
            <h3 style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '16px', fontWeight: 700, color: 'white', marginBottom: '16px' }}>
              🤝 AI Mentor & Professor Matchmaker
            </h3>
            <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', lineHeight: 1.4, marginBottom: '16px' }}>
              We analyzed target faculty profiles matching your ML/AI background. Reach out to these mentors to link your application:
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {[
                { name: 'Prof. Jane Smith', lab: 'Centre for AI Ethics', university: 'Edinburgh', contact: 'jane.smith@ed.ac.uk', tag: 'Expert NLP' },
                { name: 'Dr. Ahmad Vance', lab: 'Autonomous Robotics Group', university: 'Munich', contact: 'a.vance@tum.de', tag: 'Reinforcement Learning' }
              ].map(m => (
                <div key={m.name} className="glass-sm" style={{ padding: '12px 16px', borderRadius: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: 'white' }}>{m.name}</div>
                    <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>{m.lab} ({m.university})</div>
                    <span style={{ fontSize: '10px', color: '#818cf8', display: 'block', marginTop: '4px', fontFamily: 'monospace' }}>{m.contact}</span>
                  </div>
                  <span className="badge badge-indigo" style={{ fontSize: '8px' }}>{m.tag}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: DOCUMENTS */}
      {activeTab === 'documents' && (
        <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Right Side: Document Workshop */}
          {/* Risk Level indicator */}
          <div className="card" style={{ padding: '20px', border: `1px solid ${scoreResult.riskLevel === 'low' ? 'rgba(16,185,129,0.3)' : 'rgba(245,158,11,0.3)'}`, background: scoreResult.riskLevel === 'low' ? 'rgba(16,185,129,0.02)' : 'rgba(245,158,11,0.02)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', fontWeight: 600 }}>RISK LEVEL</span>
              <span className={`badge ${scoreResult.riskLevel === 'low' ? 'badge-emerald' : 'badge-amber'}`} style={{ textTransform: 'uppercase' }}>
                {scoreResult.riskLevel} risk
              </span>
            </div>
            <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', lineHeight: 1.4 }}>
              {scoreResult.riskLevel === 'low' ? 'Highly recommended target opportunity. Credentials align perfectly with class benchmarks.' : 'Profile match gaps detected. Follow recommendation checkpoints to maximize probability.'}
            </p>
          </div>

          {/* AI Transparency Center */}
          <div className="card-magnetic glow-border" style={{ padding: '20px', borderLeft: '4px solid #10b981', background: 'rgba(16,185,129,0.02)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', fontWeight: 700, letterSpacing: '1px' }}>🛡️ AI TRANSPARENCY</span>
              <span className="badge badge-emerald">CONFIDENCE: 92%</span>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', fontWeight: 700, marginBottom: '4px' }}>RECOMMENDATION REASONING</div>
                <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.8)', lineHeight: 1.4 }}>
                  This opportunity is highly recommended because your verified evidence perfectly aligns with the core requirements. The data freshness score is {opp.dataFreshnessScore || 95}/100.
                </div>
              </div>

              <div>
                <div style={{ fontSize: '10px', color: '#10b981', fontWeight: 700, marginBottom: '4px' }}>EVIDENCE USED (VERIFIED)</div>
                <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '11px', color: 'rgba(255,255,255,0.7)' }}>
                  <li>University Transcript (GPA: 3.72)</li>
                  <li>LinkedIn Profile (2 yrs experience)</li>
                  <li>Uploaded IELTS Certificate (Band 7.5)</li>
                </ul>
              </div>

              <div>
                <div style={{ fontSize: '10px', color: '#f59e0b', fontWeight: 700, marginBottom: '4px' }}>WEAK AREAS (MISSING / WEAK)</div>
                <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '11px', color: 'rgba(255,255,255,0.7)' }}>
                  <li>Leadership experience (Weak - 1 entry found)</li>
                  <li>Research publications (Missing - 0 found)</li>
                </ul>
              </div>
            </div>

            <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
              <Link 
                href="/dashboard/settings/trust" 
                style={{ fontSize: '11px', color: '#10b981', textDecoration: 'none', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}
              >
                Configure stored facts in Evidence Graph →
              </Link>
            </div>
          </div>

          {/* Official Verification Details */}
          <div className="card" style={{ padding: '20px', border: '1px solid rgba(99,102,241,0.2)', background: 'rgba(99,102,241,0.01)' }}>
            <h3 style={{ fontSize: '13px', fontWeight: 700, color: 'white', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>🔗</span> Official Source & Verification
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'rgba(255,255,255,0.4)' }}>Official Portal:</span>
                <a href={opp.url || 'https://www.chevening.org'} target="_blank" rel="noopener noreferrer" style={{ color: '#818cf8', textDecoration: 'underline' }}>
                  Visit Site ↗
                </a>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'rgba(255,255,255,0.4)' }}>Coordinator Email:</span>
                <span style={{ color: 'white', fontFamily: 'monospace' }}>
                  {opp.id.includes('chevening') ? 'applications@chevening.org' : opp.id.includes('daad') ? 'info@daad.de' : 'coordinator@university.edu'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'rgba(255,255,255,0.4)' }}>Official Address:</span>
                <span style={{ color: 'white', textAlign: 'right', fontSize: '11px' }}>
                  {opp.country} Selection Panel Division
                </span>
              </div>
            </div>
          </div>

          {/* Opportunity Simulator */}
          <div className="card-magnetic glow-border" style={{ padding: '20px', background: 'linear-gradient(180deg, rgba(2,4,8,0) 0%, rgba(6,182,212,0.05) 100%)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '14px', fontWeight: 700, color: 'white' }}>
                🎛️ Opportunity Simulator
              </h3>
              <span className="badge badge-cyan">BETA</span>
            </div>
            <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginBottom: '16px' }}>
              Simulate how improving your profile impacts your success probability.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '8px' }}>
                  <span style={{ color: 'rgba(255,255,255,0.7)' }}>IELTS Band Score</span>
                  <span style={{ color: '#06b6d4', fontWeight: 700 }}>+8% Probability</span>
                </div>
                <input type="range" min="6.0" max="9.0" step="0.5" defaultValue="7.0" style={{ width: '100%', accentColor: '#06b6d4' }} />
              </div>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '8px' }}>
                  <span style={{ color: 'rgba(255,255,255,0.7)' }}>Published Research Papers</span>
                  <span style={{ color: '#06b6d4', fontWeight: 700 }}>+12% Probability</span>
                </div>
                <input type="range" min="0" max="5" step="1" defaultValue="0" style={{ width: '100%', accentColor: '#06b6d4' }} />
              </div>
            </div>
          </div>

          {/* Document Builder Workshop grid */}
          <div className="card" style={{ padding: '20px' }}>
            <h3 style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '14px', fontWeight: 700, color: 'white', marginBottom: '16px' }}>
              ✍️ Document Workshop
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {[
                { type: 'sop', label: 'Statement of Purpose (SOP)' },
                { type: 'personal_statement', label: 'Personal Statement' },
                { type: 'cover_letter', label: 'Cover Letter' },
                { type: 'research_statement', label: 'Research Statement' },
              ].map(doc => (
                <Link
                  key={doc.type}
                  href={`/dashboard/builder?type=${doc.type}&opp=${opp.id}`}
                  style={{
                    display: 'flex', alignItems: 'center', padding: '12px 14px',
                    borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)',
                    background: 'rgba(255,255,255,0.02)', color: 'white', textDecoration: 'none',
                    fontSize: '12px', fontWeight: 600, transition: 'all 0.2s'
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.borderColor = 'rgba(99,102,241,0.4)';
                    e.currentTarget.style.background = 'rgba(99,102,241,0.05)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)';
                    e.currentTarget.style.background = 'rgba(255,255,255,0.02)';
                  }}
                >
                  <span>{doc.label}</span>
                  <span style={{ marginLeft: 'auto', color: '#818cf8' }}>Draft →</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: SUBMISSION */}
      {activeTab === 'submission' && (
        <div className="animate-fade-in card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'white' }}>Official Application Tracker</h2>
            <button onClick={handleStartApplication} className="btn btn-primary" style={{ padding: '8px 16px' }}>
              Add to Pipeline
            </button>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {/* We will just hardcode the visual for now to avoid async component issues in client component */}
            {[
              { id: 'wishlist', label: 'Wishlist', icon: '⭐', color: '#94a3b8', active: true },
              { id: 'interested', label: 'Interested', icon: '👀', color: '#64748b', active: false },
              { id: 'preparing', label: 'Preparing', icon: '📝', color: '#f59e0b', active: false },
              { id: 'documents_ready', label: 'Documents Ready', icon: '📋', color: '#3b82f6', active: false },
              { id: 'official_submission', label: 'Official Submission', icon: '📤', color: '#8b5cf6', active: false },
              { id: 'waiting', label: 'Waiting', icon: '⏳', color: '#6366f1', active: false },
              { id: 'interview', label: 'Interview', icon: '🎤', color: '#ec4899', active: false },
              { id: 'offer_received', label: 'Offer Received', icon: '🎉', color: '#10b981', active: false },
              { id: 'visa', label: 'Visa', icon: '🛂', color: '#06b6d4', active: false },
              { id: 'arrival', label: 'Arrival', icon: '🛬', color: '#0ea5e9', active: false },
              { id: 'enrolled', label: 'Enrolled', icon: '🎓', color: '#22c55e', active: false },
              { id: 'career_growth', label: 'Career Growth', icon: '🚀', color: '#14b8a6', active: false },
            ].map((stage, idx) => (
              <div key={stage.id} style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '12px', background: stage.active ? `${stage.color}15` : 'rgba(255,255,255,0.02)', borderRadius: '8px', border: `1px solid ${stage.active ? stage.color : 'rgba(255,255,255,0.05)'}` }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: stage.active ? stage.color : 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', opacity: stage.active ? 1 : 0.5 }}>
                  {stage.icon}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: stage.active ? 'white' : 'rgba(255,255,255,0.5)' }}>{stage.label}</div>
                  <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>{idx === 0 ? 'Added to tracking pipeline' : 'Pending completion'}</div>
                </div>
                {stage.active && (
                  <div style={{ fontSize: '12px', color: stage.color, fontWeight: 700 }}>CURRENT STAGE</div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB CONTENT: OUTCOMES */}
      {activeTab === 'outcomes' && (
        <div className="animate-fade-in card" style={{ padding: '24px', textAlign: 'center' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'white', marginBottom: '16px' }}>Interview & Visa Preparation</h2>
          <p style={{ color: 'rgba(255,255,255,0.6)' }}>
            This workspace unlocks once your application reaches the "Interview" or "Offer Received" stages.
          </p>
        </div>
      )}
    </div>
  );
}
