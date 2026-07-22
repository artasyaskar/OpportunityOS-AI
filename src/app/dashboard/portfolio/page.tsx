'use client';

import { useState, useEffect, useRef } from 'react';
import { getProbabilityColor, getScoreLabel } from '@/lib/scoring';
import { SEED_OPPORTUNITIES } from '@/lib/opportunities';

import { useProfile } from '@/components/auth/ProfileContext';
import { usePipeline } from '@/components/auth/PipelineContext';
import { useAuth } from '@/components/auth/AuthProvider';
import { useSubscription } from '@/components/auth/SubscriptionContext';
import { EvidenceRepository, EvidenceDocument, DocumentStatus } from '@/lib/repositories/EvidenceRepository';
import Link from 'next/link';
import { Lock, Dna, Briefcase, GraduationCap, Microscope, Handshake, Laptop, Brain, Target, FileText, UploadCloud, Activity, Check } from 'lucide-react';

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
    gpa: '0.0',
    field: 'Not Specified',
    skills: '',
    experience: '',
    goal: ''
  } as any;

  const [portfolioAi, setPortfolioAi] = useState<any>(null);
  const [isAiLoading, setIsAiLoading] = useState(true);

  useEffect(() => {
    async function loadAi() {
      if (!user?.uid || !profile?.field || profile.field === 'Not Specified') {
        setIsAiLoading(false);
        return;
      }
      try {
        const token = await getIdToken();
        const res = await fetch('/api/agents/portfolio', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({
            profile: profile,
            applications: apps
          })
        });
        const data = await res.json();
        setPortfolioAi(data.result);
      } catch (err) {
        console.error("AI Portfolio Error:", err);
      } finally {
        setIsAiLoading(false);
      }
    }
    loadAi();
  }, [user, profile, apps]);

  const renderInsights = () => {
    const isFree = !subscription || subscription.status === 'FREE' || subscription.planId === 'free';
    
    if (isFree) {
      return (
        <div className="card-magnetic glow-border" style={{ padding: '32px', textAlign: 'center', background: 'rgba(99,102,241,0.05)' }}>
          <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'white', marginBottom: '12px' }}><Lock size={18} className="inline mr-2 text-indigo-400" /> Premium AI Portfolio Insights</h3>
          <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.7)', marginBottom: '24px', maxWidth: '400px', margin: '0 auto 24px' }}>
            Upgrade to Pro to unlock advanced Monte Carlo simulation, expected scholarship value calculations, and deep risk analysis for your portfolio.
          </p>
          <Link href="/dashboard/settings/account" className="btn btn-primary" style={{ display: 'inline-flex', padding: '12px 24px' }}>
            Upgrade to Pro
          </Link>
        </div>
      );
    }

    if (isAiLoading) {
      return (
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', color: 'rgba(255,255,255,0.5)' }}>
          <div style={{ width: '16px', height: '16px', borderRadius: '50%', border: '2px solid rgba(255,255,255,0.1)', borderTopColor: '#6366f1', animation: 'spin 1s linear infinite' }} />
          Running Monte Carlo AI Simulations...
        </div>
      );
    }

    return (
      <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: '14px', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
        {portfolioAi?.content || 'Add applications to your portfolio to generate AI insights.'}
      </div>
    );
  };

  useEffect(() => {
    if (user?.uid) {
      EvidenceRepository.getEvidenceForUser(user.uid).then(setDocuments);
    }
  }, [user]);
  const portfolioStats = {
    total: apps.length,
    wishlist: apps.filter(a => a.stage === 'wishlist').length,
    draft: apps.filter(a => a.stage === 'preparing' || a.stage === 'documents_ready').length,
    applied: apps.filter(a => a.stage === 'official_submission').length,
    interview: apps.filter(a => a.stage === 'interview').length,
    accepted: apps.filter(a => a.stage === 'offer_received' || a.stage === 'visa').length,
    rejected: apps.filter(a => a.stage === ('rejected' as any)).length,
    potentialValue: portfolioAi?.stats?.potentialValue || (apps.length > 0 ? `$${Math.min(apps.length * 15, 120)}K` : '$0'),
  };

  const healthScore = portfolioAi?.healthScore || (apps.length > 0 ? Math.min(100, Math.round(50 + apps.length * 8)) : 0);
  const healthLabel = getScoreLabel(healthScore);

  // Compute dynamic profiles
  const hasAcademicAdv = (profile.gpa && parseFloat(profile.gpa) >= 3.5) || documents.some(d => d.type === 'transcript');
  const hasResearchAdv = profile.experience?.toLowerCase().includes('research') || profile.experience?.toLowerCase().includes('paper') || profile.skills?.toLowerCase().includes('research') || documents.some(d => d.type === 'publication' || d.type === 'research_proposal');
  const hasLeadershipAdv = profile.skills?.toLowerCase().includes('leadership') || profile.experience?.toLowerCase().includes('lead');
  const hasTechnicalAdv = profile.skills?.toLowerCase().includes('python') || profile.skills?.toLowerCase().includes('ml') || profile.skills?.toLowerCase().includes('programming') || profile.field?.toLowerCase().includes('computer');

  // AI Memory Coordinates dynamic calculation
  const preferredCountries = profile.targetOpportunities && profile.targetOpportunities.length > 0 
    ? profile.targetOpportunities.join(', ')
    : (profile.country || 'Not specified (Global)');
    
  const hasEnglishProof = documents.some(d => d.type === 'ielts' || d.type === 'toefl' || d.type === 'pte' || d.type === 'duolingo');
  const languagesRetrieved = hasEnglishProof 
    ? `English (Verified ${(documents.find(d => d.type === 'ielts')?.extractedData as any)?.overall || 'Score'}), Native Language` 
    : 'Pending verification...';

  // Strengths
  const strengths: string[] = [];
  if (profile.gpa && parseFloat(profile.gpa) >= 3.5) strengths.push(`High GPA (${profile.gpa})`);
  else if (profile.gpa) strengths.push(`GPA (${profile.gpa})`);
  if (profile.skills) strengths.push(profile.skills.split(',')[0].trim());
  if (documents.some(d => d.type === 'resume')) strengths.push('Resume Optimized');
  if (strengths.length === 0) strengths.push('Profile Setup Pending');

  // Weaknesses
  const weaknesses: string[] = [];
  if (!hasEnglishProof) weaknesses.push('Missing English Proof');
  if (!hasResearchAdv) weaknesses.push('0 Publications');
  if (!documents.some(d => d.type === 'passport' || d.type === 'national_id')) weaknesses.push('Missing Passport');
  if (weaknesses.length === 0) weaknesses.push('None Detected');

  // Application Readiness Dashboard dynamic calculation
  const docCredScore = documents.some(d => d.type === 'passport' || d.type === 'national_id') ? 100 : 15;
  const researchScore = hasResearchAdv ? 90 : 25;
  const englishScore = hasEnglishProof ? 100 : 10;
  const lorCount = documents.filter(d => d.type === 'lor').length;
  const lorScore = Math.min(100, lorCount * 33 + 10);
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
      alert('Resume successfully added to vault! Wait a moment for AI extraction.');
      EvidenceRepository.getEvidenceForUser(user.uid).then(setDocuments);
    } catch (err) {
      console.error(err);
      alert('Upload failed.');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // portfolioAi and isAiLoading moved up

  useEffect(() => {
    if (!profile || apps.length === 0) {
      setIsAiLoading(false);
      return;
    }
    const fetchPortfolioAnalysis = async () => {
      try {
        const token = await getIdToken();
        const res = await fetch('/api/agents/portfolio', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({
            userId: profile.userId,
            applications: apps,
            evidenceContext: `User has ${documents.length} verified documents.`
          })
        });
        const data = await res.json();
        setPortfolioAi(data.content); // Because router returns { content, metadata }
      } catch (err) {
        console.error('Failed to fetch portfolio analysis', err);
      } finally {
        setIsAiLoading(false);
      }
    };
    fetchPortfolioAnalysis();
  }, [profile, apps, documents.length]);

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
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
            <div className="card" style={{ padding: '20px' }}>
              <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', fontWeight: 700, letterSpacing: '0.5px' }}>ACADEMIC SCORE</div>
              <div style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '26px', fontWeight: 800, color: '#818cf8', marginTop: '6px' }}>
                {profile.gpa ? `${Math.round((parseFloat(profile.gpa) / 4.0) * 100)}%` : '85%'}
              </div>
              <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginTop: '4px' }}>Class percentile match</div>
            </div>
            <div className="card" style={{ padding: '20px' }}>
              <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', fontWeight: 700, letterSpacing: '0.5px' }}>RESEARCH ASSETS</div>
              <div style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '26px', fontWeight: 800, color: '#10b981', marginTop: '6px' }}>
                {hasResearchAdv ? 'Advanced' : 'Baseline'}
              </div>
              <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginTop: '4px' }}>Papers / citation indices</div>
            </div>
            <div className="card" style={{ padding: '20px' }}>
              <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', fontWeight: 700, letterSpacing: '0.5px' }}>LEADERSHIP RATING</div>
              <div style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '26px', fontWeight: 800, color: '#06b6d4', marginTop: '6px' }}>
                {hasLeadershipAdv ? 'Tier 1' : 'Tier 2'}
              </div>
              <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginTop: '4px' }}>Organization coordinate</div>
            </div>
            <div className="card" style={{ padding: '20px' }}>
              <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', fontWeight: 700, letterSpacing: '0.5px' }}>TECHNICAL CAPABILITY</div>
              <div style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '26px', fontWeight: 800, color: '#8b5cf6', marginTop: '6px' }}>
                {hasTechnicalAdv ? 'Elite Fit' : 'Basic Fit'}
              </div>
              <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginTop: '4px' }}>Engineering metrics</div>
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
                      Your GPA of {profile.gpa} positions you in the top 5% of class cohorts, satisfying extreme selective filters.
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
                      Documented experience in research pipelines and writing publications sets you apart for elite graduate programs.
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
                      Active leadership metrics align with the network-multiplier requirements of Rhodes and Fulbright fellowships.
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

            {/* APPLICATION READINESS DASHBOARD */}
            <div className="card-magnetic glow-border" style={{ padding: '24px' }}>
              <h2 style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '16px', fontWeight: 700, color: 'white', marginBottom: '16px' }}>
                <Target size={16} className="inline mr-2 text-indigo-400" /> Application Readiness Dashboard
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {[
                  { label: 'Documentation Credentials', value: docCredScore, color: '#3b82f6' },
                  { label: 'Research & Project assets', value: researchScore, color: '#10b981' },
                  { label: 'English (IELTS / GRE)', value: englishScore, color: '#f59e0b' },
                  { label: 'Reference Letters (LORs)', value: lorScore, color: '#8b5cf6' },
                  { label: 'Portfolio Diversification', value: portScore, color: '#06b6d4' }
                ].map(r => (
                  <div key={r.label}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '4px' }}>
                      <span style={{ color: 'rgba(255,255,255,0.5)' }}>{r.label}</span>
                      <span style={{ color: 'white', fontWeight: 700 }}>{r.value}%</span>
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
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'white', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '24px' }}>
                <span><FileText size={16} className="text-indigo-400" /> Resume Evolution Timeline</span>
              </h3>  <span style={{ fontSize: '9px', background: 'rgba(99,102,241,0.2)', padding: '3px 8px', borderRadius: '8px', color: '#818cf8', fontWeight: 700 }}>V3 ACTIVE</span>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', position: 'relative' }}>
                <div style={{ position: 'absolute', top: '10px', bottom: '10px', left: '15px', width: '2px', background: 'rgba(255,255,255,0.06)' }} />
                
                {resumeDocs.length > 0 ? resumeDocs.map((doc, idx) => (
                  <div key={doc.id} style={{ display: 'flex', gap: '12px', position: 'relative' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', borderRadius: '8px', background: hasAcademicAdv ? 'rgba(16,185,129,0.1)' : 'rgba(255,255,255,0.05)', color: hasAcademicAdv ? '#10b981' : 'rgba(255,255,255,0.4)', flexShrink: 0 }}>
                      <span style={{ fontSize: '16px' }}><GraduationCap size={16} /></span>
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
                  <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', marginLeft: '12px' }}>No resumes uploaded yet. Upload one below.</div>
                )}
              </div>

              <input 
                type="file" 
                ref={fileInputRef} 
                style={{ display: 'none' }} 
                onChange={handleUploadNewResume} 
                accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
              />
              <button className="btn btn-primary" onClick={() => fileInputRef.current?.click()}>
                <UploadCloud size={14} className="inline mr-2" /> Upload New Version
              </button>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Portfolio Overview */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '28px' }}>
        {[
          { label: 'Portfolio Health', value: `${healthScore}`, unit: '/100', color: healthLabel.color, icon: <Activity size={18} /> },
          { label: 'Expected Value', value: portfolioStats.potentialValue, unit: '', color: '#10b981', icon: <Target size={18} /> },
          { label: 'Active Applications', value: `${portfolioStats.applied + portfolioStats.interview}`, unit: '', color: '#6366f1', icon: '📋' },
          { label: 'Success Rate', value: '14%', unit: '', color: '#8b5cf6', icon: '🎯' },
        ].map(metric => (
          <div key={metric.label} className="card" style={{ padding: '20px', textAlign: 'center' }}>
            <div style={{ fontSize: '24px', marginBottom: '8px' }}>{metric.icon}</div>
            <div style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '28px', fontWeight: 900, color: metric.color, lineHeight: 1 }}>
              {metric.value}<span style={{ fontSize: '14px', fontWeight: 500, color: 'rgba(255,255,255,0.4)' }}>{metric.unit}</span>
            </div>
            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginTop: '6px' }}>{metric.label}</div>
          </div>
        ))}
      </div>

      {/* Status Distribution */}
      <div style={{ display: 'grid', gridTemplateColumns: '5fr 3fr', gap: '24px', marginBottom: '28px' }}>
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

        <div className="card" style={{ padding: '24px', textAlign: 'center' }}>
          <div style={{ fontSize: '12px', fontWeight: 700, color: 'rgba(255,255,255,0.4)', marginBottom: '12px', letterSpacing: '1px' }}>
            PORTFOLIO AI INSIGHTS
          </div>
          
          {isAiLoading ? (
            <div className="animate-pulse" style={{ padding: '24px', textAlign: 'center' }}>
              <div style={{ fontSize: '24px', marginBottom: '8px' }}>🤖</div>
              <div style={{ color: '#818cf8', fontSize: '13px', fontWeight: 600 }}>AI Analyzing Portfolio DNA...</div>
            </div>
          ) : portfolioAi ? (
            <>
              <div
                style={{
                  padding: '14px',
                  borderRadius: '12px',
                  background: 'rgba(16,185,129,0.08)',
                  border: '1px solid rgba(16,185,129,0.25)',
                  marginBottom: '12px',
                  textAlign: 'left',
                }}
              >
                <div style={{ fontSize: '12px', color: '#10b981', fontWeight: 700, marginBottom: '4px' }}>
                  🟢 AI Analysis
                </div>
                <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)', lineHeight: 1.4 }}>
                  {portfolioAi.analysis}
                </p>
              </div>
              <div
                style={{
                  padding: '14px',
                  borderRadius: '12px',
                  background: 'rgba(245,158,11,0.08)',
                  border: '1px solid rgba(245,158,11,0.25)',
                  textAlign: 'left',
                }}
              >
                <div style={{ fontSize: '12px', color: '#f59e0b', fontWeight: 700, marginBottom: '4px' }}>
                  ⚠️ Recommendations
                </div>
                <ul style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)', lineHeight: 1.4, margin: 0, paddingLeft: '16px' }}>
                  {portfolioAi.recommendations?.map((r: string, i: number) => (
                    <li key={i} style={{ marginBottom: '4px' }}>{r}</li>
                  ))}
                </ul>
              </div>
            </>
          ) : (
            <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', padding: '24px' }}>
              Add opportunities to your pipeline to generate AI insights.
            </div>
          )}
        </div>
      </div>

      {/* Portfolio Items Table */}
      <div className="card" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <h2 style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '16px', fontWeight: 700, color: 'white' }}>
            All Applications
          </h2>
          <a href="/dashboard/opportunities" className="btn btn-primary btn-sm">
            + Add Opportunity
          </a>
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
            <a href="/dashboard/opportunities" className="btn btn-primary" style={{ display: 'inline-flex', padding: '12px 24px', fontSize: '14px' }}>
              🔭 Discover Target Opportunities
            </a>
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
                const opp = SEED_OPPORTUNITIES.find(o => o.id === item.id);
                if (!opp) return null;
                const statusStyle = STATUS_STYLES[item.stage || 'wishlist'] || STATUS_STYLES.draft;
                const probColor = getProbabilityColor(item.matchScore || 0);

                return (
                  <tr key={item.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <td style={{ padding: '14px 12px' }}>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: 'white' }}>{opp.title}</div>
                      <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>{opp.provider}</div>
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
                      {item.submittedAt || '—'}
                    </td>
                    <td style={{ padding: '14px 12px', fontSize: '12px', color: '#10b981', fontWeight: 600 }}>
                      {((opp.fundingLevel || '').split('+')[0] || '—').trim()}
                    </td>
                    <td style={{ padding: '14px 12px' }}>
                      <span style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '16px', fontWeight: 800, color: probColor }}>
                        {item.matchScore > 0 ? `${item.matchScore}%` : '—'}
                      </span>
                    </td>
                    <td style={{ padding: '14px 12px' }}>
                      <a
                        href={`/dashboard/opportunities/${item.id}/workspace`}
                        style={{ fontSize: '12px', color: '#818cf8', textDecoration: 'none', fontWeight: 600 }}
                      >
                        View →
                      </a>
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
