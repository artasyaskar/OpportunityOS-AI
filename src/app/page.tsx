'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import Navbar from '@/components/layout/Navbar';
import { useScrollReveal } from '@/hooks/useScrollReveal';
import Image from 'next/image';
import { useAuth } from '@/components/auth/AuthProvider';
import { useProfile } from '@/components/auth/ProfileContext';
import WalkthroughModal from '@/components/layout/WalkthroughModal';
import { OpportunityRepository } from '@/lib/repositories/OpportunityRepository';
import { Opportunity } from '@/lib/gemini';
import { GLOBAL_OPPORTUNITIES, getCategoryCounts } from '@/lib/opportunities-data';
import AnimatedCounter from '@/components/ui/AnimatedCounter';
import LiveAgentFeed from '@/components/ui/LiveAgentFeed';
import { agentIcons, opportunityTypeIcon } from '@/lib/uiIcons';
import { Rocket, ArrowRight, PlayCircle, UserRound, Bot, Trophy, X, Check, Target, Network, TrendingUp, Cpu, FileText, ArrowDown, Building2, Globe2, Clock, MessageSquareQuote, MessageCircle } from 'lucide-react';

const ThreeScene = dynamic(() => import('@/components/3d/ThreeScene'), {
  ssr: false,
  loading: () => (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        zIndex: -1,
        background: 'radial-gradient(ellipse at 50% 30%, #1e1b4b 0%, #020408 60%)',
      }}
    />
  )
});

const AGENTS: { id: string; name: string; desc: string }[] = [
  { id: 'discovery', name: 'Discovery Agent', desc: 'Scans 10,000+ opportunities globally' },
  { id: 'probability', name: 'Probability Engine', desc: 'Predicts your success probability' },
  { id: 'eligibility', name: 'Eligibility Agent', desc: 'Matches you to qualified opportunities' },
  { id: 'gap-analysis', name: 'Gap Analysis Agent', desc: 'Identifies exactly what you\'re missing' },
  { id: 'strategist', name: 'Strategist Agent', desc: 'Tells you when and what to apply for' },
  { id: 'builder', name: 'Application Builder', desc: 'Generates SOPs, essays, cover letters' },
  { id: 'reviewer', name: 'Review Agent', desc: 'Scores and improves your submissions' },
  { id: 'compliance', name: 'Compliance Agent', desc: 'Verifies every requirement is met' },
  { id: 'planner', name: 'Planner Agent', desc: 'Creates your day-by-day timeline' },
  { id: 'rejection', name: 'Rejection Learner', desc: 'Turns rejections into future wins' },
  { id: 'portfolio', name: 'Portfolio Agent', desc: 'Manages your opportunity portfolio' },
  { id: 'readiness', name: 'Readiness Agent', desc: 'Scores your application readiness' },
];

const STATS = [
  { value: '100,000+', label: 'Indexed Opportunities' },
  { value: 'AI', label: 'Powered Scoring' },
  { value: 'Real-time', label: 'Probability Updates' },
  { value: '1', label: 'Unified AI Executive' },
];

const OPPORTUNITY_TYPES_METADATA = [
  { type: 'Scholarships', id: 'scholarship', color: '#6366f1' },
  { type: 'Fellowships', id: 'fellowship', color: '#8b5cf6' },
  { type: 'Grants', id: 'grant', color: '#06b6d4' },
  { type: 'Jobs & Internships', id: 'job', color: '#10b981' },
  { type: 'Hackathons', id: 'hackathon', color: '#ec4899' },
  { type: 'Accelerators', id: 'accelerator', color: '#f59e0b' },
];

const PRICING_PLANS = [
  {
    name: 'Free',
    price: '$0',
    period: 'forever',
    features: ['5 opportunities/month', 'Basic eligibility check', 'Opportunity Score', '1 essay draft'],
    cta: 'Start Free',
    href: '/signup',
    highlight: false,
  },
  {
    name: 'Professional Monthly',
    price: '$4.99',
    period: '/month',
    features: ['Unlimited opportunities', 'Full AI analysis (all 12 agents)', 'Unlimited essays', 'Priority support', 'Portfolio tracker'],
    cta: 'Start Pro Trial',
    href: '/signup?plan=pro',
    highlight: true,
    badge: 'Most Popular',
  },
  {
    name: 'Founder Lifetime',
    price: '$39',
    period: 'one-time',
    features: ['Everything in Pro', 'AI application assistance', '1-on-1 strategy session', 'Expert review included'],
    cta: 'Get Founder Lifetime',
    href: '/signup?plan=success',
    highlight: false,
  },
];

const TRUSTED_SOURCES = [
  'Google', 'Microsoft', 'NVIDIA', 'United Nations', 'NASA', 'DAAD', 'Erasmus+', 'Fulbright', 'ETHGlobal', 'Devpost', 'Y Combinator', 'Techstars'
];

const BETA_FEEDBACK = [
  {
    name: 'Khuram Iqbal',
    linkedin: 'https://www.linkedin.com/in/khuram-iqbal',
    role: 'Computer Science Student',
    quote: '"I found three scholarships I had never heard about. The AI Opportunity Match explanation was surprisingly useful."',
  },
  {
    name: 'Nayab Raza',
    linkedin: 'https://www.linkedin.com/in/nayab-raza-34873bab/',
    role: 'Chemistry PhD Scholar, Brazil',
    quote: '"OpportunityOS was incredibly helpful in my journey. The AI matching gave me the exact insights I needed to secure a fully funded PhD scholarship in Belgium!"',
  },
  {
    name: 'Professor Suneel Salamat',
    role: 'Faculty Mentor',
    quote: '"The evidence-based recommendations are much more convincing than a normal chatbot. It\'s a game changer for my students."',
  }
];

export default function Home() {
  const [agentIndex, setAgentIndex] = useState(0);
  const scrollRef = useScrollReveal();
  const [counter, setCounter] = useState({ ops: 0, acc: 0 });

  const [hasProfile, setHasProfile] = useState(false);
  const [profileName, setProfileName] = useState('');
  const [walkthroughOpen, setWalkthroughOpen] = useState(false);
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [termsOpen, setTermsOpen] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);

  // Live Data State
  const [totalOpportunities, setTotalOpportunities] = useState(0);
  const [totalFunding, setTotalFunding] = useState(0);
  const [countriesCovered, setCountriesCovered] = useState(0);
  const [totalOrganizations, setTotalOrganizations] = useState(0);
  const [categoryCounts, setCategoryCounts] = useState<Record<string, number>>({});
  const [liveOpps, setLiveOpps] = useState<Opportunity[]>([]);
  const [liveTickerIndex, setLiveTickerIndex] = useState(0);

  useEffect(() => {
    // For the landing page wow factor, we pull the rich local dataset to ensure 
    // lightning-fast load times and accurate counts without hitting the DB.
    const opps = GLOBAL_OPPORTUNITIES;

    setTotalOpportunities(opps.length);

    // Calculate real funding
    let funding = 0;
    const countries = new Set<string>();
    const organizations = new Set<string>();

    opps.forEach(opp => {
      if (opp.fundingAmount) funding += opp.fundingAmount;
      if (opp.country) countries.add(opp.country);
      if (opp.provider) organizations.add(opp.provider);
    });

    setTotalFunding(funding);
    setCountriesCovered(countries.size);
    setTotalOrganizations(organizations.size);

    // Get category counts
    setCategoryCounts(getCategoryCounts());

    // Sort by prestige or date (we just show top 10 for the ticker)
    setLiveOpps(opps.slice(0, 10));
  }, []);

  useEffect(() => {
    if (liveOpps.length > 0) {
      const interval = setInterval(() => {
        setLiveTickerIndex(i => (i + 1) % liveOpps.length);
      }, 4000);
      return () => clearInterval(interval);
    }
  }, [liveOpps]);

  useEffect(() => {
    const interval = setInterval(() => {
      setAgentIndex(i => (i + 1) % AGENTS.length);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setCounter({ ops: 50000, acc: 94 });
    }, 500);
    return () => clearInterval(timer);
  }, []);

  const { isAuthenticated, user } = useAuth();
  const { profile } = useProfile();

  useEffect(() => {
    if (isAuthenticated) {
      setHasProfile(true);
      setProfileName(profile?.name?.split(' ')[0] || user?.displayName?.split(' ')[0] || 'User');
    } else {
      setHasProfile(false);
      setProfileName('');
    }
  }, [isAuthenticated, user, profile]);

  return (
    <main ref={scrollRef} style={{ background: 'var(--bg-primary)', minHeight: '100vh', overflowX: 'hidden', position: 'relative', zIndex: 1 }}>
      <Navbar />

      {/* 3D Background - Viewport-wide fixed backdrop */}
      <ThreeScene />

      {/* ======================== HERO SECTION ======================== */}
      <section
        style={{
          position: 'relative',
          minHeight: 'auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          padding: '100px 24px 60px',
          zIndex: 10,
        }}
      >
        {/* Hero Content */}
        <div
          style={{
            position: 'relative',
            zIndex: 10,
            textAlign: 'center',
            maxWidth: '900px',
            padding: '0 24px',
            paddingTop: '16px',
          }}
        >
          {/* Main Headline */}
          <h1
            className="text-hero animate-slide-up delay-100"
            style={{ color: 'white', marginBottom: '16px' }}
          >
            Your AI Chief<br />
            <span className="gradient-text">Opportunity</span><br />
            Officer
          </h1>

          {/* Subheadline */}
          <p
            className="animate-slide-up delay-200"
            style={{
              fontSize: 'clamp(16px, 2.5vw, 22px)',
              color: 'rgba(255,255,255,0.6)',
              lineHeight: 1.6,
              maxWidth: '720px',
              margin: '0 auto 48px',
            }}
          >
            Discover opportunities. Predict success. Build winning applications. Let your AI Executive manage the chaos.
          </p>

          {/* CTAs */}
          <div
            className="animate-slide-up delay-300"
            style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexDirection: 'column', alignItems: 'center', width: '100%' }}
          >
            <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap', width: '100%' }}>
              {hasProfile ? (
                <Link href="/dashboard" className="btn btn-primary btn-lg" style={{ background: 'linear-gradient(135deg, #10b981, #059669)', border: '1px solid rgba(16,185,129,0.4)', flex: '1 1 auto', minWidth: 'min(100%, 250px)' }}>
                  Resume {profileName}'s Session
                  <ArrowRight size={18} aria-hidden="true" />
                </Link>
              ) : (
                <Link href="/signup" className="btn btn-primary btn-lg" style={{ flex: '1 1 auto', minWidth: 'min(100%, 250px)' }}>
                  <Rocket size={18} aria-hidden="true" />
                  Enter Mission Control
                </Link>
              )}
              <button
                onClick={() => setWalkthroughOpen(true)}
                className="btn btn-secondary btn-lg"
                style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.15), rgba(16,185,129,0.05))', border: '1px solid rgba(16,185,129,0.4)', color: '#10b981', display: 'flex', alignItems: 'center', gap: '8px', flex: '1 1 auto', minWidth: 'min(100%, 300px)', whiteSpace: 'normal', height: 'auto', padding: '12px 24px' }}
              >
                <PlayCircle size={18} aria-hidden="true" style={{ flexShrink: 0 }} />
                <span>Start Interactive Judge Walkthrough (4 min)</span>
              </button>
            </div>
          </div>

          {/* Live Agent Terminal Feed */}
          <div
            className="animate-slide-up delay-400"
            style={{ marginTop: '48px', display: 'flex', justifyContent: 'center' }}
          >
            <div style={{ maxWidth: '600px', width: '100%', textAlign: 'left' }}>
              <LiveAgentFeed />
            </div>
          </div>
        </div>

      </section>

      {/* ======================== STATS BAR ======================== */}
      <section
        className="reveal-on-scroll"
        style={{
          background: 'rgba(99,102,241,0.06)',
          borderTop: '1px solid rgba(99,102,241,0.15)',
          borderBottom: '1px solid rgba(99,102,241,0.15)',
          padding: '40px 24px',
          marginBottom: '5rem',
          position: 'relative',
          zIndex: 10,
        }}
      >
        <div className="page-container">
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
              gap: '24px',
              textAlign: 'center',
              marginBottom: '40px'
            }}
          >
            {[
              { component: <AnimatedCounter value={totalOpportunities} />, label: 'Verified Opportunities' },
              { component: <AnimatedCounter value={totalOrganizations} />, label: 'Organizations' },
              { component: <AnimatedCounter value={countriesCovered} />, label: 'Countries Covered' },
              { component: <AnimatedCounter value={Object.keys(categoryCounts).length} />, label: 'Opportunity Categories' },
              { component: '1.2s', label: 'Average AI Match Time' },
              { component: '12', label: 'Specialized AI Agents' },
            ].map(stat => (
              <div key={stat.label}>
                <div
                  className="gradient-text"
                  style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '32px', fontWeight: 800 }}
                >
                  {stat.component}
                </div>
                <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px', marginTop: '4px', fontWeight: 500 }}>
                  {stat.label}
                </div>
              </div>
            ))}
          </div>

          <div style={{ textAlign: 'center', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '32px' }}>
            <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '20px', fontWeight: 600 }}>
              Trusted Opportunity Sources
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '32px', opacity: 0.7 }}>
              {TRUSTED_SOURCES.map(source => (
                <div key={source} style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '18px', fontWeight: 700, color: '#fff' }}>
                  {source}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ======================== WHY OPPORTUNITYOS ======================== */}
      <section className="reveal-on-scroll" style={{ padding: '80px 24px', position: 'relative', zIndex: 10 }}>
        <div className="page-container">
          <div style={{ textAlign: 'center', marginBottom: '60px' }}>
            <div className="badge badge-emerald" style={{ marginBottom: '16px' }}>
              Why Users Choose OpportunityOS
            </div>
            <h2 className="text-section-title" style={{ color: 'white', marginBottom: '16px' }}>
              The <span className="gradient-text">Paradigm Shift</span> in Career Growth
            </h2>
          </div>

          <div className="grid-4" style={{ gap: '24px' }}>
            {[
              { title: 'Personalized Matching', desc: 'No generic search. Every single opportunity is ranked uniquely using your specific profile and background.', Icon: Target, color: '#10b981' },
              { title: 'Explainable AI', desc: 'Every recommendation shows exactly WHY it was suggested, giving you full transparency into the AI.', Icon: Cpu, color: '#6366f1' },
              { title: 'Daily Improvement', desc: 'The AI tells you exactly what you need to do today to increase your chances of winning tomorrow.', Icon: TrendingUp, color: '#f59e0b' },
              { title: 'AI Executive', desc: '12 specialized AI agents work tirelessly together on your behalf to manage your entire opportunity lifecycle.', Icon: Building2, color: '#8b5cf6' },
            ].map((feature, i) => (
              <div
                key={feature.title}
                className="card hover-lift"
                style={{
                  padding: '32px 24px',
                  border: '1px solid rgba(255,255,255,0.05)',
                  background: 'rgba(15,23,42,0.4)',
                  textAlign: 'left'
                }}
              >
                <div
                  style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '12px',
                    background: `${feature.color}15`,
                    border: `1px solid ${feature.color}30`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '20px'
                  }}
                >
                  <feature.Icon size={24} color={feature.color} aria-hidden="true" />
                </div>
                <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'white', marginBottom: '12px' }}>
                  {feature.title}
                </h3>
                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '14px', lineHeight: 1.6, margin: 0 }}>
                  {feature.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ======================== OPPORTUNITY TYPES ======================== */}
      <section id="features" className="reveal-on-scroll" style={{ padding: '80px 24px', position: 'relative', zIndex: 10 }}>
        <div className="page-container">
          <div style={{ textAlign: 'center', marginBottom: '60px' }}>
            <div className="badge badge-indigo" style={{ marginBottom: '16px' }}>
              What We Cover
            </div>
            <h2 className="text-section-title" style={{ color: 'white', marginBottom: '16px' }}>
              Every Opportunity,<br /><span className="gradient-text">One Platform</span>
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.5)', maxWidth: '520px', margin: '0 auto', fontSize: '16px' }}>
              From scholarships to accelerators — our AI discovers and prioritizes the right opportunities for you.
            </p>
          </div>

          <div className="grid-3">
            {OPPORTUNITY_TYPES_METADATA.map(opp => (
              <div
                key={opp.type}
                className="card hover-lift"
                style={{
                  textAlign: 'center',
                  padding: '32px 24px',
                  border: `1px solid ${opp.color}20`,
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.borderColor = `${opp.color}50`;
                  (e.currentTarget as HTMLElement).style.boxShadow = `0 0 30px ${opp.color}20`;
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.borderColor = `${opp.color}20`;
                  (e.currentTarget as HTMLElement).style.boxShadow = 'none';
                }}
              >
                {(() => {
                  const Icon = opportunityTypeIcon(opp.id);
                  return (
                    <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'center' }}>
                      <div style={{ width: '56px', height: '56px', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: `${opp.color}18`, border: `1px solid ${opp.color}33` }}>
                        <Icon size={26} color={opp.color} aria-hidden="true" />
                      </div>
                    </div>
                  );
                })()}
                <div style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '20px', fontWeight: 700, color: 'white', marginBottom: '8px' }}>
                  {opp.type}
                </div>
                <div style={{ fontSize: '28px', fontWeight: 800, color: opp.color, fontFamily: 'Space Grotesk, sans-serif' }}>
                  <AnimatedCounter value={
                    opp.type === 'Jobs & Internships'
                      ? (categoryCounts['Remote Jobs'] || 0) + (categoryCounts['Internships'] || 0)
                      : (categoryCounts[opp.type] || 0)
                  } />
                </div>
                <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', marginTop: '4px' }}>
                  curated opportunities
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ======================== 12 AGENTS SECTION ======================== */}
      <section id="agents" className="reveal-on-scroll" style={{ padding: '80px 24px', background: 'rgba(99,102,241,0.03)', position: 'relative', zIndex: 10 }}>
        <div className="page-container">
          <div style={{ textAlign: 'center', marginBottom: '60px' }}>
            <div className="badge badge-violet" style={{ marginBottom: '16px' }}>
              The AI Executive
            </div>
            <h2 className="text-section-title" style={{ color: 'white', marginBottom: '16px' }}>
              12 Invisible Experts.<br />
              <span className="gradient-text">One AI Persona.</span>
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.5)', maxWidth: '520px', margin: '0 auto', fontSize: '16px' }}>
              Your personal AI Chief Opportunity Officer quietly coordinates 12 specialized models behind the scenes.
            </p>
          </div>

          <div className="grid-4" style={{ gap: '16px' }}>
            {AGENTS.map((agent, i) => (
              <div
                key={agent.name}
                className="card card-magnetic glow-border"
                style={{ padding: '20px', position: 'relative', overflow: 'hidden' }}
              >
                <div
                  style={{
                    position: 'absolute',
                    top: '12px',
                    right: '12px',
                    fontSize: '10px',
                    fontWeight: 700,
                    color: 'rgba(99,102,241,0.6)',
                    fontFamily: 'Space Grotesk, sans-serif',
                  }}
                >
                  #{String(i + 1).padStart(2, '0')}
                </div>
                {(() => {
                  const Icon = agentIcons[agent.id] ?? Rocket;
                  return (
                    <div style={{ marginBottom: '12px', width: '40px', height: '40px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.25)' }}>
                      <Icon size={20} color="#a5b4fc" aria-hidden="true" />
                    </div>
                  );
                })()}
                <div style={{ fontSize: '13px', fontWeight: 700, color: 'white', marginBottom: '6px' }}>
                  {agent.name}
                </div>
                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.45)', lineHeight: 1.5 }}>
                  {agent.desc}
                </div>
                <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span className="agent-status-dot running" />
                  <span style={{ fontSize: '10px', color: 'rgba(6,182,212,0.8)', fontWeight: 500 }}>ACTIVE</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ======================== BETA FEEDBACK ======================== */}
      <section className="reveal-on-scroll" style={{ padding: '80px 24px', position: 'relative', zIndex: 10 }}>
        <div className="page-container">
          <div style={{ textAlign: 'center', marginBottom: '60px' }}>
            <div className="badge badge-indigo" style={{ marginBottom: '16px' }}>Early User Insights</div>
            <h2 className="text-section-title" style={{ color: 'white' }}>
              What Our <span className="gradient-text">Beta Testers</span> Say
            </h2>
          </div>

          <div className="grid-3" style={{ gap: '24px' }}>
            {BETA_FEEDBACK.map((feedback, i) => (
              <div
                key={i}
                className="card hover-lift"
                style={{
                  padding: '32px 24px',
                  background: 'rgba(15,23,42,0.6)',
                  border: '1px solid rgba(255,255,255,0.05)',
                  position: 'relative'
                }}
              >
                <div style={{ position: 'absolute', top: '24px', right: '24px', opacity: 0.2 }}>
                  <MessageSquareQuote size={32} color="#8b5cf6" />
                </div>
                <div style={{ marginBottom: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {feedback.linkedin && (
                      <a href={feedback.linkedin} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', color: '#0a66c2', transition: 'opacity 0.2s', opacity: 0.8 }} onMouseOver={e => e.currentTarget.style.opacity = '1'} onMouseOut={e => e.currentTarget.style.opacity = '0.8'}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
                        </svg>
                      </a>
                    )}
                    <div style={{ fontSize: '16px', fontWeight: 700, color: 'white' }}>{feedback.name}</div>
                  </div>
                  <div style={{ fontSize: '13px', color: '#10b981', fontWeight: 500 }}>{feedback.role}</div>
                </div>
                <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '15px', lineHeight: 1.6, margin: 0, fontStyle: 'italic' }}>
                  {feedback.quote}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ======================== PRICING ======================== */}
      <section id="pricing" className="reveal-on-scroll" style={{ padding: '80px 24px', background: 'rgba(99,102,241,0.03)', position: 'relative', zIndex: 10 }}>
        <div className="page-container">
          <div style={{ textAlign: 'center', marginBottom: '60px' }}>
            <div className="badge badge-emerald" style={{ marginBottom: '16px' }}>Pricing</div>
            <h2 className="text-section-title" style={{ color: 'white' }}>
              Invest in Your <span className="gradient-text">Future</span>
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.5)', maxWidth: '400px', margin: '16px auto 0', fontSize: '16px' }}>
              One scholarship can pay for years of Pro. The ROI is infinite.
            </p>
          </div>

          <div
            className="grid-3"
            style={{
              maxWidth: '900px',
              margin: '0 auto',
            }}
          >
            {PRICING_PLANS.map(plan => (
              <div
                key={plan.name}
                className="hover-lift"
                style={{
                  background: plan.highlight
                    ? 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(139,92,246,0.1))'
                    : 'var(--glass-bg)',
                  border: plan.highlight ? '1px solid rgba(99,102,241,0.4)' : '1px solid var(--glass-border)',
                  borderRadius: '20px',
                  padding: '32px',
                  position: 'relative',
                  transform: plan.highlight ? 'scale(1.03)' : 'scale(1)',
                  boxShadow: plan.highlight ? '0 0 40px rgba(99,102,241,0.2)' : 'none',
                  transition: 'all 0.3s ease',
                }}
              >
                {plan.badge && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '-12px',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                      borderRadius: '999px',
                      padding: '4px 16px',
                      fontSize: '11px',
                      fontWeight: 700,
                      color: 'white',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {plan.badge}
                  </div>
                )}
                <div style={{ fontFamily: 'Space Grotesk, sans-serif', fontWeight: 700, fontSize: '20px', color: 'white', marginBottom: '8px' }}>
                  {plan.name}
                </div>
                <div style={{ marginBottom: '24px' }}>
                  <span className="gradient-text" style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '40px', fontWeight: 900 }}>
                    {plan.price}
                  </span>
                  <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '14px', marginLeft: '4px' }}>
                    {plan.period}
                  </span>
                </div>
                <div style={{ marginBottom: '28px' }}>
                  {plan.features.map(feat => (
                    <div
                      key={feat}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        padding: '8px 0',
                        borderBottom: '1px solid rgba(255,255,255,0.05)',
                        fontSize: '13px',
                        color: 'rgba(255,255,255,0.7)',
                      }}
                    >
                      <Check size={15} color="#10b981" aria-hidden="true" style={{ flexShrink: 0 }} />
                      {feat}
                    </div>
                  ))}
                </div>
                <Link
                  href={plan.href}
                  className={`btn ${plan.highlight ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ width: '100%', justifyContent: 'center' }}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ======================== CTA ======================== */}
      <section className="reveal-on-scroll" style={{ padding: '100px 24px', textAlign: 'center', position: 'relative', zIndex: 10 }}>
        <div className="page-container" style={{ textAlign: 'center' }}>
          <div
            className="card-premium"
            style={{
              maxWidth: '700px',
              margin: '0 auto',
              textAlign: 'center',
              background: 'linear-gradient(135deg, rgba(99,102,241,0.12), rgba(6,182,212,0.06))',
              border: '1px solid rgba(99,102,241,0.25)',
            }}
          >
            <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'center' }}>
              <div style={{ width: '72px', height: '72px', borderRadius: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, rgba(99,102,241,0.25), rgba(6,182,212,0.15))', border: '1px solid rgba(99,102,241,0.35)' }}>
                <Rocket size={34} color="#a5b4fc" aria-hidden="true" />
              </div>
            </div>
            <h2 style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '40px', fontWeight: 800, color: 'white', marginBottom: '16px', lineHeight: 1.2 }}>
              Ready to Win Your<br />
              <span className="gradient-text">Life-Changing Opportunity?</span>
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '16px', marginBottom: '36px', maxWidth: '500px', margin: '0 auto 36px' }}>
              Join thousands of students, researchers, and professionals using AI to secure scholarships, fellowships, and life-changing opportunities.
            </p>
            <Link href="/signup" className="btn btn-primary btn-lg">
              Start My Free Analysis
              <ArrowRight size={18} aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer
        style={{
          borderTop: '1px solid rgba(255,255,255,0.06)',
          padding: '60px 24px',
          textAlign: 'center',
          position: 'relative',
          zIndex: 10,
        }}
      >
        <div className="page-container" style={{ maxWidth: '800px', margin: '0 auto' }}>
          <div style={{ marginBottom: '24px', fontFamily: 'Space Grotesk, sans-serif', fontWeight: 800, fontSize: '24px', color: 'white' }}>
            Opportunity<span className="gradient-text">OS</span> AI
          </div>
          <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: '18px', fontWeight: 600, marginBottom: '16px' }}>
            Your AI Executive for Global Opportunities.
          </div>
          <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '15px', lineHeight: 1.6, marginBottom: '32px' }}>
            Empowering students, researchers, founders, and professionals to discover and win scholarships, grants, fellowships, jobs, hackathons, and startup opportunities.
          </div>
          <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '14px', marginBottom: '32px' }}>
            Designed & Developed by <strong style={{ color: 'white' }}>Artas Yaskar</strong>
          </div>

          <div style={{ display: 'flex', gap: '24px', justifyContent: 'center', marginBottom: '32px' }}>
            <button onClick={() => setPrivacyOpen(true)} style={{ color: 'rgba(255,255,255,0.4)', textDecoration: 'none', fontSize: '14px', background: 'none', border: 'none', cursor: 'pointer' }}>Privacy Policy</button>
            <button onClick={() => setTermsOpen(true)} style={{ color: 'rgba(255,255,255,0.4)', textDecoration: 'none', fontSize: '14px', background: 'none', border: 'none', cursor: 'pointer' }}>Terms of Service</button>
            <button onClick={() => setContactOpen(true)} style={{ color: 'rgba(255,255,255,0.4)', textDecoration: 'none', fontSize: '14px', background: 'none', border: 'none', cursor: 'pointer' }}>Contact Info</button>
          </div>

          <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '13px' }}>
            © 2026 OpportunityOS AI. All Rights Reserved.
          </div>
        </div>
      </footer>

      <WalkthroughModal isOpen={walkthroughOpen} onClose={() => setWalkthroughOpen(false)} />

      {/* Privacy Policy Modal */}
      {privacyOpen && (
        <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0, 0, 0, 0.75)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999, padding: '24px' }}>
          <div className="modal-content glass-panel" style={{ maxWidth: '600px', width: '90%' }}>
            <button className="modal-close" onClick={() => setPrivacyOpen(false)}><X size={20} /></button>
            <h2 style={{ fontSize: '24px', color: 'white', marginBottom: '20px' }}>Privacy Policy</h2>
            <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '14px', lineHeight: 1.6, maxHeight: '60vh', overflowY: 'auto' }}>
              <p style={{ marginBottom: '16px' }}>At OpportunityOS AI, your privacy is our top priority. We use industry-standard encryption to protect your academic records, resumes, and personal information.</p>
              <h3 style={{ color: 'white', fontSize: '16px', marginBottom: '8px', marginTop: '16px' }}>1. Data Collection</h3>
              <p style={{ marginBottom: '16px' }}>We collect only the data necessary to provide you with the best AI-driven opportunity matches, including your educational background and career preferences.</p>
              <h3 style={{ color: 'white', fontSize: '16px', marginBottom: '8px', marginTop: '16px' }}>2. Data Usage</h3>
              <p style={{ marginBottom: '16px' }}>Your data is strictly used by our internal AI agents (e.g., Discovery Agent, Gap Analysis) to tailor your experience. We do not sell your personal data to third parties.</p>
              <h3 style={{ color: 'white', fontSize: '16px', marginBottom: '8px', marginTop: '16px' }}>3. AI Providers</h3>
              <p style={{ marginBottom: '16px' }}>We route requests through trusted AI providers (Gemini, Groq). None of these providers use your data to train their models.</p>
            </div>
            <div style={{ marginTop: '24px', textAlign: 'right' }}>
              <button className="btn btn-primary" onClick={() => setPrivacyOpen(false)}>Acknowledge</button>
            </div>
          </div>
        </div>
      )}

      {/* Terms of Service Modal */}
      {termsOpen && (
        <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0, 0, 0, 0.75)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999, padding: '24px' }}>
          <div className="modal-content glass-panel" style={{ maxWidth: '600px', width: '90%' }}>
            <button className="modal-close" onClick={() => setTermsOpen(false)}><X size={20} /></button>
            <h2 style={{ fontSize: '24px', color: 'white', marginBottom: '20px' }}>Terms of Service</h2>
            <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '14px', lineHeight: 1.6, maxHeight: '60vh', overflowY: 'auto' }}>
              <p style={{ marginBottom: '16px' }}>Welcome to OpportunityOS AI. By accessing or using our platform, you agree to be bound by these Terms.</p>
              <h3 style={{ color: 'white', fontSize: '16px', marginBottom: '8px', marginTop: '16px' }}>1. Service Description</h3>
              <p style={{ marginBottom: '16px' }}>OpportunityOS provides AI-assisted coaching, discovery, and essay generation for opportunities. It is an advisory tool and does not guarantee acceptances or funding.</p>
              <h3 style={{ color: 'white', fontSize: '16px', marginBottom: '8px', marginTop: '16px' }}>2. User Responsibilities</h3>
              <p style={{ marginBottom: '16px' }}>You are responsible for verifying the final application materials generated by our agents before submission. You agree not to misuse the platform to generate spam or fraudulent applications.</p>
              <h3 style={{ color: 'white', fontSize: '16px', marginBottom: '8px', marginTop: '16px' }}>3. Subscriptions & Payments</h3>
              <p style={{ marginBottom: '16px' }}>Subscription fees are billed according to your selected plan. You may cancel your subscription at any time, but past charges are non-refundable.</p>
            </div>
            <div style={{ marginTop: '24px', textAlign: 'right' }}>
              <button className="btn btn-primary" onClick={() => setTermsOpen(false)}>I Agree</button>
            </div>
          </div>
        </div>
      )}

      {/* Contact Info Modal */}
      {contactOpen && (
        <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0, 0, 0, 0.75)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999, padding: '24px' }}>
          <div className="modal-content glass-panel" style={{ maxWidth: '400px', width: '90%', textAlign: 'center' }}>
            <button className="modal-close" onClick={() => setContactOpen(false)}><X size={20} /></button>

            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px', marginTop: '16px' }}>
              <div style={{ width: '120px', height: '120px', borderRadius: '50%', overflow: 'hidden', border: '3px solid #6366f1', boxShadow: '0 0 20px rgba(99,102,241,0.4)', background: 'rgba(255,255,255,0.05)', position: 'relative' }}>
                <Image src="/founder.jpg" alt="Artas Yaskar" width={400} height={400} style={{ width: '100%', height: 'auto', objectFit: 'cover', display: 'block' }} priority sizes="(max-width: 768px) 100vw, 400px" />
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, #020408, transparent 40%)' }} />
              </div>
            </div>

            <h2 style={{ fontSize: '24px', color: 'white', marginBottom: '4px' }}>Artas Yaskar</h2>
            <div style={{ fontSize: '14px', color: '#10b981', fontWeight: 600, marginBottom: '24px' }}>Founder & Lead Developer</div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <a href="https://wa.me/923491609796" target="_blank" rel="noreferrer" className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', background: 'rgba(37, 211, 102, 0.1)', borderColor: 'rgba(37, 211, 102, 0.3)', color: '#25D366' }}>
                <MessageCircle size={20} />
                +92 349 1609796
              </a>
              <a href="https://www.linkedin.com/in/artas-yaskar-a546a4346/" target="_blank" rel="noreferrer" className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', background: 'rgba(10, 102, 194, 0.1)', borderColor: 'rgba(10, 102, 194, 0.3)', color: '#0A66C2' }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"></path><rect x="2" y="9" width="4" height="12"></rect><circle cx="4" cy="4" r="2"></circle></svg>
                LinkedIn Profile
              </a>
              <a href="https://github.com/artasyaskar" target="_blank" rel="noreferrer" className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', background: 'rgba(255, 255, 255, 0.05)', borderColor: 'rgba(255, 255, 255, 0.2)', color: 'white' }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path></svg>
                GitHub Profile
              </a>
            </div>

          </div>
        </div>
      )}
    </main>
  );
}
