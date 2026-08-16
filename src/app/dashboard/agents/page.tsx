'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { useProfile } from '@/components/auth/ProfileContext';
import { usePipeline } from '@/components/auth/PipelineContext';
import { useSubscription } from '@/components/auth/SubscriptionContext';
import { EvidenceRepository, type EvidenceDocument } from '@/lib/repositories/EvidenceRepository';
import { OpportunityRepository } from '@/lib/repositories/OpportunityRepository';
import { SEED_OPPORTUNITIES } from '@/lib/opportunities';
import type { Opportunity } from '@/lib/gemini';
import Link from 'next/link';

import {
  Telescope,
  BarChart,
  CheckSquare,
  Map,
  Target,
  Edit3,
  Search,
  ClipboardCheck,
  CalendarDays,
  RefreshCw,
  Briefcase,
  Zap,
  Brain,
  Wrench,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Clock,
  Copy,
  Check,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  FileText,
  ChevronRight,
  Play,
  Award,
  Layers,
  Sparkle
} from 'lucide-react';

const AGENTS = [
  { id: 'discovery', num: '01', name: 'Discovery Agent', icon: <Telescope size={26} className="text-indigo-400" />, endpoint: '/api/agents/discovery', desc: 'Scans 10,000+ opportunities globally for your profile' },
  { id: 'probability', num: '02', name: 'Probability Engine', icon: <BarChart size={26} className="text-emerald-400" />, endpoint: '/api/agents/probability', desc: 'Predicts your admission and funding probability' },
  { id: 'eligibility', num: '03', name: 'Eligibility Agent', icon: <CheckSquare size={26} className="text-blue-400" />, endpoint: '/api/agents/eligibility', desc: 'Matches you to qualified criteria and flags blockers' },
  { id: 'gap-analysis', num: '04', name: 'Gap Analysis Agent', icon: <Map size={26} className="text-amber-400" />, endpoint: '/api/agents/gap-analysis', desc: 'Identifies exactly what credentials you are missing' },
  { id: 'strategist', num: '05', name: 'Strategist Agent', icon: <Target size={26} className="text-rose-400" />, endpoint: '/api/agents/strategist', desc: 'Sequences optimal application timing and priority' },
  { id: 'builder', num: '06', name: 'Application Builder', icon: <Edit3 size={26} className="text-fuchsia-400" />, endpoint: '/api/agents/builder', desc: 'Generates evidence-grounded SOPs, essays and letters' },
  { id: 'reviewer', num: '07', name: 'Review Agent', icon: <Search size={26} className="text-teal-400" />, endpoint: '/api/agents/reviewer', desc: 'Scores and refines your application drafts' },
  { id: 'compliance', num: '08', name: 'Compliance Agent', icon: <ClipboardCheck size={26} className="text-cyan-400" />, endpoint: '/api/agents/compliance', desc: 'Audits every requirement for zero disqualification' },
  { id: 'planner', num: '09', name: 'Planner Agent', icon: <CalendarDays size={26} className="text-violet-400" />, endpoint: '/api/agents/planner', desc: 'Creates day-by-day deadline execution timelines' },
  { id: 'rejection', num: '10', name: 'Rejection Learner', icon: <RefreshCw size={26} className="text-orange-400" />, endpoint: '/api/agents/rejection', desc: 'Extracts root causes to pivot into winning strategies' },
  { id: 'portfolio', num: '11', name: 'Portfolio Agent', icon: <Briefcase size={26} className="text-sky-400" />, endpoint: '/api/agents/portfolio', desc: 'Manages risk and pipeline diversification health' },
  { id: 'readiness', num: '12', name: 'Readiness Agent', icon: <Zap size={26} className="text-yellow-400" />, endpoint: '/api/agents/readiness', desc: 'Holistically audits all document credentials' },
];

export default function AgentsDashboard() {
  const { user, getIdToken } = useAuth();
  const { profile, openUpgradeModal } = useProfile() as any;
  const { pipeline } = usePipeline() as any;
  const { subscription } = useSubscription();
  
  const [documents, setDocuments] = useState<EvidenceDocument[]>([]);
  const [evidenceContext, setEvidenceContext] = useState('');
  
  const [pipelineOpps, setPipelineOpps] = useState<Opportunity[]>([]);
  const [allOpps, setAllOpps] = useState<Opportunity[]>([]);
  const [targetOppId, setTargetOppId] = useState<string>('');

  const [activeAgent, setActiveAgent] = useState<any>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [resultData, setResultData] = useState<any>(null);
  const [copiedText, setCopiedText] = useState(false);

  // Multi-agent orchestration state
  const [isOrchestratingFleet, setIsOrchestratingFleet] = useState(false);
  const [fleetStep, setFleetStep] = useState<number>(0);
  const [fleetResults, setFleetResults] = useState<any>({});

  useEffect(() => {
    let isMounted = true;
    async function loadOpps() {
      const globalOpps = await OpportunityRepository.getAllOpportunities();
      if (!isMounted) return;
      const validGlobal = globalOpps.length > 0 ? globalOpps : SEED_OPPORTUNITIES;
      setAllOpps(validGlobal);

      if (pipeline && pipeline.length > 0) {
        const validOpps = pipeline.map((p: any) => validGlobal.find(o => o.id === p.id)).filter(Boolean) as Opportunity[];
        setPipelineOpps(validOpps);
        if (validOpps.length > 0 && !targetOppId) {
          setTargetOppId(validOpps[0].id);
        }
      } else {
        setPipelineOpps([]);
        if (validGlobal.length > 0 && !targetOppId) {
          setTargetOppId(validGlobal[0].id);
        }
      }
    }
    loadOpps();
    return () => { isMounted = false; };
  }, [pipeline, targetOppId]);

  useEffect(() => {
    if (user) {
      EvidenceRepository.getEvidenceForUser(user.uid).then(docs => {
        setDocuments(docs);
        const contextLines = docs.map(d => {
          let extra = '';
          if (d.extractedData) {
            extra = JSON.stringify(d.extractedData);
          }
          return `[${d.type.toUpperCase()}] ${d.fileName} - Confidence: ${d.aiConfidence}% | Data: ${extra}`;
        });
        setEvidenceContext(contextLines.join('\n'));
      });
    }
  }, [user]);

  const targetOpportunity = allOpps.find(o => o.id === targetOppId) || allOpps[0] || SEED_OPPORTUNITIES[0];

  const runAgent = async (agent: typeof AGENTS[0]) => {
    setActiveAgent(agent);
    setIsRunning(true);
    setResultData(null);
    setCopiedText(false);

    try {
      const currentTarget = allOpps.find(o => o.id === targetOppId) || allOpps[0] || SEED_OPPORTUNITIES[0];
      const payload: any = {
        profile: profile?.name ? profile : { name: user?.displayName || 'Applicant', education: 'Undergraduate / Graduate', country: 'Global', field: profile?.field || 'General Sciences' },
        evidenceContext: evidenceContext || `User has ${documents.length} verified documents stored in Vault.`
      };

      if (['probability', 'eligibility', 'gap-analysis'].includes(agent.id)) {
        payload.opportunity = currentTarget;
      } else if (agent.id === 'strategist') {
        payload.opportunities = pipelineOpps.length > 0 ? pipelineOpps : allOpps.slice(0, 4);
      } else if (agent.id === 'portfolio') {
        payload.applications = pipeline && pipeline.length > 0 ? pipeline : [{ id: currentTarget.id, title: currentTarget.title, stage: 'preparing', matchScore: 85 }];
      } else if (agent.id === 'rejection') {
        payload.opportunity = currentTarget;
        payload.rejection = "Application was not selected due to highly competitive candidate pool and need for more domain leadership evidence.";
      } else if (agent.id === 'builder') {
        payload.opportunity = currentTarget;
        payload.type = "Personal Statement";
        payload.instructions = `Highlight candidate background in ${profile?.field || 'my domain'} and align with ${currentTarget.title}.`;
      } else if (agent.id === 'planner') {
        payload.opportunity = currentTarget;
        payload.daysUntilDeadline = 45;
      } else if (['reviewer', 'compliance', 'readiness'].includes(agent.id)) {
        payload.opportunity = currentTarget;
        payload.submission = `My goal is to advance scientific knowledge and leadership in emerging technologies. Throughout my undergraduate studies, I focused on high-impact research, global collaboration, and building solutions for underserved communities.`;
      }

      const token = await getIdToken();
      const res = await fetch(agent.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(payload)
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        if (res.status === 402 || data.requireUpgrade) {
          setResultData({ error: "You've completed your 1,000 daily free AI credits. Redirecting to Plan & Billing dashboard..." });
          setTimeout(() => {
            window.location.href = '/dashboard/settings?tab=billing&plan=professional_monthly';
          }, 1000);
          return;
        }
        throw new Error(data.error || 'Failed to execute agent');
      }
      
      const isProActive = Boolean(subscription && ['ACTIVE', 'APPROVED', 'LIFETIME', 'ENTERPRISE'].includes((subscription.status || '').toUpperCase()));
      import('@/lib/costLimiter').then(m => {
        try {
          m.recordAiRequest(1000, 'groq', isProActive);
        } catch (err: any) {
          if (err.name === 'OutOfCreditsError') {
            setResultData({ error: "You've completed your 1,000 daily free AI credits. Redirecting to Plan & Billing dashboard..." });
            setTimeout(() => {
              window.location.href = '/dashboard/settings?tab=billing&plan=professional_monthly';
            }, 1000);
          }
        }
      }).catch(() => {});
      
      setResultData(data);
    } catch (err: any) {
      setResultData({ error: err instanceof Error ? err.message : 'Failed to communicate with Agent backend.' });
    } finally {
      setIsRunning(false);
    }
  };

  // Master Orchestration: Unified Single-Pass Master Multi-Agent Fleet Call
  const runFleetDossier = async () => {
    setIsOrchestratingFleet(true);
    setFleetResults(null);

    try {
      const token = await getIdToken();
      const currentTarget = allOpps.find(o => o.id === targetOppId) || allOpps[0] || SEED_OPPORTUNITIES[0];
      const basePayload = {
        profile: profile?.name ? profile : { name: user?.displayName || 'Applicant', field: profile?.field || 'Technology & Science' },
        opportunity: currentTarget,
        evidenceContext: evidenceContext || `User has ${documents.length} verified documents in vault.`
      };

      const res = await fetch('/api/agents/dossier', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(basePayload)
      });

      if (!res.ok) {
        if (res.status === 402) {
          setFleetResults({ error: "You've completed your 1,000 daily free AI credits. Redirecting to Plan & Billing dashboard..." });
          setTimeout(() => {
            window.location.href = '/dashboard/settings?tab=billing&plan=professional_monthly';
          }, 1000);
          return;
        }
        const err = await res.json();
        throw new Error(err.error || 'Failed to synthesize fleet dossier');
      }

      const dossierData = await res.json();
      setFleetResults(dossierData);
      
      const isProActive = Boolean(subscription && ['ACTIVE', 'APPROVED', 'LIFETIME', 'ENTERPRISE'].includes((subscription.status || '').toUpperCase()));
      import('@/lib/costLimiter').then(m => {
        try {
          m.recordAiRequest(1000, 'gemini', isProActive);
        } catch (err: any) {
          if (err.name === 'OutOfCreditsError') {
            setFleetResults({ error: "You've completed your 1,000 daily free AI credits. Redirecting to Plan & Billing dashboard..." });
            setTimeout(() => {
              window.location.href = '/dashboard/settings?tab=billing&plan=professional_monthly';
            }, 1000);
          }
        }
      }).catch(() => {});
    } catch (err: any) {
      console.error('Fleet dossier execution error:', err);
      setFleetResults({ error: err instanceof Error ? err.message : 'Failed to execute master fleet dossier.' });
    } finally {
      setIsOrchestratingFleet(false);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2000);
  };

  // Render bespoke output visualizer based on active agent
  const renderAgentOutput = () => {
    if (!resultData) return null;
    if (resultData.error) {
      return (
        <div style={{ padding: '20px', borderRadius: '12px', background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.25)', color: '#f87171' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, marginBottom: '8px' }}>
            <AlertCircle size={18} /> Agent Execution Notice
          </div>
          <p style={{ fontSize: '13px', margin: 0, lineHeight: 1.5 }}>{resultData.error}</p>
        </div>
      );
    }

    const id = activeAgent?.id;

    // 1. PROBABILITY ENGINE
    if (id === 'probability') {
      const prob = resultData as any;
      const score = prob.successProbability || 75;
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', background: 'linear-gradient(135deg, rgba(16,185,129,0.1) 0%, rgba(99,102,241,0.05) 100%)', borderRadius: '12px', border: '1px solid rgba(16,185,129,0.3)' }}>
            <div>
              <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', fontWeight: 700, textTransform: 'uppercase' }}>Predicted Success Match</div>
              <div style={{ fontSize: '28px', fontWeight: 800, color: '#10b981', fontFamily: 'Space Grotesk, sans-serif' }}>{score}% Match</div>
              <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)', marginTop: '2px' }}>Confidence Level: <strong style={{ color: 'white', textTransform: 'capitalize' }}>{prob.confidence || 'High'}</strong></div>
            </div>
            <span className={`badge ${score >= 70 ? 'badge-emerald' : score >= 40 ? 'badge-amber' : 'badge-rose'}`} style={{ textTransform: 'uppercase', padding: '6px 12px' }}>
              {(prob.recommendation || 'Apply Now').replace('_', ' ')}
            </span>
          </div>

          {prob.factors && (
            <div style={{ padding: '16px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: 'white', marginBottom: '12px' }}>Fit Factor Breakdown</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {Object.entries(prob.factors).map(([key, value]: [string, any]) => (
                  <div key={key}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '4px' }}>
                      <span style={{ color: 'rgba(255,255,255,0.6)', textTransform: 'capitalize' }}>{key}</span>
                      <span style={{ fontWeight: 700, color: 'white' }}>{value.score || 70}/100</span>
                    </div>
                    <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.06)', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{ width: `${value.score || 70}%`, height: '100%', background: value.score >= 70 ? '#10b981' : value.score >= 40 ? '#f59e0b' : '#ef4444', borderRadius: '3px' }} />
                    </div>
                    {value.note && <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>{value.note}</div>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {prob.reasoning && (
            <div style={{ padding: '14px', background: 'rgba(99,102,241,0.04)', borderRadius: '12px', border: '1px solid rgba(99,102,241,0.15)' }}>
              <div style={{ fontSize: '11px', color: '#818cf8', fontWeight: 700, marginBottom: '4px' }}>Strategic Rationale</div>
              <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)', margin: 0, lineHeight: 1.5 }}>{prob.reasoning}</p>
            </div>
          )}
        </div>
      );
    }

    // 2. GAP ANALYSIS AGENT
    if (id === 'gap-analysis') {
      const gap = resultData as any;
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px', background: 'rgba(245,158,11,0.08)', borderRadius: '12px', border: '1px solid rgba(245,158,11,0.25)' }}>
            <div>
              <div style={{ fontSize: '11px', color: '#f59e0b', fontWeight: 700 }}>Readiness Score</div>
              <div style={{ fontSize: '24px', fontWeight: 800, color: 'white', fontFamily: 'Space Grotesk, sans-serif' }}>{gap.readinessPercentage || 70}% Ready</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)' }}>Estimated Time to Complete</div>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#f59e0b' }}>{gap.estimatedTimeToReady || '2-3 Weeks'}</div>
            </div>
          </div>

          {gap.gaps && gap.gaps.length > 0 && (
            <div style={{ padding: '14px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: 'white', marginBottom: '10px' }}>Identified Credential Shortfalls</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {gap.gaps.map((item: any, i: number) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px' }}>
                    <span style={{ fontSize: '12px', color: 'white' }}>{typeof item === 'string' ? item : item.item}</span>
                    {item.priority && (
                      <span className={`badge ${item.priority === 'critical' ? 'badge-rose' : item.priority === 'high' ? 'badge-amber' : 'badge-indigo'}`} style={{ fontSize: '9px', textTransform: 'uppercase' }}>
                        {item.priority}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {gap.actionPlan && gap.actionPlan.length > 0 && (
            <div style={{ padding: '14px', background: 'rgba(99,102,241,0.04)', borderRadius: '12px', border: '1px solid rgba(99,102,241,0.2)' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#818cf8', marginBottom: '10px' }}>4-Step Action Plan</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {gap.actionPlan.map((step: any, i: number) => (
                  <div key={i} style={{ display: 'flex', gap: '10px', fontSize: '12px', color: 'rgba(255,255,255,0.8)' }}>
                    <span style={{ color: '#818cf8', fontWeight: 800 }}>#{step.step || i + 1}</span>
                    <div>
                      <div style={{ color: 'white', fontWeight: 600 }}>{step.action || step}</div>
                      {step.timeline && <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)' }}>Timeline: {step.timeline}</div>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      );
    }

    // 3. APPLICATION BUILDER
    if (id === 'builder') {
      const build = resultData as any;
      const textContent = build.content || build.essayText || (typeof build === 'string' ? build : 'Generated draft prepared.');
      const words = textContent.split(/\s+/).filter(Boolean).length;
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', background: 'rgba(217,70,239,0.08)', borderRadius: '10px', border: '1px solid rgba(217,70,239,0.25)' }}>
            <div>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#f472b6' }}>Master Personal Statement Draft</div>
              <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)' }}>{words} words • Evidence Grounded</div>
            </div>
            <button onClick={() => handleCopy(textContent)} className="btn btn-secondary btn-sm" style={{ gap: '6px', fontSize: '11px' }}>
              {copiedText ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
              {copiedText ? 'Copied!' : 'Copy Draft'}
            </button>
          </div>

          <div style={{ padding: '16px', background: 'rgba(0,0,0,0.4)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)', maxHeight: '320px', overflowY: 'auto' }}>
            <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.85)', lineHeight: 1.6, margin: 0, whiteSpace: 'pre-wrap' }}>
              {textContent}
            </p>
          </div>

          {build.evidenceUsed && build.evidenceUsed.length > 0 && (
            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)' }}>
              <span style={{ fontWeight: 600, color: '#818cf8' }}>Vault Citations: </span>
              {build.evidenceUsed.join(' • ')}
            </div>
          )}
        </div>
      );
    }

    // 4. ELIGIBILITY AGENT
    if (id === 'eligibility') {
      const elig = resultData as any;
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px', background: elig.eligible ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)', borderRadius: '12px', border: `1px solid ${elig.eligible ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}` }}>
            <div>
              <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)' }}>Criteria Verification</div>
              <div style={{ fontSize: '20px', fontWeight: 800, color: elig.eligible ? '#10b981' : '#f87171' }}>
                {elig.eligible ? '✓ Qualified Candidate' : '⚠️ Action Needed'}
              </div>
            </div>
            <div style={{ fontSize: '24px', fontWeight: 800, color: 'white' }}>{elig.eligibilityScore || 85}%</div>
          </div>

          {elig.summary && (
            <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)', lineHeight: 1.5, margin: 0 }}>{elig.summary}</p>
          )}

          {elig.missingRequirements && elig.missingRequirements.length > 0 && (
            <div style={{ padding: '12px', background: 'rgba(245,158,11,0.05)', borderRadius: '10px', border: '1px solid rgba(245,158,11,0.2)' }}>
              <div style={{ fontSize: '11px', color: '#f59e0b', fontWeight: 700, marginBottom: '6px' }}>Missing Requirements</div>
              <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '12px', color: 'rgba(255,255,255,0.7)' }}>
                {elig.missingRequirements.map((req: string, idx: number) => (
                  <li key={idx} style={{ marginBottom: '4px' }}>{req}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      );
    }

    // 5. REVIEW AGENT
    if (id === 'reviewer') {
      const rev = resultData as any;
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px', background: 'rgba(20,184,166,0.08)', borderRadius: '12px', border: '1px solid rgba(20,184,166,0.3)' }}>
            <div>
              <div style={{ fontSize: '11px', color: '#14b8a6', fontWeight: 700 }}>Overall Writing Score</div>
              <div style={{ fontSize: '24px', fontWeight: 800, color: 'white' }}>{rev.overallScore || 88}/100</div>
            </div>
            <span className="badge badge-teal" style={{ textTransform: 'uppercase' }}>{rev.verdict || 'Strong'}</span>
          </div>

          {rev.scores && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              {Object.entries(rev.scores).map(([k, v]: [string, any]) => (
                <div key={k} style={{ padding: '8px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)', textTransform: 'capitalize' }}>{k}</span>
                  <span style={{ fontSize: '11px', fontWeight: 700, color: '#14b8a6' }}>{v}/10</span>
                </div>
              ))}
            </div>
          )}

          {rev.specificFeedback && rev.specificFeedback.length > 0 && (
            <div style={{ padding: '12px', background: 'rgba(255,255,255,0.02)', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ fontSize: '11px', color: 'white', fontWeight: 700, marginBottom: '6px' }}>Suggested Refinements</div>
              {rev.specificFeedback.slice(0, 2).map((item: any, i: number) => (
                <div key={i} style={{ marginBottom: '8px', fontSize: '11px' }}>
                  {item.quote && <div style={{ color: 'rgba(255,255,255,0.4)', fontStyle: 'italic' }}>&ldquo;{item.quote}&rdquo;</div>}
                  <div style={{ color: '#818cf8', marginTop: '2px' }}>→ {item.suggestion}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }

    // 6. PLANNER AGENT
    if (id === 'planner') {
      const plan = resultData as any;
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ padding: '12px 14px', background: 'rgba(139,92,246,0.08)', borderRadius: '10px', border: '1px solid rgba(139,92,246,0.25)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: '12px', fontWeight: 700, color: '#a78bfa' }}>Execution Timeline</div>
            <div style={{ fontSize: '12px', color: 'white', fontWeight: 700 }}>{plan.totalDays || 45} Days to Deadline</div>
          </div>

          {plan.phases && plan.phases.map((phase: any, i: number) => (
            <div key={i} style={{ padding: '12px', background: 'rgba(255,255,255,0.02)', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: 700, color: 'white', marginBottom: '8px' }}>
                <span>{phase.phase}</span>
                <span style={{ color: '#a78bfa' }}>{phase.days}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {phase.tasks?.slice(0, 3).map((task: any, tIdx: number) => (
                  <div key={tIdx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'rgba(255,255,255,0.7)' }}>
                    <span>• {task.task || task}</span>
                    {task.duration && <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '10px' }}>{task.duration}</span>}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      );
    }

    // 7. COMPLIANCE AGENT
    if (id === 'compliance') {
      const comp = resultData as any;
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px', background: comp.overallCompliant ? 'rgba(6,182,212,0.08)' : 'rgba(245,158,11,0.08)', borderRadius: '12px', border: '1px solid rgba(6,182,212,0.3)' }}>
            <div>
              <div style={{ fontSize: '11px', color: '#06b6d4', fontWeight: 700 }}>Zero-Disqualification Audit</div>
              <div style={{ fontSize: '18px', fontWeight: 800, color: 'white' }}>{comp.overallCompliant ? '100% Compliant' : 'Audit Incomplete'}</div>
            </div>
            <span className="badge badge-cyan">{comp.completionPercentage || 100}% Ready</span>
          </div>

          {comp.checklist && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {comp.checklist.map((item: any, i: number) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', fontSize: '11px' }}>
                  <span style={{ color: 'white' }}>{item.requirement}</span>
                  <span className={`badge ${item.status === 'complete' ? 'badge-emerald' : 'badge-amber'}`} style={{ fontSize: '9px', textTransform: 'uppercase' }}>
                    {item.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }

    // Default formatted fallback for other agents (Strategist, Rejection, Portfolio, Readiness, Discovery)
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ padding: '14px', background: 'rgba(99,102,241,0.08)', borderRadius: '12px', border: '1px solid rgba(99,102,241,0.25)' }}>
          <div style={{ fontSize: '12px', color: '#818cf8', fontWeight: 700, marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Sparkles size={14} /> Agent Intelligence Output
          </div>
          <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.85)', lineHeight: 1.5, margin: 0 }}>
            {resultData.analysis || resultData.summary || resultData.motivationalNote || (typeof resultData === 'string' ? resultData : 'Strategic analysis successfully executed.')}
          </p>
        </div>

        {resultData.recommendations && Array.isArray(resultData.recommendations) && (
          <div style={{ padding: '14px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ fontSize: '12px', fontWeight: 700, color: 'white', marginBottom: '8px' }}>Actionable Recommendations</div>
            <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '12px', color: 'rgba(255,255,255,0.7)', lineHeight: 1.5 }}>
              {resultData.recommendations.map((r: any, idx: number) => (
                <li key={idx} style={{ marginBottom: '4px' }}>{typeof r === 'string' ? r : r.action || JSON.stringify(r)}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', paddingBottom: '60px' }}>
      {/* Top Title & Mission Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '28px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <span className="badge badge-indigo" style={{ fontSize: '10px', letterSpacing: '1px' }}>THE AI EXECUTIVE FLEET</span>
            <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>12 Specialized Models • 1 Coordinated Persona</span>
          </div>
          <h1 style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '30px', fontWeight: 800, color: 'white', marginBottom: '6px', display: 'flex', alignItems: 'center' }}>
            <Brain size={32} className="text-indigo-400 mr-3" /> AI Chief Officer
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '14px', maxWidth: '650px', lineHeight: 1.5 }}>
            Your personal AI Chief Opportunity Officer quietly coordinates 12 specialized models behind the scenes, reading verified documents from your Vault in real-time.
          </p>
        </div>

        {/* Master Multi-Agent Fleet Dossier Button */}
        <button
          onClick={runFleetDossier}
          disabled={isOrchestratingFleet}
          className="btn btn-primary"
          style={{ padding: '12px 20px', fontSize: '13px', display: 'inline-flex', alignItems: 'center', gap: '8px', boxShadow: '0 0 25px rgba(99,102,241,0.4)' }}
        >
          {isOrchestratingFleet ? (
            <>
              <div style={{ width: '16px', height: '16px', border: '2px solid rgba(255,255,255,0.2)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
              <span>Synthesizing Fleet Dossier (Single Pass)...</span>
            </>
          ) : (
            <>
              <Sparkles size={16} />
              <span>Run Full Fleet Dossier ⚡</span>
            </>
          )}
        </button>
      </div>
      
      {/* Evidence Vault & Target Context Bar */}
      <div className="glass-panel" style={{ padding: '18px 22px', borderRadius: '14px', marginBottom: '32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: '1px solid rgba(99,102,241,0.25)', background: 'linear-gradient(135deg, rgba(99,102,241,0.05) 0%, rgba(16,185,129,0.03) 100%)', flexWrap: 'wrap', gap: '14px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShieldCheck size={16} className="text-emerald-400" />
            <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'white', margin: 0 }}>Live Evidence Data Feed</h3>
          </div>
          <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginTop: '4px', margin: 0 }}>
            Agents are grounded in <strong style={{ color: '#10b981' }}>{documents.length} verified documents</strong> from your Evidence Vault.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)' }}>Active Target:</span>
            {allOpps.length > 0 && (
              <select 
                value={targetOppId} 
                onChange={(e) => setTargetOppId(e.target.value)}
                style={{ background: 'rgba(0,0,0,0.6)', color: 'white', border: '1px solid rgba(255,255,255,0.15)', padding: '6px 14px', borderRadius: '8px', fontSize: '13px', outline: 'none', maxWidth: '280px' }}
              >
                {pipelineOpps.length > 0 && (
                  <optgroup label="Your Pipeline">
                    {pipelineOpps.map(opp => (
                      <option key={opp.id} value={opp.id}>{opp.title}</option>
                    ))}
                  </optgroup>
                )}
                <optgroup label="Global Opportunities">
                  {allOpps.filter(opp => !pipelineOpps.find(p => p.id === opp.id)).map(opp => (
                    <option key={opp.id} value={opp.id}>{opp.title}</option>
                  ))}
                </optgroup>
              </select>
            )}
          </div>
          <div style={{ padding: '6px 12px', background: 'rgba(16, 185, 129, 0.12)', borderRadius: '20px', color: '#10b981', fontSize: '11px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px', border: '1px solid rgba(16,185,129,0.25)' }}>
            <span className="agent-status-dot running" /> Data Synchronized
          </div>
        </div>
      </div>

      {/* Autonomous Fleet Dossier Results Card (When Executed) */}
      {fleetResults && (
        <div className="card" style={{ padding: '24px', marginBottom: '32px', border: '1px solid rgba(99,102,241,0.4)', background: 'linear-gradient(180deg, rgba(99,102,241,0.04) 0%, rgba(0,0,0,0.4) 100%)', borderRadius: '16px', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}>
          {fleetResults.error ? (
            <div style={{ color: '#f87171', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
              <AlertCircle size={16} /> {fleetResults.error}
            </div>
          ) : (
            <>
              {/* Dossier Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', flexWrap: 'wrap', gap: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ padding: '10px', borderRadius: '12px', background: 'rgba(99,102,241,0.18)', color: '#818cf8' }}><Brain size={22} /></div>
                  <div>
                    <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'white', margin: 0 }}>Executive Intelligence Dossier</h3>
                    <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.45)', margin: 0, marginTop: '2px' }}>
                      Complete 12-Agent Single-Pass Synthesis for {targetOpportunity.title}
                    </p>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className="badge badge-emerald" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 12px', fontSize: '11px' }}>
                    <span className="agent-status-dot running" /> 12 INVISIBLE EXPERTS SYNCHRONIZED
                  </span>
                </div>
              </div>

              {/* Executive Summary Banner */}
              {fleetResults.executiveSummary && (
                <div style={{ padding: '14px 16px', background: 'rgba(99,102,241,0.08)', borderRadius: '12px', border: '1px solid rgba(99,102,241,0.2)', marginBottom: '20px' }}>
                  <div style={{ fontSize: '11px', color: '#818cf8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>
                    Chief Opportunity Officer Briefing
                  </div>
                  <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.85)', lineHeight: 1.5, margin: 0 }}>
                    {fleetResults.executiveSummary}
                  </p>
                </div>
              )}

              {/* 12-Agent Intelligence Grid (All 12 Specialist Models Distinctly Rendered) */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(270px, 1fr))', gap: '14px', marginBottom: '24px' }}>
                
                {/* 1. Discovery Agent (#01) */}
                <div style={{ padding: '16px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid rgba(99,102,241,0.25)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span style={{ fontSize: '11px', color: '#818cf8', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <Telescope size={14} /> #01 Discovery Agent
                      </span>
                      <span className="badge badge-indigo" style={{ fontSize: '9px', textTransform: 'uppercase' }}>
                        {fleetResults.discovery?.targetTier || 'Target'} Tier
                      </span>
                    </div>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: 'white', marginBottom: '4px' }}>
                      {fleetResults.discovery?.matchedCategory || 'Global Opportunities'}
                    </div>
                    {fleetResults.discovery?.similarOpportunities && fleetResults.discovery.similarOpportunities.length > 0 && (
                      <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.45)', marginTop: '4px' }}>
                        Similar Program: {fleetResults.discovery.similarOpportunities[0].title} ({fleetResults.discovery.similarOpportunities[0].matchScore}% match)
                      </div>
                    )}
                  </div>
                  <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', marginTop: '8px', paddingTop: '6px', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                    Scanned across 10,000+ opportunities
                  </div>
                </div>

                {/* 2. Probability Engine (#02) */}
                <div style={{ padding: '16px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid rgba(16,185,129,0.25)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span style={{ fontSize: '11px', color: '#10b981', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <BarChart size={14} /> #02 Probability Engine
                      </span>
                      <span className={`badge ${fleetResults.probability?.successProbability >= 70 ? 'badge-emerald' : fleetResults.probability?.successProbability >= 45 ? 'badge-amber' : 'badge-rose'}`} style={{ fontSize: '9px', textTransform: 'uppercase' }}>
                        {(fleetResults.probability?.recommendation || 'Strengthen First').replace('_', ' ')}
                      </span>
                    </div>
                    <div style={{ fontSize: '24px', fontWeight: 800, color: '#10b981', fontFamily: 'Space Grotesk, sans-serif' }}>
                      {fleetResults.probability?.successProbability || 68}% Win Rate
                    </div>
                    <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', margin: 0, marginTop: '4px', lineHeight: 1.4 }}>
                      {fleetResults.probability?.reasoning || 'Calibrated against competitive applicant pool.'}
                    </p>
                  </div>
                  {fleetResults.probability?.factors && (
                    <div style={{ display: 'flex', gap: '4px', marginTop: '8px', paddingTop: '6px', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                      {Object.entries(fleetResults.probability.factors).slice(0, 3).map(([k, v]: [string, any]) => (
                        <span key={k} style={{ fontSize: '9px', color: 'rgba(255,255,255,0.5)', background: 'rgba(255,255,255,0.04)', padding: '1px 5px', borderRadius: '4px', textTransform: 'capitalize' }}>
                          {k}: {v.score}%
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* 3. Eligibility Agent (#03) */}
                <div style={{ padding: '16px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid rgba(59,130,246,0.25)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span style={{ fontSize: '11px', color: '#60a5fa', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <CheckSquare size={14} /> #03 Eligibility Agent
                      </span>
                      <span className={`badge ${fleetResults.eligibility?.eligible !== false ? 'badge-blue' : 'badge-amber'}`} style={{ fontSize: '9px' }}>
                        {fleetResults.eligibility?.eligibilityScore || 82}% Criteria
                      </span>
                    </div>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: 'white', marginBottom: '4px' }}>
                      {fleetResults.eligibility?.eligible !== false ? '✓ Qualified Candidate' : '⚠️ Conditional Eligibility'}
                    </div>
                    <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', margin: 0, lineHeight: 1.4 }}>
                      {fleetResults.eligibility?.summary || 'Primary qualification prerequisites verified.'}
                    </p>
                  </div>
                  {fleetResults.eligibility?.missingRequirements && fleetResults.eligibility.missingRequirements.length > 0 && (
                    <div style={{ fontSize: '10px', color: '#f59e0b', marginTop: '6px', paddingTop: '4px', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                      Missing: {fleetResults.eligibility.missingRequirements[0]}
                    </div>
                  )}
                </div>

                {/* 4. Gap Analysis Agent (#04) */}
                <div style={{ padding: '16px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid rgba(245,158,11,0.25)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span style={{ fontSize: '11px', color: '#f59e0b', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <Map size={14} /> #04 Gap Analysis Agent
                      </span>
                      <span className="badge badge-amber" style={{ fontSize: '9px' }}>
                        {fleetResults.gapAnalysis?.estimatedTimeToReady || '2-3 Weeks'}
                      </span>
                    </div>
                    <div style={{ fontSize: '24px', fontWeight: 800, color: '#f59e0b', fontFamily: 'Space Grotesk, sans-serif' }}>
                      {fleetResults.gapAnalysis?.readinessPercentage || 68}% Ready
                    </div>
                    {fleetResults.gapAnalysis?.gaps && fleetResults.gapAnalysis.gaps.length > 0 && (
                      <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)', marginTop: '4px', lineHeight: 1.4 }}>
                        Key Gap: {fleetResults.gapAnalysis.gaps[0].item}
                      </div>
                    )}
                  </div>
                  {fleetResults.gapAnalysis?.actionPlan && fleetResults.gapAnalysis.actionPlan.length > 0 && (
                    <div style={{ fontSize: '10px', color: '#818cf8', marginTop: '8px', paddingTop: '6px', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                      Next Step: {fleetResults.gapAnalysis.actionPlan[0].action}
                    </div>
                  )}
                </div>

                {/* 5. Strategist Agent (#05) */}
                <div style={{ padding: '16px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid rgba(244,63,94,0.25)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span style={{ fontSize: '11px', color: '#fb7185', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <Target size={14} /> #05 Strategist Agent
                      </span>
                      <span className="badge badge-rose" style={{ fontSize: '9px' }}>
                        {fleetResults.strategist?.priorityRank || 'Priority #1'}
                      </span>
                    </div>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: 'white', marginBottom: '4px' }}>
                      Optimal Window: {fleetResults.strategist?.bestTimeToApply || 'Early Submission'}
                    </div>
                    <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', margin: 0, lineHeight: 1.4 }}>
                      {fleetResults.strategist?.strategicRationale || 'Strategic timing advice to maximize reviewer engagement.'}
                    </p>
                  </div>
                  {fleetResults.strategist?.sequencingAdvice && (
                    <div style={{ fontSize: '10px', color: '#fb7185', marginTop: '8px', paddingTop: '6px', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                      Sequencing: {fleetResults.strategist.sequencingAdvice}
                    </div>
                  )}
                </div>

                {/* 6. Application Builder (#06) */}
                <div style={{ padding: '16px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid rgba(217,70,239,0.25)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span style={{ fontSize: '11px', color: '#f472b6', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <Edit3 size={14} /> #06 Application Builder
                      </span>
                      <span className="badge badge-fuchsia" style={{ fontSize: '9px' }}>
                        {fleetResults.applicationDraft?.confidence || 'High'} Quality
                      </span>
                    </div>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: 'white', marginBottom: '4px' }}>
                      {fleetResults.applicationDraft?.title || 'Master Personal Statement'}
                    </div>
                    <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', margin: 0, lineHeight: 1.4 }}>
                      Evidence-grounded draft tailored to profile and {targetOpportunity.title}.
                    </p>
                  </div>
                  <div style={{ fontSize: '10px', color: '#f472b6', marginTop: '8px', paddingTop: '6px', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                    ↓ See Full Master SOP Draft Below
                  </div>
                </div>

                {/* 7. Review Agent (#07) */}
                <div style={{ padding: '16px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid rgba(20,184,166,0.25)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span style={{ fontSize: '11px', color: '#14b8a6', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <Search size={14} /> #07 Review Agent
                      </span>
                      <span className="badge badge-teal" style={{ fontSize: '9px' }}>
                        {fleetResults.reviewer?.verdict || 'Solid Draft'}
                      </span>
                    </div>
                    <div style={{ fontSize: '24px', fontWeight: 800, color: '#14b8a6', fontFamily: 'Space Grotesk, sans-serif' }}>
                      {fleetResults.reviewer?.overallScore || 78}/100 Rubric
                    </div>
                    <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', margin: 0, marginTop: '4px', lineHeight: 1.4 }}>
                      {fleetResults.reviewer?.keyFeedback || 'Evaluated across 5 standard admission rubric dimensions.'}
                    </p>
                  </div>
                  {fleetResults.reviewer?.criticalWeakness && (
                    <div style={{ fontSize: '10px', color: '#f87171', marginTop: '8px', paddingTop: '6px', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                      Critical Weakness: {fleetResults.reviewer.criticalWeakness}
                    </div>
                  )}
                </div>

                {/* 8. Compliance Agent (#08) */}
                <div style={{ padding: '16px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid rgba(6,182,212,0.25)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span style={{ fontSize: '11px', color: '#06b6d4', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <ClipboardCheck size={14} /> #08 Compliance Agent
                      </span>
                      <span className={`badge ${fleetResults.compliance?.overallCompliant ? 'badge-cyan' : 'badge-amber'}`} style={{ fontSize: '9px' }}>
                        {fleetResults.compliance?.completionPercentage || 75}% Audited
                      </span>
                    </div>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: 'white', marginBottom: '4px' }}>
                      {fleetResults.compliance?.overallCompliant ? '✓ 100% Compliant' : '⚠️ Action Items Flagged'}
                    </div>
                    {fleetResults.compliance?.checklist && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '6px' }}>
                        {fleetResults.compliance.checklist.slice(0, 2).map((item: any, idx: number) => (
                          <div key={idx} style={{ fontSize: '10px', color: 'rgba(255,255,255,0.6)', display: 'flex', justifyContent: 'space-between' }}>
                            <span>• {item.requirement}</span>
                            <span style={{ color: item.status === 'complete' ? '#10b981' : '#f59e0b' }}>{item.status}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', marginTop: '8px', paddingTop: '6px', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                    Zero-Disqualification Audit
                  </div>
                </div>

                {/* 9. Planner Agent (#09) */}
                <div style={{ padding: '16px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid rgba(139,92,246,0.25)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span style={{ fontSize: '11px', color: '#a78bfa', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <CalendarDays size={14} /> #09 Planner Agent
                      </span>
                      <span className="badge badge-violet" style={{ fontSize: '9px' }}>
                        {fleetResults.planner?.phases?.length || 3} Phases
                      </span>
                    </div>
                    <div style={{ fontSize: '24px', fontWeight: 800, color: '#a78bfa', fontFamily: 'Space Grotesk, sans-serif' }}>
                      {fleetResults.planner?.totalDays || 45} Days
                    </div>
                    {fleetResults.planner?.phases && fleetResults.planner.phases.length > 0 && (
                      <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', margin: 0, marginTop: '4px', lineHeight: 1.4 }}>
                        Current: {fleetResults.planner.phases[0].phase}
                      </p>
                    )}
                  </div>
                  <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', marginTop: '8px', paddingTop: '6px', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                    Safe milestone buffers included
                  </div>
                </div>

                {/* 10. Rejection Learner (#10) */}
                <div style={{ padding: '16px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid rgba(249,115,22,0.25)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span style={{ fontSize: '11px', color: '#fb923c', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <RefreshCw size={14} /> #10 Rejection Shield
                      </span>
                      <span className="badge badge-orange" style={{ fontSize: '9px' }}>
                        Pitfall Defense
                      </span>
                    </div>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: 'white', marginBottom: '4px' }}>
                      Edge: {fleetResults.rejectionLearner?.competitiveEdge || 'Authentic Vault Evidence'}
                    </div>
                    {fleetResults.rejectionLearner?.likelyCauses && fleetResults.rejectionLearner.likelyCauses.length > 0 && (
                      <p style={{ fontSize: '10px', color: '#f87171', margin: 0, lineHeight: 1.4 }}>
                        Risk: {fleetResults.rejectionLearner.likelyCauses[0]}
                      </p>
                    )}
                  </div>
                  <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', marginTop: '8px', paddingTop: '6px', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                    Proactive failure prevention
                  </div>
                </div>

                {/* 11. Portfolio Agent (#11) */}
                <div style={{ padding: '16px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid rgba(14,165,233,0.25)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span style={{ fontSize: '11px', color: '#38bdf8', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <Briefcase size={14} /> #11 Portfolio Agent
                      </span>
                      <span className={`badge ${fleetResults.portfolio?.riskLevel === 'Low' ? 'badge-emerald' : fleetResults.portfolio?.riskLevel === 'Medium' ? 'badge-amber' : 'badge-rose'}`} style={{ fontSize: '9px' }}>
                        {fleetResults.portfolio?.riskLevel || 'Medium'} Risk
                      </span>
                    </div>
                    <div style={{ fontSize: '24px', fontWeight: 800, color: '#38bdf8', fontFamily: 'Space Grotesk, sans-serif' }}>
                      {fleetResults.portfolio?.portfolioHealthScore || 74}% Health
                    </div>
                    <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', margin: 0, marginTop: '4px', lineHeight: 1.4 }}>
                      {fleetResults.portfolio?.diversificationAdvice || 'Maintain balanced portfolio pipeline.'}
                    </p>
                  </div>
                  <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', marginTop: '8px', paddingTop: '6px', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                    Pipeline diversification check
                  </div>
                </div>

                {/* 12. Readiness Agent (#12) */}
                <div style={{ padding: '16px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid rgba(234,179,8,0.25)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span style={{ fontSize: '11px', color: '#facc15', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <Zap size={14} /> #12 Readiness Agent
                      </span>
                      <span className="badge badge-amber" style={{ fontSize: '9px' }}>
                        4 Pillars
                      </span>
                    </div>
                    <div style={{ fontSize: '24px', fontWeight: 800, color: '#facc15', fontFamily: 'Space Grotesk, sans-serif' }}>
                      {fleetResults.readiness?.overallScore || 70}% Audit
                    </div>
                    {fleetResults.readiness?.breakdown && (
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px', marginTop: '6px' }}>
                        {Object.entries(fleetResults.readiness.breakdown).map(([k, v]: [string, any]) => (
                          <div key={k} style={{ fontSize: '9px', color: 'rgba(255,255,255,0.6)', textTransform: 'capitalize' }}>
                            {k}: <strong style={{ color: v.status === 'Verified' ? '#10b981' : v.status === 'Draft Ready' ? '#38bdf8' : '#f59e0b' }}>{v.status || v.score + '%'}</strong>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', marginTop: '8px', paddingTop: '6px', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                    Evidence document completeness
                  </div>
                </div>

              </div>

              {/* Master SOP Preview (#06 Application Builder) */}
              {fleetResults.applicationDraft?.essayText && (
                <div style={{ padding: '18px 20px', background: 'rgba(0,0,0,0.6)', borderRadius: '14px', border: '1px solid rgba(217,70,239,0.25)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: '#f472b6', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <FileText size={16} /> #06 Application Builder: {fleetResults.applicationDraft.title || 'Master Personal Statement'}
                      </div>
                      <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>
                        Evidence-grounded from Vault • Grounded in {documents.length} verified documents
                      </div>
                    </div>
                    <button 
                      onClick={() => handleCopy(fleetResults.applicationDraft.essayText)}
                      className="btn btn-secondary btn-sm"
                      style={{ fontSize: '11px', gap: '6px' }}
                    >
                      {copiedText ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                      {copiedText ? 'Copied Draft!' : 'Copy Master SOP Draft'}
                    </button>
                  </div>
                  <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.85)', lineHeight: 1.65, margin: 0, maxHeight: '240px', overflowY: 'auto', whiteSpace: 'pre-wrap', paddingRight: '6px' }}>
                    {fleetResults.applicationDraft.essayText}
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Core Autonomous Pipeline Sequence */}
      <div style={{ marginBottom: '40px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'white', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Zap size={20} className="text-indigo-400" /> The Core Autonomous Pipeline
        </h2>
        <div style={{ display: 'flex', gap: '14px', alignItems: 'stretch', flexWrap: 'wrap' }}>
          {['discovery', 'gap-analysis', 'strategist', 'builder'].map((id, index) => {
            const agent = AGENTS.find(a => a.id === id)!;
            const isSelected = activeAgent?.id === agent.id;
            return (
              <div key={agent.id} style={{ flex: '1 1 240px', minWidth: '220px', display: 'flex', alignItems: 'center' }}>
                <div 
                  className="card-magnetic glow-border"
                  style={{ 
                    flex: 1,
                    padding: '22px', 
                    position: 'relative', 
                    cursor: 'pointer',
                    background: isSelected ? 'rgba(99,102,241,0.12)' : 'rgba(255,255,255,0.02)',
                    border: isSelected ? '1px solid rgba(99,102,241,0.6)' : '1px solid rgba(255,255,255,0.06)',
                    borderRadius: '14px',
                    transition: 'all 0.2s ease'
                  }}
                  onClick={() => runAgent(agent)}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
                    <div>{agent.icon}</div>
                    <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', fontWeight: 800, fontFamily: 'monospace' }}>#{agent.num}</span>
                  </div>
                  <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'white', marginBottom: '6px' }}>{agent.name}</h3>
                  <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.45)', minHeight: '34px', lineHeight: 1.4, margin: 0 }}>{agent.desc}</p>
                  
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '16px', paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span className={`agent-status-dot ${isRunning && isSelected ? 'running' : 'idle'}`} />
                      <span style={{ fontSize: '10px', color: isRunning && isSelected ? '#818cf8' : '#10b981', fontWeight: 700 }}>
                        {isRunning && isSelected ? 'PROCESSING...' : 'READY'}
                      </span>
                    </div>
                    <span style={{ fontSize: '11px', color: '#818cf8', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '2px' }}>
                      Run <ChevronRight size={14} />
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Specialized Autonomous Agents Grid */}
      <div>
        <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'white', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Wrench size={20} className="text-slate-400" /> Specialized Autonomous Models
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '16px' }}>
          {AGENTS.filter(a => !['discovery', 'gap-analysis', 'strategist', 'builder'].includes(a.id)).map(agent => {
            const isSelected = activeAgent?.id === agent.id;
            return (
              <div 
                key={agent.id}
                className="card"
                style={{ 
                  padding: '22px', 
                  position: 'relative', 
                  overflow: 'hidden',
                  cursor: 'pointer',
                  borderRadius: '14px',
                  border: isSelected ? '1px solid rgba(99,102,241,0.6)' : '1px solid rgba(255,255,255,0.06)',
                  background: isSelected ? 'rgba(99,102,241,0.08)' : 'rgba(255,255,255,0.02)',
                  transition: 'all 0.2s ease'
                }}
                onClick={() => runAgent(agent)}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
                  <div>{agent.icon}</div>
                  <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', fontWeight: 800, fontFamily: 'monospace' }}>#{agent.num}</span>
                </div>
                
                <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'white', marginBottom: '6px' }}>
                  {agent.name}
                </h3>
                
                <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.45)', marginBottom: '16px', minHeight: '34px', lineHeight: 1.4 }}>
                  {agent.desc}
                </p>
                
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span className={`agent-status-dot ${isRunning && isSelected ? 'running' : 'idle'}`} />
                    <span style={{ fontSize: '10px', color: isRunning && isSelected ? '#818cf8' : '#10b981', fontWeight: 700, letterSpacing: '0.5px' }}>
                      {isRunning && isSelected ? 'RUNNING...' : 'ACTIVE'}
                    </span>
                  </div>
                  <span style={{ fontSize: '11px', color: '#818cf8', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '2px' }}>
                    Execute <ChevronRight size={14} />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Enterprise Executive Output Drawer */}
      {activeAgent && (
        <div style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: '100%', maxWidth: '540px', background: 'rgba(4, 6, 12, 0.98)', borderLeft: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(25px)', zIndex: 100, display: 'flex', flexDirection: 'column', boxShadow: '-15px 0 40px rgba(0,0,0,0.7)', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)' }}>
          {/* Drawer Header */}
          <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255,255,255,0.02)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ padding: '8px', borderRadius: '10px', background: 'rgba(255,255,255,0.05)' }}>{activeAgent.icon}</div>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'white', margin: 0 }}>{activeAgent.name}</h3>
                <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.45)', margin: 0, marginTop: '2px' }}>Target: {targetOpportunity.title}</p>
              </div>
            </div>
            <button 
              onClick={() => setActiveAgent(null)} 
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', width: '32px', height: '32px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
            >
              ✕
            </button>
          </div>
          
          {/* Drawer Body */}
          <div style={{ padding: '24px', flex: 1, overflowY: 'auto' }}>
            {isRunning ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', textAlign: 'center', color: 'rgba(255,255,255,0.6)' }}>
                <div style={{ width: '44px', height: '44px', borderRadius: '50%', border: '3px solid rgba(99,102,241,0.2)', borderTopColor: '#6366f1', animation: 'spin 1s linear infinite', marginBottom: '16px' }} />
                <div style={{ fontSize: '15px', fontWeight: 700, color: 'white' }}>{activeAgent.name} Executing...</div>
                <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.45)', marginTop: '4px', maxWidth: '300px' }}>
                  Processing {documents.length} verified Vault documents & analyzing target criteria.
                </p>
              </div>
            ) : (
              renderAgentOutput()
            )}
          </div>
          
          {/* Drawer Footer Actions */}
          <div style={{ padding: '18px 24px', borderTop: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.01)', display: 'flex', gap: '10px' }}>
            <button 
              className="btn btn-primary" 
              style={{ flex: 1, justifyContent: 'center', gap: '6px', fontSize: '12px' }} 
              onClick={() => runAgent(activeAgent)}
              disabled={isRunning}
            >
              <RefreshCw size={14} className={isRunning ? 'animate-spin' : ''} />
              Re-run Agent
            </button>
            <Link 
              href="/dashboard/vault" 
              className="btn btn-secondary" 
              style={{ fontSize: '12px', padding: '0 16px' }}
            >
              Vault →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
