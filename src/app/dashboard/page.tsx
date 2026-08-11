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
import { useDialog } from '@/components/ui/DialogProvider';
import { Loader2, Sparkles, Check, Hand, Briefcase, Newspaper, Telescope, DollarSign, TrendingUp, Zap, Target, Globe, Landmark, Laptop, Rocket, Trophy, CheckCircle, Search, Plane, Shield, GraduationCap, FileText, Microscope, Mic, Pin, Bot, Network, Download, ShieldCheck, ZapIcon, Info, Mail, Clock, AlertCircle, FileEdit, Activity, Map, Copy, FileDown, X } from 'lucide-react';

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
  const [showReportModal, setShowReportModal] = useState(false);
  const [copiedReport, setCopiedReport] = useState(false);
  const [downloadingPDF, setDownloadingPDF] = useState(false);
  const { toast } = useDialog();
  const [profileCompleteness, setProfileCompleteness] = useState<{ score: number; items: any[] }>({ score: 0, items: [] });
  const [upcomingDeadlines, setUpcomingDeadlines] = useState<any[]>([]);
  const [allDeadlines, setAllDeadlines] = useState<any[]>([]);
  const [deadlineSearch, setDeadlineSearch] = useState('');
  const [deadlineSort, setDeadlineSort] = useState<'deadline' | 'score'>('deadline');
  const [showAllDeadlines, setShowAllDeadlines] = useState(false);
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

    // Filter opportunities mapping to the user's profile realistically
    const matchedCount = opportunities.filter(opp => {
      let isMatch = false;
      // Match by country if profile has one
      if (country && country !== 'Global' && opp.country && opp.country.toLowerCase() === country.toLowerCase()) {
        isMatch = true;
      }
      // Match by GPA if applicable
      if (opp.requiredGPA && gpa >= parseFloat(opp.requiredGPA)) {
        isMatch = true;
      }
      // If opportunity is globally available
      if (!opp.country || opp.country.toLowerCase() === 'global' || opp.country.toLowerCase() === 'multiple') {
        isMatch = true;
      }
      return isMatch;
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

    // Calculate dynamic projections based on user profile and pipeline
    const baseSalary = Math.round(40 + (gpaPercent * 0.2));
    const projectedSalary = Math.round(baseSalary + 30 + (apps.length * 15) + (opportunityScore * 0.5));
    const networkMultiplier = (1.2 + (apps.length * 0.6) + (readinessScore / 25)).toFixed(1);
    const estimatedStipendValue = totalValueUSD > 0 ? totalValueUSD + 15000 : 25000 + (apps.length * 5000);

    // Dynamically build deadlines from active applications AND all matched opportunities
    // Filter out expired deadlines (daysLeft <= 0) to keep the tracker authentic
    const buildDeadlineEntry = (opp: Opportunity, overrideDeadline?: string, matchScore?: number) => {
      const deadlineDate = overrideDeadline || opp.deadline;
      if (!deadlineDate || deadlineDate === 'Unknown' || deadlineDate === 'TBD') return null;
      const daysLeft = Math.ceil((new Date(deadlineDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      if (daysLeft <= 0) return null; // Filter expired
      return {
        id: opp.id,
        name: opp.title,
        type: opp.type,
        provider: opp.provider,
        deadline: deadlineDate,
        daysLeft,
        probability: matchScore || compResult.score,
        fundingLevel: opp.fundingLevel,
        country: opp.country,
      };
    };

    // Build from user's active apps first (higher priority)
    const appDeadlines = apps
      .map(app => {
        const opp = opportunities.find(o => o.id === app.id);
        if (!opp) return null;
        return buildDeadlineEntry(opp, app.deadline, app.matchScore);
      })
      .filter(Boolean);

    // Build from ALL opportunities (for the full tracker)
    const allOppDeadlines = opportunities
      .map(opp => buildDeadlineEntry(opp))
      .filter(Boolean);

    // Merge: app deadlines first, then remaining non-duplicate opp deadlines
    const seenIds = new Set(appDeadlines.map((d: any) => d.id));
    const mergedDeadlines = [
      ...appDeadlines,
      ...allOppDeadlines.filter((d: any) => !seenIds.has(d.id))
    ];

    mergedDeadlines.sort((a: any, b: any) => a.daysLeft - b.daysLeft);
    setAllDeadlines(mergedDeadlines as any[]);
    setUpcomingDeadlines(mergedDeadlines.slice(0, 4) as any[]);

    setMetrics({
      opportunityScore,
      readinessScore,
      portfolioHealth,
      successProbabilityAvg,
      applicationsInProgress: apps.length,
      deadlinesThisMonth: mergedDeadlines.filter((d: any) => d.daysLeft <= 30).length,
      opportunitiesFound: matchedCount,
      aiConfidence: compResult.score, // derived from real profile completeness, not a constant floor
      potentialValue: potentialValueStr,
      // @ts-ignore
      baseSalary: `$${baseSalary}K`,
      // @ts-ignore
      projectedSalary: `$${projectedSalary}K+`,
      // @ts-ignore
      networkMultiplier: `${networkMultiplier}×`,
      // @ts-ignore
      estimatedStipendValue: `$${(estimatedStipendValue / 1000).toFixed(0)}K+`
    });

    // Generate dynamic updates from opportunities verification data
    // Use real relative timestamps from lastUpdatedDate
    const getRelativeTime = (dateStr?: string) => {
      if (!dateStr) return 'Recently';
      const diffMs = Date.now() - new Date(dateStr).getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      if (diffDays <= 0) return 'Today';
      if (diffDays === 1) return 'Yesterday';
      if (diffDays < 7) return `${diffDays}d ago`;
      if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
      return `${Math.floor(diffDays / 30)}mo ago`;
    };

    const updates = opportunities
      .filter(o => o.verificationStatus === 'verified')
      .slice(0, 3)
      .map(o => ({
        icon: <Check size={14} className="inline" />,
        title: `${o.provider} Verification Complete`,
        desc: `Verified requirements for ${o.title}. Data source updated to official portal guidelines.`,
        time: getRelativeTime(o.lastUpdatedDate),
        color: '#10b981'
      }));
    if (updates.length < 3) {
      updates.push({
        icon: <Info size={14} className="inline" />,
        title: 'Profile Alignment Scan',
        desc: `System mapped your skills to ${matchedCount} active opportunities in the database.`,
        time: 'Recently',
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
        <div className="metrics-grid" style={{ gap: '16px' }}>
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="skeleton" style={{ height: '110px', borderRadius: '12px' }} />
          ))}
        </div>

        <div className="dashboard-layout-grid" style={{ gap: '24px' }}>
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
              {greeting}, <span className="gradient-text">{userName}</span> <Hand size={24} className="inline ml-2 text-indigo-400" />
            </h1>
            <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '14px' }}>
              Welcome back to your Opportunity Operating System.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button
              onClick={() => setShowReportModal(true)}
              className="btn btn-ghost btn-sm"
              style={{ display: 'flex', alignItems: 'center', gap: '6px', border: '1px solid rgba(99,102,241,0.3)', background: 'rgba(99,102,241,0.06)', color: 'white', whiteSpace: 'nowrap' }}
              title="Generate & View AI Executive Strategy Report"
            >
              <Sparkles size={16} className="inline mr-1 text-indigo-400" /> AI Executive Report
            </button>
            <Link href="/dashboard/opportunities" className="btn btn-primary btn-sm" style={{ whiteSpace: 'nowrap' }}>
              + New Application
            </Link>
          </div>
        </div>
      </div>

      {/* EXECUTIVE BRIEFING */}
      <div className="briefing-card card-magnetic glow-border glass-panel page-transition" style={{ padding: '20px', marginBottom: '24px', display: 'flex', gap: '20px', alignItems: 'center', borderLeft: '4px solid #6366f1' }}>
        <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center' }}><Newspaper size={32} className="text-indigo-400" /></div>
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

      {(() => {
        const hasProfile = !!(profile && (profile.name || profile.field));
        const hasCvUploaded = !!(profile?.resumeFile || documents.some((d: any) => d.source?.toLowerCase?.()?.includes('resume') || d.type?.toLowerCase?.()?.includes('resume')));
        const hasMatchedOpps = opportunities.length > 0 && metrics.opportunitiesFound > 0;
        const hasReviewedGap = apps && apps.length > 0;
        const hasStartedApp = apps && apps.length > 0 && apps.some((a: any) => a.stage && a.stage !== 'discovered');

        const journeySteps = [
          { label: 'Profile Created', done: hasProfile, href: '/onboarding', icon: <Shield size={14} /> },
          { label: 'CV Uploaded', done: hasCvUploaded, href: '/dashboard/vault', icon: <FileText size={14} /> },
          { label: 'AI Matched Opportunities', done: hasMatchedOpps, href: '/dashboard/opportunities', icon: <Telescope size={14} /> },
          { label: 'Gap Analysis Reviewed', done: hasReviewedGap, href: '/dashboard/roadmap', icon: <Target size={14} /> },
          { label: 'Application Started', done: hasStartedApp, href: '/dashboard/builder', icon: <Rocket size={14} /> },
        ];
        const completedCount = journeySteps.filter(s => s.done).length;
        const progressPct = Math.round((completedCount / journeySteps.length) * 100);

        return (
          <div className="card-magnetic glow-border page-transition" style={{ padding: '16px 20px', marginBottom: '24px', border: '1px solid rgba(99,102,241,0.2)', background: 'linear-gradient(135deg, rgba(99,102,241,0.04) 0%, rgba(139,92,246,0.03) 100%)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '12px', fontWeight: 700, color: 'white', letterSpacing: '1px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Sparkles size={14} className="text-indigo-400" /> YOUR OPPORTUNITYOS JOURNEY
              </h3>
              <span className="badge badge-indigo" style={{ fontSize: '9px' }}>{completedCount}/{journeySteps.length} COMPLETE</span>
            </div>
            {/* Progress bar */}
            <div style={{ width: '100%', height: '4px', borderRadius: '4px', background: 'rgba(255,255,255,0.06)', marginBottom: '14px', overflow: 'hidden' }}>
              <div style={{ width: `${progressPct}%`, height: '100%', borderRadius: '4px', background: 'linear-gradient(90deg, #6366f1, #8b5cf6)', transition: 'width 1s ease' }} />
            </div>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {journeySteps.map((step, idx) => (
                <Link
                  key={step.label}
                  href={step.href}
                  style={{
                    flex: 1,
                    minWidth: '140px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 12px',
                    borderRadius: '10px',
                    background: step.done ? 'rgba(16,185,129,0.08)' : 'rgba(255,255,255,0.03)',
                    border: `1px solid ${step.done ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.06)'}`,
                    textDecoration: 'none',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <div style={{
                    width: '24px', height: '24px', borderRadius: '50%', flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: step.done ? '#10b981' : 'rgba(255,255,255,0.06)',
                    color: step.done ? 'white' : 'rgba(255,255,255,0.3)',
                    fontSize: '10px', fontWeight: 800,
                  }}>
                    {step.done ? <Check size={12} /> : (idx + 1)}
                  </div>
                  <div>
                    <div style={{ fontSize: '11px', fontWeight: 600, color: step.done ? '#10b981' : 'rgba(255,255,255,0.5)' }}>{step.label}</div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        );
      })()}

      {/* EXECUTIVE OPPORTUNITY DASHBOARD METRICS */}
      <div className="metrics-grid page-transition" style={{ gap: '16px', marginBottom: '24px' }}>
        {[
          { label: 'OPPORTUNITIES FOUND', value: metrics.opportunitiesFound, desc: 'Matching your DNA', icon: <Telescope size={18} className="text-indigo-400" />, color: '#6366f1' },
          { label: 'ACTIVE PORTFOLIO VALUE', value: metrics.potentialValue, desc: 'Estimated funding potential', icon: <DollarSign size={18} className="text-emerald-400" />, color: '#10b981' },
          { label: 'AVERAGE PROBABILITY', value: `${metrics.successProbabilityAvg}%`, desc: 'Based on current profile evidence', icon: <TrendingUp size={18} className="text-cyan-400" />, color: '#06b6d4' },
          { label: 'EVIDENCE STRENGTH', value: `${metrics.readinessScore}%`, desc: 'How complete your profile evidence is', icon: <Zap size={18} className="text-purple-400" />, color: '#8b5cf6' },
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
            <Briefcase size={14} className="inline mr-2 text-indigo-400" /> OPPORTUNITY ACQUISITION PIPELINE
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
              <Globe size={18} className="inline mr-2 text-indigo-400" /> Future Impact Projection
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
            {/* @ts-ignore */}
            <div style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '24px', fontWeight: 800, color: '#10b981', marginTop: '6px' }}>{metrics.estimatedStipendValue}</div>
            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.45)', marginTop: '4px' }}>Fully-funded baseline</div>
          </div>
          <div>
            <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', fontWeight: 700, letterSpacing: '0.5px' }}>SALARY UPLIFT (5YR)</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginTop: '6px' }}>
              {/* @ts-ignore */}
              <span style={{ fontSize: '14px', color: 'rgba(255,255,255,0.4)', textDecoration: 'line-through' }}>{metrics.baseSalary}</span>
              {/* @ts-ignore */}
              <span style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '24px', fontWeight: 800, color: 'white' }}>{metrics.projectedSalary}</span>
            </div>
            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.45)', marginTop: '4px' }}>Top 5% bracket shift</div>
          </div>
          <div>
            <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', fontWeight: 700, letterSpacing: '0.5px' }}>NETWORK GROWTH</div>
            {/* @ts-ignore */}
            <div style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '24px', fontWeight: 800, color: '#818cf8', marginTop: '6px' }}>{metrics.networkMultiplier}</div>
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
                <span><Network size={16} className="inline mr-2 text-indigo-400" /> Autonomous Database Sync (Live)</span>
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
              {apps.length === 0 ? <><Target size={18} className="inline mr-2 text-indigo-400" /> Top AI Recommendations For You</> : <><Target size={18} className="inline mr-2 text-indigo-400" /> Verified Opportunities For You</>}
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
                      {opp.type === 'scholarship' ? <GraduationCap size={16} /> : opp.type === 'fellowship' ? <Landmark size={16} /> : opp.type === 'grant' ? <DollarSign size={16} /> : opp.type === 'job' ? <Laptop size={16} /> : opp.type === 'accelerator' ? <Rocket size={16} /> : <Trophy size={16} />}
                    </div>

                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', minWidth: 0 }}>
                        <span style={{ fontSize: '14px', fontWeight: 700, color: 'white', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block', minWidth: 0 }}>
                          {opp.title}
                        </span>
                        {opp.verificationStatus === 'verified' && (
                          <span style={{ fontSize: '12px', flexShrink: 0 }} title="Verified Data"><CheckCircle size={12} className="inline text-emerald-500" /></span>
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
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 20px', background: 'rgba(255,255,255,0.02)', borderRadius: '16px', border: '1px dashed rgba(255,255,255,0.1)', animation: 'pulse 2s infinite' }}>
                <div style={{ position: 'relative', width: '64px', height: '64px', marginBottom: '16px' }}>
                  <Loader2 size={64} className="text-indigo-500 animate-spin" style={{ position: 'absolute', opacity: 0.2 }} />
                  <Loader2 size={64} className="text-indigo-400 animate-spin" style={{ position: 'absolute', animationDuration: '3s' }} />
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Sparkles size={24} className="text-emerald-400" />
                  </div>
                </div>
                <h3 style={{ color: 'white', fontSize: '15px', fontWeight: 600, marginBottom: '6px' }}>Scanning Global Databases</h3>
                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px', maxWidth: '300px', textAlign: 'center' }}>Your AI Chief Officer is analyzing your DNA to find matching opportunities. Check back shortly.</p>
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
                <span><Target size={16} className="text-indigo-400" /></span> Evidence-Based Completeness
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
                  icon: <GraduationCap size={16} className="inline" />,
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
                  icon: <Plane size={16} className="inline" />,
                  color: '#8b5cf6',
                  items: [
                    { name: 'Passport', done: hasPassport },
                    { name: 'Country', done: hasCountry },
                  ]
                },
                {
                  label: 'Language Evidence',
                  icon: <Mic size={16} className="inline" />,
                  color: '#06b6d4',
                  items: [
                    { name: 'IELTS / TOEFL', done: hasIelts || ieltsStatus === 'Scheduled' },
                  ]
                },
                {
                  label: 'Application Docs',
                  icon: <FileText size={16} className="inline" />,
                  color: '#10b981',
                  items: [
                    { name: 'Resume / CV', done: hasResume },
                    { name: 'Skills Profile', done: hasSkills },
                  ]
                },
                {
                  label: 'Research Portfolio',
                  icon: <Microscope size={16} className="inline" />,
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
                <span><Target size={16} className="text-indigo-400" /></span> Daily Mission Timeline
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
                      desc: `Crucial for passing basic eligibility filters${missing.length > 1 ? ` (${missing.length - 1} more pending)` : ''}`,
                      roi: `+${Math.min(missing.length * 8, 30)}% Readiness`,
                      color: '#f43f5e'
                    });
                  }

                  const drafts = apps.filter(a => a.stage === 'preparing');
                  if (drafts.length > 0) {
                    const draftOpp = opportunities.find(o => o.id === drafts[0].id);
                    missions.push({
                      day: 'Today',
                      title: `Finalize SOP for ${draftOpp?.title.substring(0, 20) || 'Application'}`,
                      desc: `High-leverage action to move ${drafts.length} pipeline${drafts.length > 1 ? 's' : ''} to submission`,
                      roi: '+22% Win Prob.',
                      color: '#10b981'
                    });
                  } else {
                    // Dynamic: use actual matched opportunity count and real potential value
                    const qualifiedCount = Math.max(3, Math.round(metrics.opportunitiesFound * 0.4));
                    missions.push({
                      day: 'Today',
                      title: `Analyze ${qualifiedCount} Qualified Matches`,
                      desc: `Identify and save top ROI opportunities from ${metrics.opportunitiesFound} matched`,
                      roi: metrics.potentialValue !== '$0' ? `+${metrics.potentialValue} Potential` : '+$25K Potential',
                      color: '#6366f1'
                    });
                  }

                  // Dynamic 3rd mission: based on closest deadline or profile gap
                  const closestDeadline = upcomingDeadlines[0];
                  if (closestDeadline && closestDeadline.daysLeft <= 30) {
                    missions.push({
                      day: closestDeadline.daysLeft <= 3 ? 'Urgent' : closestDeadline.daysLeft <= 7 ? 'This Week' : 'Tomorrow',
                      title: `Prepare for ${closestDeadline.name.substring(0, 25)}${closestDeadline.name.length > 25 ? '...' : ''}`,
                      desc: `Deadline in ${closestDeadline.daysLeft} day${closestDeadline.daysLeft !== 1 ? 's' : ''} — ensure all documents are ready`,
                      roi: `${closestDeadline.daysLeft}d left`,
                      color: closestDeadline.daysLeft <= 7 ? '#f43f5e' : '#f59e0b'
                    });
                  } else {
                    missions.push({
                      day: 'Tomorrow',
                      title: `Strengthen ${missing.length > 0 ? missing[missing.length - 1]?.name || 'Profile' : 'Leadership Narrative'}`,
                      desc: `Bolster your DNA matrix to match elite selection criteria`,
                      roi: `+${Math.round(10 + (100 - metrics.readinessScore) * 0.2)}% Profile Score`,
                      color: '#f59e0b'
                    });
                  }

                  return missions.map((mission, idx) => (
                    <div key={idx} style={{ position: 'relative', zIndex: 1, display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                      <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'var(--bg-secondary)', border: `2px solid ${mission.color}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '4px' }}>
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: mission.color }} />
                      </div>
                      <div className="glass-sm" style={{ padding: '12px', borderRadius: '8px', flex: 1, border: `1px solid ${mission.color}30`, background: `${mission.color}05` }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <span style={{ fontSize: '10px', color: mission.color, fontWeight: 800, textTransform: 'uppercase' }}>{mission.day}</span>
                          <span style={{ fontSize: '10px', color: '#10b981', fontWeight: 700, background: 'rgba(16,185,129,0.1)', padding: '2px 6px', borderRadius: '4px' }}><TrendingUp size={12} className="inline mr-1" /> {mission.roi}</span>
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

          {/* Verified Deadline Tracker */}
          <div className="card" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
              <h3 style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '15px', fontWeight: 700, color: 'white', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Clock size={16} className="text-indigo-400" /> Deadline Tracker
              </h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <button
                  onClick={() => setDeadlineSort(prev => prev === 'deadline' ? 'score' : 'deadline')}
                  className="badge"
                  style={{
                    fontSize: '10px',
                    padding: '3px 8px',
                    background: 'rgba(99,102,241,0.1)',
                    color: '#818cf8',
                    border: '1px solid rgba(99,102,241,0.2)',
                    cursor: 'pointer',
                  }}
                  title="Toggle sort by Deadline or Match Score"
                >
                  Sort: {deadlineSort === 'deadline' ? '⏳ Date' : '🎯 Score'}
                </button>
                <span className="badge badge-amber">{allDeadlines.length} Active</span>
              </div>
            </div>

            {/* Inline Quick Search Filter */}
            <div style={{ marginBottom: '12px', position: 'relative' }}>
              <input
                type="text"
                placeholder="Search deadlines..."
                value={deadlineSearch}
                onChange={(e) => setDeadlineSearch(e.target.value)}
                style={{
                  width: '100%',
                  padding: '7px 10px 7px 30px',
                  borderRadius: '8px',
                  background: 'rgba(0,0,0,0.25)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  color: 'white',
                  fontSize: '11px',
                  outline: 'none',
                }}
              />
              <Search size={13} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.4)' }} />
              {deadlineSearch && (
                <button
                  onClick={() => setDeadlineSearch('')}
                  style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: '11px' }}
                >
                  ✕
                </button>
              )}
            </div>

            {/* Deadline List */}
            {(() => {
              let displayList = allDeadlines.length > 0 ? allDeadlines : upcomingDeadlines;

              // Filter by search query
              if (deadlineSearch.trim()) {
                const q = deadlineSearch.toLowerCase();
                displayList = displayList.filter(item =>
                  item.name.toLowerCase().includes(q) ||
                  (item.provider && item.provider.toLowerCase().includes(q)) ||
                  (item.type && item.type.toLowerCase().includes(q))
                );
              }

              // Apply sorting
              displayList = [...displayList].sort((a, b) => {
                if (deadlineSort === 'score') return (b.probability || 0) - (a.probability || 0);
                return a.daysLeft - b.daysLeft;
              });

              // Apply pagination toggle
              const visibleList = showAllDeadlines ? displayList : displayList.slice(0, 4);

              if (visibleList.length === 0) {
                return (
                  <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', textAlign: 'center', padding: '16px 0' }}>
                    {deadlineSearch ? 'No matching deadlines found.' : 'No imminent deadlines.'}
                  </div>
                );
              }

              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: showAllDeadlines ? '340px' : 'none', overflowY: showAllDeadlines ? 'auto' : 'visible', paddingRight: showAllDeadlines ? '4px' : '0' }}>
                  {visibleList.map((item, idx) => {
                    const urgencyColor = item.daysLeft <= 14 ? '#f43f5e' : item.daysLeft <= 45 ? '#f59e0b' : '#10b981';
                    const formattedDate = new Date(item.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

                    return (
                      <Link
                        key={item.id || idx}
                        href={`/dashboard/opportunities/${item.id || ''}`}
                        style={{ textDecoration: 'none', display: 'block' }}
                      >
                        <div
                          style={{
                            padding: '10px',
                            borderRadius: '8px',
                            background: 'rgba(255,255,255,0.02)',
                            border: `1px solid ${urgencyColor}25`,
                            transition: 'all 0.2s ease',
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.borderColor = `${urgencyColor}60`)}
                          onMouseLeave={(e) => (e.currentTarget.style.borderColor = `${urgencyColor}25`)}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', gap: '8px', alignItems: 'flex-start' }}>
                            <span style={{ fontSize: '12px', color: 'white', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block', minWidth: 0 }}>
                              {item.name}
                            </span>
                            <span
                              style={{
                                fontSize: '10px',
                                fontWeight: 700,
                                color: urgencyColor,
                                background: `${urgencyColor}15`,
                                border: `1px solid ${urgencyColor}30`,
                                padding: '1px 6px',
                                borderRadius: '4px',
                                flexShrink: 0
                              }}
                            >
                              {item.daysLeft}d left
                            </span>
                          </div>
                          <div className="progress-bar" style={{ height: '4px', margin: '6px 0' }}>
                            <div
                              className="progress-fill"
                              style={{
                                width: `${Math.max(8, Math.min(100, 100 - (item.daysLeft / 180) * 100))}%`,
                                background: `linear-gradient(90deg, ${urgencyColor}, ${urgencyColor}bb)`,
                              }}
                            />
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '10px', color: 'rgba(255,255,255,0.4)', marginTop: '4px' }}>
                            <span>{formattedDate !== 'Invalid Date' ? formattedDate : item.deadline}</span>
                            {item.probability ? (
                              <span style={{ color: '#818cf8', fontWeight: 600 }}>🎯 {item.probability}% Match</span>
                            ) : null}
                          </div>
                        </div>
                      </Link>
                    );
                  })}

                  {displayList.length > 4 && (
                    <button
                      onClick={() => setShowAllDeadlines(prev => !prev)}
                      style={{
                        width: '100%',
                        padding: '6px',
                        background: 'rgba(255,255,255,0.03)',
                        border: '1px border rgba(255,255,255,0.08)',
                        borderRadius: '6px',
                        color: '#818cf8',
                        fontSize: '11px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        marginTop: '4px',
                      }}
                    >
                      {showAllDeadlines ? 'Show Less ▲' : `View All ${displayList.length} Deadlines ▼`}
                    </button>
                  )}
                </div>
              );
            })()}
          </div>

          {/* AI Updates Inbox */}
          <div className="card" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <h3 style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '15px', fontWeight: 700, color: 'white', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span><Download size={16} className="text-indigo-400" /></span> System Compliance Alerts
              </h3>
              <span className="badge badge-indigo">LIVE</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {(() => {
                const missingItems = profileCompleteness.items.filter(item => item.status === 'missing');
                if (missingItems.length === 0) {
                  return (
                    <div style={{ display: 'flex', gap: '8px', fontSize: '12px', alignItems: 'center', color: '#10b981' }}>
                      <span><Check size={12} className="inline text-emerald-500" /></span>
                      <span>All mandatory credentials fully connected & verified.</span>
                    </div>
                  );
                }
                return missingItems.slice(0, 3).map((item, idx) => (
                  <div key={idx} style={{ borderBottom: idx < missingItems.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none', paddingBottom: '10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <span style={{ fontSize: '12px', fontWeight: 700, color: '#f43f5e' }}><AlertCircle size={12} className="inline mr-1 text-rose-500" /> Missing: {item.name}</span>
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
              <Zap size={16} className="inline mr-2 text-indigo-400" /> Quick Actions
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {[
                { label: <><FileEdit size={14} className="inline mr-2" /> Application Builder</>, href: '/dashboard/builder' },
                { label: <><Activity size={14} className="inline mr-2" /> Opportunity Matrix</>, href: '/dashboard/compare' },
                { label: <><Map size={14} className="inline mr-2" /> Compliance Roadmap</>, href: '/dashboard/roadmap' },
                { label: <><Search size={14} className="inline mr-2" /> Browse Database</>, href: '/dashboard/opportunities' },
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

          {/* PLATFORM INTELLIGENCE — Real Dynamic Metrics */}
          <div className="card" style={{ padding: '20px' }}>
            <h3 style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '15px', fontWeight: 700, color: 'white', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Globe size={16} className="text-indigo-400" /> Platform Intelligence
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              {(() => {
                const totalOpps = opportunities.length;
                const categories = new Set(opportunities.map((o: Opportunity) => o.type).filter(Boolean));
                const countries = new Set(opportunities.map((o: Opportunity) => o.country).filter(Boolean));
                const providers = new Set(opportunities.map((o: Opportunity) => o.provider).filter(Boolean));

                return [
                  { label: 'OPPORTUNITIES INDEXED', value: totalOpps.toLocaleString(), color: '#6366f1', icon: <Telescope size={14} className="text-indigo-400" /> },
                  { label: 'CATEGORIES TRACKED', value: categories.size.toString(), color: '#8b5cf6', icon: <Target size={14} className="text-purple-400" /> },
                  { label: 'COUNTRIES COVERED', value: countries.size.toString(), color: '#10b981', icon: <Globe size={14} className="text-emerald-400" /> },
                  { label: 'PROVIDERS', value: providers.size.toString(), color: '#06b6d4', icon: <Landmark size={14} className="text-cyan-400" /> },
                ].map(stat => (
                  <div key={stat.label} className="glass-sm" style={{ padding: '12px', borderRadius: '10px', textAlign: 'center' }}>
                    <div style={{ marginBottom: '4px' }}>{stat.icon}</div>
                    <div style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '18px', fontWeight: 800, color: stat.color }}>{stat.value}</div>
                    <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.35)', fontWeight: 600, marginTop: '2px' }}>{stat.label}</div>
                  </div>
                ));
              })()}
            </div>
          </div>

        </div>{/* close dashboard-sidebar-panels */}
      </div>{/* close dashboard-layout-grid */}

      {/* AI EXECUTIVE STRATEGY REPORT MODAL */}
      {showReportModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(16px)', padding: '20px' }}>
          <div className="card-magnetic glow-border page-transition" style={{ width: '100%', maxWidth: '640px', maxHeight: '90vh', overflowY: 'auto', background: 'var(--bg-secondary)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: '20px', padding: '28px', boxShadow: '0 24px 64px rgba(0,0,0,0.8)' }}>
            
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '16px' }}>
              <div>
                <div style={{ fontSize: '10px', fontWeight: 800, color: '#818cf8', letterSpacing: '1.5px', marginBottom: '4px' }}>AI EXECUTIVE BRIEFING • LIVE REPORT</div>
                <h2 style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '20px', fontWeight: 800, color: 'white', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Sparkles size={20} className="text-indigo-400" /> Executive Opportunity Strategy
                </h2>
                <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>Prepared for {userName} • Generated from Live Opportunity DNA</div>
              </div>
              <button
                onClick={() => setShowReportModal(false)}
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Live Metrics Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginBottom: '16px' }}>
              <div className="glass-sm" style={{ padding: '12px', borderRadius: '10px', textAlign: 'center' }}>
                <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.4)', fontWeight: 700 }}>READINESS</div>
                <div style={{ fontSize: '18px', fontWeight: 800, color: '#10b981', marginTop: '2px' }}>{metrics.readinessScore}%</div>
              </div>
              <div className="glass-sm" style={{ padding: '12px', borderRadius: '10px', textAlign: 'center' }}>
                <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.4)', fontWeight: 700 }}>MATCHED OPPS</div>
                <div style={{ fontSize: '18px', fontWeight: 800, color: '#6366f1', marginTop: '2px' }}>{metrics.opportunitiesFound}</div>
              </div>
              <div className="glass-sm" style={{ padding: '12px', borderRadius: '10px', textAlign: 'center' }}>
                <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.4)', fontWeight: 700 }}>PORTFOLIO VAL</div>
                <div style={{ fontSize: '18px', fontWeight: 800, color: '#06b6d4', marginTop: '2px' }}>{metrics.potentialValue}</div>
              </div>
              <div className="glass-sm" style={{ padding: '12px', borderRadius: '10px', textAlign: 'center' }}>
                <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.4)', fontWeight: 700 }}>AVG PROBABILITY</div>
                <div style={{ fontSize: '18px', fontWeight: 800, color: '#8b5cf6', marginTop: '2px' }}>{metrics.successProbabilityAvg}%</div>
              </div>
            </div>

            {/* Candidate DNA Profile Box */}
            <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', padding: '14px 16px', marginBottom: '16px' }}>
              <div style={{ fontSize: '10px', fontWeight: 700, color: '#818cf8', marginBottom: '8px', letterSpacing: '0.5px' }}>CANDIDATE PROFILE DNA</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '12px', color: 'rgba(255,255,255,0.7)' }}>
                <div><span style={{ color: 'rgba(255,255,255,0.4)' }}>Field of Study:</span> <strong style={{ color: 'white' }}>{profile?.field || 'Engineering & AI'}</strong></div>
                <div><span style={{ color: 'rgba(255,255,255,0.4)' }}>GPA Metric:</span> <strong style={{ color: 'white' }}>{profile?.gpa || '3.5'}</strong></div>
                <div><span style={{ color: 'rgba(255,255,255,0.4)' }}>Target Region:</span> <strong style={{ color: 'white' }}>{profile?.country || 'Global'}</strong></div>
                <div><span style={{ color: 'rgba(255,255,255,0.4)' }}>Evidence Files:</span> <strong style={{ color: '#10b981' }}>{documents.length} Verified</strong></div>
              </div>
            </div>

            {/* Strategic Summary Box */}
            <div style={{ background: 'rgba(99,102,241,0.04)', border: '1px solid rgba(99,102,241,0.15)', borderRadius: '12px', padding: '16px', marginBottom: '20px' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#818cf8', marginBottom: '8px', letterSpacing: '0.5px' }}>EXECUTIVE ANALYSIS SUMMARY</div>
              <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.8)', lineHeight: 1.6, margin: 0 }}>
                {userName}'s Opportunity Profile in <strong>{profile?.field || 'Engineering & AI'}</strong> is currently operating at <strong>{metrics.readinessScore}% evidence completeness</strong>. 
                Our AI Chief Officer has indexed <strong>{metrics.opportunitiesFound} matching opportunities</strong> globally, representing an estimated funding portfolio of <strong>{metrics.potentialValue}</strong> with an average success projection of <strong>{metrics.successProbabilityAvg}%</strong>.
              </p>
            </div>

            {/* Top Matched Opportunities List */}
            {opportunities.length > 0 && (
              <div style={{ marginBottom: '20px' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,0.5)', marginBottom: '10px', letterSpacing: '0.5px' }}>TOP RANKED TARGET OPPORTUNITIES</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {opportunities.slice(0, 3).map((opp, idx) => (
                    <div key={opp.id || idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', borderRadius: '10px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: 700, color: 'white' }}>{opp.title}</div>
                        <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>{opp.provider} • {opp.country || 'Global'}</div>
                      </div>
                      <span className="badge badge-indigo" style={{ fontSize: '11px' }}>{opp.fundingLevel || 'Full Funding'}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Modal Actions */}
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
              <button
                disabled={downloadingPDF}
                onClick={async () => {
                  try {
                    setDownloadingPDF(true);
                    toast('Generating Executive PDF report...');

                    const { jsPDF } = await import('jspdf');
                    const doc = new jsPDF({
                      orientation: 'portrait',
                      unit: 'pt',
                      format: 'a4'
                    });

                    const pageWidth = doc.internal.pageSize.getWidth();
                    const margin = 40;
                    const contentWidth = pageWidth - (margin * 2);

                    const primaryIndigo = [99, 102, 241];
                    const textDark = [15, 23, 42];
                    const textMuted = [100, 116, 139];
                    const bgLight = [248, 250, 252];
                    const borderLight = [226, 232, 240];
                    const accentGreen = [16, 185, 129];
                    const accentPurple = [139, 92, 246];

                    let y = 45;

                    // --- HEADER ---
                    doc.setFont('helvetica', 'bold');
                    doc.setFontSize(22);
                    doc.setTextColor(textDark[0], textDark[1], textDark[2]);
                    doc.text('Executive Strategy Report', margin, y);

                    doc.setFont('helvetica', 'bold');
                    doc.setFontSize(14);
                    doc.setTextColor(primaryIndigo[0], primaryIndigo[1], primaryIndigo[2]);
                    doc.text('OpportunityOS AI', pageWidth - margin, y, { align: 'right' });

                    y += 18;
                    doc.setFont('helvetica', 'bold');
                    doc.setFontSize(9);
                    doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
                    doc.text(`PREPARED FOR ${userName.toUpperCase()} • CONFIDENTIAL OPPORTUNITY DNA`, margin, y);

                    y += 15;
                    doc.setDrawColor(primaryIndigo[0], primaryIndigo[1], primaryIndigo[2]);
                    doc.setLineWidth(2);
                    doc.line(margin, y, pageWidth - margin, y);

                    y += 25;

                    // --- METRICS GRID (4 CARDS) ---
                    const cardGap = 10;
                    const cardWidth = (contentWidth - (cardGap * 3)) / 4;
                    const cardHeight = 50;

                    const metricsData = [
                      { label: 'READINESS', val: `${metrics.readinessScore}%`, color: accentGreen },
                      { label: 'MATCHED OPPS', val: `${metrics.opportunitiesFound}`, color: primaryIndigo },
                      { label: 'PORTFOLIO VAL', val: `${metrics.potentialValue}`, color: [6, 182, 212] },
                      { label: 'AVG WIN CHANCE', val: `${metrics.successProbabilityAvg}%`, color: accentPurple }
                    ];

                    metricsData.forEach((m, idx) => {
                      const x = margin + idx * (cardWidth + cardGap);
                      doc.setFillColor(bgLight[0], bgLight[1], bgLight[2]);
                      doc.setDrawColor(borderLight[0], borderLight[1], borderLight[2]);
                      doc.setLineWidth(1);
                      doc.roundedRect(x, y, cardWidth, cardHeight, 6, 6, 'FD');

                      doc.setFont('helvetica', 'bold');
                      doc.setFontSize(8);
                      doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
                      doc.text(m.label, x + cardWidth / 2, y + 16, { align: 'center' });

                      doc.setFont('helvetica', 'bold');
                      doc.setFontSize(15);
                      doc.setTextColor(m.color[0], m.color[1], m.color[2]);
                      doc.text(m.val, x + cardWidth / 2, y + 38, { align: 'center' });
                    });

                    y += cardHeight + 25;

                    // --- EXECUTIVE ASSESSMENT SUMMARY BOX ---
                    doc.setFillColor(238, 242, 255);
                    doc.setDrawColor(199, 210, 254);
                    doc.roundedRect(margin, y, contentWidth, 65, 8, 8, 'FD');

                    doc.setFont('helvetica', 'bold');
                    doc.setFontSize(10);
                    doc.setTextColor(49, 46, 129);
                    doc.text('EXECUTIVE ASSESSMENT SUMMARY', margin + 14, y + 18);

                    doc.setFont('helvetica', 'normal');
                    doc.setFontSize(9.5);
                    doc.setTextColor(30, 41, 59);
                    const summaryText = `${userName}'s Opportunity Profile in ${profile?.field || 'Electrical Engineering'} is operating at ${metrics.readinessScore}% evidence completeness with ${documents.length} verified evidence document(s) connected. Our AI Chief Officer has indexed ${metrics.opportunitiesFound} matching opportunities globally, representing an estimated funding portfolio of ${metrics.potentialValue} with an average success projection of ${metrics.successProbabilityAvg}%.`;
                    
                    const splitSummary = doc.splitTextToSize(summaryText, contentWidth - 28);
                    doc.text(splitSummary, margin + 14, y + 34);

                    y += 85;

                    // --- CANDIDATE DNA PROFILE SUMMARY ---
                    doc.setFillColor(primaryIndigo[0], primaryIndigo[1], primaryIndigo[2]);
                    doc.rect(margin, y, 4, 14, 'F');

                    doc.setFont('helvetica', 'bold');
                    doc.setFontSize(11);
                    doc.setTextColor(textDark[0], textDark[1], textDark[2]);
                    doc.text('CANDIDATE PROFILE DNA SUMMARY', margin + 12, y + 11);

                    y += 22;

                    doc.setFillColor(bgLight[0], bgLight[1], bgLight[2]);
                    doc.setDrawColor(borderLight[0], borderLight[1], borderLight[2]);
                    doc.roundedRect(margin, y, contentWidth, 75, 8, 8, 'FD');

                    doc.setFont('helvetica', 'normal');
                    doc.setFontSize(9.5);
                    doc.setTextColor(51, 65, 85);

                    const col1X = margin + 16;
                    const col2X = margin + contentWidth / 2 + 10;

                    // Row 1
                    doc.setFont('helvetica', 'bold'); doc.text('Candidate Name:', col1X, y + 20);
                    doc.setFont('helvetica', 'normal'); doc.text(userName, col1X + 95, y + 20);

                    doc.setFont('helvetica', 'bold'); doc.text('Field of Study:', col2X, y + 20);
                    doc.setFont('helvetica', 'normal'); doc.text(profile?.field || 'Electrical Engineering', col2X + 85, y + 20);

                    // Row 2
                    doc.setFont('helvetica', 'bold'); doc.text('GPA Metric:', col1X, y + 40);
                    doc.setFont('helvetica', 'normal'); doc.text(profile?.gpa || '3.0/4.0', col1X + 95, y + 40);

                    doc.setFont('helvetica', 'bold'); doc.text('Target Region:', col2X, y + 40);
                    doc.setFont('helvetica', 'normal'); doc.text(profile?.country || 'Global', col2X + 85, y + 40);

                    // Row 3
                    doc.setFont('helvetica', 'bold'); doc.text('Vault Files:', col1X, y + 60);
                    doc.setFont('helvetica', 'normal'); doc.text(`${documents.length} File(s) Connected`, col1X + 95, y + 60);

                    doc.setFont('helvetica', 'bold'); doc.text('Active Pipelines:', col2X, y + 60);
                    doc.setFont('helvetica', 'normal'); doc.text(`${apps.length} Application(s) Active`, col2X + 85, y + 60);

                    y += 95;

                    // --- TOP RANKED TARGET OPPORTUNITIES ---
                    doc.setFillColor(primaryIndigo[0], primaryIndigo[1], primaryIndigo[2]);
                    doc.rect(margin, y, 4, 14, 'F');

                    doc.setFont('helvetica', 'bold');
                    doc.setFontSize(11);
                    doc.setTextColor(textDark[0], textDark[1], textDark[2]);
                    doc.text('TOP RANKED TARGET OPPORTUNITIES', margin + 12, y + 11);

                    y += 22;

                    const topOpps = opportunities.slice(0, 4);
                    topOpps.forEach(opp => {
                      doc.setFillColor(255, 255, 255);
                      doc.setDrawColor(borderLight[0], borderLight[1], borderLight[2]);
                      doc.roundedRect(margin, y, contentWidth, 38, 6, 6, 'FD');

                      doc.setFont('helvetica', 'bold');
                      doc.setFontSize(10);
                      doc.setTextColor(15, 23, 42);
                      doc.text(opp.title, margin + 14, y + 16);

                      doc.setFont('helvetica', 'normal');
                      doc.setFontSize(8.5);
                      doc.setTextColor(100, 116, 139);
                      doc.text(`${opp.provider} • ${opp.country || 'Global'}`, margin + 14, y + 28);

                      // Funding Badge
                      doc.setFont('helvetica', 'bold');
                      doc.setFontSize(8);
                      doc.setTextColor(55, 48, 163);
                      doc.text(opp.fundingLevel || 'Full Funding', pageWidth - margin - 14, y + 22, { align: 'right' });

                      y += 44;
                    });

                    // --- FOOTER ---
                    const footerY = doc.internal.pageSize.getHeight() - 35;
                    doc.setDrawColor(borderLight[0], borderLight[1], borderLight[2]);
                    doc.setLineWidth(0.5);
                    doc.line(margin, footerY, pageWidth - margin, footerY);

                    doc.setFont('helvetica', 'normal');
                    doc.setFontSize(8);
                    doc.setTextColor(148, 163, 184);
                    doc.text(`Generated by OpportunityOS AI Operating System • ${new Date().toLocaleDateString()} • Verified Strategic Intelligence Document`, pageWidth / 2, footerY + 15, { align: 'center' });

                    // SAVE DIRECTLY TO LOCAL DISK!
                    const fileName = `OpportunityOS_Executive_Report_${userName.replace(/\s+/g, '_')}.pdf`;
                    doc.save(fileName);
                    toast(`PDF downloaded directly: ${fileName}`);
                  } catch (err: any) {
                    console.error('jsPDF direct generation error:', err);
                    toast(`Could not generate PDF: ${err?.message || 'Unknown error'}`);
                  } finally {
                    setDownloadingPDF(false);
                  }
                }}
                className="btn btn-primary"
                style={{ flex: 1, justifyContent: 'center', padding: '10px 16px', fontSize: '13px' }}
              >
                {downloadingPDF ? <Loader2 size={14} className="inline mr-1 animate-spin" /> : <Download size={14} className="inline mr-1" />}
                {downloadingPDF ? 'Downloading PDF...' : 'Download PDF Report'}
              </button>

              <button
                onClick={() => {
                  const reportText = `# EXECUTIVE OPPORTUNITY STRATEGY REPORT\nPrepared for: ${userName}\nField: ${profile?.field || 'Engineering & AI'}\nGPA: ${profile?.gpa || '3.5'}\nDate: ${new Date().toLocaleDateString()}\n\n## Key Metrics\n- Readiness Score: ${metrics.readinessScore}%\n- Matched Opportunities: ${metrics.opportunitiesFound}\n- Estimated Portfolio Value: ${metrics.potentialValue}\n- Success Probability Average: ${metrics.successProbabilityAvg}%\n- Vault Files Connected: ${documents.length}\n\n## Top Target Opportunities\n${opportunities.slice(0, 4).map(o => `- ${o.title} (${o.provider}, ${o.country || 'Global'})`).join('\n')}\n\nGenerated by OpportunityOS AI Operating System.`;
                  if (typeof navigator !== 'undefined' && navigator.clipboard) {
                    navigator.clipboard.writeText(reportText);
                    setCopiedReport(true);
                    toast('Strategy Report copied to clipboard!');
                    setTimeout(() => setCopiedReport(false), 2500);
                  }
                }}
                className="btn btn-secondary"
                style={{ justifyContent: 'center', padding: '10px 16px', fontSize: '13px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
              >
                {copiedReport ? <Check size={14} className="inline mr-1" /> : <Copy size={14} className="inline mr-1" />}
                {copiedReport ? 'Copied!' : 'Copy Text'}
              </button>

              <button
                onClick={() => setShowReportModal(false)}
                className="btn btn-ghost"
                style={{ border: '1px solid rgba(255,255,255,0.1)', padding: '10px 16px', fontSize: '13px' }}
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
