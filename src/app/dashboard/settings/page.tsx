'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/auth/AuthProvider';
import { useProfile } from '@/components/auth/ProfileContext';
import { useSubscription } from '@/components/auth/SubscriptionContext';
import { usePipeline } from '@/components/auth/PipelineContext';
import { PRICING_PLANS, PricingPlan } from '@/lib/pricing';
import { SubscriptionRecord } from '@/lib/subscription';
import { getMerchantConfigs, PaymentMerchantConfig } from '@/lib/paymentAdapter';
import { fetchPaymentMerchants, uploadPaymentReceipt } from '@/lib/db';
import { validatePromo, applyReferral } from '@/lib/growth';
import { getQuotaState, QuotaState } from '@/lib/costLimiter';

export default function SettingsPage() {
  const { user } = useAuth();
  const { profile: remoteProfile, updateProfile } = useProfile();
  const { subscription: sub, updateSubscription } = useSubscription();
  const { pipeline: applications } = usePipeline();
  const [activeTab, setActiveTab] = useState<'profile' | 'billing'>('profile');
  
  // Profile DNA state — local edit buffer
  const [profile, setProfile] = useState<{
    name: string;
    email: string;
    country: string;
    education: string;
    gpa: string;
    field: string;
    skills: string;
    goal: string;
    careerGoal: string;
    experience: string;
    level: string;
    targetOpportunities: string[];
    githubUrl: string;
    portfolioUrl: string;
    toeflScore: string;
    greScore: string;
    notifications: boolean;
    weeklyDigest: boolean;
    shareData: boolean;
  }>({
    name: '',
    email: '',
    country: '',
    education: 'Not Specified',
    gpa: '',
    field: '',
    skills: '',
    goal: '',
    careerGoal: '',
    experience: '',
    level: 'undergraduate',
    targetOpportunities: [],
    githubUrl: '',
    portfolioUrl: '',
    toeflScore: '',
    greScore: '',
    notifications: true,
    weeklyDigest: true,
    shareData: false,
  });
  const [saving, setSaving] = useState(false);

  // Billing state
  const [quota, setQuota] = useState<QuotaState | null>(null);
  const [savedCount, setSavedCount] = useState(0);
  const [currency, setCurrency] = useState<'PKR' | 'USD'>('PKR');
  
  // Guided checkout wizard state
  const [checkoutStep, setCheckoutStep] = useState<number>(1);
  const [selectedPlan, setSelectedPlan] = useState<string>('professional_monthly');
  const [selectedProvider, setSelectedProvider] = useState<string>('easypaisa');
  const [orderId, setOrderId] = useState<string>('');
  const [paymentRef, setPaymentRef] = useState<string>('');
  const [promoOpen, setPromoOpen] = useState(false);
  const [promoCode, setPromoCode] = useState('');
  const [promoDiscount, setPromoDiscount] = useState(0);
  const [promoError, setPromoError] = useState('');
  
  // Clipboards feedback alert
  const [copyAlert, setCopyAlert] = useState<string>('');

  // Auto-verification timeline state
  const [verificationStatus, setVerificationStatus] = useState<'idle' | 'running' | 'auto_success' | 'fallback_proof' | 'uploading'>('idle');
  const [autoVerifyStep, setAutoVerifyStep] = useState(0);
  const [trxIdInput, setTrxIdInput] = useState('');
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  
  const [merchants, setMerchants] = useState<PaymentMerchantConfig[]>([]);

  useEffect(() => {
    // Populate from remote/local profile when loaded
    if (remoteProfile) {
      setProfile(prev => ({
        ...prev,
        ...remoteProfile,
      }));
    }
  }, [remoteProfile]);

  const updateProfileField = (key: string, value: any) => {
    setProfile(prev => ({ ...prev, [key]: value }));
  };

  useEffect(() => {
    // Override with auth user details if missing in profile
    if (user) {
      setProfile(prev => ({
        ...prev,
        email: user.email || prev.email,
        name: prev.name || user.displayName || '',
      }));
    }
  }, [user]);

  useEffect(() => {
    if (applications) {
      setSavedCount(applications.length);
    }

    setQuota(getQuotaState());
    
    // Fetch dynamic merchants
    fetchPaymentMerchants().then(m => setMerchants(m));

    // Generate Order ID & Reference Code if empty
    if (!orderId) {
      const rnd = Math.random().toString(36).substring(2, 8).toUpperCase();
      setOrderId(`OPP-2026-${rnd}`);
      setPaymentRef(`REF-${rnd}`);
    }
  }, [applications]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateProfile(profile);
      setCopyAlert('Profile saved successfully.');
      setTimeout(() => setCopyAlert(''), 3000);
    } catch (err) {
      console.error(err);
      setCopyAlert('Error saving profile.');
      setTimeout(() => setCopyAlert(''), 3000);
    } finally {
      setSaving(false);
    }
  };

  const handleApplyPromo = () => {
    setPromoError('');
    setPromoDiscount(0);
    const promo = validatePromo(promoCode);
    if (promo) {
      setPromoDiscount(promo.discountPercentage);
    } else {
      setPromoError('Invalid coupon code');
    }
  };

  const handleCopy = (text: string, label: string) => {
    const fallbackCopy = (t: string, l: string) => {
      try {
        const textArea = document.createElement('textarea');
        textArea.value = t;
        textArea.style.position = 'fixed';
        textArea.style.top = '0';
        textArea.style.left = '0';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        const successful = document.execCommand('copy');
        document.body.removeChild(textArea);
        if (successful) {
          setCopyAlert(`Copied ${l} to clipboard!`);
        } else {
          setCopyAlert(`Failed to copy ${l}`);
        }
      } catch (err) {
        setCopyAlert(`Failed to copy ${l}`);
      }
      setTimeout(() => setCopyAlert(''), 2000);
    };

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text)
        .then(() => {
          setCopyAlert(`Copied ${label} to clipboard!`);
          setTimeout(() => setCopyAlert(''), 2000);
        })
        .catch(() => fallbackCopy(text, label));
    } else {
      fallbackCopy(text, label);
    }
  };

  const handleStartCheckout = (planId: string) => {
    setSelectedPlan(planId);
    setCheckoutStep(2);
  };

  const handleChooseMethod = (providerId: string) => {
    setSelectedProvider(providerId);
    setCheckoutStep(3);
  };

  const handleVerifyTimelineSimulate = () => {
    setVerificationStatus('running');
    setAutoVerifyStep(1);

    // Timeline steps timer simulation
    setTimeout(() => {
      setAutoVerifyStep(2);
      setTimeout(() => {
        setAutoVerifyStep(3);
        setTimeout(async () => {
          // If the user inputs "AUTO-CONFIRM" as custom code, let it succeed immediately
          if (promoCode.toUpperCase() === 'AUTO-CONFIRM' || trxIdInput.toUpperCase() === 'AUTO-CONFIRM') {
            setVerificationStatus('auto_success');
            await updateSubscription({
              status: 'LIFETIME',
              planId: selectedPlan,
              paymentProvider: selectedProvider,
              promoCode: promoCode || undefined,
              paymentReference: orderId,
              startedAt: new Date().toISOString(),
            });
          } else {
            // Otherwise, prompt for Reference ID & receipt upload fallback
            setVerificationStatus('fallback_proof');
          }
        }, 1500);
      }, 1500);
    }, 1500);
  };

  const handleSubmitFallbackReceipt = async () => {
    if (!trxIdInput) {
      alert('Please enter your transaction ID or Reference Number.');
      return;
    }
    setVerificationStatus('uploading');
    
    let proofUrl = 'screenshot_pending';
    
    // If real file selected, upload it to storage
    if (receiptFile && user?.uid) {
      try {
        proofUrl = await uploadPaymentReceipt(user.uid, receiptFile);
      } catch (err) {
        console.error('Failed to upload receipt:', err);
        alert('Failed to upload receipt. Please try again.');
        setVerificationStatus('fallback_proof');
        return;
      }
    } else {
      alert('Please attach your payment receipt screenshot.');
      setVerificationStatus('fallback_proof');
      return;
    }

    await updateSubscription({
      status: 'UNDER_REVIEW',
      planId: selectedPlan,
      paymentProvider: selectedProvider,
      paymentReference: trxIdInput,
      paymentProofUrl: proofUrl,
      startedAt: new Date().toISOString(),
    });
    setCheckoutStep(1);
    setVerificationStatus('idle');
  };

  const handleResetToFree = async () => {
    if (confirm('Revert account to Free tier?')) {
      await updateSubscription({ status: 'FREE', planId: 'free', expiresAt: undefined });
      setVerificationStatus('idle');
    }
  };

  const currentPlan = PRICING_PLANS.find(p => p.id === (sub?.planId || 'free')) || PRICING_PLANS[0];
  const activePlanPrice = currency === 'PKR' ? currentPlan.pricePKR : currentPlan.priceUSD;
  const merchantInfo = merchants.find(m => m.providerId === selectedProvider) || merchants[0];

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', paddingBottom: '60px' }}>
      {/* Dynamic clipboards alert banner */}
      {copyAlert && (
        <div style={{ position: 'fixed', top: '20px', right: '20px', zIndex: 1000, background: '#10b981', color: 'white', padding: '12px 24px', borderRadius: '10px', boxShadow: '0 4px 12px rgba(16,185,129,0.3)', fontSize: '13px', fontWeight: 600 }}>
          {copyAlert}
        </div>
      )}

      {/* Title */}
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '28px', fontWeight: 800, color: 'white', marginBottom: '8px' }}>
          ⚙️ Settings & Subscriptions
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '14px' }}>
          Configure your candidate profile settings, verify AI limits, and manage payment options.
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '28px', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '12px' }}>
        <button
          onClick={() => setActiveTab('profile')}
          style={{
            padding: '8px 16px', borderRadius: '8px',
            border: activeTab === 'profile' ? '1px solid rgba(99,102,241,0.4)' : '1px solid transparent',
            background: activeTab === 'profile' ? 'rgba(99,102,241,0.1)' : 'transparent',
            color: activeTab === 'profile' ? '#818cf8' : 'rgba(255,255,255,0.5)',
            fontSize: '13px', fontWeight: 700, cursor: 'pointer'
          }}
        >
          🧬 Opportunity DNA Profile
        </button>
        <button
          onClick={() => setActiveTab('billing')}
          style={{
            padding: '8px 16px', borderRadius: '8px',
            border: activeTab === 'billing' ? '1px solid rgba(99,102,241,0.4)' : '1px solid transparent',
            background: activeTab === 'billing' ? 'rgba(99,102,241,0.1)' : 'transparent',
            color: activeTab === 'billing' ? '#818cf8' : 'rgba(255,255,255,0.5)',
            fontSize: '13px', fontWeight: 700, cursor: 'pointer'
          }}
        >
          💳 Plan & Billing Dashboard
        </button>
        
        <Link href="/dashboard/settings/vault" style={{ textDecoration: 'none' }}>
          <button
            style={{
              padding: '8px 16px', borderRadius: '8px',
              border: '1px solid transparent',
              background: 'transparent',
              color: 'rgba(255,255,255,0.5)',
              fontSize: '13px', fontWeight: 700, cursor: 'pointer'
            }}
          >
            🗄️ Evidence Vault
          </button>
        </Link>

        <Link
          href="/dashboard/settings/account"
          style={{
            padding: '8px 16px', borderRadius: '8px',
            border: '1px solid transparent',
            background: 'transparent',
            color: 'rgba(255,255,255,0.5)',
            fontSize: '13px', fontWeight: 700, cursor: 'pointer',
            textDecoration: 'none',
            display: 'flex', alignItems: 'center'
          }}
          onMouseEnter={e => e.currentTarget.style.color = 'white'}
          onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.5)'}
        >
          🔒 Account & Security
        </Link>
      </div>

      {activeTab === 'profile' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="card" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
              <div>
                <h2 style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '16px', fontWeight: 700, color: 'white' }}>
                  Opportunity DNA Profile Coordinates
                </h2>
                <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', marginTop: '4px' }}>
                  You can edit your baseline data used by the AI engine.
                </p>
              </div>
              <button 
                className="btn btn-primary" 
                onClick={handleSaveProfile} 
                disabled={saving}
              >
                {saving ? 'Saving...' : 'Save Profile'}
              </button>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginBottom: '6px' }}>Full Name</label>
                <input className="input" value={profile.name} onChange={e => updateProfileField('name', e.target.value)} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginBottom: '6px' }}>Country</label>
                <input className="input" value={profile.country} onChange={e => updateProfileField('country', e.target.value)} />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px', marginBottom: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginBottom: '6px' }}>One-line Goal</label>
                <input className="input" value={profile.goal} onChange={e => updateProfileField('goal', e.target.value)} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginBottom: '6px' }}>Career Vision</label>
                <textarea className="input" style={{ minHeight: '80px', resize: 'vertical' }} value={profile.careerGoal} onChange={e => updateProfileField('careerGoal', e.target.value)} />
              </div>
            </div>

            <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'white', marginTop: '24px', marginBottom: '12px' }}>Academics</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginBottom: '6px' }}>Institution</label>
                <input className="input" value={profile.education} onChange={e => updateProfileField('education', e.target.value)} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginBottom: '6px' }}>GPA / Grade</label>
                <input className="input" value={profile.gpa} onChange={e => updateProfileField('gpa', e.target.value)} />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginBottom: '6px' }}>Study Level</label>
                <select className="input" value={profile.level} onChange={e => updateProfileField('level', e.target.value)}>
                  <option value="high_school">High School</option>
                  <option value="undergraduate">Undergraduate</option>
                  <option value="masters">Masters</option>
                  <option value="phd">PhD</option>
                  <option value="professional">Professional</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginBottom: '6px' }}>Field of Study</label>
                <input className="input" value={profile.field} onChange={e => updateProfileField('field', e.target.value)} />
              </div>
            </div>

            <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'white', marginTop: '24px', marginBottom: '12px' }}>Skills & Experience</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px', marginBottom: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginBottom: '6px' }}>Skills (comma-separated)</label>
                <textarea className="input" style={{ minHeight: '60px', resize: 'vertical' }} value={profile.skills} onChange={e => updateProfileField('skills', e.target.value)} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginBottom: '6px' }}>Work / Research Experience</label>
                <textarea className="input" style={{ minHeight: '80px', resize: 'vertical' }} value={profile.experience} onChange={e => updateProfileField('experience', e.target.value)} />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginBottom: '6px' }}>TOEFL / IELTS Score</label>
                <input className="input" value={profile.toeflScore} onChange={e => updateProfileField('toeflScore', e.target.value)} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginBottom: '6px' }}>GRE / GMAT Score</label>
                <input className="input" value={profile.greScore} onChange={e => updateProfileField('greScore', e.target.value)} />
              </div>
            </div>
          </div>

          {/* UPLOADED EVIDENCE (EDITABLE) */}
          <div className="card" style={{ padding: '24px' }}>
            <h2 style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '16px', fontWeight: 700, color: 'white', marginBottom: '20px' }}>
              Verified Evidence Vault
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              
              {(() => {
                const evidenceList = [
                  { key: 'onboarding_resume', label: 'Resume / CV', icon: '📄' },
                  { key: 'onboarding_transcript', label: 'Academic Transcript', icon: '📊' },
                  { key: 'onboarding_passport', label: 'Passport', icon: '🛂' },
                  { key: 'onboarding_ielts', label: 'IELTS Score', icon: '🗣️' },
                  { key: 'onboarding_linkedin', label: 'LinkedIn', icon: '💼' },
                ];
                
                return evidenceList.map(item => {
                  const val = typeof window !== 'undefined' ? localStorage.getItem(item.key) : null;
                  return (
                    <div key={item.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{ fontSize: '20px' }}>{item.icon}</span>
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: 600, color: 'white' }}>{item.label}</div>
                          <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>{val || 'Not uploaded'}</div>
                        </div>
                      </div>
                      <Link href="/dashboard/settings/vault">
                        <button className="btn btn-secondary btn-sm" style={{ cursor: 'pointer' }}>
                          Manage
                        </button>
                      </Link>
                    </div>
                  );
                });
              })()}

            </div>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
          
          {/* SUBSCRIPTION LIFECYCLE TRACKER BAR */}
          <div className="card-magnetic glow-border" style={{ padding: '24px', background: 'rgba(99,102,241,0.02)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', fontWeight: 700, letterSpacing: '1px' }}>ACTIVE STATUS</span>
                <h3 style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '18px', fontWeight: 800, color: 'white', marginTop: '4px' }}>
                  {currentPlan.name} Tier
                </h3>
              </div>
              <span className="badge badge-emerald" style={{ fontSize: '10px' }}>{sub?.status || 'FREE'}</span>
            </div>

            {/* Lifecycle Timeline Steps */}
            <div style={{ display: 'flex', justifyContent: 'space-between', position: 'relative', marginTop: '16px' }}>
              <div style={{ position: 'absolute', top: '15px', left: '20px', right: '20px', height: '2px', background: 'rgba(255,255,255,0.06)', zIndex: 0 }} />
              {['FREE', 'PENDING_PAYMENT', 'UNDER_REVIEW', 'ACTIVE'].map((stepState, idx) => {
                const statesMap: Record<string, number> = { FREE: 0, PENDING_PAYMENT: 1, UNDER_REVIEW: 2, ACTIVE: 3, LIFETIME: 3, ENTERPRISE: 3 };
                const currentIdx = statesMap[sub?.status || 'FREE'];
                const isPassed = idx <= currentIdx;
                const isActive = idx === currentIdx;
                return (
                  <div key={stepState} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative', zIndex: 1, flex: 1 }}>
                    <div style={{
                      width: '32px', height: '32px', borderRadius: '50%',
                      background: isPassed ? 'var(--indigo)' : 'var(--bg-secondary)',
                      border: `2px solid ${isActive ? '#818cf8' : 'rgba(255,255,255,0.1)'}`,
                      display: 'flex', alignItems: 'center', justifyItems: 'center', justifyContent: 'center',
                      fontSize: '12px', fontWeight: 700, color: isPassed ? 'white' : 'rgba(255,255,255,0.3)'
                    }}>
                      {idx + 1}
                    </div>
                    <span style={{ fontSize: '9px', fontWeight: 700, color: isPassed ? 'white' : 'rgba(255,255,255,0.3)', marginTop: '8px', letterSpacing: '0.5px' }}>
                      {stepState.replace('_', ' ')}
                    </span>
                  </div>
                );
              })}
            </div>

            {sub && sub.status !== 'FREE' && (
              <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end' }}>
                <button onClick={handleResetToFree} className="btn btn-ghost btn-sm" style={{ color: '#f43f5e', borderColor: 'rgba(244,63,94,0.2)' }}>
                  Revert Account Status
                </button>
              </div>
            )}
          </div>

          {/* ACTIVE STEP MODULES */}

          {/* Step 1: Premium Pricing Page */}
          {checkoutStep === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
              
              {/* CURRENT USAGE SUMMARY CARDS */}
              <div className="card" style={{ padding: '24px' }}>
                <h3 style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '15px', fontWeight: 700, color: 'white', marginBottom: '16px' }}>
                  📊 Current Quotas & Feature Access
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
                  <div className="glass-sm" style={{ padding: '16px' }}>
                    <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', fontWeight: 700 }}>DAILY AI DISPATCHES</div>
                    <div style={{ fontSize: '20px', fontWeight: 900, color: 'white', marginTop: '4px' }}>{quota?.dailyRequests || 0} / 3</div>
                    <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginTop: '4px' }}>Resets in 24 hours.</p>
                  </div>
                  <div className="glass-sm" style={{ padding: '16px' }}>
                    <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', fontWeight: 700 }}>SAVED SCHOLARSHIPS</div>
                    <div style={{ fontSize: '20px', fontWeight: 900, color: 'white', marginTop: '4px' }}>{savedCount} / 5</div>
                    <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginTop: '4px' }}>Target list limits.</p>
                  </div>
                  <div className="glass-sm" style={{ padding: '16px' }}>
                    <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', fontWeight: 700 }}>PREMIUM GATES ACTIVE</div>
                    <div style={{ fontSize: '20px', fontWeight: 900, color: '#f43f5e', marginTop: '4px' }}>Gated</div>
                    <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginTop: '4px' }}>Upgrade to unlock advisor & exports.</p>
                  </div>
                </div>
              </div>

              {/* PRICING PLANS DISPLAY */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
                {PRICING_PLANS.filter(p => ['free', 'professional_monthly', 'founder_lifetime'].includes(p.id)).map(plan => {
                  const isPro = plan.id === 'professional_monthly';
                  const isLifetime = plan.id === 'founder_lifetime';
                  const priceStr = currency === 'PKR' ? `Rs. ${plan.pricePKR.toLocaleString()}` : `$${plan.priceUSD}`;
                  const cycleStr = plan.billingCycle === 'one-time' ? ' One-time' : '/month';
                  return (
                    <div 
                      key={plan.id}
                      className="card-magnetic glow-border"
                      style={{
                        padding: '28px 24px',
                        background: isPro ? 'rgba(99,102,241,0.02)' : 'rgba(255,255,255,0.01)',
                        border: isPro ? '1px solid #6366f1' : '1px solid rgba(255,255,255,0.06)',
                        position: 'relative'
                      }}
                    >
                      {isPro && (
                        <span className="badge badge-emerald" style={{ position: 'absolute', top: '-10px', right: '20px', fontSize: '9px', fontWeight: 700 }}>RECOMMENDED</span>
                      )}
                      {isLifetime && (
                        <span className="badge badge-amber" style={{ position: 'absolute', top: '-10px', right: '20px', fontSize: '9px', fontWeight: 700 }}>FOUNDER ADVANTAGE</span>
                      )}
                      
                      <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', fontWeight: 600 }}>{plan.name}</div>
                      <h3 style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '32px', fontWeight: 900, color: 'white', marginTop: '12px' }}>
                        {priceStr}<span style={{ fontSize: '13px', fontWeight: 500, color: 'rgba(255,255,255,0.4)' }}>{cycleStr}</span>
                      </h3>

                      <ul style={{ margin: '20px 0', padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px', color: 'rgba(255,255,255,0.6)' }}>
                        <li>{plan.id === 'free' ? '✓ 3 daily AI dispatches' : '✓ Unlimited priority AI runs'}</li>
                        <li>{plan.id === 'free' ? '✓ Save up to 5 opportunities' : '✓ Unlimited opportunity saving'}</li>
                        <li>{plan.pdfExportEnabled ? '✓ Executive PDF report downloads' : '✗ No document exports'}</li>
                        <li>{plan.advisorEnabled ? '✓ Proactive executive AI coaching' : '✗ No AI coach consultations'}</li>
                        <li>{plan.simulatorEnabled ? '✓ Real-time probability simulator' : '✗ Static score calculations'}</li>
                      </ul>

                      {plan.id !== 'free' ? (
                        <button 
                          onClick={() => handleStartCheckout(plan.id)}
                          className={`btn ${isPro ? 'btn-primary' : 'btn-ghost'}`} 
                          style={{ width: '100%', justifyContent: 'center' }}
                        >
                          Select {plan.name}
                        </button>
                      ) : (
                        <button className="btn btn-ghost" style={{ width: '100%', justifyContent: 'center', opacity: 0.5 }} disabled>Active Plan</button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Step 2: Choose Payment Method */}
          {checkoutStep === 2 && (
            <div className="card" style={{ padding: '28px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <div>
                  <h3 style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '18px', fontWeight: 700, color: 'white' }}>
                    Select Your Payment Corridor
                  </h3>
                  <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px', marginTop: '2px' }}>
                    Choose local mobile wallets or global bank routing details.
                  </p>
                </div>
                <button onClick={() => setCheckoutStep(1)} className="btn btn-ghost btn-sm">← Back</button>
              </div>

              {currency === 'USD' ? (
                /* INTERNATIONAL CARD COMING SOON */
                <div style={{ textAlign: 'center', padding: '40px 24px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px dashed rgba(255,255,255,0.1)' }}>
                  <span style={{ fontSize: '48px' }}>💳</span>
                  <h4 style={{ fontSize: '16px', fontWeight: 700, color: 'white', marginTop: '12px' }}>International Payments Coming Soon</h4>
                  <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', maxWidth: '400px', margin: '8px auto 16px', lineHeight: 1.5 }}>
                    Stripe and international debit card integrations are actively processing compliance verification. Submit your email to unlock early adopter whitelisting alerts.
                  </p>
                  <div style={{ display: 'flex', gap: '8px', maxWidth: '320px', margin: '0 auto' }}>
                    <input type="email" placeholder="Your email address" className="input" style={{ fontSize: '12px' }} defaultValue={profile.email} />
                    <button onClick={() => alert('Thanks! You have been added to the waitlist.')} className="btn btn-primary btn-sm">Join Waitlist</button>
                  </div>
                </div>
              ) : (
                /* PAKISTAN LOCAL WALLETS */
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
                  {merchants.map(m => (
                    <div
                      key={m.providerId}
                      onClick={() => handleChooseMethod(m.providerId)}
                      className="glass-panel"
                      style={{
                        padding: '20px',
                        borderRadius: '12px',
                        cursor: 'pointer',
                        border: '1px solid rgba(255,255,255,0.06)',
                        textAlign: 'center',
                        transition: 'transform 0.2s ease, border-color 0.2s ease'
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.borderColor = 'rgba(99,102,241,0.4)';
                        e.currentTarget.style.transform = 'translateY(-2px)';
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)';
                        e.currentTarget.style.transform = 'translateY(0)';
                      }}
                    >
                      <div style={{ fontSize: '24px', marginBottom: '8px' }}>
                        {m.providerId === 'easypaisa' || m.providerId === 'jazzcash' ? '📱' : '🏦'}
                      </div>
                      <div style={{ fontSize: '14px', fontWeight: 700, color: 'white' }}>{m.name}</div>
                      <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginTop: '4px' }}>Zero transaction fee</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Step 3: guided checkout */}
          {checkoutStep === 3 && (
            <div className="card" style={{ padding: '28px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <div>
                  <h3 style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '18px', fontWeight: 700, color: 'white' }}>
                    Corporate Account Deposit
                  </h3>
                  <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px', marginTop: '2px' }}>
                    Order ID: **{orderId}** | Reference ID: **{paymentRef}**
                  </p>
                </div>
                <button onClick={() => setCheckoutStep(2)} className="btn btn-ghost btn-sm">← Back</button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '28px' }}>
                {/* Account card details */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div className="glass-panel" style={{ padding: '20px', borderRadius: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '14px' }}>
                      <div>
                        <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', fontWeight: 700 }}>BENEFICIARY TITLE</div>
                        <div style={{ fontSize: '15px', fontWeight: 800, color: 'white', marginTop: '4px' }}>{merchantInfo.accountTitle}</div>
                      </div>
                      {merchantInfo.qrCode && (
                        <img src={merchantInfo.qrCode} alt="Merchant QR" style={{ width: '48px', height: '48px', borderRadius: '8px' }} />
                      )}
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '12px', marginBottom: '14px' }}>
                      <div onClick={() => handleCopy(merchantInfo.accountNumber, 'Account Number')} style={{ cursor: 'pointer' }}>
                        <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', fontWeight: 700 }}>ACCOUNT NUMBER 📋</div>
                        <div style={{ fontSize: '14px', fontWeight: 800, color: '#818cf8', marginTop: '4px', fontFamily: 'monospace' }}>{merchantInfo.accountNumber}</div>
                      </div>
                      {merchantInfo.iban !== 'N/A' && (
                        <div onClick={() => handleCopy(merchantInfo.iban, 'IBAN')} style={{ cursor: 'pointer' }}>
                          <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', fontWeight: 700 }}>IBAN 📋</div>
                          <div style={{ fontSize: '12px', fontWeight: 700, color: 'rgba(255,255,255,0.7)', marginTop: '4px', fontFamily: 'monospace' }}>{merchantInfo.iban}</div>
                        </div>
                      )}
                    </div>

                    <div onClick={() => handleCopy(paymentRef, 'Payment Reference')} style={{ cursor: 'pointer', background: 'rgba(99,102,241,0.06)', padding: '10px 14px', borderRadius: '8px', border: '1px dashed rgba(99,102,241,0.2)' }}>
                      <div style={{ fontSize: '10px', color: '#818cf8', fontWeight: 700 }}>REQUIRED PAYMENT REFERENCE (MEMO/REMARK) 📋</div>
                      <div style={{ fontSize: '15px', fontWeight: 950, color: '#818cf8', marginTop: '4px', fontFamily: 'monospace' }}>{paymentRef}</div>
                    </div>
                  </div>

                  {/* Deep link prefill apps */}
                  <a
                    href="https://easypaisa.com.pk"
                    target="_blank"
                    className="btn btn-primary"
                    style={{ width: '100%', justifyContent: 'center', padding: '14px' }}
                  >
                    📲 Open Wallet App
                  </a>
                </div>

                {/* Promo Code & Verification */}
                <div>
                  <h4 style={{ fontSize: '13px', fontWeight: 700, color: 'white', marginBottom: '12px' }}>Checkout Verification</h4>
                  
                  {/* EXPANDABLE PROMO CODE */}
                  <div style={{ marginBottom: '16px' }}>
                    <button 
                      onClick={() => setPromoOpen(!promoOpen)}
                      style={{ background: 'transparent', border: 'none', color: '#818cf8', fontSize: '12px', fontWeight: 600, cursor: 'pointer', padding: 0 }}
                    >
                      {promoOpen ? '▼ Hide promo code options' : '▶ Have a promo code?'}
                    </button>
                    {promoOpen && (
                      <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                        <input 
                          type="text" 
                          placeholder="PROMO50" 
                          className="input" 
                          value={promoCode} 
                          onChange={e => setPromoCode(e.target.value)} 
                          style={{ padding: '8px', fontSize: '12px' }}
                        />
                        <button onClick={handleApplyPromo} className="btn btn-ghost btn-sm" style={{ padding: '0 12px' }}>Apply</button>
                      </div>
                    )}
                    {promoDiscount > 0 && <p style={{ fontSize: '11px', color: '#10b981', marginTop: '6px' }}>✓ Discount coupon active: {promoDiscount}% Off.</p>}
                    {promoError && <p style={{ fontSize: '11px', color: '#f43f5e', marginTop: '6px' }}>{promoError}</p>}
                  </div>

                  <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', lineHeight: 1.4, marginBottom: '20px' }}>
                    Transfer the funds using your preferred wallet application. Paste the exact **Reference ID** in your bank's Memo/Remarks field to link your subscription.
                  </p>

                  <button 
                    onClick={handleVerifyTimelineSimulate}
                    className="btn btn-emerald" 
                    style={{ width: '100%', justifyContent: 'center', padding: '12px' }}
                  >
                    ✓ I Have Transferred
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Verification Timeline status checks */}
          {verificationStatus !== 'idle' && (
            <div className="card" style={{ padding: '28px' }}>
              <h3 style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '18px', fontWeight: 700, color: 'white', marginBottom: '16px' }}>
                🛡️ AI Transaction Verification Corridor
              </h3>

              {verificationStatus === 'running' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: '#818cf8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px' }}>✓</div>
                    <span style={{ fontSize: '13px', color: 'white', fontWeight: 600 }}>1. Receiving reference handshake logs...</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: autoVerifyStep >= 2 ? '#818cf8' : 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px' }}>
                      {autoVerifyStep >= 2 ? '✓' : '•'}
                    </div>
                    <span style={{ fontSize: '13px', color: autoVerifyStep >= 2 ? 'white' : 'rgba(255,255,255,0.3)', fontWeight: 600 }}>2. Reconciling digital deposit ledger...</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: autoVerifyStep >= 3 ? '#818cf8' : 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px' }}>
                      {autoVerifyStep >= 3 ? '✓' : '•'}
                    </div>
                    <span style={{ fontSize: '13px', color: autoVerifyStep >= 3 ? 'white' : 'rgba(255,255,255,0.3)', fontWeight: 600 }}>3. Querying mobile billing adapter APIs...</span>
                  </div>
                  <div className="progress-bar" style={{ marginTop: '10px' }}>
                    <div className="progress-fill" style={{ width: `${(autoVerifyStep / 3) * 100}%`, background: '#818cf8', transition: 'width 1.5s ease' }} />
                  </div>
                </div>
              )}

              {/* Success Timeline */}
              {verificationStatus === 'auto_success' && (
                <div style={{ textAlign: 'center', padding: '20px 0' }}>
                  <span style={{ fontSize: '48px' }}>🎉</span>
                  <h4 style={{ fontSize: '16px', fontWeight: 800, color: '#10b981', marginTop: '12px' }}>Automatic Verification Complete</h4>
                  <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', marginTop: '6px' }}>
                    Your deposit reference has resolved. Premium SaaS configurations are active!
                  </p>
                  <button onClick={() => setVerificationStatus('idle')} className="btn btn-primary btn-sm" style={{ marginTop: '16px' }}>Return to settings</button>
                </div>
              )}

              {/* Fallback Form requested only if auto-verify fails */}
              {verificationStatus === 'fallback_proof' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '24px' }}>
                  <div>
                    <h4 style={{ fontSize: '14px', fontWeight: 700, color: 'white', marginBottom: '8px' }}>Auto-Verification Incomplete</h4>
                    <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', lineHeight: 1.4, marginBottom: '16px' }}>
                      We could not reconcile the payment parameters automatically. Please provide your transaction details for verification.
                    </p>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '10px', color: 'rgba(255,255,255,0.4)', fontWeight: 700, marginBottom: '6px' }}>TRANSACTION ID / REFERENCE NUMBER</label>
                        <input 
                          type="text" 
                          placeholder="e.g. 9988776655" 
                          className="input" 
                          value={trxIdInput} 
                          onChange={e => setTrxIdInput(e.target.value)} 
                          style={{ padding: '8px', fontSize: '12px' }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '10px', color: 'rgba(255,255,255,0.4)', fontWeight: 700, marginBottom: '6px' }}>RECEIPT SCREENSHOT</label>
                        <input 
                          type="file"
                          accept="image/*"
                          onChange={e => setReceiptFile(e.target.files?.[0] || null)}
                          className="input"
                          style={{ padding: '4px', fontSize: '11px', width: '100%' }}
                        />
                      </div>
                    </div>

                    <button 
                      onClick={handleSubmitFallbackReceipt} 
                      className="btn btn-primary" 
                      style={{ width: '100%', justifyContent: 'center' }}
                    >
                      🚀 Submit for Manual Approval
                    </button>
                  </div>

                </div>
              )}
            </div>
          )}

          {/* PAYMENT UNDER REVIEW NOTIFICATION */}
          {sub?.status === 'UNDER_REVIEW' && (
            <div className="card-magnetic glow-border" style={{ padding: '24px', borderLeft: '4px solid #3b82f6' }}>
              <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                <span style={{ fontSize: '32px' }}>🕵️</span>
                <div>
                  <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'white' }}>Deposit Verification in Progress</h3>
                  <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginTop: '4px' }}>
                    Our accounts ops team is verifying Transaction Reference ID **{sub.paymentReference}** against merchant logs. Access to premium capabilities will resolve dynamically.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
