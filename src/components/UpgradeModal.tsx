'use client';

import React from 'react';
import Link from 'next/link';
import { X, Rocket, Check } from 'lucide-react';

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  featureName?: string;
}

export default function UpgradeModal({ isOpen, onClose, featureName = 'Premium Feature' }: UpgradeModalProps) {
  if (!isOpen) return null;

  return (
    <div 
      style={{ 
        position: 'fixed', 
        inset: 0, 
        zIndex: 99999, 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        background: 'rgba(0,0,0,0.85)', 
        backdropFilter: 'blur(12px)' 
      }}
      onClick={onClose}
    >
      <div 
        className="card-magnetic glow-border animate-slide-up" 
        style={{ 
          width: '100%',
          maxWidth: '450px', 
          padding: '32px', 
          background: 'var(--bg-secondary)', 
          border: '1px solid rgba(99,102,241,0.3)', 
          borderRadius: '20px', 
          boxShadow: '0 24px 64px rgba(0,0,0,0.8)', 
          textAlign: 'center' 
        }}
        onClick={e => e.stopPropagation()}
      >
        <button 
          onClick={onClose}
          style={{ position: 'absolute', top: '16px', right: '16px', background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', fontSize: '20px', cursor: 'pointer' }}
        >
          <X size={20} />
        </button>
        
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px', color: '#6366f1' }}><Rocket size={48} /></div>
        
        <h3 style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '24px', fontWeight: 800, color: 'white', marginBottom: '12px' }}>
          Unlock {featureName}
        </h3>
        
        <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '14px', lineHeight: 1.5, marginBottom: '24px' }}>
          You've discovered a premium capability. Upgrade to OpportunityOS Pro to access full AI automation, deep pipeline tracking, and personalized career roadmaps.
        </p>

        <div style={{ display: 'grid', gap: '12px', marginBottom: '32px', textAlign: 'left' }}>
          {[
            'Unlimited AI Resume & SOP Generations',
            'Full Access to 100,000+ Verified Opportunities',
            'Live Admission Intelligence & Insights',
            '1-on-1 Visa & Interview Prep Simulation'
          ].map((benefit, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: 'white' }}>
              <Check size={16} color="#10b981" /> {benefit}
            </div>
          ))}
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <Link href="/dashboard/settings?tab=billing" onClick={onClose} className="btn btn-primary" style={{ justifyContent: 'center', padding: '14px', fontSize: '16px' }}>
            Upgrade to Pro
          </Link>
          <button 
            onClick={onClose}
            className="btn btn-ghost" 
            style={{ justifyContent: 'center', padding: '12px', color: 'rgba(255,255,255,0.5)' }}
          >
            Maybe Later
          </button>
        </div>
      </div>
    </div>
  );
}
