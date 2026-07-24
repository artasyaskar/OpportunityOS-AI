'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getProbabilityColor } from '@/lib/scoring';
import { useProfile } from '@/components/auth/ProfileContext';
import { useAuth } from '@/components/auth/AuthProvider';
import { usePipeline } from '@/components/auth/PipelineContext';
import { useSubscription } from '@/components/auth/SubscriptionContext';
import { EvidenceRepository, EvidenceDocument } from '@/lib/repositories/EvidenceRepository';
import { OpportunityRepository } from '@/lib/repositories/OpportunityRepository';
import type { Opportunity } from '@/lib/gemini';
import Link from 'next/link';
import { SEED_OPPORTUNITIES } from '@/lib/opportunities';
import { ChevronDown, Map, Target, Zap, Lock, Bot, AlertCircle, AlertTriangle, MapPin, CheckCircle } from 'lucide-react';

const PRIORITY_COLORS: Record<string, string> = {
  critical: '#f43f5e',
  high: '#f59e0b',
  medium: '#3b82f6',
  low: '#10b981',
};

export default function RoadmapPage() {
  const router = useRouter();
  const { user, getIdToken } = useAuth();
  const { profile: userProfile } = useProfile();
  const { pipeline: apps } = usePipeline() as any;
  const { subscription } = useSubscription();
  const [documents, setDocuments] = useState<EvidenceDocument[]>([]);

  const [selectedOppId, setSelectedOppId] = useState<string | null>(null);
  const [allOpps, setAllOpps] = useState<Opportunity[]>([]);
  const [pipelineOpps, setPipelineOpps] = useState<Opportunity[]>([]);
  const [currentOpp, setCurrentOpp] = useState<Opportunity | null>(null);

  const [leverValues, setLeverValues] = useState<Record<string, number>>({});
  const [overallReadiness, setOverallReadiness] = useState(0);

  const [aiAnalysis, setAiAnalysis] = useState<any>(null);
  const [analysisStatus, setAnalysisStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [stats, setStats] = useState({ critical: 0, high: 0, medium: 0, complete: 0 });

  const profile: any = userProfile || {};

  // Initialize selectedOppId and pipelineOpps
  useEffect(() => {
    let isMounted = true;
    async function load() {
      const globalOpps = await OpportunityRepository.getAllOpportunities();
      if (!isMounted) return;
      setAllOpps(globalOpps);

      if (apps && apps.length > 0) {
        const savedOpps = apps.map((p: any) => globalOpps.find(o => o.id === p.id)).filter(Boolean) as Opportunity[];
        setPipelineOpps(savedOpps);
      } else {
        setPipelineOpps([]);
      }
    }
    load();
    return () => { isMounted = false; };
  }, [apps]);

  useEffect(() => {
    if (!selectedOppId && allOpps.length > 0) {
      if (pipelineOpps.length > 0) {
        setSelectedOppId(pipelineOpps[0].id);
      } else {
        setSelectedOppId(allOpps[0].id);
      }
    }
  }, [allOpps, pipelineOpps, selectedOppId]);

  useEffect(() => {
    if (selectedOppId) {
      const opp = allOpps.find(o => o.id === selectedOppId);
      if (opp) {
        setCurrentOpp(opp);
      } else {
        OpportunityRepository.getOpportunityById(selectedOppId).then(setCurrentOpp);
      }
    }
  }, [selectedOppId, allOpps]);

  useEffect(() => {
    if (user?.uid) {
      EvidenceRepository.getEvidenceForUser(user.uid).then(setDocuments);
    }
  }, [user]);

  const runAnalysis = async () => {
    if (!profile || !user?.uid || !selectedOppId || !currentOpp) return;
    try {
      setAnalysisStatus('loading');
      const opportunity = currentOpp;
      
      const token = await getIdToken();
      const res = await fetch('/api/agents/gap-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          userId: user.uid,
          profile,
          opportunity,
          evidenceContext: `User has ${documents.length} verified documents.`
        })
      });
      const data = await res.json();
      const content = data.content || data;
      import('@/lib/costLimiter').then(m => m.recordAiRequest(1500, 'groq'));
      setAiAnalysis(content);
      
      if (content?.gaps) {
        const c = content.gaps.filter((g: any) => g.priority === 'critical').length;
        const h = content.gaps.filter((g: any) => g.priority === 'high').length;
        const m = content.gaps.filter((g: any) => g.priority === 'medium').length;
        setStats({ critical: c, high: h, medium: m, complete: 5 });
      }
      setOverallReadiness(content?.readinessPercentage || 40);

      if (content?.simulatorLevers) {
        const initialLevers: Record<string, number> = {};
        content.simulatorLevers.forEach((lever: any) => {
          initialLevers[lever.name] = lever.current;
        });
        setLeverValues(initialLevers);
      } else {
        setLeverValues({});
      }
      setAnalysisStatus('success');
    } catch (err) {
      console.error(err);
      setAnalysisStatus('error');
    }
  };

  const targetTitle = currentOpp?.title || 'Global Executive Target';

  // Dynamic Simulator odds
  let probabilityBoost = 0;
  if (aiAnalysis?.simulatorLevers) {
    aiAnalysis.simulatorLevers.forEach((lever: any) => {
      const val = leverValues[lever.name] !== undefined ? leverValues[lever.name] : lever.current;
      const diff = val - lever.current;
      probabilityBoost += diff * (lever.impactMultiplier || 5);
    });
  }

  const simulatedProbability = Math.min(
    Math.round(overallReadiness + probabilityBoost),
    98
  );
  const probColor = getProbabilityColor(simulatedProbability);

  return (
    <div>
      <div style={{ marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '28px', fontWeight: 800, color: 'white', marginBottom: '8px' }}>
            <Map size={28} className="inline mr-2 text-indigo-400" /> Gap Analysis & Roadmap
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '14px' }}>
            Your personalized AI-driven action plan to win {targetTitle}
          </p>
        </div>
        
        {/* Opportunity Selector */}
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <div style={{ position: 'relative', width: '320px' }}>
            <select 
              className="input"
              style={{ width: '100%', appearance: 'none', background: 'rgba(255,255,255,0.05)', color: 'white', border: '1px solid rgba(255,255,255,0.1)', padding: '12px 40px 12px 16px', borderRadius: '12px', fontSize: '14px', cursor: 'pointer', outline: 'none' }}
              value={selectedOppId || ''}
              onChange={(e) => {
                setSelectedOppId(e.target.value);
                setAnalysisStatus('idle');
                setAiAnalysis(null);
              }}
              disabled={analysisStatus === 'loading' || allOpps.length === 0}
            >
              {pipelineOpps.length > 0 && (
                <optgroup label="Your Saved Pipeline">
                  {pipelineOpps.map(opp => (
                    <option key={opp.id} value={opp.id}>{opp.title}</option>
                  ))}
                </optgroup>
              )}
              {allOpps.length > 0 && (
                <optgroup label="All Opportunities">
                  {allOpps.filter(opp => !pipelineOpps.find(p => p.id === opp.id)).map(opp => (
                    <option key={opp.id} value={opp.id}>{opp.title}</option>
                  ))}
                </optgroup>
              )}
            </select>
            <ChevronDown size={18} style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.5)', pointerEvents: 'none' }} />
          </div>
          <button 
            onClick={runAnalysis}
            disabled={analysisStatus === 'loading' || !selectedOppId}
            className="btn btn-primary"
            style={{ padding: '12px 24px', height: '44px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}
          >
            <Zap size={16} /> {analysisStatus === 'loading' ? 'Analyzing...' : 'Run AI Analysis'}
          </button>
        </div>
      </div>

      {/* Status Banner */}
      <div
        className="card-premium"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '28px',
          flexWrap: 'wrap',
          gap: '20px',
        }}
      >
        <div>
          <div style={{ fontSize: '12px', fontWeight: 700, color: 'rgba(255,255,255,0.4)', letterSpacing: '1px', marginBottom: '8px' }}>
            SIMULATED ADMISSION ODDS
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '40px', fontWeight: 900, color: probColor }}>
                {simulatedProbability}%
              </div>
              <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>Win Probability</div>
            </div>
            <div style={{ fontSize: '32px', color: 'rgba(255,255,255,0.3)' }}>→</div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '40px', fontWeight: 900, color: '#10b981' }}>85%+</div>
              <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>Target Benchmark</div>
            </div>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', marginBottom: '4px' }}>Estimated time to reach target</div>
          <div style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '28px', fontWeight: 800, color: 'white' }}>
            {aiAnalysis?.estimatedTimeToReady || '3-4 Months'}
          </div>
          <div style={{ marginTop: '8px' }}>
            <span className="badge badge-amber"><Target size={14} className="inline mr-1" /> Target: {targetTitle}</span>
          </div>
        </div>
      </div>

      {/* ROADMAP SUCCESS SIMULATOR ENGINE */}
      <div className="card" style={{ padding: '24px', marginBottom: '28px', border: '1px solid rgba(99,102,241,0.25)', background: 'rgba(99,102,241,0.02)' }}>
        <div style={{ marginBottom: '16px' }}>
          <h2 style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '15px', fontWeight: 700, color: 'white' }}>
            <Zap size={16} className="inline mr-2 text-yellow-400" /> Dynamic AI Success Simulator
          </h2>
          <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>
            Drag variables to see how bridging credentials shifts your success odds live for this specific opportunity.
          </p>
        </div>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px' }}>
          {analysisStatus === 'idle' ? (
            <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '14px' }}>Run Analysis to unlock dynamic simulator</div>
          ) : analysisStatus === 'loading' ? (
            <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '14px' }}>Generating simulation parameters...</div>
          ) : aiAnalysis?.simulatorLevers && aiAnalysis.simulatorLevers.length > 0 ? (
            aiAnalysis.simulatorLevers.map((lever: any, i: number) => (
              <div key={i}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'white', fontWeight: 600, marginBottom: '8px' }}>
                  <span>{lever.name}</span>
                  <span style={{ color: '#818cf8' }}>{leverValues[lever.name] !== undefined ? leverValues[lever.name] : lever.current}</span>
                </div>
                <input 
                  type="range" min={lever.min} max={lever.max} step={lever.step}
                  value={leverValues[lever.name] !== undefined ? leverValues[lever.name] : lever.current}
                  onChange={e => setLeverValues(prev => ({ ...prev, [lever.name]: parseFloat(e.target.value) }))}
                  style={{ width: '100%', cursor: 'pointer' }}
                />
              </div>
            ))
          ) : (
            <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '14px' }}>No simulation parameters available for this opportunity.</div>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '28px' }}>
        {/* Rejection Intelligence Dashboard */}
        <div className="card" style={{ padding: '24px', border: '1px solid rgba(244,63,94,0.25)', background: 'rgba(244,63,94,0.02)' }}>
          <div className="card-header" style={{ padding: '24px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 600, color: 'white' }}>Execution Roadmap</h2>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '14px', marginTop: '4px' }}>Your step-by-step path to achieving your goals.</p>
          </div>
          <div style={{ padding: '24px' }}>
            {(!subscription || subscription.status === 'FREE' || subscription.planId === 'free') ? (
              <div className="card-magnetic glow-border" style={{ padding: '32px', textAlign: 'center', background: 'rgba(99,102,241,0.05)', border: '1px solid rgba(99,102,241,0.2)' }}>
                <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'white', marginBottom: '12px' }}><Lock size={18} className="inline mr-2 text-indigo-400" /> Step-by-Step AI Roadmap</h3>
                <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.7)', marginBottom: '24px', maxWidth: '400px', margin: '0 auto 24px' }}>
                  Upgrade to Pro to generate a highly personalized timeline and task checklist based on your gap analysis.
                </p>
                <Link href="/dashboard/settings/account" className="btn btn-primary" style={{ display: 'inline-flex', padding: '12px 24px' }}>
                  Upgrade to Pro
                </Link>
              </div>
            ) : (
              <div className="timeline-container" style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
                <div style={{ fontSize: '11px', color: '#f59e0b', fontWeight: 700 }}>TARGET STATE</div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: 'white', marginTop: '4px' }}>
                  {analysisStatus === 'idle' ? 'Run AI Analysis to view target state' : analysisStatus === 'loading' ? 'Analyzing...' : aiAnalysis?.targetState || 'N/A'}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="card" style={{ padding: '24px' }}>
          <div className="card-header" style={{ padding: '24px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 600, color: 'white' }}>Opportunity Gap Analysis</h2>
          </div>
          <div style={{ padding: '24px' }}>
            {(!subscription || subscription.status === 'FREE' || subscription.planId === 'free') ? (
              <div className="card-magnetic glow-border" style={{ padding: '32px', textAlign: 'center', background: 'rgba(99,102,241,0.05)', border: '1px solid rgba(99,102,241,0.2)' }}>
                <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'white', marginBottom: '12px' }}><Lock size={18} className="inline mr-2 text-indigo-400" /> Premium AI Gap Analysis</h3>
                <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.7)', marginBottom: '24px', maxWidth: '400px', margin: '0 auto 24px' }}>
                  Upgrade to Pro to unlock the AI Planner, identify critical weaknesses in your profile, and receive a step-by-step roadmap to admission.
                </p>
                <Link href="/dashboard/settings/account" className="btn btn-primary" style={{ display: 'inline-flex', padding: '12px 24px' }}>
                  Upgrade to Pro
                </Link>
              </div>
            ) : analysisStatus === 'idle' ? (
              <div style={{ color: 'rgba(255,255,255,0.5)', textAlign: 'center', padding: '20px' }}>Run AI Analysis to uncover your critical profile gaps.</div>
            ) : analysisStatus === 'loading' ? (
              <div style={{ color: 'rgba(255,255,255,0.5)', textAlign: 'center', padding: '20px' }}>Analyzing gaps with AI...</div>
            ) : aiAnalysis?.gaps?.map((gap: any, i: number) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: 'white' }}>{gap.item}</div>
                    <div className="badge" style={{ fontSize: '10px', textTransform: 'capitalize', color: PRIORITY_COLORS[gap.priority] || 'white', border: `1px solid ${PRIORITY_COLORS[gap.priority] || 'white'}40` }}>
                      {gap.priority} Priority
                    </div>
                  </div>
                  <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginBottom: '8px' }}>
                    Est: {gap.timeEstimate}
                  </div>
                  <div style={{ height: '6px', background: 'rgba(255,255,255,0.06)', borderRadius: '3px', overflow: 'hidden' }}>
                    <div
                      style={{
                        height: '100%',
                        width: '0%', // Start at 0% for AI generated gaps
                        background: 'linear-gradient(90deg, #f43f5e, #8b5cf6)',
                      }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '7fr 3fr', gap: '24px' }}>
        {/* AI Missions Timeline */}
        <div className="card" style={{ padding: '28px' }}>
          <h2 style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '18px', fontWeight: 700, color: 'white', marginBottom: '24px' }}>
            <Target size={18} className="inline mr-2 text-indigo-400" /> Active AI Missions
          </h2>
          <div style={{ position: 'relative', paddingLeft: '24px' }}>
            <div style={{ position: 'absolute', left: '7px', top: 0, bottom: 0, width: '2px', background: 'linear-gradient(180deg, #6366f1, #06b6d4)', borderRadius: '1px', opacity: 0.3 }} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {analysisStatus === 'idle' ? (
                <div style={{ color: 'rgba(255,255,255,0.5)', textAlign: 'center', padding: '20px' }}>Run AI Analysis to generate your step-by-step roadmap.</div>
              ) : analysisStatus === 'loading' ? (
                <div style={{ color: 'rgba(255,255,255,0.5)', textAlign: 'center', padding: '20px' }}>Generating AI Action Plan...</div>
              ) : aiAnalysis?.actionPlan?.map((item: any, i: number) => (
                <div key={i} style={{ display: 'flex', gap: '16px', alignItems: 'flex-start', position: 'relative' }}>
                  <div
                    style={{
                      position: 'absolute',
                      left: '-22px',
                      top: '6px',
                      width: '10px',
                      height: '10px',
                      borderRadius: '50%',
                      background: '#6366f1',
                      boxShadow: `0 0 8px #6366f160`,
                      flexShrink: 0,
                    }}
                  />
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '16px' }}><Bot size={16} /></span>
                      <span style={{ fontSize: '14px', fontWeight: 700, color: 'white' }}>{item.action}</span>
                      <span className="badge badge-emerald" style={{ fontSize: '10px' }}>Step {item.step}</span>
                    </div>
                    <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>
                      <span style={{ color: '#818cf8', fontWeight: 600 }}>{item.timeline}</span>
                      <span style={{ margin: '0 8px' }}>•</span>
                      <span>Resources: {item.resources?.join(', ')}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Stats Summary */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {[
            { label: 'Critical Gaps', value: stats.critical, icon: <AlertCircle size={14} />, color: '#f43f5e', desc: 'Must resolve before applying' },
            { label: 'High Priority', value: stats.high, icon: <AlertTriangle size={14} />, color: '#f59e0b', desc: 'Strongly recommended to fix' },
            { label: 'Medium Priority', value: stats.medium, icon: <MapPin size={14} />, color: '#3b82f6', desc: 'Will improve your chances' },
            { label: 'Items Complete', value: stats.complete, icon: <CheckCircle size={14} />, color: '#10b981', desc: 'Already meeting requirements' },
          ].map(stat => (
            <div key={stat.label} className="card" style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div
                style={{
                  width: '44px', height: '44px', borderRadius: '12px', flexShrink: 0,
                  background: `${stat.color}18`, border: `1px solid ${stat.color}30`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px',
                }}
              >
                {stat.icon}
              </div>
              <div>
                <div style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '24px', fontWeight: 800, color: 'white', lineHeight: 1 }}>{stat.value}</div>
                <div style={{ fontSize: '12px', fontWeight: 700, color: stat.color }}>{stat.label}</div>
                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>{stat.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
