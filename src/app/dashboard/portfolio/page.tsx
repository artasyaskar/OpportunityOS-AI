'use client';

import { useState, useEffect, useRef } from 'react';
import { useDialog } from '@/components/ui/DialogProvider';
import { getProbabilityColor, getScoreLabel } from '@/lib/scoring';
import { SEED_OPPORTUNITIES } from '@/lib/opportunities';

import { useProfile } from '@/components/auth/ProfileContext';
import { usePipeline } from '@/components/auth/PipelineContext';
import { useAuth } from '@/components/auth/AuthProvider';
import { useSubscription } from '@/components/auth/SubscriptionContext';
import { EvidenceRepository, EvidenceDocument, DocumentStatus } from '@/lib/repositories/EvidenceRepository';
import Link from 'next/link';
import { Lock, Dna, Briefcase, GraduationCap, Microscope, Handshake, Laptop, Brain, Target, FileText, UploadCloud, Activity, Check, ArrowRight, ShieldCheck, Plus, Sparkles } from 'lucide-react';

const STATUS_STYLES: Record<string, { color: string; label: any; bg: string }> = {
  wishlist: { color: '#94a3b8', label: 'Wishlist', bg: 'rgba(148,163,184,0.1)' },
  draft: { color: '#f59e0b', label: 'Drafts', bg: 'rgba(245,158,11,0.1)' },
  preparing: { color: '#f59e0b', label: 'Preparing', bg: 'rgba(245,158,11,0.1)' },
  applied: { color: '#3b82f6', label: 'Applied', bg: 'rgba(59,130,246,0.1)' },
  submitted: { color: '#3b82f6', label: 'Submitted', bg: 'rgba(59,130,246,0.1)' },
  interview: { color: '#8b5cf6', label: 'Interview', bg: 'rgba(139,92,246,0.1)' },
  accepted: { color: '#10b981', label: 'Accepted', bg: 'rgba(16,185,129,0.1)' },
  visa: { color: '#06b6d4', label: 'Visa / Travel', bg: 'rgba(6,182,212,0.1)' },
  enrolled: { color: '#10b981', label: <><Check size={14} className="inline mr-1" /> Enrolled</>, bg: 'rgba(16,185,129,0.1)' },
  rejected: { color: '#f43f5e', label: 'Rejected', bg: 'rgba(244,63,94,0.1)' },
};

export default function PortfolioPage() {
  const { toast } = useDialog();
  const [activeTab, setActiveTab] = useState<'dna' | 'portfolio'>('dna');
  
  const { user, getIdToken } = useAuth();
  const { profile: userProfile } = useProfile();
  const { pipeline: apps } = usePipeline();
  const { subscription } = useSubscription();
  
  const [documents, setDocuments] = useState<EvidenceDocument[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const profile = userProfile || {
    name: 'Candidate Profile',
    education: 'Not Specified',
    gpa: '',
    field: 'Not Specified',
    skills: '',
    experience: '',
    goal: ''
  } as any;

  const [portfolioAi, setPortfolioAi] = useState<any>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);

  const handleRunPortfolioAi = async () => {
    if (!user?.uid) {
      toast('Please sign in to generate AI Portfolio Insights.');
      return;
    }
    setIsAiLoading(true);
    try {
      const token = await getIdToken();
      const res = await fetch('/api/agents/portfolio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          applications: apps,
          evidenceContext: `User has ${documents.length} verified documents in evidence vault.`
        })
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'AI Portfolio Analysis failed');
      }
      const data = await res.json();
      setPortfolioAi(data);
      toast('AI Portfolio Insights successfully generated!');
    } catch (err: any) {
      console.error("AI Portfolio Error:", err);
      toast(err?.message || "Failed to generate AI portfolio analysis.");
    } finally {
      setIsAiLoading(false);
    }
  };

  useEffect(() => {
    if (user?.uid) {
      EvidenceRepository.getEvidenceForUser(user.uid).then(setDocuments);
    }
  }, [user]);

  // Calculate clean potential value
  let totalPipelineFundingUSD = 0;
  if (apps && apps.length > 0) {
    apps.forEach(app => {
      const opp = SEED_OPPORTUNITIES.find(o => o.id === app.id || o.title === app.title);
      if (opp && opp.fundingLevel) {
        if (opp.fundingLevel.toLowerCase().includes('full')) {
          totalPipelineFundingUSD += 65000;
        } else {
          const num = parseInt(opp.fundingLevel.replace(/[^0-9]/g, '') || '0');
          totalPipelineFundingUSD += num > 0 ? num : 15000;
        }
      } else {
        totalPipelineFundingUSD += 25000;
      }
    });
  }

  let formattedFundingValue = '$0';
  if (totalPipelineFundingUSD >= 1000000) {
    formattedFundingValue = `$${(totalPipelineFundingUSD / 1000000).toFixed(1)}M`;
  } else if (totalPipelineFundingUSD > 0) {
    formattedFundingValue = `$${Math.round(totalPipelineFundingUSD / 1000)}K`;
  }

  // Calculate dynamic success rate from actual apps
  const terminalApps = apps.filter(a => (a.stage as string) === 'offer_received' || (a.stage as string) === 'enrolled' || (a.stage as string) === 'rejected');
  const acceptedAppsCount = apps.filter(a => (a.stage as string) === 'offer_received' || (a.stage as string) === 'enrolled' || (a.stage as string) === 'accepted').length;
  
  let dynamicSuccessRate = '0%';
  if (terminalApps.length > 0) {
    dynamicSuccessRate = `${Math.round((acceptedAppsCount / terminalApps.length) * 100)}%`;
  } else if (apps.length > 0) {
    // Dynamic estimate based on average match score of active pipeline apps
    const avgScore = Math.round(apps.reduce((sum, a) => sum + (a.matchScore || 50), 0) / apps.length);
    dynamicSuccessRate = `${Math.round(avgScore * 0.75)}%`;
  }

  const portfolioStats = {
    total: apps.length,
    wishlist: apps.filter(a => (a.stage as string) === 'wishlist' || (a.stage as string) === 'discovered').length,
    draft: apps.filter(a => (a.stage as string) === 'preparing' || (a.stage as string) === 'documents_ready' || (a.stage as string) === 'qualified').length,
    applied: apps.filter(a => (a.stage as string) === 'official_submission' || (a.stage as string) === 'applied' || (a.stage as string) === 'submitted').length,
    interview: apps.filter(a => (a.stage as string) === 'interview').length,
    accepted: acceptedAppsCount,
    rejected: apps.filter(a => (a.stage as string) === 'rejected').length,
    potentialValue: formattedFundingValue,
  };

  const activeAppsCount = apps.filter(a => (a.stage as string) !== 'wishlist' && (a.stage as string) !== 'discovered' && (a.stage as string) !== 'rejected').length;

  const healthScore = portfolioAi?.healthScore || (apps.length > 0 ? Math.min(100, Math.round(40 + apps.length * 10 + (acceptedAppsCount * 15))) : 0);
  const healthLabel = getScoreLabel(healthScore);

  // Compute dynamic profiles based strictly on real user data & evidence
  const hasAcademicAdv = (profile.gpa && parseFloat(profile.gpa) >= 3.5) || documents.some(d => d.type === 'transcript');
  const hasResearchAdv = profile.experience?.toLowerCase().includes('research') || profile.experience?.toLowerCase().includes('paper') || profile.skills?.toLowerCase().includes('research') || documents.some(d => d.type === 'publication' || d.type === 'research_proposal');
  const hasLeadershipAdv = profile.skills?.toLowerCase().includes('leadership') || profile.experience?.toLowerCase().includes('lead') || documents.some(d => d.type === 'lor');
  const hasTechnicalAdv = profile.skills?.toLowerCase().includes('python') || profile.skills?.toLowerCase().includes('ml') || profile.skills?.toLowerCase().includes('programming') || profile.field?.toLowerCase().includes('computer') || profile.field?.toLowerCase().includes('engineering');

  // AI Memory Coordinates dynamic calculation
  const preferredCountries = profile.targetOpportunities && profile.targetOpportunities.length > 0 
    ? profile.targetOpportunities.join(', ')
    : (profile.country || 'Not specified (Global)');
    
  const hasEnglishProof = documents.some(d => d.type === 'ielts' || d.type === 'toefl' || d.type === 'pte' || d.type === 'duolingo');
  const englishDoc = documents.find(d => d.type === 'ielts' || d.type === 'toefl');
  const languagesRetrieved = hasEnglishProof 
    ? `English (Verified ${(englishDoc?.extractedData as any)?.overall || 'Score'}), Native Language` 
    : 'Pending verification...';

  // Strengths
  const strengths: string[] = [];
  if (profile.gpa && parseFloat(profile.gpa) >= 3.5) strengths.push(`High GPA (${profile.gpa})`);
  else if (profile.gpa) strengths.push(`GPA (${profile.gpa})`);
  if (profile.skills) strengths.push(profile.skills.split(',')[0].trim());
  if (documents.some(d => d.type === 'resume')) strengths.push('Resume Verified');
  if (strengths.length === 0) strengths.push('Profile Setup Pending');

  // Weaknesses
  const weaknesses: string[] = [];
  if (!hasEnglishProof) weaknesses.push('Missing English Proof');
  if (!hasResearchAdv) weaknesses.push('0 Publications');
  if (!documents.some(d => d.type === 'passport' || d.type === 'national_id')) weaknesses.push('Missing Passport');
  if (weaknesses.length === 0) weaknesses.push('None Detected');

  // Application Readiness Dashboard dynamic calculation
  const docCredScore = documents.some(d => d.type === 'passport' || d.type === 'national_id') ? 100 : 20;
  const researchScore = hasResearchAdv ? 90 : 25;
  const englishScore = hasEnglishProof ? 100 : 15;
  const lorCount = documents.filter(d => d.type === 'lor').length;
  const lorScore = Math.min(100, lorCount * 33 + (lorCount > 0 ? 10 : 0));
  const portScore = apps.length > 0 ? Math.min(100, apps.length * 20 + 20) : 10;

  // Resume Evolution Timeline
  const resumeDocs = documents.filter(d => d.type === 'resume').sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());

  const handleUploadNewResume = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0] || !user?.uid) return;
    const file = e.target.files[0];
    try {
      const newDoc = {
        id: crypto.randomUUID(),
        userId: user.uid,
        type: 'resume',
        fileName: file.name,
        size: file.size,
        mimeType: file.type,
        uploadedAt: new Date().toISOString(),
        lastUpdatedAt: new Date().toISOString(),
        status: DocumentStatus.PROCESSING as any,
        storageKey: `evidence/${user.uid}/resume/${Date.now()}_${file.name}`,
        source: 'local',
        aiConfidence: 0,
        version: resumeDocs.length + 1,
        usedInApplications: []
      };
      await EvidenceRepository.saveEvidence(user.uid, newDoc as any);
      toast('Document successfully added to Evidence Vault!');
      EvidenceRepository.getEvidenceForUser(user.uid).then(setDocuments);
    } catch (err) {
      console.error(err);
      toast('Upload failed.');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div>
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '28px', fontWeight: 800, color: 'white', marginBottom: '8px' }}>
          <Dna size={28} className="inline mr-2 text-indigo-400" /> Profile DNA & Portfolio
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '14px' }}>
          Manage your economic mobility coordinates. View your Opportunity DNA model and track active applications.
        </p>
      </div>

      {/* Tabs Selector */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '28px', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '12px' }}>
        <button
          onClick={() => setActiveTab('dna')}
          className="tab-button"
          style={{ padding: '12px 24px', background: 'transparent', border: 'none', color: activeTab === 'dna' ? 'white' : 'rgba(255,255,255,0.5)', borderBottom: activeTab === 'dna' ? '2px solid #6366f1' : '2px solid transparent', fontSize: '14px', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s' }}
        >
          <Dna size={14} className="inline mr-2 text-indigo-400" /> Opportunity DNA Profile
        </button>
        <button
          onClick={() => setActiveTab('portfolio')}
          className="tab-button"
          style={{ padding: '12px 24px', background: 'transparent', border: 'none', color: activeTab === 'portfolio' ? 'white' : 'rgba(255,255,255,0.5)', borderBottom: activeTab === 'portfolio' ? '2px solid #6366f1' : '2px solid transparent', fontSize: '14px', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s' }}
        >
          <Briefcase size={14} className="inline mr-2 text-indigo-400" /> Applications Portfolio
        </button>
      </div>

      {activeTab === 'dna' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* DNA Metrics Overview */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            <div className="card" style={{ padding: '20px' }}>
              <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', fontWeight: 700, letterSpacing: '0.5px' }}>ACADEMIC SCORE</div>
              <div style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '26px', fontWeight: 800, color: '#818cf8', marginTop: '6px' }}>
                {profile.gpa ? `${Math.round((parseFloat(profile.gpa) / 4.0) * 100)}%` : 'Pending'}
              </div>
              <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginTop: '4px' }}>GPA alignment rating</div>
            </div>
            <div className="card" style={{ padding: '20px' }}>
              <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', fontWeight: 700, letterSpacing: '0.5px' }}>RESEARCH ASSETS</div>
              <div style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '26px', fontWeight: 800, color: '#10b981', marginTop: '6px' }}>
                {hasResearchAdv ? 'Advanced' : 'Baseline'}
              </div>
              <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginTop: '4px' }}>Papers / publication proof</div>
            </div>
            <div className="card" style={{ padding: '20px' }}>
              <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', fontWeight: 700, letterSpacing: '0.5px' }}>LEADERSHIP RATING</div>
              <div style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '26px', fontWeight: 800, color: '#06b6d4', marginTop: '6px' }}>
                {hasLeadershipAdv ? 'Tier 1' : 'Verified'}
              </div>
              <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginTop: '4px' }}>Organization coordinate</div>
            </div>
            <div className="card" style={{ padding: '20px' }}>
              <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', fontWeight: 700, letterSpacing: '0.5px' }}>TECHNICAL CAPABILITY</div>
              <div style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '26px', fontWeight: 800, color: '#8b5cf6', marginTop: '6px' }}>
                {hasTechnicalAdv ? 'Elite Fit' : 'Basic Fit'}
              </div>
              <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginTop: '4px' }}>Domain skills alignment</div>
            </div>
          </div>

          {/* DNA Analysis Board */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '24px' }}>
            {/* Dynamic Advantage Grid */}
            <div className="card" style={{ padding: '24px' }}>
              <h2 style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '16px', fontWeight: 700, color: 'white', marginBottom: '16px' }}>
                <Dna size={16} className="inline mr-2 text-indigo-400" /> Dynamic Advantage Engine
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {hasAcademicAdv && (
                  <div className="glass-sm" style={{ padding: '14px', borderRadius: '10px', border: '1px solid rgba(129,140,248,0.2)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <span style={{ fontSize: '16px' }}>🎓</span>
                      <span style={{ fontSize: '13px', fontWeight: 700, color: 'white' }}>Academic Leadership</span>
                    </div>
                    <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', lineHeight: 1.4 }}>
                      Your GPA of {profile.gpa || '3.5+'} positions you in top match cohorts for selective funding filters.
                    </p>
                  </div>
                )}
                {hasResearchAdv && (
                  <div className="glass-sm" style={{ padding: '14px', borderRadius: '10px', border: '1px solid rgba(16,185,129,0.2)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <span style={{ fontSize: '16px' }}>🔬</span>
                      <span style={{ fontSize: '13px', fontWeight: 700, color: 'white' }}>Published Research Index</span>
                    </div>
                    <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', lineHeight: 1.4 }}>
                      Documented experience in research pipelines and publications sets you apart for elite graduate programs.
                    </p>
                  </div>
                )}
                {hasLeadershipAdv && (
                  <div className="glass-sm" style={{ padding: '14px', borderRadius: '10px', border: '1px solid rgba(6,182,212,0.2)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <span style={{ fontSize: '16px' }}>🤝</span>
                      <span style={{ fontSize: '13px', fontWeight: 700, color: 'white' }}>Civic & Project Direction</span>
                    </div>
                    <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', lineHeight: 1.4 }}>
                      Active leadership metrics align with fellowship requirements for top international programs.
                    </p>
                  </div>
                )}
                {hasTechnicalAdv && (
                  <div className="glass-sm" style={{ padding: '14px', borderRadius: '10px', border: '1px solid rgba(139,92,246,0.2)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <span style={{ fontSize: '16px' }}>💻</span>
                      <span style={{ fontSize: '13px', fontWeight: 700, color: 'white' }}>Engineering Excellence</span>
                    </div>
                    <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', lineHeight: 1.4 }}>
                      Strong background in {profile.field || 'CS/AI'} tools matching technical needs of target accelerators.
                    </p>
                  </div>
                )}
                {!hasAcademicAdv && !hasResearchAdv && !hasLeadershipAdv && !hasTechnicalAdv && (
                  <div className="glass-sm" style={{ padding: '20px', borderRadius: '10px', border: '1px dashed rgba(99,102,241,0.3)', textAlign: 'center' }}>
                    <Sparkles size={24} className="text-indigo-400 mx-auto mb-2" />
                    <div style={{ fontSize: '13px', fontWeight: 700, color: 'white', marginBottom: '4px' }}>Build Your Advantage Profile</div>
                    <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginBottom: '12px' }}>
                      Complete your onboarding profile and upload evidence to generate your dynamic advantage insights.
                    </p>
                    <Link href="/onboarding" className="btn btn-primary btn-sm" style={{ display: 'inline-flex' }}>
                      Complete Profile →
                    </Link>
                  </div>
                )}
              </div>
            </div>

            {/* AI Memory Panel */}
            <div className="card-magnetic glow-border page-transition" style={{ padding: '24px' }}>
              <h2 style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '16px', fontWeight: 700, color: 'white', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Brain size={16} className="text-indigo-400" /> Your AI Memory Coordinates
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', fontWeight: 600 }}>CAREER GOAL</div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: 'white', marginTop: '4px' }}>{profile.careerGoal || profile.goal || 'Not specified'}</div>
                </div>
                <div>
                  <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', fontWeight: 600 }}>PREFERRED COUNTRIES</div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: 'white', marginTop: '4px' }}>{preferredCountries}</div>
                </div>
                <div>
                  <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', fontWeight: 600 }}>LANGUAGES RETRIEVED</div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: 'white', marginTop: '4px' }}>{languagesRetrieved}</div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '4px' }}>
                  <div className="glass-sm" style={{ padding: '10px', borderRadius: '8px', border: '1px solid rgba(16,185,129,0.15)' }}>
                    <div style={{ fontSize: '9px', color: '#10b981', fontWeight: 700 }}>STRENGTHS</div>
                    <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.7)', marginTop: '4px' }}>
                      {strengths.map((s, i) => <div key={i}>• {s}</div>)}
                    </div>
                  </div>
                  <div className="glass-sm" style={{ padding: '10px', borderRadius: '8px', border: '1px solid rgba(244,63,94,0.15)' }}>
                    <div style={{ fontSize: '9px', color: '#f43f5e', fontWeight: 700 }}>WEAKNESSES</div>
                    <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.7)', marginTop: '4px' }}>
                      {weaknesses.map((w, i) => <div key={i}>• {w}</div>)}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* APPLICATION READINESS DASHBOARD - FULLY INTERACTIVE */}
            <div className="card-magnetic glow-border" style={{ padding: '24px' }}>
              <h2 style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '16px', fontWeight: 700, color: 'white', marginBottom: '16px' }}>
                <Target size={16} className="inline mr-2 text-indigo-400" /> Application Readiness Dashboard
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {[
                  { label: 'Documentation Credentials', value: docCredScore, color: '#3b82f6', action: docCredScore === 100 ? 'Verified' : '+ Upload Passport', href: '/dashboard/vault' },
                  { label: 'Research & Project Assets', value: researchScore, color: '#10b981', action: researchScore >= 90 ? 'Verified' : '+ Add Papers', href: '/dashboard/vault' },
                  { label: 'English (IELTS / GRE)', value: englishScore, color: '#f59e0b', action: englishScore === 100 ? 'Verified' : '+ Add Test Scores', href: '/dashboard/vault' },
                  { label: 'Reference Letters (LORs)', value: lorScore, color: '#8b5cf6', action: `${lorCount}/3 LORs`, href: '/dashboard/vault' },
                  { label: 'Portfolio Diversification', value: portScore, color: '#06b6d4', action: `${apps.length} Active`, href: '/dashboard/opportunities' }
                ].map(r => (
                  <div key={r.label}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', marginBottom: '6px' }}>
                      <span style={{ color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>{r.label}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ color: 'white', fontWeight: 700 }}>{r.value}%</span>
                        <Link href={r.href} style={{ fontSize: '10px', color: r.color, fontWeight: 700, textDecoration: 'none', background: `${r.color}15`, padding: '2px 8px', borderRadius: '6px', border: `1px solid ${r.color}30` }}>
                          {r.action}
                        </Link>
                      </div>
                    </div>
                    <div className="progress-bar" style={{ height: '6px' }}>
                      <div className="progress-fill" style={{ width: `${r.value}%`, background: r.color }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* RESUME EVOLUTION TIMELINE */}
            <div className="card-magnetic glow-border" style={{ padding: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'white', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                  <FileText size={16} className="text-indigo-400" /> Resume Evolution Timeline
                </h3>
                {resumeDocs.length > 0 && (
                  <span style={{ fontSize: '9px', background: 'rgba(99,102,241,0.2)', padding: '3px 8px', borderRadius: '8px', color: '#818cf8', fontWeight: 700 }}>
                    V{resumeDocs.length} ACTIVE
                  </span>
                )}
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', position: 'relative', marginBottom: '20px' }}>
                <div style={{ position: 'absolute', top: '10px', bottom: '10px', left: '15px', width: '2px', background: 'rgba(255,255,255,0.06)' }} />
                
                {resumeDocs.length > 0 ? resumeDocs.map((doc, idx) => (
                  <div key={doc.id} style={{ display: 'flex', gap: '12px', position: 'relative' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', borderRadius: '8px', background: idx === 0 ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.05)', color: idx === 0 ? '#10b981' : 'rgba(255,255,255,0.4)', flexShrink: 0 }}>
                      <GraduationCap size={16} />
                    </div>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: idx === 0 ? 'white' : 'rgba(255,255,255,0.6)' }}>{doc.fileName}</div>
                      <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>
                        {idx === 0 ? 'Latest active version ' : 'Archived version '} 
                        ({new Date(doc.uploadedAt).toLocaleDateString()})
                      </p>
                    </div>
                  </div>
                )) : (
                  <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', padding: '12px 0' }}>No resume uploaded yet. Upload one below to track versions.</div>
                )}
              </div>

              <input 
                type="file" 
                ref={fileInputRef} 
                style={{ display: 'none' }} 
                onChange={handleUploadNewResume} 
                accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
              />
              <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} onClick={() => fileInputRef.current?.click()}>
                <UploadCloud size={14} className="inline mr-2" /> Upload New Version
              </button>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Portfolio Overview Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '28px' }}>
            {[
              { label: 'Portfolio Health', value: `${healthScore}`, unit: '/100', color: healthLabel.color, icon: <Activity size={18} /> },
              { label: 'Funding Pipeline', value: portfolioStats.potentialValue, unit: '', color: '#10b981', icon: <Target size={18} /> },
              { label: 'Active Applications', value: `${activeAppsCount}`, unit: '', color: '#6366f1', icon: <Briefcase size={18} /> },
              { label: 'Success Rate', value: dynamicSuccessRate, unit: '', color: '#8b5cf6', icon: <ShieldCheck size={18} /> },
            ].map(metric => (
              <div key={metric.label} className="card" style={{ padding: '20px', textAlign: 'center' }}>
                <div style={{ fontSize: '24px', marginBottom: '8px', display: 'flex', justifyContent: 'center', color: metric.color }}>{metric.icon}</div>
                <div style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '28px', fontWeight: 900, color: metric.color, lineHeight: 1 }}>
                  {metric.value}<span style={{ fontSize: '14px', fontWeight: 500, color: 'rgba(255,255,255,0.4)' }}>{metric.unit}</span>
                </div>
                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginTop: '6px' }}>{metric.label}</div>
              </div>
            ))}
          </div>

          {/* Status Distribution */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '24px', marginBottom: '28px' }}>
            <div className="card" style={{ padding: '24px' }}>
              <h2 style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '16px', fontWeight: 700, color: 'white', marginBottom: '20px' }}>
                Application Status Overview
              </h2>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                {Object.entries(portfolioStats)
                  .filter(([key]) => !['total', 'potentialValue'].includes(key))
                  .map(([status, count]) => {
                    const style = STATUS_STYLES[status] || STATUS_STYLES.wishlist;
                    const width = portfolioStats.total > 0 ? ((count as number) / portfolioStats.total) * 100 : 0;
                    return (
                      <div
                        key={status}
                        style={{ height: '8px', borderRadius: '4px', background: style.color, width: `${width}%`, minWidth: '4px', transition: 'width 1s ease' }}
                        title={`${style.label}: ${count}`}
                      />
                    );
                  })}
              </div>
              <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                {Object.entries(portfolioStats)
                  .filter(([key]) => !['total', 'potentialValue'].includes(key))
                  .map(([status, count]) => {
                    const style = STATUS_STYLES[status] || STATUS_STYLES.wishlist;
                    return (
                      <div key={status} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: style.color }} />
                        <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)' }}>{style.label}</span>
                        <span style={{ fontSize: '12px', fontWeight: 700, color: 'white' }}>{count as number}</span>
                      </div>
                    );
                  })}
              </div>
            </div>

            <div className="card" style={{ padding: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div style={{ fontSize: '12px', fontWeight: 700, color: 'rgba(255,255,255,0.4)', letterSpacing: '1px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Brain size={14} className="text-indigo-400" /> PORTFOLIO AI INSIGHTS
                </div>
                {portfolioAi && !isAiLoading && (
                  <button
                    onClick={handleRunPortfolioAi}
                    className="btn btn-secondary btn-sm"
                    style={{ fontSize: '10px', padding: '4px 10px' }}
                  >
                    Re-analyze 🔄
                  </button>
                )}
              </div>
              
              {isAiLoading ? (
                <div style={{ padding: '24px 12px', textAlign: 'center' }}>
                  <div style={{ display: 'inline-block', width: '24px', height: '24px', border: '3px solid rgba(99,102,241,0.2)', borderTopColor: '#6366f1', borderRadius: '50%', animation: 'spin 1s linear infinite', marginBottom: '12px' }} />
                  <div style={{ color: '#818cf8', fontSize: '13px', fontWeight: 700 }}>AI Portfolio Agent Executing...</div>
                  <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px', marginTop: '4px' }}>Analyzing target alignment, risk factors & portfolio health</div>
                </div>
              ) : portfolioAi ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {portfolioAi.riskLevel && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', background: 'rgba(255,255,255,0.03)', padding: '8px 12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)' }}>
                      <span style={{ color: 'rgba(255,255,255,0.5)' }}>Portfolio Risk Assessment:</span>
                      <span style={{
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        color: portfolioAi.riskLevel === 'low' ? '#10b981' : portfolioAi.riskLevel === 'medium' ? '#f59e0b' : '#ef4444'
                      }}>
                        {portfolioAi.riskLevel} Risk
                      </span>
                    </div>
                  )}
                  <div
                    style={{
                      padding: '14px',
                      borderRadius: '12px',
                      background: 'rgba(16,185,129,0.08)',
                      border: '1px solid rgba(16,185,129,0.25)',
                      textAlign: 'left',
                    }}
                  >
                    <div style={{ fontSize: '12px', color: '#10b981', fontWeight: 700, marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Sparkles size={12} /> Strategic Portfolio Analysis
                    </div>
                    <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)', lineHeight: 1.5, margin: 0 }}>
                      {portfolioAi.analysis || (typeof portfolioAi === 'string' ? portfolioAi : 'Active portfolio analysis ready.')}
                    </p>
                  </div>
                  {portfolioAi.recommendations && portfolioAi.recommendations.length > 0 && (
                    <div
                      style={{
                        padding: '14px',
                        borderRadius: '12px',
                        background: 'rgba(245,158,11,0.08)',
                        border: '1px solid rgba(245,158,11,0.25)',
                        textAlign: 'left',
                      }}
                    >
                      <div style={{ fontSize: '12px', color: '#f59e0b', fontWeight: 700, marginBottom: '6px' }}>
                        ⚠️ Strategic Recommendations
                      </div>
                      <ul style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)', lineHeight: 1.5, margin: 0, paddingLeft: '16px' }}>
                        {portfolioAi.recommendations?.map((r: string, i: number) => (
                          <li key={i} style={{ marginBottom: '4px' }}>{r}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ padding: '24px 16px', textAlign: 'center', background: 'rgba(99,102,241,0.03)', borderRadius: '12px', border: '1px dashed rgba(99,102,241,0.2)' }}>
                  <Brain size={28} className="text-indigo-400 mx-auto mb-2" />
                  <div style={{ fontSize: '13px', fontWeight: 700, color: 'white', marginBottom: '4px' }}>Analyze Your Portfolio</div>
                  <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginBottom: '16px', lineHeight: 1.4 }}>
                    Run the AI Portfolio Agent to get personalized risk assessment, strategic recommendations, and Monte Carlo probability evaluations for your target applications.
                  </p>
                  <button
                    onClick={handleRunPortfolioAi}
                    className="btn btn-primary"
                    style={{ padding: '10px 18px', fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                  >
                    <Sparkles size={14} /> Run AI Portfolio Analysis
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Portfolio Items Table */}
          <div className="card" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <h2 style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '16px', fontWeight: 700, color: 'white' }}>
                All Applications ({apps.length})
              </h2>
              <Link href="/dashboard/opportunities" className="btn btn-primary btn-sm">
                + Add Opportunity
              </Link>
            </div>

            {apps.length === 0 ? (
              <div className="card-magnetic glow-border page-transition" style={{ padding: '48px 24px', textAlign: 'center', background: 'linear-gradient(180deg, rgba(255,255,255,0.02) 0%, rgba(99,102,241,0.05) 100%)', borderRadius: '16px' }}>
                <div style={{ fontSize: '48px', marginBottom: '16px', animation: 'float 3s ease-in-out infinite' }}>📂</div>
                <h3 style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '20px', fontWeight: 800, color: 'white', marginBottom: '8px' }}>
                  Your Application Portfolio is Empty
                </h3>
                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '14px', maxWidth: '400px', margin: '0 auto 24px', lineHeight: 1.6 }}>
                  You haven't added any targets yet. The AI Discovery Engine has already found high-probability matches for your DNA.
                </p>
                <Link href="/dashboard/opportunities" className="btn btn-primary" style={{ display: 'inline-flex', padding: '12px 24px', fontSize: '14px' }}>
                  🔭 Discover Target Opportunities
                </Link>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      {['Opportunity', 'Status', 'Applied', 'Value', 'Probability', 'Action'].map(col => (
                        <th
                          key={col}
                          style={{
                            textAlign: 'left',
                            padding: '10px 12px',
                            fontSize: '11px',
                            fontWeight: 700,
                            color: 'rgba(255,255,255,0.35)',
                            letterSpacing: '1px',
                            borderBottom: '1px solid rgba(255,255,255,0.06)',
                          }}
                        >
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {apps.map(item => {
                      const itemAny = item as any;
                      const opp = SEED_OPPORTUNITIES.find(o => o.id === item.id);
                      const title = itemAny.title || opp?.title || 'Target Application';
                      const provider = itemAny.provider || opp?.provider || 'Global Program';
                      const statusStyle = STATUS_STYLES[item.stage || 'wishlist'] || STATUS_STYLES.draft;
                      const probColor = getProbabilityColor(item.matchScore || 50);

                      return (
                        <tr key={item.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                          <td style={{ padding: '14px 12px' }}>
                            <div style={{ fontSize: '13px', fontWeight: 600, color: 'white' }}>{title}</div>
                            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>{provider}</div>
                          </td>
                          <td style={{ padding: '14px 12px' }}>
                            <span
                              className="badge"
                              style={{
                                background: statusStyle.bg,
                                color: statusStyle.color,
                                border: `1px solid ${statusStyle.color}30`,
                                textTransform: 'capitalize',
                              }}
                            >
                              {statusStyle.label}
                            </span>
                          </td>
                          <td style={{ padding: '14px 12px', fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>
                            {itemAny.submittedAt || itemAny.createdAt || '—'}
                          </td>
                          <td style={{ padding: '14px 12px', fontSize: '12px', color: '#10b981', fontWeight: 600 }}>
                            {opp ? ((opp.fundingLevel || '').split('+')[0] || 'Fully Funded').trim() : '$25,000 Est.'}
                          </td>
                          <td style={{ padding: '14px 12px' }}>
                            <span style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '16px', fontWeight: 800, color: probColor }}>
                              {item.matchScore > 0 ? `${item.matchScore}%` : '50%'}
                            </span>
                          </td>
                          <td style={{ padding: '14px 12px' }}>
                            <Link
                              href={`/dashboard/opportunities/${item.id}/workspace`}
                              style={{ fontSize: '12px', color: '#818cf8', textDecoration: 'none', fontWeight: 600 }}
                            >
                              View →
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
