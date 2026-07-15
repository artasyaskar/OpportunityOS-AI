'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import Navbar from '@/components/layout/Navbar';
import { useScrollReveal } from '@/hooks/useScrollReveal';
import { useAuth } from '@/components/auth/AuthProvider';
import { useProfile } from '@/components/auth/ProfileContext';
import WalkthroughModal from '@/components/layout/WalkthroughModal';

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

const AGENTS = [
  { name: 'Discovery Agent', icon: '🔭', desc: 'Scans 10,000+ opportunities globally' },
  { name: 'Probability Engine', icon: '📊', desc: 'Predicts your success probability' },
  { name: 'Eligibility Agent', icon: '✅', desc: 'Matches you to qualified opportunities' },
  { name: 'Gap Analysis Agent', icon: '🗺️', desc: 'Identifies exactly what you\'re missing' },
  { name: 'Strategist Agent', icon: '♟️', desc: 'Tells you when and what to apply for' },
  { name: 'Application Builder', icon: '✍️', desc: 'Generates SOPs, essays, cover letters' },
  { name: 'Review Agent', icon: '🔍', desc: 'Scores and improves your submissions' },
  { name: 'Compliance Agent', icon: '📋', desc: 'Verifies every requirement is met' },
  { name: 'Planner Agent', icon: '📅', desc: 'Creates your day-by-day timeline' },
  { name: 'Rejection Learner', icon: '🔄', desc: 'Turns rejections into future wins' },
  { name: 'Portfolio Agent', icon: '💼', desc: 'Manages your opportunity portfolio' },
  { name: 'Readiness Agent', icon: '⚡', desc: 'Scores your application readiness' },
];

const STATS = [
  { value: '100,000+', label: 'Indexed Opportunities' },
  { value: 'AI', label: 'Powered Scoring' },
  { value: 'Real-time', label: 'Probability Updates' },
  { value: '1', label: 'Unified AI Executive' },
];

const OPPORTUNITY_TYPES = [
  { type: 'Scholarships', count: '12,400+', color: '#6366f1', icon: '🎓' },
  { type: 'Fellowships', count: '3,200+', color: '#8b5cf6', icon: '🏛️' },
  { type: 'Grants', count: '8,700+', color: '#06b6d4', icon: '💰' },
  { type: 'Remote Jobs', count: '15,000+', color: '#10b981', icon: '💻' },
  { type: 'Accelerators', count: '980+', color: '#f59e0b', icon: '🚀' },
  { type: 'Competitions', count: '4,300+', color: '#f43f5e', icon: '🏆' },
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
    name: 'Pro',
    price: '$9',
    period: '/month',
    features: ['Unlimited opportunities', 'Full AI analysis (all 12 agents)', 'Unlimited essays', 'Priority support', 'Portfolio tracker'],
    cta: 'Start Pro Trial',
    href: '/signup?plan=pro',
    highlight: true,
    badge: 'Most Popular',
  },
  {
    name: 'Success Package',
    price: '$49',
    period: 'one-time',
    features: ['Everything in Pro', 'AI application assistance', '1-on-1 strategy session', 'Expert review included'],
    cta: 'Get Success Package',
    href: '/signup?plan=success',
    highlight: false,
  },
];

export default function Home() {
  const [agentIndex, setAgentIndex] = useState(0);
  const scrollRef = useScrollReveal();
  const [counter, setCounter] = useState({ ops: 0, acc: 0 });

  const [hasProfile, setHasProfile] = useState(false);
  const [profileName, setProfileName] = useState('');
  const [walkthroughOpen, setWalkthroughOpen] = useState(false);

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
            style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap', flexDirection: 'column', alignItems: 'center' }}
          >
            <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
              {hasProfile ? (
                <Link href="/dashboard" className="btn btn-primary btn-lg" style={{ background: 'linear-gradient(135deg, #10b981, #059669)', border: '1px solid rgba(16,185,129,0.4)' }}>
                  💼 Resume {profileName}'s Session →
                </Link>
              ) : (
                <Link href="/signup" className="btn btn-primary btn-lg">
                  🚀 Enter Mission Control
                </Link>
              )}
              <button 
                onClick={() => setWalkthroughOpen(true)}
                className="btn btn-secondary btn-lg"
                style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.15), rgba(16,185,129,0.05))', border: '1px solid rgba(16,185,129,0.4)', color: '#10b981', display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                ⚖️ Start Interactive Judge Walkthrough (4 min)
              </button>
            </div>
          </div>

          {/* Live Agent Ticker */}
          <div
            className="animate-slide-up delay-400"
            style={{ marginTop: '48px' }}
          >
            <div
              className="glass"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px 24px',
                borderRadius: '999px',
              }}
            >
              <span className="agent-status-dot running" />
              <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', fontWeight: 500 }}>
                Active:
              </span>
              <span
                style={{
                  fontSize: '13px',
                  color: '#818cf8',
                  fontWeight: 600,
                  transition: 'all 0.3s ease',
                }}
              >
                {AGENTS[agentIndex].icon} {AGENTS[agentIndex].name}
              </span>
              <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.35)' }}>
                — {AGENTS[agentIndex].desc}
              </span>
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
          padding: '32px 24px',
          marginBottom: '5rem',
          position: 'relative',
          zIndex: 10,
        }}
      >
        <div className="page-container">
          <div
            className="grid-4"
            style={{
              textAlign: 'center',
            }}
          >
            {STATS.map(stat => (
              <div key={stat.label}>
                <div
                  className="gradient-text"
                  style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '36px', fontWeight: 800 }}
                >
                  {stat.value}
                </div>
                <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px', marginTop: '4px', fontWeight: 500 }}>
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ======================== WHY OPPORTUNITYOS COMPARISON ======================== */}
      <section className="reveal-on-scroll" style={{ padding: '60px 24px', position: 'relative', zIndex: 10 }}>
        <div className="page-container" style={{ maxWidth: '800px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '40px' }}>
            <div className="badge badge-emerald" style={{ marginBottom: '16px' }}>
              Why OpportunityOS?
            </div>
            <h2 className="text-section-title" style={{ color: 'white', marginBottom: '16px' }}>
              The Paradigm Shift in Career Growth
            </h2>
          </div>

          <div className="card-magnetic glow-border" style={{ overflow: 'hidden', padding: '1px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', background: 'rgba(15,23,42,0.4)', borderRadius: '15px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                  <th style={{ padding: '16px 20px', textAlign: 'left', color: 'rgba(255,255,255,0.4)', fontSize: '12px', fontWeight: 700, letterSpacing: '1px' }}>TRADITIONAL PLATFORMS</th>
                  <th style={{ padding: '16px 20px', textAlign: 'left', color: '#10b981', fontSize: '12px', fontWeight: 700, letterSpacing: '1px', background: 'rgba(16,185,129,0.05)' }}>OPPORTUNITYOS AI</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { trad: 'Search opportunities manually', os: 'Understands your exact profile & matches you' },
                  { trad: 'Lists generic deadlines', os: 'Builds a dynamic execution plan' },
                  { trad: 'Shows text requirements blocks', os: 'Explains exactly why you match with scores' },
                  { trad: 'Provides outbound links', os: 'Generates and optimizes application documents' },
                  { trad: 'Leaves you alone', os: 'Acts as your proactive AI Chief Opportunity Officer' },
                  { trad: 'No contextual learning', os: 'Learns from your progress, timeline, and history' },
                ].map((row, i) => (
                  <tr key={i} style={{ borderBottom: i === 5 ? 'none' : '1px solid rgba(255,255,255,0.05)' }}>
                    <td style={{ padding: '16px 20px', color: 'rgba(255,255,255,0.6)', fontSize: '13px' }}>✗ {row.trad}</td>
                    <td style={{ padding: '16px 20px', color: 'white', fontSize: '13px', fontWeight: 600, background: 'rgba(16,185,129,0.02)' }}>✓ {row.os}</td>
                  </tr>
                ))}
              </tbody>
            </table>
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
            {OPPORTUNITY_TYPES.map(opp => (
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
                <div style={{ fontSize: '40px', marginBottom: '16px' }}>{opp.icon}</div>
                <div style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '20px', fontWeight: 700, color: 'white', marginBottom: '8px' }}>
                  {opp.type}
                </div>
                <div style={{ fontSize: '28px', fontWeight: 800, color: opp.color, fontFamily: 'Space Grotesk, sans-serif' }}>
                  {opp.count}
                </div>
                <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', marginTop: '4px' }}>
                  opportunities indexed
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
                <div style={{ fontSize: '28px', marginBottom: '12px' }}>{agent.icon}</div>
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

      {/* ======================== HOW IT WORKS ======================== */}
      <section className="reveal-on-scroll" style={{ padding: '80px 24px', position: 'relative', zIndex: 10 }}>
        <div className="page-container">
          <div style={{ textAlign: 'center', marginBottom: '60px' }}>
            <div className="badge badge-cyan" style={{ marginBottom: '16px' }}>How It Works</div>
            <h2 className="text-section-title" style={{ color: 'white' }}>
              From Profile to <span className="gradient-text-cyan">Win</span>
            </h2>
          </div>

          <div className="grid-3" style={{ position: 'relative' }}>
            {[
              { step: '01', title: 'Build Your Profile', desc: 'Upload your resume, transcripts, and goals. Our AI extracts your full academic and professional identity.', icon: '👤' },
              { step: '02', title: 'AI Analysis Begins', desc: 'All 12 agents activate simultaneously. In seconds, you get your Opportunity Score and a personalized opportunity feed.', icon: '🤖' },
              { step: '03', title: 'Win Opportunities', desc: 'Apply with AI-generated essays, track deadlines, and get real-time probability scores for every application.', icon: '🏆' },
            ].map((step, i) => (
              <div key={step.step} className="card-premium card-magnetic glow-border" style={{ textAlign: 'center' }}>
                <div
                  style={{
                    width: '56px',
                    height: '56px',
                    borderRadius: '16px',
                    background: 'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(139,92,246,0.2))',
                    border: '1px solid rgba(99,102,241,0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '28px',
                    margin: '0 auto 20px',
                  }}
                >
                  {step.icon}
                </div>
                <div
                  style={{
                    fontFamily: 'Space Grotesk, sans-serif',
                    fontSize: '11px',
                    fontWeight: 700,
                    color: '#818cf8',
                    letterSpacing: '2px',
                    marginBottom: '12px',
                  }}
                >
                  STEP {step.step}
                </div>
                <h3 style={{ fontSize: '20px', fontWeight: 700, color: 'white', marginBottom: '12px' }}>
                  {step.title}
                </h3>
                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '14px', lineHeight: 1.6 }}>
                  {step.desc}
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
                      <span style={{ color: '#10b981', fontWeight: 700 }}>✓</span>
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
            <div style={{ fontSize: '48px', marginBottom: '24px' }}>🚀</div>
            <h2 style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '40px', fontWeight: 800, color: 'white', marginBottom: '16px', lineHeight: 1.2 }}>
              Ready to Win Your<br />
              <span className="gradient-text">Life-Changing Opportunity?</span>
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '16px', marginBottom: '36px', maxWidth: '500px', margin: '0 auto 36px' }}>
              Join thousands of students, researchers, and professionals using AI to secure scholarships, fellowships, and life-changing opportunities.
            </p>
            <Link href="/signup" className="btn btn-primary btn-lg">
              Start My Free Analysis →
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer
        style={{
          borderTop: '1px solid rgba(255,255,255,0.06)',
          padding: '32px 24px',
          textAlign: 'center',
          position: 'relative',
          zIndex: 10,
        }}
      >
        <div className="page-container">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
            <div style={{ fontFamily: 'Space Grotesk, sans-serif', fontWeight: 700, fontSize: '16px', color: 'white' }}>
              Opportunity<span className="gradient-text">OS</span> AI
            </div>
            <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '13px' }}>
              © 2025 OpportunityOS AI. Powered by OpportunityOS AI Architecture.
            </div>
            <div style={{ display: 'flex', gap: '20px' }}>
              {['Privacy', 'Terms', 'Contact'].map(item => (
                <a key={item} href="#" style={{ color: 'rgba(255,255,255,0.4)', textDecoration: 'none', fontSize: '13px' }}>
                  {item}
                </a>
              ))}
            </div>
          </div>
        </div>
      </footer>

      <WalkthroughModal isOpen={walkthroughOpen} onClose={() => setWalkthroughOpen(false)} />
    </main>
  );
}
