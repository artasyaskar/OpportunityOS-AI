'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Rocket, UserRound, Zap, ShieldCheck, Globe, CheckCircle2,
  PenLine, Mic, Target, Sparkles, ArrowLeft, ArrowRight, X,
  type LucideIcon,
} from 'lucide-react';

interface WalkthroughModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const STEPS: { title: string; subtitle: string; content: string; Icon: LucideIcon }[] = [
  {
    title: 'Welcome to OpportunityOS AI',
    subtitle: 'Your AI Chief Opportunity Officer',
    content: 'We are not just another chatbot or search engine. OpportunityOS is an autonomous AI executive that lives on your behalf. It discovers life-changing scholarships, fellowships, and jobs, then actively builds the applications for you.',
    Icon: Rocket
  },
  {
    title: 'The Canonical Profile',
    subtitle: 'Meet Alex Chen (CS Major, 3.8 GPA)',
    content: 'It all starts with your profile. Instead of filling out endless forms, you simply upload your resume and transcripts once. Our AI constructs a comprehensive, mathematically-scored canonical profile.',
    Icon: UserRound
  },
  {
    title: 'Instant Extraction',
    subtitle: 'Data parsing in milliseconds',
    content: 'The Parser Agent extracts 50+ data points from your documents—skills, experiences, and academic metrics—structuring them into a deterministic JSON format ready for the matching engine.',
    Icon: Zap
  },
  {
    title: 'The Evidence Engine',
    subtitle: 'Zero Hallucinations. 100% Truth.',
    content: 'Unlike standard LLMs that invent stories, our proprietary Evidence Engine strictly enforces a "Zero Hallucination Policy." Every claim made in an essay must be mathematically traced back to your verified documents.',
    Icon: ShieldCheck
  },
  {
    title: 'Global Matching',
    subtitle: 'Scanning 100,000+ Opportunities',
    content: 'The Discovery Agent continuously scans global databases, matching your precise profile against eligibility requirements to predict your exact Probability of Success (e.g., 84% Match).',
    Icon: Globe
  },
  {
    title: 'Strict Verification',
    subtitle: 'Are you actually eligible?',
    content: 'Before you waste hours applying, the Compliance Agent verifies every single requirement (GPA, citizenship, language scores). If you are missing an IELTS score, the Gap Analysis Agent tells you immediately.',
    Icon: CheckCircle2
  },
  {
    title: 'Application Builder',
    subtitle: 'Writing your winning essay',
    content: 'The Builder Agent drafts a highly personalized, authentic Statement of Purpose. It weaves your specific projects and goals into a compelling narrative, backed entirely by your Evidence Graph.',
    Icon: PenLine
  },
  {
    title: 'AI Interview Coach',
    subtitle: 'Predicting their questions',
    content: 'Once you secure an interview, our Coach analyzes the specific opportunity and your specific resume to generate the exact behavioral and technical questions the judges are most likely to ask you.',
    Icon: Mic
  },
  {
    title: 'Mission Control',
    subtitle: 'Your Daily Command Center',
    content: 'Your dashboard transforms into an active Mission Control. It tells you exactly what to do today—"Review this draft", "Upload your transcript"—so you never miss a deadline.',
    Icon: Target
  },
  {
    title: 'Your Turn',
    subtitle: 'Ready to secure your future?',
    content: 'Imagine having this AI Executive working for you 24/7. Stop searching. Start winning.',
    Icon: Sparkles
  }
];

export default function WalkthroughModal({ isOpen, onClose }: WalkthroughModalProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  // Reset step when opened
  useEffect(() => {
    if (isOpen) {
      setCurrentStep(0);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [isOpen]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'ArrowRight') nextStep();
      if (e.key === 'ArrowLeft') prevStep();
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentStep]);

  if (!isOpen) return null;

  const nextStep = () => {
    if (currentStep < STEPS.length - 1) {
      setIsAnimating(true);
      setTimeout(() => {
        setCurrentStep(prev => prev + 1);
        setIsAnimating(false);
      }, 300);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setIsAnimating(true);
      setTimeout(() => {
        setCurrentStep(prev => prev - 1);
        setIsAnimating(false);
      }, 300);
    }
  };

  const progress = ((currentStep + 1) / STEPS.length) * 100;

  return (
    <div 
      style={{
        position: 'fixed',
        top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(2, 4, 8, 0.85)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px', // Smaller padding for mobile
        opacity: 1,
        transition: 'opacity 0.3s ease',
      }}
    >
      {/* Background Orbs for Premium Feel */}
      <div style={{ position: 'absolute', top: '20%', left: '20%', width: '300px', height: '300px', background: 'radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%)', borderRadius: '50%', filter: 'blur(40px)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: '20%', right: '20%', width: '400px', height: '400px', background: 'radial-gradient(circle, rgba(6,182,212,0.1) 0%, transparent 70%)', borderRadius: '50%', filter: 'blur(40px)', pointerEvents: 'none' }} />

      <div 
        className="card-premium glow-border"
        style={{
          width: '100%',
          maxWidth: '650px',
          maxHeight: '90vh', // Prevent cutting off on small screens
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: 'rgba(15, 23, 42, 0.6)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '24px',
          overflow: 'hidden',
          position: 'relative',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
        }}
      >
        {/* Top Progress Bar */}
        <div style={{ height: '4px', width: '100%', background: 'rgba(255,255,255,0.05)' }}>
          <div 
            style={{ 
              height: '100%', 
              width: `${progress}%`, 
              background: 'linear-gradient(90deg, #3b82f6, #8b5cf6, #10b981)',
              transition: 'width 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
            }} 
          />
        </div>

        {/* Header Controls */}
        <div style={{ flexShrink: 0, display: 'flex', justifyContent: 'space-between', padding: '20px 24px 0' }}>
          <div style={{ fontSize: '12px', fontWeight: 600, color: 'rgba(255,255,255,0.4)', letterSpacing: '1px' }}>
            STEP {currentStep + 1} OF {STEPS.length}
          </div>
          <button
            onClick={onClose}
            aria-label="Close walkthrough"
            style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: '14px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <span>Esc</span>
            <X size={16} aria-hidden="true" />
          </button>
        </div>

        {/* Content Area */}
        <div 
          style={{ 
            padding: '24px 24px 32px',
            overflowY: 'auto', // Allow scrolling on small screens
            flexGrow: 1,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            opacity: isAnimating ? 0 : 1,
            transform: isAnimating ? 'translateY(10px)' : 'translateY(0)',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        >
          {(() => {
            const StepIcon = STEPS[currentStep].Icon;
            return (
              <div style={{ marginBottom: '20px' }}>
                <div style={{ width: '60px', height: '60px', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(139,92,246,0.2))', border: '1px solid rgba(99,102,241,0.3)' }}>
                  <StepIcon size={28} color="#a5b4fc" aria-hidden="true" />
                </div>
              </div>
            );
          })()}
          <h2 style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: 'clamp(24px, 6vw, 32px)', fontWeight: 800, color: 'white', marginBottom: '8px', lineHeight: 1.2 }}>
            {STEPS[currentStep].title}
          </h2>
          <div style={{ color: '#818cf8', fontSize: '16px', fontWeight: 600, marginBottom: '20px' }}>
            {STEPS[currentStep].subtitle}
          </div>
          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 'clamp(15px, 4vw, 18px)', lineHeight: 1.6 }}>
            {STEPS[currentStep].content}
          </p>
        </div>

        {/* Footer Navigation */}
        <div style={{ flexShrink: 0, padding: '20px 24px', borderTop: '1px solid rgba(255,255,255,0.06)', background: 'rgba(0,0,0,0.2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <button 
            onClick={prevStep}
            disabled={currentStep === 0}
            style={{ 
              background: 'transparent', 
              border: '1px solid rgba(255,255,255,0.1)', 
              color: currentStep === 0 ? 'rgba(255,255,255,0.2)' : 'white', 
              padding: '10px 20px', 
              borderRadius: '8px',
              cursor: currentStep === 0 ? 'default' : 'pointer',
              transition: 'all 0.2s',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <ArrowLeft size={16} aria-hidden="true" />
            Back
          </button>

          <div style={{ display: 'flex', gap: '6px' }}>
            {STEPS.map((_, i) => (
              <div 
                key={i} 
                style={{ 
                  width: i === currentStep ? '24px' : '8px', 
                  height: '8px', 
                  borderRadius: '4px', 
                  background: i === currentStep ? '#8b5cf6' : 'rgba(255,255,255,0.1)',
                  transition: 'all 0.3s'
                }} 
              />
            ))}
          </div>

          {currentStep < STEPS.length - 1 ? (
            <button 
              onClick={nextStep}
              className="btn btn-primary"
              style={{ padding: '10px 24px', fontSize: '14px', margin: 0, display: 'inline-flex', alignItems: 'center', gap: '8px' }}
            >
              Next
              <ArrowRight size={16} aria-hidden="true" />
            </button>
          ) : (
            <Link 
              href="/signup" 
              className="btn btn-primary"
              style={{ padding: '10px 24px', fontSize: '14px', margin: 0, background: 'linear-gradient(135deg, #10b981, #059669)', border: '1px solid rgba(16,185,129,0.4)', display: 'inline-flex', alignItems: 'center', gap: '8px' }}
            >
              Create Free Account
              <Rocket size={16} aria-hidden="true" />
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
