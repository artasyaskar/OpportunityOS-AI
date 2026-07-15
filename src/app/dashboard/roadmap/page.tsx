'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getProbabilityColor } from '@/lib/scoring';
import { useProfile } from '@/components/auth/ProfileContext';
import { useAuth } from '@/components/auth/AuthProvider';
import { usePipeline } from '@/components/auth/PipelineContext';
import { useSubscription } from '@/components/auth/SubscriptionContext';
import { EvidenceRepository, EvidenceDocument } from '@/lib/repositories/EvidenceRepository';
import Link from 'next/link';
import { SEED_OPPORTUNITIES } from '@/lib/opportunities';

const PRIORITY_COLORS: Record<string, string> = {
  critical: '#f43f5e',
  high: '#f59e0b',
  medium: '#3b82f6',
  low: '#10b981',
};

export default function RoadmapPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { profile: userProfile } = useProfile();
  const { pipeline: apps } = usePipeline();
  const { subscription } = useSubscription();
  const [documents, setDocuments] = useState<EvidenceDocument[]>([]);

  const [ielts, setIelts] = useState(6.0);
  const [researchPapers, setResearchPapers] = useState(0);
  const [overallReadiness, setOverallReadiness] = useState(0);

  const [aiAnalysis, setAiAnalysis] = useState<any>(null);
  const [isAiLoading, setIsAiLoading] = useState(true);
  const [stats, setStats] = useState({ critical: 0, high: 0, medium: 0, complete: 0 });

  const profile: any = userProfile || {};

  useEffect(() => {
    if (user?.uid) {
      EvidenceRepository.getEvidenceForUser(user.uid).then(setDocuments);
    }
  }, [user]);

  useEffect(() => {
    if (!profile || !user?.uid) return;
    const fetchAnalysis = async () => {
      try {
        const topApp = apps.length > 0 ? apps[0] : null;
        const opportunity = topApp ? SEED_OPPORTUNITIES.find(o => o.id === topApp.id) : SEED_OPPORTUNITIES[0];
        
        const res = await fetch('/api/agents/gap-analysis', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: user.uid,
            profile,
            opportunity,
            evidenceContext: `User has ${documents.length} verified documents.`
          })
        });
        const data = await res.json();
        setAiAnalysis(data.content);
        if (data.content?.gaps) {
          const c = data.content.gaps.filter((g: any) => g.priority === 'critical').length;
          const h = data.content.gaps.filter((g: any) => g.priority === 'high').length;
          const m = data.content.gaps.filter((g: any) => g.priority === 'medium').length;
          setStats({ critical: c, high: h, medium: m, complete: 5 }); // Mock complete
        }
        setOverallReadiness(data.content?.readinessPercentage || 40);
      } catch (err) {
        console.error(err);
      } finally {
        setIsAiLoading(false);
      }
    };
    fetchAnalysis();
  }, [profile, user, documents, apps]);

  const targetTitle = apps.length > 0 ? SEED_OPPORTUNITIES.find(o => o.id === apps[0].id)?.title : profile?.careerGoal || 'Global Executive Target';

  // Dynamic Simulator odds
  const simulatedProbability = Math.min(
    Math.round(overallReadiness + (ielts - 6.5) * 12 + researchPapers * 10),
    98
  );
  const probColor = getProbabilityColor(simulatedProbability);

  return (
    <div>
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '28px', fontWeight: 800, color: 'white', marginBottom: '8px' }}>
          🗺️ Gap Analysis & Roadmap
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '14px' }}>
          Your personalized AI-driven action plan to win {targetTitle}
        </p>
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
            <span className="badge badge-amber">🎯 Target: {targetTitle}</span>
          </div>
        </div>
      </div>

      {/* ROADMAP SUCCESS SIMULATOR ENGINE */}
      <div className="card" style={{ padding: '24px', marginBottom: '28px', border: '1px solid rgba(99,102,241,0.25)', background: 'rgba(99,102,241,0.02)' }}>
        <div style={{ marginBottom: '16px' }}>
          <h2 style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '15px', fontWeight: 700, color: 'white' }}>
            ⚡ AI Success Simulator
          </h2>
          <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>
            Drag variables to see how bridging credentials shifts your success odds live.
          </p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'white', fontWeight: 600, marginBottom: '8px' }}>
              <span>English Proficiency (IELTS Target)</span>
              <span style={{ color: '#818cf8' }}>{ielts.toFixed(1)} Band</span>
            </div>
            <input 
              type="range" min="6.0" max="9.0" step="0.5"
              value={ielts}
              onChange={e => setIelts(parseFloat(e.target.value))}
              style={{ width: '100%', cursor: 'pointer' }}
            />
          </div>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'white', fontWeight: 600, marginBottom: '8px' }}>
              <span>Research Publications (IEEE / ACM)</span>
              <span style={{ color: '#10b981' }}>{researchPapers} Published</span>
            </div>
            <input 
              type="range" min="0" max="3" step="1"
              value={researchPapers}
              onChange={e => setResearchPapers(parseInt(e.target.value))}
              style={{ width: '100%', cursor: 'pointer' }}
            />
          </div>
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
                <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'white', marginBottom: '12px' }}>🔒 Step-by-Step AI Roadmap</h3>
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
                  {isAiLoading ? 'Analyzing...' : aiAnalysis?.targetState || 'N/A'}
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
                <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'white', marginBottom: '12px' }}>🔒 Premium AI Gap Analysis</h3>
                <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.7)', marginBottom: '24px', maxWidth: '400px', margin: '0 auto 24px' }}>
                  Upgrade to Pro to unlock the AI Planner, identify critical weaknesses in your profile, and receive a step-by-step roadmap to admission.
                </p>
                <Link href="/dashboard/settings/account" className="btn btn-primary" style={{ display: 'inline-flex', padding: '12px 24px' }}>
                  Upgrade to Pro
                </Link>
              </div>
            ) : isAiLoading ? (
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
            🎯 Active AI Missions
          </h2>
          <div style={{ position: 'relative', paddingLeft: '24px' }}>
            <div style={{ position: 'absolute', left: '7px', top: 0, bottom: 0, width: '2px', background: 'linear-gradient(180deg, #6366f1, #06b6d4)', borderRadius: '1px', opacity: 0.3 }} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {isAiLoading ? (
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
                      <span style={{ fontSize: '16px' }}>🤖</span>
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
            { label: 'Critical Gaps', value: stats.critical, icon: '🚨', color: '#f43f5e', desc: 'Must resolve before applying' },
            { label: 'High Priority', value: stats.high, icon: '⚠️', color: '#f59e0b', desc: 'Strongly recommended to fix' },
            { label: 'Medium Priority', value: stats.medium, icon: '📌', color: '#3b82f6', desc: 'Will improve your chances' },
            { label: 'Items Complete', value: stats.complete, icon: '✅', color: '#10b981', desc: 'Already meeting requirements' },
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
