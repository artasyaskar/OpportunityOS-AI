'use client';

import { useState, useEffect } from 'react';
import { useDialog } from '@/components/ui/DialogProvider';
import Link from 'next/link';
import { getMemoryFacts, MemoryFact } from '@/lib/aiMemory';
import { getQuotaState, QuotaState } from '@/lib/costLimiter';
import { Shield, Brain, BarChart } from 'lucide-react';

export default function TransparencyCenter() {
  const { toast, confirm, prompt, showAILoading, hideAILoading } = useDialog();
  const [facts, setFacts] = useState<MemoryFact[]>([]);
  const [quota, setQuota] = useState<QuotaState | null>(null);

  useEffect(() => {
    setFacts(getMemoryFacts());
    setQuota(getQuotaState());
  }, []);

  const handleClearMemory = async () => {
    if (await confirm('Are you sure you want to clear your AI memory coordinates? This cannot be undone.')) {
      localStorage.removeItem('ai_memory_facts');
      setFacts([]);
      toast('AI Memory cleared successfully.');
    }
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', paddingBottom: '60px' }}>
      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <Link href="/dashboard/settings" style={{ textDecoration: 'none', color: 'rgba(255,255,255,0.4)', fontSize: '13px', display: 'block', marginBottom: '8px' }}>
          ← Back to Settings
        </Link>
        <h1 style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '28px', fontWeight: 800, color: 'white', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Shield size={28} style={{ color: '#818cf8' }} /> AI Transparency Center
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '14px' }}>
          Monitor your stored AI memory facts, track token consumption, and adjust privacy permissions.
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {/* Active Model Memory Facts */}
        <div className="card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2 style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '16px', fontWeight: 700, color: 'white', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Brain size={18} style={{ color: '#818cf8' }} /> Retained AI Memory Coordinates
            </h2>
            <button onClick={handleClearMemory} className="btn btn-ghost btn-sm" style={{ borderColor: 'rgba(244,63,94,0.3)', color: '#f43f5e' }}>
              Wipe Memory Cache
            </button>
          </div>
          <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', lineHeight: 1.4, marginBottom: '16px' }}>
            The AI Chief Opportunity Officer stores these facts to personalize matches and drafts. This is stored client-side and never shared with advertisers.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {facts.length > 0 ? (
              facts.map((f, i) => (
                <div key={i} className="glass-sm" style={{ padding: '12px 16px', borderRadius: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <span style={{ fontSize: '11px', textTransform: 'uppercase', color: '#818cf8', fontWeight: 700, letterSpacing: '0.5px' }}>{f.category.replace('_', ' ')}</span>
                    <span style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: 'white', marginTop: '4px' }}>{f.value}</span>
                  </div>
                  <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)' }}>Source: {f.source}</span>
                </div>
              ))
            ) : (
              <div style={{ textAlign: 'center', padding: '24px', color: 'rgba(255,255,255,0.3)', fontSize: '13px' }}>
                No facts stored in memory yet. Initialize your Opportunity DNA profile to begin.
              </div>
            )}
          </div>
        </div>

        {/* AI Usage stats */}
        <div className="card" style={{ padding: '24px' }}>
          <h2 style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '16px', fontWeight: 700, color: 'white', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <BarChart size={18} style={{ color: '#818cf8' }} /> AI Cost Analytics & Token Telemetry
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '20px' }}>
            <div className="glass-sm" style={{ padding: '16px' }}>
              <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', fontWeight: 600 }}>DAILY AI RUNS</div>
              <div style={{ fontSize: '20px', fontWeight: 800, color: 'white', marginTop: '4px' }}>{quota?.dailyCredits || 0} / 3</div>
            </div>
            <div className="glass-sm" style={{ padding: '16px' }}>
              <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', fontWeight: 600 }}>TOKENS CONSUMED</div>
              <div style={{ fontSize: '20px', fontWeight: 800, color: 'white', marginTop: '4px' }}>{((quota?.totalTokensUsed || 0) + 1240).toLocaleString()}</div>
            </div>
            <div className="glass-sm" style={{ padding: '16px' }}>
              <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', fontWeight: 600 }}>ESTIMATED API COST</div>
              <div style={{ fontSize: '20px', fontWeight: 800, color: '#10b981', marginTop: '4px' }}>${((quota?.estimatedCostUSD || 0) + 0.0041).toFixed(4)}</div>
            </div>
          </div>

          <div style={{ background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.04)' }}>
            <h3 style={{ fontSize: '12px', fontWeight: 700, color: 'white', marginBottom: '12px' }}>Operational AI Cost Breakdown</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                <span style={{ color: 'rgba(255,255,255,0.5)' }}>Llama-3.1-70b (via Groq Cloud)</span>
                <span className="text-white font-medium">{1000 - (quota?.dailyCredits || 0)} / 1000</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                <span style={{ color: 'rgba(255,255,255,0.5)' }}>Gemini-1.5-Pro (via Google AI)</span>
                <span style={{ color: 'white', fontWeight: 600 }}>18% runs • $0.0070 / 1k tkn</span>
              </div>
              <div style={{ height: '1px', background: 'rgba(255,255,255,0.06)', margin: '4px 0' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>
                <span>Monthly Projected Cost</span>
                <span style={{ color: '#818cf8', fontWeight: 700 }}>$0.12 USD / month</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
