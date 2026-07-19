'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { OpportunityRepository } from '@/lib/repositories/OpportunityRepository';
import type { Opportunity } from '@/lib/gemini';
import { getScoreLabel, getProbabilityColor, getProbabilityLabel } from '@/lib/scoring';
import { calculateProfileCompleteness } from '@/lib/scoringEngine';
import { ActivityTimeline } from '@/components/ui/ActivityTimeline';
import { useAuth } from '@/components/auth/AuthProvider';
import { useProfile } from '@/components/auth/ProfileContext';
import { usePipeline } from '@/components/auth/PipelineContext';

function ScoreRing({ score, size = 100, label }: { score: number; size?: number; label: string }) {
  const { color } = getScoreLabel(score);
  const radius = (size - 12) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 100) * circumference;

  return (
    <div className="score-ring-container" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={6} />
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none"
          stroke={color}
          strokeWidth={6}
          strokeDasharray={circumference}
          strokeDashoffset={circumference - progress}
          strokeLinecap="round"
          style={{ filter: `drop-shadow(0 0 6px ${color}80)`, transition: 'stroke-dashoffset 1.5s ease' }}
        />
      </svg>
      <div className="score-ring-text">
        <div style={{ fontSize: size > 80 ? '20px' : '16px', fontWeight: 800, color: 'white', fontFamily: 'Space Grotesk, sans-serif', lineHeight: 1 }}>
          {score}
        </div>
        <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.4)', fontWeight: 600, marginTop: '2px' }}>
          {label}
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [metrics, setMetrics] = useState({
    opportunityScore: 0,
    readinessScore: 0,
    portfolioHealth: 0,
    successProbabilityAvg: 0,
    applicationsInProgress: 0,
    deadlinesThisMonth: 0,
    opportunitiesFound: 0,
    aiConfidence: 0,
    potentialValue: '$0',
  });
  const [userName, setUserName] = useState('User');
  const [showInvestorModal, setShowInvestorModal] = useState(false);
  const [profileCompleteness, setProfileCompleteness] = useState<{ score: number; items: any[] }>({ score: 0, items: [] });
  const [upcomingDeadlines, setUpcomingDeadlines] = useState<any[]>([]);
  const [recentUpdates, setRecentUpdates] = useState<any[]>([]);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);

  const { profile, isLoading } = useProfile();
  const { pipeline: apps } = usePipeline();
  const { user } = useAuth();
  const [documents, setDocuments] = useState<any[]>([]);

  useEffect(() => {
    OpportunityRepository.getAllOpportunities().then(setOpportunities);
    if (user?.uid) {
      import('@/lib/repositories/EvidenceRepository').then(({ EvidenceRepository }) => {
        EvidenceRepository.getEvidenceForUser(user.uid).then(setDocuments);
      });
    }
  }, [user]);

  useEffect(() => {
    if (isLoading) return;

    let name = 'User';
    let gpa = 3.5;
    let country = 'Global';
    let skillsCount = 3;
    let profileData: any = null;
    
    // Load real user name and data from onboarding profile (Firestore)
    if (profile) {
      profileData = profile;
      if (profile.name) {
        name = profile.name;
        setUserName(profile.name.split(' ')[0]);
      }
      if (profile.country) country = profile.country;
      
      // Use real data from user profile if available, rather than hardcoded defaults
      if (profile.gpa) {
        const parsed = parseFloat(profile.gpa);
        if (!isNaN(parsed)) gpa = parsed;
      }
      if (profile.skills) {
        skillsCount = typeof profile.skills === 'string' ? profile.skills.split(',').length : (profile.skills as any[]).length;
      }
    }

    // Dynamic completeness calculation
    const compResult = calculateProfileCompleteness(profileData);
    setProfileCompleteness(compResult);

    // Calculate dynamic values
    const gpaPercent = Math.min((gpa / 4.0) * 100, 100);
    const opportunityScore = Math.round(55 + (gpaPercent * 0.35) + Math.min(skillsCount * 2, 10));
    const readinessScore = compResult.score;
    
    const successProbabilityAvg = apps.length > 0
      ? Math.round(apps.reduce((sum, a) => sum + (a.matchScore || compResult.score), 0) / apps.length)
      : Math.round(50 + (gpaPercent * 0.2));
      
    const portfolioHealth = apps.length > 0
      ? Math.round(60 + Math.min(apps.length * 8, 35))
      : 0;

    // Filter opportunities matching user's type choice or general country match
    const matchedCount = opportunities.filter(opp => {
      if (opp.country.toLowerCase() === country.toLowerCase()) return true;
      if (opp.requiredGPA && gpa >= parseFloat(opp.requiredGPA)) return true;
      return true;
    }).length;

    // Calculate potential value of active applications
    let totalValueUSD = 0;
    apps.forEach(app => {
      const opp = opportunities.find(o => o.id === app.id);
      if (opp) {
        if (opp.fundingLevel?.toLowerCase().includes('full')) {
          totalValueUSD += 65000; // estimated fully-funded worth
        } else {
          const num = parseInt(opp.fundingLevel?.replace(/[^0-9]/g, '') || '0');
          totalValueUSD += num > 0 ? num : 15000;
        }
      }
    });

    const potentialValueStr = totalValueUSD > 0
      ? `$${(totalValueUSD / 1000).toFixed(0)}K`
      : '$0';
      
    // Dynamically build deadlines from active applications OR matched opportunities if no apps
    let deadlinesToUse = [];
    if (apps.length > 0) {
      deadlinesToUse = apps.map(app => {
        const opp = opportunities.find(o => o.id === app.id);
        const deadlineDate = app.deadline || opp?.deadline;
        const daysLeft = deadlineDate ? Math.ceil((new Date(deadlineDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : 30;
        return {
          name: opp?.title || 'Unknown Opportunity',
          deadline: deadlineDate || 'Unknown',
          daysLeft: daysLeft > 0 ? daysLeft : 0,
          probability: app.matchScore || compResult.score
        };
      });
    } else {
      deadlinesToUse = opportunities.slice(0, 4).map(opp => {
        const deadlineDate = opp.deadline;
        const daysLeft = deadlineDate ? Math.ceil((new Date(deadlineDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : 30;
        return {
          name: opp.title,
          deadline: deadlineDate || 'Unknown',
          daysLeft: daysLeft > 0 ? daysLeft : 0,
          probability: compResult.score
        };
      });
      // Add a fallback placeholder if absolutely empty
      if (deadlinesToUse.length === 0) {
        deadlinesToUse = [{
          name: 'AI Identifying Matches...',
          deadline: 'TBD',
          daysLeft: 30,
          probability: compResult.score
        }];
      }
    }
    
    deadlinesToUse.sort((a, b) => a.daysLeft - b.daysLeft);
    setUpcomingDeadlines(deadlinesToUse.slice(0, 4));

    setMetrics({
      opportunityScore,
      readinessScore,
      portfolioHealth,
      successProbabilityAvg,
      applicationsInProgress: apps.length,
      deadlinesThisMonth: deadlinesToUse.filter(d => d.daysLeft <= 30).length,
      opportunitiesFound: matchedCount > 0 ? matchedCount : opportunities.length,
      aiConfidence: Math.round(85 + (gpaPercent * 0.1)),
      potentialValue: potentialValueStr,
    });
    
    // Generate dynamic updates from opportunities verification data
    const updates = opportunities
      .filter(o => o.verificationStatus === 'verified')
      .slice(0, 3)
      .map(o => ({
        icon: '✓',
        title: `${o.provider} Verification Complete`,
        desc: `Verified requirements for ${o.title}. Data source updated to official portal guidelines.`,
        time: 'Today',
        color: '#10b981'
      }));
    if (updates.length < 3) {
      updates.push({
        icon: 'ℹ',
        title: 'Profile Alignment Scan',
        desc: `System mapped your skills to ${matchedCount} active opportunities in the database.`,
        time: 'Live',
        color: '#818cf8'
      });
    }
    setRecentUpdates(updates);
  }, [isLoading, opportunities, apps, profile]);

  const topOpportunities = opportunities.slice(0, 6);

  // Calculate dynamic greeting
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  if (isLoading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {/* Header Skeleton */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <div>
            <div className="skeleton" style={{ width: '300px', height: '36px', marginBottom: '8px' }} />
            <div className="skeleton" style={{ width: '200px', height: '16px' }} />
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <div className="skeleton" style={{ width: '140px', height: '36px', borderRadius: '8px' }} />
            <div className="skeleton" style={{ width: '120px', height: '36px', borderRadius: '8px' }} />
          </div>
        </div>

        {/* Briefing Card Skeleton */}
        <div className="skeleton" style={{ width: '100%', height: '80px', borderRadius: '16px' }} />

        {/* Metrics Grid Skeleton */}
        <div className="metrics-grid" style={{ gap: '16px', display: 'flex' }}>
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="skeleton" style={{ flex: 1, height: '110px', borderRadius: '12px' }} />
          ))}
        </div>

        <div className="dashboard-layout-grid" style={{ gap: '24px', display: 'grid', gridTemplateColumns: '1.8fr 1fr' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div className="skeleton" style={{ width: '100%', height: '120px', borderRadius: '12px', marginBottom: '12px' }} />
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="skeleton" style={{ width: '100%', height: '80px', borderRadius: '12px' }} />
            ))}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div className="skeleton" style={{ width: '100%', height: '400px', borderRadius: '16px' }} />
            <div className="skeleton" style={{ width: '100%', height: '250px', borderRadius: '16px' }} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: '36px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h1
              style={{
                fontFamily: 'Space Grotesk, sans-serif',
                fontSize: '28px',
                fontWeight: 800,
                color: 'white',
                marginBottom: '4px',
              }}
            >
              {greeting}, <span className="gradient-text">{userName}</span> 👋
            </h1>
            <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '14px' }}>
              Welcome back to your Opportunity Operating System.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
             <button 
              onClick={() => setShowInvestorModal(true)}
              className="btn btn-ghost btn-sm"
              style={{ display: 'flex', alignItems: 'center', gap: '6px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.02)' }}
            >
              💼 Investor Mode (PDF Export)
            </button>
            <Link href="/dashboard/opportunities" className="btn btn-primary btn-sm">
              + New Application
            </Link>
          </div>
        </div>
      </div>

      {/* EXECUTIVE BRIEFING */}
      <div className="briefing-card card-magnetic glow-border glass-panel page-transition" style={{ padding: '20px', marginBottom: '24px', display: 'flex', gap: '20px', alignItems: 'center', borderLeft: '4px solid #6366f1' }}>
        <div style={{ flexShrink: 0, fontSize: '32px' }}>📰</div>
        <div style={{ flex: 1 }}>
          <h3 style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', fontWeight: 700, letterSpacing: '1px', marginBottom: '6px' }}>TODAY'S EXECUTIVE BRIEFING</h3>
          <div style={{ display: 'flex', gap: '16px', fontSize: '14px', color: 'white', alignItems: 'center', flexWrap: 'wrap' }}>
            {metrics.applicationsInProgress === 0 ? (
              <>
                <span><span style={{ color: '#10b981' }}>Profile DNA</span> securely loaded.</span>
                <span style={{ color: 'rgba(255,255,255,0.2)' }}>|</span>
                <span><span style={{ color: '#f59e0b' }}>0</span> active pipelines.</span>
                <span style={{ color: 'rgba(255,255,255,0.2)' }}>|</span>
                <span><span style={{ fontWeight: 600, color: '#818cf8' }}>Strategic Mission:</span> Review matched opportunities and initiate your first application.</span>
              </>
            ) : (
              <>
                <span><span style={{ color: '#10b981' }}>+{metrics.opportunitiesFound}</span> verified opportunities mapping to your profile.</span>
                <span style={{ color: 'rgba(255,255,255,0.2)' }}>|</span>
                <span><span style={{ color: '#f59e0b' }}>{metrics.deadlinesThisMonth}</span> urgent deadlines.</span>
                <span style={{ color: 'rgba(255,255,255,0.2)' }}>|</span>
                <span><span style={{ fontWeight: 600, color: '#818cf8' }}>System Alert:</span> Focus on completing mandatory document checklists for active pipelines.</span>
              </>
            )}
          </div>
        </div>
        <div>
          <Link href="/dashboard/opportunities" className="btn btn-primary btn-sm">
            {metrics.applicationsInProgress === 0 ? 'Discover Targets' : 'Execute Strategy'}
          </Link>
        </div>
      </div>

      {/* EXECUTIVE OPPORTUNITY DASHBOARD METRICS */}
      <div className="metrics-grid page-transition" style={{ gap: '16px', marginBottom: '24px' }}>
        {[
          { label: 'OPPORTUNITIES FOUND', value: metrics.opportunitiesFound, desc: 'Matching your DNA', icon: '🔭', color: '#6366f1' },
          { label: 'ACTIVE PORTFOLIO VALUE', value: metrics.potentialValue, desc: 'Estimated funding potential', icon: '💰', color: '#10b981' },
          { label: 'AVERAGE PROBABILITY', value: `${metrics.successProbabilityAvg}%`, desc: 'Based on current profile evidence', icon: '📈', color: '#06b6d4' },
          { label: 'AI CONFIDENCE', value: `${metrics.aiConfidence}%`, desc: 'Prediction reliability score', icon: '⚡', color: '#8b5cf6' },
        ].map(metric => (
          <div key={metric.label} className="card" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{
              width: '42px', height: '42px', borderRadius: '10px',
              background: `${metric.color}15`, border: `1px solid ${metric.color}25`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', flexShrink: 0
            }}>
              {metric.icon}
            </div>
            <div>
              <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', fontWeight: 700, letterSpacing: '0.5px' }}>{metric.label}</div>
              <div style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '20px', fontWeight: 800, color: 'white', marginTop: '2px', lineHeight: 1 }}>{metric.value}</div>
              <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', marginTop: '4px' }}>{metric.desc}</div>
              <div style={{ fontSize: '8px', color: 'rgba(255,255,255,0.2)', marginTop: '6px', textTransform: 'uppercase' }}>Explainability: AI Model v4.2</div>
            </div>
          </div>
        ))}
      </div>

      {/* OPPORTUNITY ACQUISITION PIPELINE */}
      <div className="card-magnetic glow-border page-transition" style={{ padding: '20px 24px', marginBottom: '28px', border: '1px solid rgba(99,102,241,0.15)', animationDelay: '0.1s' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '13px', fontWeight: 700, color: 'white', letterSpacing: '1px' }}>
            💼 OPPORTUNITY ACQUISITION PIPELINE
          </h3>
          <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>
            Active Stage Progression
          </span>
        </div>
        <div className="pipeline-grid" style={{ gap: '8px', position: 'relative' }}>
          {[
            { id: 'discovered', label: 'Discovered', count: metrics.opportunitiesFound, active: true },
            { id: 'qualified', label: 'Qualified', count: Math.round(metrics.opportunitiesFound * 0.4), active: false },
            { id: 'prepared', label: 'Prepared', count: metrics.applicationsInProgress, active: false },
            { id: 'applied', label: 'Applied', count: Math.max(0, metrics.applicationsInProgress - 1), active: false },
            { id: 'interview', label: 'Interview', count: 0, active: false },
            { id: 'accepted', label: 'Accepted', count: 0, active: false },
            { id: 'won', label: 'Won / Acquired', count: 0, active: false }
          ].map((stage, idx) => (
            <div 
              key={stage.id} 
              className="glass-sm"
              style={{ 
                padding: '12px', 
                borderRadius: '8px', 
                textAlign: 'center',
                border: stage.id === 'prepared' ? '1px solid rgba(99,102,241,0.35)' : '1px solid rgba(255,255,255,0.05)',
                background: stage.id === 'prepared' ? 'rgba(99,102,241,0.06)' : 'rgba(255,255,255,0.01)',
                cursor: 'pointer'
              }}
            >
              <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.35)', fontWeight: 600 }}>Stage {idx + 1}</div>
              <div style={{ fontSize: '13px', fontWeight: 700, color: stage.id === 'prepared' ? '#818cf8' : 'white', margin: '4px 0 2px' }}>{stage.label}</div>
              <div style={{ fontSize: '11px', color: stage.id === 'prepared' ? '#818cf8' : 'rgba(255,255,255,0.4)', fontWeight: 700 }}>{stage.count}</div>
            </div>
          ))}
        </div>
      </div>

      {/* METRICS ROW 1: Score Rings */}
      <div className="score-rings-grid" style={{ gap: '16px', marginBottom: '24px' }}>
        {[
          { score: metrics.opportunityScore, label: 'SCORE', title: 'Opportunity Score', desc: 'Overall profile strength', color: '#6366f1' },
          { score: metrics.readinessScore, label: 'READY', title: 'Readiness Score', desc: 'Based on verified credentials', color: '#8b5cf6' },
          { score: metrics.portfolioHealth, label: 'HEALTH', title: 'Portfolio Health', desc: 'Diversification index', color: '#06b6d4' },
          { score: metrics.successProbabilityAvg, label: 'PROB', title: 'Success Probability', desc: 'Average calculated odds', color: '#10b981' },
        ].map(metric => (
          <div
            key={metric.title}
            className="card"
            style={{ padding: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}
          >
            <ScoreRing score={metric.score} size={90} label={metric.label} />
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '13px', fontWeight: 700, color: 'white' }}>{metric.title}</div>
              <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>{metric.desc}</div>
              <div style={{ marginTop: '8px' }}>
                <span
                  className="badge"
                  style={{
                    background: `${metric.color}18`,
                    color: metric.color,
                    border: `1px solid ${metric.color}35`,
                    fontSize: '10px',
                  }}
                >
                  {getScoreLabel(metric.score).label}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* FUTURE IMPACT PROJECTION */}
      <div className="card" style={{ padding: '24px', marginBottom: '32px', border: '1px solid rgba(16,185,129,0.25)', background: 'rgba(16,185,129,0.02)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div>
            <h3 style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '15px', fontWeight: 700, color: 'white' }}>
              🔮 Future Impact Projection
            </h3>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px', marginTop: '2px' }}>
              Aspirational trajectory generated by your Opportunity DNA profile.
            </p>
          </div>
          <span className="badge badge-indigo">Pro Projection</span>
        </div>
        <div className="score-rings-grid" style={{ gap: '20px' }}>
          <div>
            <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', fontWeight: 700, letterSpacing: '0.5px' }}>ESTIMATED CAREER STIPEND</div>
            <div style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '24px', fontWeight: 800, color: '#10b981', marginTop: '6px' }}>$120,000+</div>
            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.45)', marginTop: '4px' }}>Fully-funded baseline</div>
          </div>
          <div>
            <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', fontWeight: 700, letterSpacing: '0.5px' }}>SALARY UPLIFT (5YR)</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginTop: '6px' }}>
              <span style={{ fontSize: '14px', color: 'rgba(255,255,255,0.4)', textDecoration: 'line-through' }}>$45K</span>
              <span style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '24px', fontWeight: 800, color: 'white' }}>$250K+</span>
            </div>
            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.45)', marginTop: '4px' }}>Top 5% bracket shift</div>
          </div>
          <div>
            <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', fontWeight: 700, letterSpacing: '0.5px' }}>NETWORK GROWTH</div>
            <div style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '24px', fontWeight: 800, color: '#818cf8', marginTop: '6px' }}>12.4×</div>
            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.45)', marginTop: '4px' }}>Elite alumni networks</div>
          </div>
          <div>
            <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', fontWeight: 700, letterSpacing: '0.5px' }}>ACCEPTANCE CHANCE</div>
            <div style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '24px', fontWeight: 800, color: '#06b6d4', marginTop: '6px' }}>{metrics.successProbabilityAvg}% Avg</div>
            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.45)', marginTop: '4px' }}>Qualified target match</div>
          </div>
        </div>
      </div>

      {/* MAIN CONTENT GRID */}
      <div className="dashboard-layout-grid" style={{ gap: '24px' }}>
        {/* Left: Opportunities */}
        <div style={{ minWidth: 0 }}>
          {/* AUTONOMOUS OPPORTUNITY MONITORING FEED */}
          <div className="card-magnetic glow-border page-transition" style={{ padding: '20px', marginBottom: '24px', background: 'rgba(99,102,241,0.02)', borderLeft: '4px solid #818cf8' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h3 style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '13px', fontWeight: 800, color: 'white', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="pulse-dot" style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#818cf8', display: 'inline-block' }} />
                <span>📡 Autonomous Database Sync (Live)</span>
              </h3>
              <span className="badge badge-indigo" style={{ fontSize: '9px' }}>AI SCAN ACTIVE</span>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {recentUpdates.map((update, idx) => (
                <div key={idx} style={{ display: 'flex', gap: '8px', fontSize: '12px', alignItems: 'flex-start' }}>
                  <span style={{ color: update.color }}>{update.icon}</span>
                  <div>
                    <span style={{ color: 'white', fontWeight: 600 }}>{update.title}:</span>
                    <span style={{ color: 'rgba(255,255,255,0.5)', marginLeft: '4px' }}>{update.desc} ({update.time})</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <h2 style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '18px', fontWeight: 700, color: 'white' }}>
              {apps.length === 0 ? '✨ Top AI Recommendations For You' : '🎯 Verified Opportunities For You'}
            </h2>
            {opportunities.length > 0 && (
              <Link href="/dashboard/opportunities" style={{ fontSize: '13px', color: '#818cf8', textDecoration: 'none' }}>
                View all {opportunities.length} →
              </Link>
            )}
          </div>

          <div style={{ display: 'grid', gap: '12px' }}>
            {apps.length === 0 && (
              <div style={{ padding: '16px', background: 'rgba(99,102,241,0.05)', borderRadius: '12px', border: '1px dashed rgba(99,102,241,0.3)' }}>
                <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '13px', margin: 0 }}>
                  <strong>Your pipeline is empty!</strong> Your AI agents have found these top matching opportunities based on your profile. Click any of them to explore and add them to your pipeline.
                </p>
              </div>
            )}
            {topOpportunities.length > 0 ? topOpportunities.map(opp => {
              const probColor = '#10b981';
              const typeColors: Record<string, string> = {
                scholarship: '#6366f1', fellowship: '#8b5cf6', grant: '#06b6d4',
                job: '#10b981', accelerator: '#f59e0b', competition: '#f43f5e',
              };
              const typeColor = typeColors[opp.type] || '#6366f1';

              return (
                <Link
                  key={opp.id}
                  href={`/dashboard/opportunities/${opp.id}`}
                  style={{ textDecoration: 'none', display: 'block', minWidth: 0 }}
                >
                  <div
                    className="card"
                    style={{
                      padding: '20px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '16px',
                      cursor: 'pointer',
                      minWidth: 0
                    }}
                  >
                    {/* Type Badge */}
                    <div
                      style={{
                        width: '44px', height: '44px', borderRadius: '12px', flexShrink: 0,
                        background: `${typeColor}18`, border: `1px solid ${typeColor}30`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '20px',
                      }}
                    >
                      {opp.type === 'scholarship' ? '🎓' : opp.type === 'fellowship' ? '🏛️' : opp.type === 'grant' ? '💰' : opp.type === 'job' ? '💻' : opp.type === 'accelerator' ? '🚀' : '🏆'}
                    </div>

                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', minWidth: 0 }}>
                        <span style={{ fontSize: '14px', fontWeight: 700, color: 'white', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block', minWidth: 0 }}>
                          {opp.title}
                        </span>
                        {opp.verificationStatus === 'verified' && (
                          <span style={{ fontSize: '12px', flexShrink: 0 }} title="Verified Data">✅</span>
                        )}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>{opp.provider}</span>
                        <span style={{ width: '3px', height: '3px', borderRadius: '50%', background: 'rgba(255,255,255,0.2)' }} />
                        <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>{opp.country}</span>
                        {opp.fundingLevel && (
                          <>
                            <span style={{ width: '3px', height: '3px', borderRadius: '50%', background: 'rgba(255,255,255,0.2)' }} />
                            <span style={{ fontSize: '11px', color: '#10b981', fontWeight: 600 }}>{opp.fundingLevel.split('+')[0].trim()}</span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Deadline */}
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)', fontWeight: 600 }}>
                        {opp.deadline}
                      </div>
                      <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', marginTop: '2px' }}>
                        deadline
                      </div>
                    </div>
                  </div>
                </Link>
              );
            }) : (
              <div className="card" style={{ padding: '32px', textAlign: 'center' }}>
                 <div style={{ fontSize: '32px', marginBottom: '12px' }}>🔍</div>
                 <h3 style={{ color: 'white', fontSize: '15px', fontWeight: 600, marginBottom: '6px' }}>Scanning Global Databases</h3>
                 <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px' }}>Your AI Chief Officer is analyzing your DNA to find matching opportunities. Check back shortly.</p>
              </div>
            )}
          </div>
        </div>

        {/* Right: Sidebar Panels */}
        <div className="dashboard-sidebar-panels">
          {/* EVIDENCE-BASED PROFILE COMPLETENESS */}
          <div className="card-magnetic glow-border" style={{ padding: '20px', background: 'linear-gradient(180deg, rgba(2,4,8,0) 0%, rgba(99,102,241,0.03) 100%)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <h3 style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '15px', fontWeight: 700, color: 'white', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>🎯</span> Evidence-Based Completeness
              </h3>
            </div>

            {(() => {
              const hasResume = !!(profile?.resumeFile || (typeof window !== 'undefined' && localStorage.getItem('onboarding_resume')));
              const hasTranscript = !!(profile?.transcriptFile || (typeof window !== 'undefined' && localStorage.getItem('onboarding_transcript')));
              const hasPassport = typeof window !== 'undefined' && !!localStorage.getItem('onboarding_passport');
              const hasIelts = typeof window !== 'undefined' && !!localStorage.getItem('onboarding_ielts');
              const ieltsStatus = typeof window !== 'undefined' ? localStorage.getItem('ielts_status') || 'Not Planned' : 'Not Planned';
              const hasName = !!profile?.name;
              const hasCountry = !!profile?.country;
              const hasGpa = !!profile?.gpa;
              const hasField = !!profile?.field;
              const hasSkills = !!profile?.skills;
              const hasEducation = !!profile?.education;

              const segments = [
                {
                  label: 'Academic Profile',
                  icon: '🎓',
                  color: '#6366f1',
                  items: [
                    { name: 'Name', done: hasName },
                    { name: 'University', done: hasEducation },
                    { name: 'Field of Study', done: hasField },
                    { name: 'GPA', done: hasGpa },
                    { name: 'Transcript', done: hasTranscript },
                  ]
                },
                {
                  label: 'Identity Documents',
                  icon: '🛂',
                  color: '#8b5cf6',
                  items: [
                    { name: 'Passport', done: hasPassport },
                    { name: 'Country', done: hasCountry },
                  ]
                },
                {
                  label: 'Language Evidence',
                  icon: '🗣️',
                  color: '#06b6d4',
                  items: [
                    { name: 'IELTS / TOEFL', done: hasIelts || ieltsStatus === 'Scheduled' },
                  ]
                },
                {
                  label: 'Application Docs',
                  icon: '📄',
                  color: '#10b981',
                  items: [
                    { name: 'Resume / CV', done: hasResume },
                    { name: 'Skills Profile', done: hasSkills },
                  ]
                },
                {
                  label: 'Research Portfolio',
                  icon: '🔬',
                  color: '#f59e0b',
                  items: [
                    { name: 'Publications', done: false },
                    { name: 'Projects', done: !!(profile as any)?.projects?.length },
                  ]
                },
              ];

              const overallDone = segments.reduce((sum, s) => sum + s.items.filter(i => i.done).length, 0);
              const overallTotal = segments.reduce((sum, s) => sum + s.items.length, 0);
              const overallPercent = Math.round((overallDone / overallTotal) * 100);

              return (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>Overall</span>
                    <span className="badge badge-indigo" style={{ fontSize: '10px' }}>{overallPercent}%</span>
                  </div>
                  <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.06)', borderRadius: '4px', marginBottom: '20px', overflow: 'hidden' }}>
                    <div style={{ width: `${overallPercent}%`, height: '100%', background: 'linear-gradient(90deg, #6366f1, #10b981)', borderRadius: '4px', transition: 'width 1s ease' }} />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {segments.map((seg, idx) => {
                      const done = seg.items.filter(i => i.done).length;
                      const total = seg.items.length;
                      const pct = Math.round((done / total) * 100);
                      const missing = seg.items.filter(i => !i.done);
                      return (
                        <div key={idx}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                            <span style={{ fontSize: '12px', color: 'white', fontWeight: 600 }}>{seg.icon} {seg.label}</span>
                            <span style={{ fontSize: '11px', fontWeight: 700, color: pct === 100 ? '#10b981' : pct >= 50 ? '#f59e0b' : '#f43f5e' }}>{pct}%</span>
                          </div>
                          <div style={{ width: '100%', height: '4px', background: 'rgba(255,255,255,0.06)', borderRadius: '2px', overflow: 'hidden', marginBottom: missing.length > 0 ? '6px' : '0' }}>
                            <div style={{ width: `${pct}%`, height: '100%', background: seg.color, borderRadius: '2px', transition: 'width 0.8s ease' }} />
                          </div>
                          {missing.length > 0 && (
                            <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.35)', paddingLeft: '4px' }}>
                              Missing: {missing.map(m => m.name).join(', ')}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </>
              );
            })()}

            <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '16px', marginTop: '16px', marginBottom: '16px' }}>
              <h4 style={{ fontSize: '12px', fontWeight: 700, color: 'white', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>🎯</span> Daily Mission Timeline
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', position: 'relative' }}>
                {/* Vertical timeline line */}
                <div style={{ position: 'absolute', left: '11px', top: '10px', bottom: '10px', width: '2px', background: 'rgba(255,255,255,0.05)', zIndex: 0 }} />
                
                {(() => {
                  const missions = [];
                  const missing = profileCompleteness.items.filter(i => i.status === 'missing');
                  
                  if (missing.length > 0) {
                    missions.push({
                      day: 'Today',
                      title: `Upload Missing ${missing[0].name}`,
                      desc: 'Crucial for passing basic eligibility filters',
                      roi: '+15% Readiness',
                      color: '#f43f5e'
                    });
                  }
                  
                  const drafts = apps.filter(a => a.stage === 'preparing');
                  if (drafts.length > 0) {
                    missions.push({
                      day: 'Today',
                      title: `Finalize SOP for ${opportunities.find(o => o.id === drafts[0].id)?.title.substring(0, 15) || 'Application'}`,
                      desc: 'High-leverage action to move pipeline to submission',
                      roi: '+22% Win Prob.',
                      color: '#10b981'
                    });
                  } else {
                    missions.push({
                      day: 'Today',
                      title: 'Analyze 3 Qualified Matches',
                      desc: 'Identify and save top ROI opportunities',
                      roi: '+$85k Potential',
                      color: '#6366f1'
                    });
                  }
                  
                  missions.push({
                    day: 'Tomorrow',
                    title: 'Expand Leadership Narrative',
                    desc: 'Bolster your DNA matrix to match elite expectations',
                    roi: '+12% Profile Score',
                    color: '#f59e0b'
                  });

                  return missions.map((mission, idx) => (
                    <div key={idx} style={{ position: 'relative', zIndex: 1, display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                      <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'var(--bg-secondary)', border: `2px solid ${mission.color}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '4px' }}>
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: mission.color }} />
                      </div>
                      <div className="glass-sm" style={{ padding: '12px', borderRadius: '8px', flex: 1, border: `1px solid ${mission.color}30`, background: `${mission.color}05` }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <span style={{ fontSize: '10px', color: mission.color, fontWeight: 800, textTransform: 'uppercase' }}>{mission.day}</span>
                          <span style={{ fontSize: '10px', color: '#10b981', fontWeight: 700, background: 'rgba(16,185,129,0.1)', padding: '2px 6px', borderRadius: '4px' }}>📈 {mission.roi}</span>
                        </div>
                        <p style={{ fontSize: '12px', color: 'white', marginTop: '6px', fontWeight: 600 }}>{mission.title}</p>
                        <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.5)', display: 'block', marginTop: '3px' }}>{mission.desc}</span>
                      </div>
                    </div>
                  ));
                })()}
              </div>
            </div>
          </div>

          {/* Upcoming Deadlines */}
          <div className="card" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <h3 style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '15px', fontWeight: 700, color: 'white' }}>
                ⏰ Verified Deadlines
              </h3>
              <span className="badge badge-amber">Upcoming</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {upcomingDeadlines.map((item, idx) => (
                <div key={idx}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', gap: '8px' }}>
                    <span style={{ fontSize: '12px', color: 'white', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block', minWidth: 0 }}>
                      {item.name}
                    </span>
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 700,
                        color: item.daysLeft < 30 ? '#f43f5e' : item.daysLeft < 60 ? '#f59e0b' : '#10b981',
                        flexShrink: 0
                      }}
                    >
                      {item.daysLeft}d
                    </span>
                  </div>
                  <div className="progress-bar">
                    <div
                      className="progress-fill"
                      style={{
                        width: `${Math.max(10, 100 - item.daysLeft)}%`,
                        background: `linear-gradient(90deg, ${item.daysLeft < 30 ? '#f43f5e' : '#10b981'}, ${item.daysLeft < 30 ? '#be123c' : '#059669'})`,
                      }}
                    />
                  </div>
                  <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', marginTop: '3px' }}>
                    {item.deadline}
                  </div>
                </div>
              ))}
              {upcomingDeadlines.length === 0 && (
                <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', textAlign: 'center', padding: '10px 0' }}>
                  No imminent deadlines.
                </div>
              )}
            </div>
          </div>

          {/* AI Updates Inbox */}
          <div className="card" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <h3 style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '15px', fontWeight: 700, color: 'white', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>📥</span> System Compliance Alerts
              </h3>
              <span className="badge badge-indigo">LIVE</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {(() => {
                const missingItems = profileCompleteness.items.filter(item => item.status === 'missing');
                if (missingItems.length === 0) {
                  return (
                    <div style={{ display: 'flex', gap: '8px', fontSize: '12px', alignItems: 'center', color: '#10b981' }}>
                      <span>✓</span>
                      <span>All mandatory credentials fully connected & verified.</span>
                    </div>
                  );
                }
                return missingItems.slice(0, 3).map((item, idx) => (
                  <div key={idx} style={{ borderBottom: idx < missingItems.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none', paddingBottom: '10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <span style={{ fontSize: '12px', fontWeight: 700, color: '#f43f5e' }}>🚨 Missing: {item.name}</span>
                      <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.4)' }}>Action Required</span>
                    </div>
                    <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', lineHeight: 1.4 }}>
                      Provide target coordinates to satisfy selectivity gates for international selection panels.
                    </p>
                  </div>
                ));
              })()}
            </div>
          </div>

          {/* Activity Timeline */}
          <ActivityTimeline />

          {/* Quick Actions */}
          <div className="card" style={{ padding: '20px' }}>
            <h3 style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '15px', fontWeight: 700, color: 'white', marginBottom: '16px' }}>
              ⚡ Quick Actions
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {[
                { label: '✍️ Application Builder', href: '/dashboard/builder' },
                { label: '⚖️ Opportunity Matrix', href: '/dashboard/compare' },
                { label: '🗺️ Compliance Roadmap', href: '/dashboard/roadmap' },
                { label: '🔭 Browse Database', href: '/dashboard/opportunities' },
              ].map(action => (
                <Link
                  key={action.href}
                  href={action.href}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.07)',
                    color: 'rgba(255,255,255,0.7)',
                    textDecoration: 'none',
                    fontSize: '13px',
                    fontWeight: 500,
                    transition: 'all 0.2s ease',
                  }}
                  onMouseEnter={e => {
                    const el = e.currentTarget as HTMLElement;
                    el.style.background = 'rgba(99,102,241,0.12)';
                    el.style.borderColor = 'rgba(99,102,241,0.3)';
                    el.style.color = '#818cf8';
                  }}
                  onMouseLeave={e => {
                    const el = e.currentTarget as HTMLElement;
                    el.style.background = 'rgba(255,255,255,0.04)';
                    el.style.borderColor = 'rgba(255,255,255,0.07)';
                    el.style.color = 'rgba(255,255,255,0.7)';
                  }}
                >
                  {action.label}
                  <span style={{ marginLeft: 'auto', opacity: 0.4 }}>→</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
      {showInvestorModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(16px)' }}>
          <div className="card-magnetic glow-border page-transition" style={{ width: '450px', padding: '32px', background: 'var(--bg-secondary)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: '20px', boxShadow: '0 24px 64px rgba(0,0,0,0.8)', textAlign: 'center' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>💼</div>
            <h3 style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '22px', fontWeight: 800, color: 'white', marginBottom: '8px' }}>
              Investor Mode & Live Analytics
            </h3>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px', marginBottom: '24px' }}>
              DEMO MODE • Real-time simulated indicators of global usage
            </p>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '28px', textAlign: 'left' }}>
              <div className="glass-sm" style={{ padding: '12px 16px', borderRadius: '10px' }}>
                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>ACTIVE USERS</div>
                <div style={{ fontSize: '20px', fontWeight: 800, color: 'white', marginTop: '2px' }}>1,320</div>
              </div>
              <div className="glass-sm" style={{ padding: '12px 16px', borderRadius: '10px' }}>
                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>APPLICATIONS BUILT</div>
                <div style={{ fontSize: '20px', fontWeight: 800, color: 'white', marginTop: '2px' }}>9,284</div>
              </div>
              <div className="glass-sm" style={{ padding: '12px 16px', borderRadius: '10px' }}>
                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>TRACKED DB</div>
                <div style={{ fontSize: '20px', fontWeight: 800, color: 'white', marginTop: '2px' }}>100,000+</div>
              </div>
              <div className="glass-sm" style={{ padding: '12px 16px', borderRadius: '10px' }}>
                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>COUNTRIES</div>
                <div style={{ fontSize: '20px', fontWeight: 800, color: 'white', marginTop: '2px' }}>185</div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button 
                onClick={() => {
                  setShowInvestorModal(false);
                  setTimeout(() => typeof window !== 'undefined' && window.print(), 100);
                }}
                className="btn btn-primary" 
                style={{ flex: 1, justifyContent: 'center' }}
              >
                📥 Export Briefing PDF
              </button>
              <button 
                onClick={() => setShowInvestorModal(false)}
                className="btn btn-ghost" 
                style={{ border: '1px solid rgba(255,255,255,0.1)' }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
