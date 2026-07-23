'use client';

import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useState, useEffect, useRef } from 'react';
import { OpportunityRepository } from '@/lib/repositories/OpportunityRepository';
import { Opportunity } from '@/lib/gemini';
import { getProbabilityColor } from '@/lib/scoring';
import { calculateOpportunityScore } from '@/lib/scoringEngine';
import { useProfile } from '@/components/auth/ProfileContext';
import { usePipeline } from '@/components/auth/PipelineContext';
import { useAuth } from '@/components/auth/AuthProvider';
import { CheckCircle, Zap, Brain, Wrench, FileText, UploadCloud, GraduationCap, Clipboard, Check, MapPin, Target, ShieldCheck, Map, Search, Link as LinkIcon, Network, Globe, Building, Microscope, UserCheck, DollarSign, Rocket, Activity, Edit3, ClipboardList, Handshake, PartyPopper, CheckSquare, XCircle, AlertTriangle, Clock, Star, Eye, FileEdit, Mic, Shield, PlaneLanding, Lock, MapPin as MapPinIcon, BarChart2, X } from 'lucide-react';

export default function OpportunityDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  
  const [opp, setOpp] = useState<Opportunity | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const { profile: userProfile, openUpgradeModal } = useProfile();
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
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    OpportunityRepository.getOpportunityById(id)
      .then(data => {
        if (cancelled) return;
        setOpp(data);
      })
      .catch(err => {
        if (cancelled) return;
        console.error('Failed to load opportunity:', err);
        setLoadError('We could not load this opportunity. Please check your connection and try again.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [id]);

  useEffect(() => {
    setResumeUploaded(!!(userProfile?.resumeFile || userProfile?.verifiedEvidence?.some(e => e.source.toLowerCase().includes('resume'))));
    setTranscriptUploaded(!!(userProfile?.transcriptFile || userProfile?.verifiedEvidence?.some(e => e.source.toLowerCase().includes('transcript'))));
  }, [userProfile]);

  const oppInPipeline = applications.find((a: any) => a?.id === id || a?.id === opp?.id);
  const currentStage = oppInPipeline ? oppInPipeline.stage : null;
  const hasReachedOutcome = currentStage && ['interview', 'offer_received', 'visa', 'arrival', 'enrolled', 'career_growth'].includes(currentStage);

  const handleRunIntelligence = () => {
    if (!opp || intelligenceData || loadingIntelligence) return;
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
        if (data.requireUpgrade) {
          openUpgradeModal();
        } else if (data.success && data.intelligence) {
          setIntelligenceData(data.intelligence);
        }
      })
      .catch(console.error)
      .finally(() => setLoadingIntelligence(false));
    }).catch(err => {
      console.error('Failed to get auth token', err);
      setLoadingIntelligence(false);
    });
  };

  if (loading) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
      <div style={{ position: 'relative', width: '80px', height: '80px', marginBottom: '24px' }}>
        <div style={{ width: '80px', height: '80px', border: '3px solid rgba(99,102,241,0.2)', borderTop: '3px solid #6366f1', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Zap size={24} className="text-yellow-400" />
        </div>
      </div>
      <h3 style={{ fontSize: '20px', fontWeight: 700, color: 'white', marginBottom: '8px' }}>Accessing Opportunity...</h3>
      <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '14px' }}>Fetching deep intelligence from the global database</p>
      <style dangerouslySetInnerHTML={{ __html: '@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }' }} />
    </div>
  );
  if (loadError) return (
    <div style={{ color: 'white', padding: '40px', textAlign: 'center' }}>
      <p style={{ marginBottom: '16px', color: 'rgba(255,255,255,0.7)' }}>{loadError}</p>
      <Link href="/dashboard/opportunities" style={{ color: '#818cf8', textDecoration: 'none' }}>← Back to Opportunities</Link>
    </div>
  );
  if (!opp) return (
    <div style={{ color: 'white', padding: '40px', textAlign: 'center' }}>
      <p style={{ marginBottom: '16px', color: 'rgba(255,255,255,0.7)' }}>Opportunity not found.</p>
      <Link href="/dashboard/opportunities" style={{ color: '#818cf8', textDecoration: 'none' }}>← Back to Opportunities</Link>
    </div>
  );

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
        matchScore: opp.successProbability || scoreResult.score,
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
              <span className="badge badge-emerald"><CheckCircle size={12} className="inline mr-1" /> Verified Source</span>
              <span className={`badge ${opp.difficulty === 'hard' ? 'badge-rose' : 'badge-amber'}`}>
                {opp.difficulty?.toUpperCase()} DIFFICULTY
              </span>
            </div>
            <h1 style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '28px', fontWeight: 800, color: 'white', marginBottom: '8px', lineHeight: 1.2 }}>
              <Zap size={24} className="inline mr-2 text-yellow-400" /> {opp.title} — Application War Room
            </h1>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '14px', marginBottom: '16px' }}>
              {opp.provider} · {opp.country}
            </p>
            <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
              {[
                { label: 'Award Funding', value: opp.fundingLevel || (opp.fundingAmount ? `${opp.currency || '$'}${opp.fundingAmount.toLocaleString()}` : 'Varies'), color: '#10b981' },
                { label: 'Strategic Deadline', value: opp.deadline, color: '#f59e0b' },
                { label: 'Competition Level', value: opp.competitionLevel ? opp.competitionLevel.charAt(0).toUpperCase() + opp.competitionLevel.slice(1) : 'Varies', color: '#06b6d4' },
                { label: 'Match Confidence', value: scoreResult.riskLevel === 'low' ? 'Strong Match' : scoreResult.riskLevel === 'medium' ? 'Moderate Match' : 'Stretch Goal', color: '#8b5cf6' },
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
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '16px' }}>
              <button onClick={handleStartApplication} className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
                <Zap size={14} className="inline mr-2" /> Launch Document Workshop
              </button>
              {opp.url && (
                <a href={opp.url} target="_blank" rel="noreferrer" className="btn btn-secondary" style={{ width: '100%', justifyContent: 'center' }}>
                  <Globe size={14} className="inline mr-2" /> Official Site ↗
                </a>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* WORKSPACE TABS */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '12px', overflowX: 'auto' }}>
        {[
          { id: 'intelligence', label: <><Brain size={14} className="inline mr-1" /> Intelligence & Fit</> },
          { id: 'preparation', label: <><Wrench size={14} className="inline mr-1" /> Preparation & Evidence</> },
          { id: 'documents', label: <><FileText size={14} className="inline mr-1" /> Document Center</> },
          { id: 'submission', label: <><UploadCloud size={14} className="inline mr-1" /> Tracker & Submission</> },
          { id: 'outcomes', label: <><GraduationCap size={14} className="inline mr-1" /> Outcomes & Visa</> }
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
            <Clipboard size={16} className="inline mr-2 text-indigo-400" /> Opportunity Score Breakdown & Fit Analysis
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
          {loadingIntelligence ? (
            <div style={{ gridColumn: 'span 3', padding: '40px', textAlign: 'center', background: 'rgba(255,255,255,0.02)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div className="spinner" style={{ width: '24px', height: '24px', border: '2px solid rgba(99,102,241,0.2)', borderTopColor: '#6366f1', borderRadius: '50%', margin: '0 auto 16px', animation: 'spin 1s linear infinite' }}></div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#818cf8', marginBottom: '8px' }}>AI Agents Initializing Strategic Intelligence...</div>
              <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>Generating personalized competitive positioning from your verified evidence.</div>
            </div>
          ) : !intelligenceData ? (
            <div style={{ gridColumn: 'span 3', padding: '40px', textAlign: 'center', background: 'rgba(255,255,255,0.02)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ marginBottom: '12px', display: 'flex', justifyContent: 'center' }}><Brain size={24} className="text-indigo-400" /></div>
              <div style={{ fontSize: '15px', fontWeight: 700, color: 'white', marginBottom: '8px' }}>Run AI Strategic Intelligence</div>
              <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', marginBottom: '24px', maxWidth: '400px', margin: '0 auto 24px' }}>Analyze this opportunity against your profile DNA to uncover fit, timing, and competitive positioning.</div>
              <button onClick={handleRunIntelligence} className="btn btn-primary" style={{ padding: '10px 24px', fontSize: '14px' }}>
                Run Intelligence Match
              </button>
            </div>
          ) : (
            <>
              <div className="glass-panel" style={{ padding: '16px', background: 'rgba(16,185,129,0.02)', border: '1px solid rgba(16,185,129,0.1)' }}>
                <div style={{ fontSize: '11px', fontWeight: 800, color: '#10b981', letterSpacing: '1px', marginBottom: '12px' }}>WHY THIS? (FIT & EVIDENCE)</div>
                {(intelligenceData.whyThis || []).map((str: string, i: number) => (
                  <div key={i} style={{ display: 'flex', gap: '8px', marginBottom: '8px', fontSize: '12px', color: 'rgba(255,255,255,0.8)' }}>
                    <Check size={14} className="text-emerald-500 flex-shrink-0 mt-1" />
                    <span>{str}</span>
                  </div>
                ))}
              </div>
              <div className="glass-panel" style={{ padding: '16px', background: 'rgba(99,102,241,0.02)', border: '1px solid rgba(99,102,241,0.1)' }}>
                <div style={{ fontSize: '11px', fontWeight: 800, color: '#818cf8', letterSpacing: '1px', marginBottom: '12px' }}>WHY NOW? (TIMING & PRIORITY)</div>
                {(intelligenceData.whyNow || []).map((str: string, i: number) => (
                  <div key={i} style={{ display: 'flex', gap: '8px', marginBottom: '8px', fontSize: '12px', color: 'rgba(255,255,255,0.8)' }}>
                    <Clock size={14} className="text-indigo-400 flex-shrink-0" />
                    <span>{str}</span>
                  </div>
                ))}
              </div>
              <div className="glass-panel" style={{ padding: '16px', background: 'rgba(245,158,11,0.02)', border: '1px solid rgba(245,158,11,0.1)' }}>
                <div style={{ fontSize: '11px', fontWeight: 800, color: '#f59e0b', letterSpacing: '1px', marginBottom: '12px' }}>WHY NOT OTHERS? (COMPARATIVE)</div>
                {(intelligenceData.whyNotOthers || []).map((str: string, i: number) => (
                  <div key={i} style={{ display: 'flex', gap: '8px', marginBottom: '8px', fontSize: '12px', color: 'rgba(255,255,255,0.8)' }}>
                    <AlertTriangle size={14} className="text-amber-500 flex-shrink-0" />
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
          <Map size={16} className="inline mr-2 text-indigo-400" /> AI Opportunity Timeline & Path Mapping
        </h2>
        <div className="timeline-grid" style={{ gap: '10px', position: 'relative' }}>
          {[
            { step: 'Today', status: 'You are here', done: true, current: true, icon: <MapPin size={16} /> },
            { step: 'Draft Submission', status: 'SOP/Essays Builder', done: resumeUploaded, icon: <Edit3 size={16} /> },
            { step: 'Compliance Lock', status: '12-Agent review', done: false, icon: <ClipboardList size={16} /> },
            { step: 'Interview Selection', status: 'Simulation check', done: false, icon: <Handshake size={16} /> },
            { step: 'Award Acceptance', status: 'Funding active', done: false, icon: <PartyPopper size={16} /> },
            { step: 'Career Impact', status: 'Salary scale rise', done: false, icon: <Rocket size={16} /> },
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
          <span><Network size={18} className="text-indigo-400" /></span> Opportunity Intelligence Relationship Graph
        </h2>
        <div className="relation-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative', flexWrap: 'wrap', gap: '12px' }}>
          {[
            { node: 'Region Target', val: intelligenceData?.graphNodes?.region || opp.country || 'Global', icon: <Globe size={14} />, color: '#6366f1' },
            { node: 'Universities', val: intelligenceData?.graphNodes?.universities || opp.provider, icon: <Building size={14} />, color: '#06b6d4' },
            { node: 'Research Labs', val: intelligenceData?.graphNodes?.researchLabs || 'Relevant Department', icon: <Microscope size={14} />, color: '#8b5cf6' },
            { node: 'PI Mentors', val: intelligenceData?.graphNodes?.piMentors || 'Assigned Faculty', icon: <UserCheck size={14} />, color: '#f59e0b' },
            { node: 'Active Funding', val: intelligenceData?.graphNodes?.activeFunding || opp.fundingLevel || 'Variable Funding', icon: <DollarSign size={14} />, color: '#10b981' },
            { node: 'Career Paths', val: intelligenceData?.graphNodes?.careerPaths || 'Leadership Role', icon: <Rocket size={14} />, color: '#f43f5e' },
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
              <Search size={16} className="inline mr-2 text-indigo-400" /> Executive Mission Brief
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
              ...scoreResult.evidenceMatch.missing.map(m => ({ label: m.requirement, status: 'Missing', icon: <XCircle size={14} className="text-red-500" /> })),
              ...scoreResult.evidenceMatch.weak.map(w => ({ label: w.requirement, status: 'Weak', icon: <AlertTriangle size={14} className="text-yellow-500" /> }))
            ];
            const readyItems = scoreResult.evidenceMatch.ready.map(r => ({ label: r.requirement, status: 'Ready', icon: <CheckCircle size={14} className="text-emerald-500" /> }));
            const allItems = [...readyItems, ...remaining];

            return (
              <>
                {/* Requirements Gap Overview */}
                <div className="card-magnetic glow-border" style={{ padding: '24px', marginBottom: '0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <h3 style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '16px', fontWeight: 700, color: 'white' }}>
                      <BarChart2 size={16} className="inline mr-2 text-indigo-400" /> Requirements Gap Analysis
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
                    <CheckSquare size={16} className="inline mr-2 text-indigo-400" /> Evidence-Based Requirement Checks
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
                            {isReady ? <Check size={12} className="inline mr-1" /> : isWeak ? <AlertTriangle size={12} className="inline mr-1" /> : <X size={12} className="inline mr-1" />}{item.status}
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
              <span><BarChart2 size={16} className="inline mr-2 text-indigo-400" /> Competitor Intelligence Benchmarks</span>
              <span className="badge badge-rose" style={{ fontSize: '9px' }}>SELECTIVITY HIGH</span>
            </h3>
            {loadingIntelligence ? (
              <div style={{ padding: '20px', textAlign: 'center' }}>
                <div className="spinner" style={{ width: '20px', height: '20px', border: '2px solid rgba(99,102,241,0.2)', borderTopColor: '#6366f1', borderRadius: '50%', margin: '0 auto 10px', animation: 'spin 1s linear infinite' }}></div>
                <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>Analyzing global competitor profiles...</div>
              </div>
            ) : !intelligenceData ? (
              <div style={{ padding: '40px', textAlign: 'center', background: 'rgba(255,255,255,0.02)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ fontSize: '15px', fontWeight: 700, color: 'white', marginBottom: '8px' }}>Unlock Competitor Benchmarks</div>
                <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', marginBottom: '24px' }}>Run the AI Intelligence Match to see how you stack up against competitors.</div>
                <button onClick={handleRunIntelligence} className="btn btn-primary" style={{ padding: '8px 24px' }}>
                  Run Intelligence Match
                </button>
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
              <Handshake size={16} className="inline mr-2 text-indigo-400" /> AI Mentor & Professor Matchmaker
            </h3>
            <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', lineHeight: 1.4, marginBottom: '16px' }}>
              We analyzed target faculty profiles matching your ML/AI background. Reach out to these mentors to link your application:
            </p>
            {loadingIntelligence ? (
              <div style={{ padding: '20px', textAlign: 'center' }}>
                <div className="spinner" style={{ width: '20px', height: '20px', border: '2px solid rgba(99,102,241,0.2)', borderTopColor: '#6366f1', borderRadius: '50%', margin: '0 auto 10px', animation: 'spin 1s linear infinite' }}></div>
                <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>Discovering highly relevant mentors for your profile...</div>
              </div>
            ) : !intelligenceData ? (
              <div style={{ padding: '40px', textAlign: 'center', background: 'rgba(255,255,255,0.02)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ fontSize: '15px', fontWeight: 700, color: 'white', marginBottom: '8px' }}>Unlock Mentor Network</div>
                <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', marginBottom: '24px' }}>Run the AI Intelligence Match to discover key academic/professional contacts.</div>
                <button onClick={handleRunIntelligence} className="btn btn-primary" style={{ padding: '8px 24px' }}>
                  Run Intelligence Match
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {(intelligenceData.mentors || []).map((m: any, idx: number) => (
                  <div key={idx} className="glass-sm" style={{ padding: '12px 16px', borderRadius: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: 'white' }}>{m.name}</div>
                      <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>{m.lab} ({m.university})</div>
                      <span style={{ fontSize: '10px', color: '#818cf8', display: 'block', marginTop: '4px', fontFamily: 'monospace' }}>{m.contact}</span>
                    </div>
                    <span className="badge badge-indigo" style={{ fontSize: '8px' }}>{m.tag}</span>
                  </div>
                ))}
              </div>
            )}
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
              <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', fontWeight: 700, letterSpacing: '1px' }}><Shield size={12} className="inline mr-1" /> AI TRANSPARENCY</span>
              <span className="badge badge-emerald">CONFIDENCE: {scoreResult.riskLevel === 'low' ? '92%' : scoreResult.riskLevel === 'medium' ? '78%' : '65%'}</span>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', fontWeight: 700, marginBottom: '4px' }}>RECOMMENDATION REASONING</div>
                <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.8)', lineHeight: 1.4 }}>
                  {scoreResult.riskLevel === 'low' 
                    ? "This opportunity is highly recommended because your verified evidence strongly aligns with the core requirements." 
                    : "This opportunity requires strategic improvements to your profile to maximize your success probability."}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '10px', color: '#10b981', fontWeight: 700, marginBottom: '4px' }}>EVIDENCE USED (VERIFIED)</div>
                <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '11px', color: 'rgba(255,255,255,0.7)' }}>
                  {scoreResult.evidenceMatch.ready.length > 0 ? (
                    scoreResult.evidenceMatch.ready.map((item, idx) => (
                      <li key={idx}>{item.requirement} ({item.evidence})</li>
                    ))
                  ) : (
                    <li>No verified evidence matched yet.</li>
                  )}
                </ul>
              </div>

              <div>
                <div style={{ fontSize: '10px', color: '#f59e0b', fontWeight: 700, marginBottom: '4px' }}>WEAK AREAS (MISSING / WEAK)</div>
                <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '11px', color: 'rgba(255,255,255,0.7)' }}>
                  {[...scoreResult.evidenceMatch.weak, ...scoreResult.evidenceMatch.missing].length > 0 ? (
                    [...scoreResult.evidenceMatch.weak, ...scoreResult.evidenceMatch.missing].map((item, idx) => (
                      <li key={idx}>{item.requirement} ({item.status === 'weak' ? 'Weak' : 'Missing'})</li>
                    ))
                  ) : (
                    <li style={{ color: '#10b981' }}>None detected. Perfect match.</li>
                  )}
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
              <span><LinkIcon size={16} className="text-indigo-400" /></span> Official Source & Verification
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
                  {opp.officialContact || `coordinator@${opp.provider.replace(/[^a-zA-Z]/g, '').toLowerCase() || 'program'}.org`}
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
                <Activity size={16} className="inline mr-2 text-indigo-400" /> Opportunity Simulator
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
              <FileEdit size={16} className="inline mr-2 text-indigo-400" /> Document Workshop
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
            {[
              { id: 'wishlist', label: 'Wishlist', icon: <Star size={14} />, color: '#94a3b8' },
              { id: 'interested', label: 'Interested', icon: <Eye size={14} />, color: '#64748b' },
              { id: 'preparing', label: 'Preparing', icon: <FileEdit size={14} />, color: '#f59e0b' },
              { id: 'documents_ready', label: 'Documents Ready', icon: <ClipboardList size={14} />, color: '#3b82f6' },
              { id: 'official_submission', label: 'Official Submission', icon: <UploadCloud size={14} />, color: '#8b5cf6' },
              { id: 'waiting', label: 'Waiting', icon: <Clock size={14} />, color: '#6366f1' },
              { id: 'interview', label: 'Interview', icon: <Mic size={14} />, color: '#ec4899' },
              { id: 'offer_received', label: 'Offer Received', icon: <PartyPopper size={14} />, color: '#10b981' },
              { id: 'visa', label: 'Visa', icon: <Shield size={14} />, color: '#06b6d4' },
              { id: 'arrival', label: 'Arrival', icon: <PlaneLanding size={14} />, color: '#0ea5e9' },
              { id: 'enrolled', label: 'Enrolled', icon: <GraduationCap size={14} />, color: '#22c55e' },
              { id: 'career_growth', label: 'Career Growth', icon: <Rocket size={14} />, color: '#14b8a6' },
            ].map((stage, idx) => {
              const isActive = currentStage === stage.id;
              return (
                <div key={stage.id} style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '12px', background: isActive ? `${stage.color}15` : 'rgba(255,255,255,0.02)', borderRadius: '8px', border: `1px solid ${isActive ? stage.color : 'rgba(255,255,255,0.05)'}` }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: isActive ? stage.color : 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', opacity: isActive ? 1 : 0.5 }}>
                    {stage.icon}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: isActive ? 'white' : 'rgba(255,255,255,0.5)' }}>{stage.label}</div>
                    <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>{idx === 0 ? 'Added to tracking pipeline' : 'Pending completion'}</div>
                  </div>
                  {isActive && (
                    <div style={{ fontSize: '12px', color: stage.color, fontWeight: 700 }}>CURRENT STAGE</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB CONTENT: OUTCOMES */}
      {activeTab === 'outcomes' && (
        <div className="animate-fade-in card" style={{ padding: '24px', textAlign: 'center' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'white', marginBottom: '16px' }}>Interview & Visa Preparation</h2>
          {!hasReachedOutcome ? (
            <p style={{ color: 'rgba(255,255,255,0.6)' }}>
              <Lock size={12} className="inline mr-1" /> This workspace unlocks once your application reaches the "Interview" or "Offer Received" stages. Keep pushing your application forward!
            </p>
          ) : (
            <div style={{ textAlign: 'left' }}>
              <div style={{ padding: '16px', background: 'rgba(16,185,129,0.05)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: '8px', marginBottom: '16px' }}>
                <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#10b981', marginBottom: '8px' }}><PartyPopper size={14} className="inline mr-2" /> Congratulations on reaching this stage!</h3>
                <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.8)' }}>Your AI Executive Advisor is now preparing targeted interview simulations and visa guidance specific to this opportunity.</p>
              </div>
              <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
                Start Interview Simulation
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
