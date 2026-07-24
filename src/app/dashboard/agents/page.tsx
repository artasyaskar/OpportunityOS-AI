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

import { Telescope, BarChart, CheckSquare, Map, Target, Edit3, Search, ClipboardCheck, CalendarDays, RefreshCw, Briefcase, Zap, Brain, Wrench } from 'lucide-react';

const AGENTS = [
  { id: 'discovery', num: '01', name: 'Discovery Agent', icon: <Telescope size={28} className="text-indigo-400" />, endpoint: '/api/agents/discovery', desc: 'Scans 10,000+ opportunities globally' },
  { id: 'probability', num: '02', name: 'Probability Engine', icon: <BarChart size={28} className="text-emerald-400" />, endpoint: '/api/agents/probability', desc: 'Predicts your success probability' },
  { id: 'eligibility', num: '03', name: 'Eligibility Agent', icon: <CheckSquare size={28} className="text-blue-400" />, endpoint: '/api/agents/eligibility', desc: 'Matches you to qualified opportunities' },
  { id: 'gap-analysis', num: '04', name: 'Gap Analysis Agent', icon: <Map size={28} className="text-amber-400" />, endpoint: '/api/agents/gap-analysis', desc: 'Identifies exactly what you\'re missing' },
  { id: 'strategist', num: '05', name: 'Strategist Agent', icon: <Target size={28} className="text-rose-400" />, endpoint: '/api/agents/strategist', desc: 'Tells you when and what to apply for' },
  { id: 'builder', num: '06', name: 'Application Builder', icon: <Edit3 size={28} className="text-fuchsia-400" />, endpoint: '/api/agents/builder', desc: 'Generates SOPs, essays, cover letters' },
  { id: 'reviewer', num: '07', name: 'Review Agent', icon: <Search size={28} className="text-teal-400" />, endpoint: '/api/agents/reviewer', desc: 'Scores and improves your submissions' },
  { id: 'compliance', num: '08', name: 'Compliance Agent', icon: <ClipboardCheck size={28} className="text-cyan-400" />, endpoint: '/api/agents/compliance', desc: 'Verifies every requirement is met' },
  { id: 'planner', num: '09', name: 'Planner Agent', icon: <CalendarDays size={28} className="text-violet-400" />, endpoint: '/api/agents/planner', desc: 'Creates your day-by-day timeline' },
  { id: 'rejection', num: '10', name: 'Rejection Learner', icon: <RefreshCw size={28} className="text-orange-400" />, endpoint: '/api/agents/rejection', desc: 'Turns rejections into future wins' },
  { id: 'portfolio', num: '11', name: 'Portfolio Agent', icon: <Briefcase size={28} className="text-sky-400" />, endpoint: '/api/agents/portfolio', desc: 'Manages your opportunity portfolio' },
  { id: 'readiness', num: '12', name: 'Readiness Agent', icon: <Zap size={28} className="text-yellow-400" />, endpoint: '/api/agents/readiness', desc: 'Scores your application readiness' },
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

  useEffect(() => {
    let isMounted = true;
    async function loadOpps() {
      const globalOpps = await OpportunityRepository.getAllOpportunities();
      if (!isMounted) return;
      setAllOpps(globalOpps);

      if (pipeline && pipeline.length > 0) {
        const validOpps = pipeline.map((p: any) => globalOpps.find(o => o.id === p.id)).filter(Boolean) as Opportunity[];
        setPipelineOpps(validOpps);
        if (validOpps.length > 0 && !targetOppId) {
          setTargetOppId(validOpps[0].id);
        }
      } else {
        setPipelineOpps([]);
        if (globalOpps.length > 0 && !targetOppId) {
          setTargetOppId(globalOpps[0].id);
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
        // Compile the context to feed to Gemini
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

  const runAgent = async (agent: typeof AGENTS[0]) => {
    setActiveAgent(agent);
    setIsRunning(true);
    setResultData(null);

    const targetOpportunity = allOpps.find(o => o.id === targetOppId) || allOpps[0];

    try {
      // Setup payload based on agent needs
      const payload: any = {
        profile: profile?.name ? profile : { name: user?.displayName || 'User', education: 'Unknown', country: 'Unknown' },
        evidenceContext: evidenceContext
      };

      // Provide dynamic target context
      if (['probability', 'eligibility', 'gap-analysis'].includes(agent.id)) {
        payload.opportunity = targetOpportunity;
      } else if (agent.id === 'strategist') {
        payload.opportunities = pipelineOpps.length > 0 ? pipelineOpps : SEED_OPPORTUNITIES.slice(0, 3);
      } else if (agent.id === 'portfolio') {
        payload.applications = pipeline || [];
      } else if (agent.id === 'rejection') {
        payload.opportunity = targetOpportunity;
        payload.rejection = "No feedback provided yet.";
      } else if (agent.id === 'builder') {
        payload.opportunity = targetOpportunity;
        payload.type = "Personal Statement";
        payload.instructions = "Focus on my leadership experience.";
      } else if (agent.id === 'planner') {
        payload.opportunity = targetOpportunity;
        payload.daysUntilDeadline = 45;
      } else if (['reviewer', 'compliance', 'readiness'].includes(agent.id)) {
        payload.opportunity = targetOpportunity;
        payload.submission = "My goal is to advance artificial intelligence in emerging markets. Throughout my undergraduate studies...";
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
          openUpgradeModal();
          throw new Error('Insufficient AI Credits');
        }
        throw new Error(data.error || 'Failed to execute agent');
      }
      
      import('@/lib/costLimiter').then(m => m.recordAiRequest(2000, 'groq', !!subscription?.planId && subscription.planId !== 'free'));
      
      setResultData(data);
    } catch (err) {
      setResultData({ error: err instanceof Error ? err.message : 'Failed to communicate with the Agent backend. Check console logs.' });
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', paddingBottom: '60px' }}>
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '28px', fontWeight: 800, color: 'white', marginBottom: '8px', display: 'flex', alignItems: 'center' }}>
          <Brain size={32} className="text-indigo-500 mr-3" /> AI Chief Officer
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '14px' }}>
          Manage your personal fleet of 12 autonomous AI agents. These agents process your Evidence Vault in real-time.
        </p>
      </div>
      
      {/* Evidence Vault Status Bar */}
      <div className="glass-panel" style={{ padding: '16px 20px', borderRadius: '12px', marginBottom: '32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: '1px solid rgba(99,102,241,0.2)' }}>
        <div>
          <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'white' }}>Live Data Feed</h3>
          <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>The agents are actively reading {documents.length} verified documents from your Vault.</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {allOpps.length > 0 && (
            <select 
              value={targetOppId} 
              onChange={(e) => setTargetOppId(e.target.value)}
              style={{ background: 'rgba(0,0,0,0.5)', color: 'white', border: '1px solid rgba(255,255,255,0.1)', padding: '6px 12px', borderRadius: '8px', fontSize: '13px', outline: 'none', maxWidth: '300px' }}
            >
              {pipelineOpps.length > 0 && (
                <optgroup label="Your Saved Pipeline">
                  {pipelineOpps.map(opp => (
                    <option key={opp.id} value={opp.id}>{opp.title}</option>
                  ))}
                </optgroup>
              )}
              <optgroup label="All Opportunities">
                {allOpps.filter(opp => !pipelineOpps.find(p => p.id === opp.id)).map(opp => (
                  <option key={opp.id} value={opp.id}>{opp.title}</option>
                ))}
              </optgroup>
            </select>
          )}
          <div style={{ padding: '6px 12px', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '20px', color: '#10b981', fontSize: '12px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span className="agent-status-dot running" /> Data Synchronized
          </div>
        </div>
      </div>

      <div style={{ marginBottom: '40px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'white', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Zap size={20} className="text-indigo-400" /> The Core Pipeline
        </h2>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'stretch' }}>
          {['discovery', 'gap-analysis', 'strategist', 'builder'].map((id, index) => {
            const agent = AGENTS.find(a => a.id === id)!;
            return (
              <div key={agent.id} style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
                <div 
                  className="card-magnetic glow-border"
                  style={{ 
                    flex: 1,
                    padding: '24px', 
                    position: 'relative', 
                    cursor: 'pointer',
                    background: activeAgent?.id === agent.id ? 'rgba(99,102,241,0.1)' : 'rgba(255,255,255,0.02)',
                    border: activeAgent?.id === agent.id ? '1px solid rgba(99,102,241,0.6)' : '1px solid rgba(255,255,255,0.06)'
                  }}
                  onClick={() => runAgent(agent)}
                >
                  <div style={{ marginBottom: '16px' }}>{agent.icon}</div>
                  <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'white', marginBottom: '8px' }}>{agent.name}</h3>
                  <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', minHeight: '36px' }}>{agent.desc}</p>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '16px' }}>
                    <span className={`agent-status-dot ${isRunning && activeAgent?.id === agent.id ? 'running' : 'idle'}`} />
                    <span style={{ fontSize: '10px', color: isRunning && activeAgent?.id === agent.id ? '#818cf8' : '#10b981', fontWeight: 600 }}>
                      {isRunning && activeAgent?.id === agent.id ? 'PROCESSING...' : 'READY'}
                    </span>
                  </div>
                </div>
                {index < 3 && (
                  <div style={{ padding: '0 12px', color: 'rgba(255,255,255,0.2)', fontSize: '24px' }}>→</div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div>
        <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'white', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Wrench size={20} className="text-slate-400" /> Specialized Agents
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
          {AGENTS.filter(a => !['discovery', 'gap-analysis', 'strategist', 'builder'].includes(a.id)).map(agent => (
          <div 
            key={agent.id}
            className="card"
            style={{ 
              padding: '24px', 
              position: 'relative', 
              overflow: 'hidden',
              cursor: 'pointer',
              border: activeAgent?.id === agent.id ? '1px solid rgba(99,102,241,0.6)' : '1px solid rgba(255,255,255,0.06)'
            }}
            onClick={() => runAgent(agent)}
          >
            <div style={{ position: 'absolute', top: '16px', right: '16px', fontSize: '10px', color: 'rgba(255,255,255,0.2)', fontWeight: 800, fontFamily: 'monospace' }}>
              #{agent.num}
            </div>
            
            <div style={{ marginBottom: '16px' }}>{agent.icon}</div>
            
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'white', marginBottom: '8px' }}>
              {agent.name}
            </h3>
            
            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', marginBottom: '20px', minHeight: '36px' }}>
              {agent.desc}
            </p>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className={`agent-status-dot ${isRunning && activeAgent?.id === agent.id ? 'running' : 'idle'}`} />
              <span style={{ fontSize: '11px', color: isRunning && activeAgent?.id === agent.id ? '#818cf8' : '#10b981', fontWeight: 600, letterSpacing: '0.5px' }}>
                {isRunning && activeAgent?.id === agent.id ? 'PROCESSING DATA...' : 'ACTIVE'}
              </span>
            </div>
          </div>
        ))}
        </div>
      </div>

      {/* Results Modal/Panel */}
      {activeAgent && (
        <div style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: '100%', maxWidth: '500px', background: 'rgba(2, 4, 8, 0.95)', borderLeft: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(20px)', zIndex: 100, display: 'flex', flexDirection: 'column', boxShadow: '-10px 0 30px rgba(0,0,0,0.5)', transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)' }}>
          <div style={{ padding: '24px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '24px' }}>{activeAgent.icon}</span>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'white' }}>{activeAgent.name} Output</h3>
                <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>Real-time Gemini Analysis</p>
              </div>
            </div>
            <button onClick={() => setActiveAgent(null)} style={{ background: 'none', border: 'none', color: 'white', fontSize: '24px', cursor: 'pointer', opacity: 0.5 }}>×</button>
          </div>
          
          <div style={{ padding: '24px', flex: 1, overflowY: 'auto' }}>
            {isRunning ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'rgba(255,255,255,0.5)' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '50%', border: '2px solid rgba(99,102,241,0.2)', borderTopColor: '#6366f1', animation: 'spin 1s linear infinite', marginBottom: '16px' }} />
                <p style={{ fontSize: '14px' }}>Agent is reading {documents.length} verified documents...</p>
              </div>
            ) : (
              <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: '8px', padding: '16px', overflowX: 'auto' }}>
                <pre style={{ margin: 0, fontSize: '12px', color: '#10b981', fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}>
                  {JSON.stringify(resultData, null, 2)}
                </pre>
              </div>
            )}
          </div>
          
          <div style={{ padding: '20px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} onClick={() => runAgent(activeAgent)}>
              Re-run Agent
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
