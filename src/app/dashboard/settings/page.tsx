'use client';

import { useState, useEffect } from 'react';
import { useDialog } from '@/components/ui/DialogProvider';
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
import { PaymentRequestRepository, PaymentRequest, PaymentProvider, PaymentStatus } from '@/lib/repositories/PaymentRequestRepository';
import { NotificationRepository } from '@/lib/repositories/NotificationRepository';
import { compressImage, validateReceiptUpload } from '@/lib/imageUtils';
import { Settings, Dna, CreditCard, Archive, Lock, FileText, BarChart2, Briefcase, Smartphone, Landmark, CheckCircle, XCircle, Check, X, Shield, ShieldCheck, Clipboard, Copy, AlertTriangle, UploadCloud, Clock, Hourglass } from 'lucide-react';

export default function SettingsPage() {
  const { toast, confirm, prompt, showAILoading, hideAILoading } = useDialog();
  const { user, getIdToken } = useAuth();
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
    discipline: string;
    previousEducation: string;
    previousDegreeField: string;
    englishTests: { type: string; score: string; date: string }[];
    standardizedTests: { type: string; score: string; date: string }[];
    skills: string;
    experience: string;
    dynamicLinks: Record<string, string>;
    goal: string;
    careerGoal: string;
    level: string;
    targetOpportunities: string[];
    // Multi-dimensional DNA Matrix
    leadershipRoles: string;
    communityImpact: string;
    projects: string;
    researchPublications: string;
    interviewNarrative: string;
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
    discipline: 'Technology & Engineering',
    previousEducation: '',
    previousDegreeField: '',
    englishTests: [],
    standardizedTests: [],
    skills: '',
    experience: '',
    dynamicLinks: {},
    goal: '',
    careerGoal: '',
    level: 'undergraduate',
    targetOpportunities: [],
    leadershipRoles: '',
    communityImpact: '',
    projects: '',
    researchPublications: '',
    interviewNarrative: '',
    notifications: true,
    weeklyDigest: true,
    shareData: false,
  });
  const [saving, setSaving] = useState(false);

  // Billing state
  const [quota, setQuota] = useState<QuotaState | null>(null);
  const [savedCount, setSavedCount] = useState(0);
  const [currency, setCurrency] = useState<'PKR' | 'USD'>('USD');
  
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
  const [paymentRequests, setPaymentRequests] = useState<PaymentRequest[]>([]);

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
      // Fetch payment history
      PaymentRequestRepository.getUserRequests(user.uid).then(reqs => setPaymentRequests(reqs));
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
          const confirmCode = (promoCode || trxIdInput || '').toUpperCase();
          // The grant is authorized server-side (Admin SDK). Clients can no longer
          // write a premium subscription state directly — Firestore rules block it.
          try {
            const token = await getIdToken();
            const res = await fetch('/api/subscription/grant', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
              body: JSON.stringify({
                planId: selectedPlan,
                promoCode: confirmCode,
                paymentProvider: selectedProvider,
                paymentReference: orderId,
              }),
            });
            if (res.ok) {
              // The SubscriptionContext onSnapshot listener will reflect the new
              // state automatically once the server write lands.
              setVerificationStatus('auto_success');
            } else {
              // Not an auto-confirm code (402) or other error: fall back to receipt upload.
              setVerificationStatus('fallback_proof');
            }
          } catch (err) {
            console.error('Auto-confirm grant failed:', err);
            setVerificationStatus('fallback_proof');
          }
        }, 1500);
      }, 1500);
    }, 1500);
  };

  const handleSubmitFallbackReceipt = async () => {
    if (!trxIdInput) {
      toast('Please enter your transaction ID or Reference Number.');
      return;
    }
    
    // Prevent duplicate upload if already pending
    const hasPending = paymentRequests.some(req => req.status === PaymentStatus.PENDING);
    if (hasPending) {
      toast('You already have a payment waiting for review.');
      return;
    }

    setVerificationStatus('uploading');
    
    let proofUrl = 'screenshot_pending';
    
    // If real file selected, compress and upload it
    if (receiptFile && user?.uid) {
      const validation = validateReceiptUpload(receiptFile);
      if (!validation.valid) {
        toast(validation.error || 'Validation error');
        setVerificationStatus('fallback_proof');
        return;
      }

      try {
        const compressedFile = await compressImage(receiptFile, 0.4, 800);
        proofUrl = await uploadPaymentReceipt(user.uid, compressedFile);
      } catch (err) {
        console.error('Failed to upload receipt:', err);
        toast('Failed to upload receipt. Please try again.');
        setVerificationStatus('fallback_proof');
        return;
      }
    } else {
      toast('Please attach your payment receipt screenshot.');
      setVerificationStatus('fallback_proof');
      return;
    }

    // Create payment request
    await PaymentRequestRepository.createRequest({
      uid: user!.uid,
      userEmail: user!.email || '',
      userName: profile.name || user!.displayName || 'Unknown',
      planId: selectedPlan,
      provider: selectedProvider,
      paymentReference: trxIdInput,
      paymentProofUrl: proofUrl,
      promoCode: promoCode || undefined,
    });
    
    // Notify admin via Firestore
    await NotificationRepository.createNotification({
      userId: 'admin',
      title: 'New Payment Receipt',
      message: `${profile.name || user!.email} submitted a payment receipt for ${selectedPlan}.`,
      type: 'PAYMENT_SUBMITTED',
      link: '/dashboard/admin',
    });

    // Notify admin via Email API (server verifies the token and derives identity from it).
    getIdToken().then(token =>
      fetch('/api/admin/notify-receipt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          userEmail: user!.email,
          userName: profile.name || user!.displayName,
          planId: selectedPlan,
          provider: selectedProvider,
          referenceId: trxIdInput,
          receiptUrl: proofUrl,
        }),
      })
    ).catch(err => console.error('Failed to trigger email API:', err));

    // Reload history
    const reqs = await PaymentRequestRepository.getUserRequests(user!.uid);
    setPaymentRequests(reqs);

    setCheckoutStep(1);
    setVerificationStatus('idle');
  };

  const handleResetToFree = async () => {
    if (await confirm('Revert account to Free tier?')) {
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
          <Settings size={28} className="inline mr-2 text-indigo-400" /> Settings & Subscriptions
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
          <Dna size={14} className="inline mr-2 text-indigo-400" /> Opportunity DNA Profile
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
          <CreditCard size={14} className="inline mr-2 text-emerald-400" /> Plan & Billing Dashboard
        </button>
        
        <Link href="/dashboard/vault" style={{ textDecoration: 'none' }}>
          <button
            style={{
              padding: '8px 16px', borderRadius: '8px',
              border: '1px solid transparent',
              background: 'transparent',
              color: 'rgba(255,255,255,0.5)',
              fontSize: '13px', fontWeight: 700, cursor: 'pointer'
            }}
          >
            <Archive size={14} className="inline mr-2 text-amber-400" /> Evidence Vault
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
          <Lock size={14} className="inline mr-2 text-red-400" /> Account & Security
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
              <div style={{ display: 'flex', gap: '8px' }}>

                <button 
                  className="btn btn-primary" 
                  onClick={handleSaveProfile} 
                  disabled={saving}
                >
                  {saving ? 'Saving...' : 'Save Profile'}
                </button>
              </div>
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

            <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'white', marginTop: '24px', marginBottom: '12px' }}>Academic Profile</h3>
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
                  <option value="highschool">High School</option>
                  <option value="undergraduate">Undergraduate</option>
                  <option value="masters">Masters</option>
                  <option value="phd">PhD</option>
                  <option value="postdoc">Postdoc</option>
                  <option value="professional">Professional</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginBottom: '6px' }}>Broad Discipline</label>
                <select className="input" value={profile.discipline} onChange={e => updateProfileField('discipline', e.target.value)}>
                  <option value="Technology & Engineering">Technology & Engineering</option>
                  <option value="Medical & Healthcare">Medical & Healthcare</option>
                  <option value="Business & Management">Business & Management</option>
                  <option value="Arts & Design">Arts & Design</option>
                  <option value="Natural Sciences">Natural Sciences</option>
                  <option value="Humanities & Law">Humanities & Law</option>
                </select>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginBottom: '6px' }}>Field of Study</label>
                <input className="input" value={profile.field} onChange={e => updateProfileField('field', e.target.value)} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginBottom: '6px' }}>Previous Education / Degree</label>
                <input className="input" value={profile.level === 'undergraduate' ? profile.previousEducation : profile.previousDegreeField} onChange={e => updateProfileField(profile.level === 'undergraduate' ? 'previousEducation' : 'previousDegreeField', e.target.value)} />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '24px', marginBottom: '12px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'white' }}>Global Readiness</h3>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <label style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>English Tests</label>
              <button className="btn btn-secondary btn-sm" onClick={() => updateProfileField('englishTests', [...(profile.englishTests || []), { type: 'Not Planned', score: '', date: '' }])}>+ Add Test</button>
            </div>
            {(profile.englishTests || []).map((test, index) => (
              <div key={`eng-${index}`} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: '16px', marginBottom: '16px', alignItems: 'end' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginBottom: '6px' }}>Test Type</label>
                  <select className="input" value={test.type} onChange={e => {
                    const newTests = [...profile.englishTests];
                    newTests[index].type = e.target.value;
                    updateProfileField('englishTests', newTests);
                  }}>
                    <option value="Not Planned">Not Planned</option>
                    <option value="IELTS">IELTS</option>
                    <option value="TOEFL">TOEFL</option>
                    <option value="PTE">PTE Academic</option>
                    <option value="Duolingo">Duolingo</option>
                    <option value="Cambridge">Cambridge</option>
                    <option value="MOI">MOI</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginBottom: '6px' }}>Score</label>
                  <input className="input" value={test.score} onChange={e => {
                    const newTests = [...profile.englishTests];
                    newTests[index].score = e.target.value;
                    updateProfileField('englishTests', newTests);
                  }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginBottom: '6px' }}>Date</label>
                  <input type="date" className="input" value={test.date} onChange={e => {
                    const newTests = [...profile.englishTests];
                    newTests[index].date = e.target.value;
                    updateProfileField('englishTests', newTests);
                  }} />
                </div>
                <button 
                  onClick={() => updateProfileField('englishTests', profile.englishTests.filter((_, i) => i !== index))}
                  style={{ background: 'none', border: 'none', color: '#fb7185', cursor: 'pointer', paddingBottom: '12px' }}
                >
                  <X size={16} />
                </button>
              </div>
            ))}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', marginTop: '24px' }}>
              <label style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>Standardized Tests</label>
              <button className="btn btn-secondary btn-sm" onClick={() => updateProfileField('standardizedTests', [...(profile.standardizedTests || []), { type: '', score: '' }])}>+ Add Test</button>
            </div>
            {(profile.standardizedTests || []).map((test, index) => (
              <div key={`std-${index}`} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '16px', marginBottom: '16px', alignItems: 'end' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginBottom: '6px' }}>Test Type</label>
                  <select className="input" value={test.type} onChange={e => {
                    const newTests = [...profile.standardizedTests];
                    newTests[index].type = e.target.value;
                    updateProfileField('standardizedTests', newTests);
                  }}>
                    <option value="">None</option>
                    <option value="GRE">GRE</option>
                    <option value="GMAT">GMAT</option>
                    <option value="SAT">SAT</option>
                    <option value="ACT">ACT</option>
                    <option value="LSAT">LSAT</option>
                    <option value="MCAT">MCAT</option>
                    <option value="GATE">GATE</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginBottom: '6px' }}>Score</label>
                  <input className="input" value={test.score} onChange={e => {
                    const newTests = [...profile.standardizedTests];
                    newTests[index].score = e.target.value;
                    updateProfileField('standardizedTests', newTests);
                  }} />
                </div>
                <button 
                  onClick={() => updateProfileField('standardizedTests', profile.standardizedTests.filter((_, i) => i !== index))}
                  style={{ background: 'none', border: 'none', color: '#fb7185', cursor: 'pointer', paddingBottom: '12px' }}
                >
                  <X size={16} />
                </button>
              </div>
            ))}

            <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'white', marginTop: '24px', marginBottom: '12px' }}>Leadership & Impact</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginBottom: '6px' }}>Key Leadership Roles</label>
                <textarea className="input" style={{ minHeight: '60px', resize: 'vertical' }} value={profile.leadershipRoles} onChange={e => updateProfileField('leadershipRoles', e.target.value)} placeholder="President of Tech Club..." />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginBottom: '6px' }}>Community Impact</label>
                <textarea className="input" style={{ minHeight: '60px', resize: 'vertical' }} value={profile.communityImpact} onChange={e => updateProfileField('communityImpact', e.target.value)} placeholder="Organized a hackathon for 500 students..." />
              </div>
            </div>

            <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'white', marginTop: '24px', marginBottom: '12px' }}>Professional Assets</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ display: 'block', fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginBottom: '6px' }}>Skills (comma-separated)</label>
                <textarea className="input" style={{ minHeight: '40px', resize: 'vertical' }} value={profile.skills} onChange={e => updateProfileField('skills', e.target.value)} placeholder="Python, Machine Learning, Leadership..." />
              </div>
              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ display: 'block', fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginBottom: '6px' }}>Work / Research Experience Summary</label>
                <textarea className="input" style={{ minHeight: '60px', resize: 'vertical' }} value={profile.experience} onChange={e => updateProfileField('experience', e.target.value)} placeholder="2 years as research assistant..." />
              </div>
              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ display: 'block', fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginBottom: '6px' }}>Notable Projects & Ventures</label>
                <textarea className="input" style={{ minHeight: '60px', resize: 'vertical' }} value={profile.projects} onChange={e => updateProfileField('projects', e.target.value)} placeholder="Built an AI app that..." />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginBottom: '6px' }}>LinkedIn Profile</label>
                <input className="input" value={profile.dynamicLinks?.linkedin || ''} onChange={e => updateProfileField('dynamicLinks', { ...profile.dynamicLinks, linkedin: e.target.value })} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginBottom: '6px' }}>Personal Website</label>
                <input className="input" value={profile.dynamicLinks?.website || ''} onChange={e => updateProfileField('dynamicLinks', { ...profile.dynamicLinks, website: e.target.value })} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginBottom: '6px' }}>GitHub Profile</label>
                <input className="input" value={profile.dynamicLinks?.github || ''} onChange={e => updateProfileField('dynamicLinks', { ...profile.dynamicLinks, github: e.target.value })} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginBottom: '6px' }}>ORCID / ResearchGate / Behance</label>
                <input className="input" value={profile.dynamicLinks?.orcid || profile.dynamicLinks?.behance || ''} onChange={e => updateProfileField('dynamicLinks', { ...profile.dynamicLinks, orcid: e.target.value })} />
              </div>
            </div>

            <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'white', marginTop: '24px', marginBottom: '12px' }}>Research & Narrative</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginBottom: '6px' }}>Research & Publications</label>
                <textarea className="input" style={{ minHeight: '60px', resize: 'vertical' }} value={profile.researchPublications} onChange={e => updateProfileField('researchPublications', e.target.value)} placeholder="Published paper on..." />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginBottom: '6px' }}>Personal Interview Narrative</label>
                <textarea className="input" style={{ minHeight: '60px', resize: 'vertical' }} value={profile.interviewNarrative} onChange={e => updateProfileField('interviewNarrative', e.target.value)} placeholder="My core story is overcoming..." />
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
                  { key: 'onboarding_resume', label: 'Resume / CV', icon: <FileText size={20} className="text-indigo-400" /> },
                  { key: 'onboarding_transcript', label: 'Academic Transcript', icon: <BarChart2 size={20} className="text-emerald-400" /> },
                  { key: 'onboarding_passport', label: 'Passport', icon: <Lock size={20} className="text-blue-400" /> },
                  { key: 'onboarding_ielts', label: 'IELTS Score', icon: <CheckCircle size={20} className="text-amber-400" /> },
                  { key: 'onboarding_linkedin', label: 'LinkedIn', icon: <Briefcase size={20} className="text-indigo-500" /> },
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
                      <Link href="/dashboard/vault">
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

          {/* PAYMENT TIMELINE / HISTORY */}
          {paymentRequests.length > 0 && (
            <div className="card" style={{ padding: '24px' }}>
              <h3 style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '16px', fontWeight: 700, color: 'white', marginBottom: '20px' }}>
                Payment History & Verification Timeline
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {paymentRequests.map((req) => {
                  let badgeColor = 'rgba(255,255,255,0.1)';
                  let textColor = 'rgba(255,255,255,0.5)';
                  if (req.status === PaymentStatus.PENDING) { badgeColor = 'rgba(245,158,11,0.2)'; textColor = '#fcd34d'; }
                  if (req.status === PaymentStatus.APPROVED) { badgeColor = 'rgba(16,185,129,0.2)'; textColor = '#34d399'; }
                  if (req.status === PaymentStatus.REJECTED) { badgeColor = 'rgba(244,63,94,0.2)'; textColor = '#fb7185'; }
                  
                  return (
                    <div key={req.id} style={{ display: 'flex', gap: '16px', alignItems: 'flex-start', padding: '16px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                      <div style={{ 
                        width: '40px', height: '40px', borderRadius: '50%', background: badgeColor, color: textColor,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', flexShrink: 0 
                      }}>
                        {req.status === PaymentStatus.PENDING && <Hourglass size={18} className="text-amber-400" />}
                        {req.status === PaymentStatus.APPROVED && <Check size={18} className="text-emerald-500" />}
                        {req.status === PaymentStatus.REJECTED && <X size={18} className="text-rose-500" />}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ fontSize: '14px', fontWeight: 700, color: 'white' }}>{req.planId.toUpperCase()} • {req.provider.toUpperCase()}</div>
                          <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>
                            {new Date(req.submittedAt).toLocaleDateString()}
                          </div>
                        </div>
                        <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginTop: '4px' }}>
                          Reference ID: <span style={{ fontFamily: 'monospace', color: 'white' }}>{req.paymentReference}</span>
                        </div>
                        {req.status === PaymentStatus.PENDING && (
                          <div style={{ fontSize: '12px', color: '#fcd34d', marginTop: '8px', padding: '8px 12px', background: 'rgba(245,158,11,0.1)', borderRadius: '6px' }}>
                            Currently under manual review by the Executive AI team. Expected resolution: &lt; 2 hours.
                          </div>
                        )}
                        {req.status === PaymentStatus.REJECTED && req.rejectReason && (
                          <div style={{ fontSize: '12px', color: '#fb7185', marginTop: '8px', padding: '8px 12px', background: 'rgba(244,63,94,0.1)', borderRadius: '6px' }}>
                            <strong>Rejection Reason:</strong> {req.rejectReason}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ACTIVE STEP MODULES */}

          {/* Step 1: Premium Pricing Page */}
          {checkoutStep === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
              
              {/* CURRENT USAGE SUMMARY CARDS */}
              <div className="card" style={{ padding: '24px' }}>
                <h3 style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '15px', fontWeight: 700, color: 'white', marginBottom: '16px' }}>
                  <BarChart2 size={16} className="inline mr-2 text-indigo-400" /> Current Quotas & Feature Access
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
                  <div className="glass-sm" style={{ padding: '16px' }}>
                    <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', fontWeight: 700 }}>DAILY AI DISPATCHES</div>
                    <div style={{ fontSize: '20px', fontWeight: 900, color: 'white', marginTop: '4px' }}>{quota?.dailyCredits || 0} / 3</div>
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
                        <li><Check size={12} className="inline mr-1 text-emerald-500" /> {plan.id === 'free' ? '3 daily AI dispatches' : 'Unlimited priority AI runs'}</li>
                        <li><Check size={12} className="inline mr-1 text-emerald-500" /> {plan.id === 'free' ? 'Save up to 5 opportunities' : 'Unlimited opportunity saving'}</li>
                        <li>{plan.pdfExportEnabled ? <><Check size={12} className="inline mr-1 text-emerald-500" /> Executive PDF report downloads</> : <><X size={12} className="inline mr-1 text-red-500" /> No document exports</>}</li>
                        <li>{plan.advisorEnabled ? <><Check size={12} className="inline mr-1 text-emerald-500" /> Proactive executive AI coaching</> : <><X size={12} className="inline mr-1 text-red-500" /> No AI coach consultations</>}</li>
                        <li>{plan.simulatorEnabled ? <><Check size={12} className="inline mr-1 text-emerald-500" /> Real-time probability simulator</> : <><X size={12} className="inline mr-1 text-red-500" /> Static score calculations</>}</li>
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

          {/* Step 2: Choose Payment Method / Concierge Checkout */}
          {checkoutStep === 2 && (
            <div className="card" style={{ padding: '32px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
                <div>
                  <h3 style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '24px', fontWeight: 800, color: 'white' }}>
                    Concierge Checkout
                  </h3>
                  <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '14px', marginTop: '4px' }}>
                    Secure your premium access.
                  </p>
                </div>
                <button onClick={() => setCheckoutStep(1)} className="btn btn-ghost">← Back to Plans</button>
              </div>

              {/* The Stripe Limitation Notice */}
              <div style={{ padding: '24px', background: 'rgba(99,102,241,0.05)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: '16px', marginBottom: '32px', display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
                <div style={{ marginBottom: '16px', display: 'flex' }}><CreditCard size={32} className="text-indigo-400 drop-shadow-md" /></div>
                <div>
                  <h4 style={{ fontSize: '16px', fontWeight: 700, color: 'white', marginBottom: '8px' }}>Important Payment Notice</h4>
                  <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.7)', lineHeight: 1.6, marginBottom: '16px' }}>
                    Stripe and automated international USD payments are currently not personally available in Pakistan. While we work on fully integrating them in the future, we have set up a seamless manual approval process for our Pakistani users.
                  </p>
                  <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.7)', lineHeight: 1.6 }}>
                    Please select a local payment corridor below. You will be provided with the exact <strong>PKR equivalent</strong> amount to transfer. Alternatively, you can always manually email your payment receipt to <a href="mailto:artasyaskar@gmail.com" style={{ color: '#818cf8', textDecoration: 'none', fontWeight: 600 }}>artasyaskar@gmail.com</a> for instant manual approval.
                  </p>
                </div>
              </div>

              <h4 style={{ fontSize: '14px', fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '16px' }}>Select Manual Payment Corridor</h4>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
                {merchants.map(m => (
                  <div
                    key={m.providerId}
                    onClick={() => handleChooseMethod(m.providerId)}
                    className="glass-panel"
                    style={{
                      padding: '24px',
                      borderRadius: '16px',
                      cursor: 'pointer',
                      border: '1px solid rgba(255,255,255,0.06)',
                      textAlign: 'center',
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                      position: 'relative',
                      overflow: 'hidden'
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.borderColor = 'rgba(99,102,241,0.5)';
                      e.currentTarget.style.transform = 'translateY(-4px)';
                      e.currentTarget.style.boxShadow = '0 10px 30px -10px rgba(99,102,241,0.2)';
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)';
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                      {m.providerId === 'easypaisa' || m.providerId === 'jazzcash' ? <Smartphone size={32} className="text-indigo-400" /> : <Landmark size={32} className="text-emerald-400" />}
                    <div style={{ fontSize: '16px', fontWeight: 700, color: 'white' }}>{m.name}</div>
                    <div style={{ fontSize: '12px', color: '#10b981', marginTop: '6px', fontWeight: 600 }}>0% Transaction Fee</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Step 3: guided checkout */}
          {checkoutStep === 3 && (
            <div className="card" style={{ padding: '32px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
                <div>
                  <h3 style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '24px', fontWeight: 800, color: 'white' }}>
                    Complete Your Upgrade
                  </h3>
                  <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '14px', marginTop: '4px' }}>
                    Follow the instructions below to verify your payment.
                  </p>
                </div>
                <button onClick={() => setCheckoutStep(2)} className="btn btn-ghost">← Payment Corridors</button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '32px' }}>
                {/* Account card details */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  
                  <div className="glass-panel" style={{ padding: '24px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
                      <div>
                        <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', fontWeight: 700, letterSpacing: '1px' }}>AMOUNT TO TRANSFER</div>
                        <div style={{ fontSize: '32px', fontWeight: 900, color: '#10b981', marginTop: '4px', fontFamily: 'Space Grotesk, sans-serif' }}>
                          Rs. {PRICING_PLANS.find(p => p.id === selectedPlan)?.pricePKR.toLocaleString() || '0'}
                        </div>
                        <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', marginTop: '4px' }}>
                          Equivalent to ${PRICING_PLANS.find(p => p.id === selectedPlan)?.priceUSD || '0'} USD
                        </div>
                      </div>
                      <div style={{ background: 'rgba(99,102,241,0.1)', padding: '8px 12px', borderRadius: '8px', border: '1px solid rgba(99,102,241,0.2)' }}>
                        <span style={{ fontSize: '12px', fontWeight: 700, color: '#818cf8' }}>{merchantInfo?.name}</span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                      <div>
                        <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', fontWeight: 700, letterSpacing: '1px' }}>BENEFICIARY TITLE</div>
                        <div style={{ fontSize: '16px', fontWeight: 800, color: 'white', marginTop: '6px' }}>{merchantInfo?.accountTitle}</div>
                      </div>
                      {merchantInfo?.qrCode && (
                        <img src={merchantInfo.qrCode} alt="Merchant QR" style={{ width: '56px', height: '56px', borderRadius: '12px' }} />
                      )}
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '20px' }}>
                      <div onClick={() => handleCopy(merchantInfo?.accountNumber || '', 'Account Number')} style={{ cursor: 'pointer', background: 'rgba(0,0,0,0.2)', padding: '16px', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', fontWeight: 700, letterSpacing: '1px' }}>ACCOUNT NUMBER</div>
                          <div style={{ fontSize: '16px', fontWeight: 800, color: '#white', marginTop: '6px', fontFamily: 'monospace' }}>{merchantInfo?.accountNumber}</div>
                        </div>
                        <Copy size={16} className="text-indigo-400" />
                      </div>
                      
                      {merchantInfo?.iban && merchantInfo.iban !== 'N/A' && (
                        <div onClick={() => handleCopy(merchantInfo.iban, 'IBAN')} style={{ cursor: 'pointer', background: 'rgba(0,0,0,0.2)', padding: '16px', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', fontWeight: 700, letterSpacing: '1px' }}>IBAN</div>
                            <div style={{ fontSize: '14px', fontWeight: 700, color: 'white', marginTop: '6px', fontFamily: 'monospace' }}>{merchantInfo.iban}</div>
                          </div>
                          <Copy size={16} className="text-indigo-400" />
                        </div>
                      )}
                    </div>

                    <div onClick={() => handleCopy(paymentRef, 'Payment Reference')} style={{ cursor: 'pointer', background: 'rgba(99,102,241,0.06)', padding: '16px', borderRadius: '12px', border: '1px dashed rgba(99,102,241,0.3)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontSize: '11px', color: '#818cf8', fontWeight: 700, letterSpacing: '1px' }}>REQUIRED REFERENCE (MEMO/REMARK)</div>
                        <div style={{ fontSize: '18px', fontWeight: 950, color: '#818cf8', marginTop: '6px', fontFamily: 'monospace' }}>{paymentRef}</div>
                      </div>
                      <Copy size={16} className="text-indigo-400" />
                    </div>
                  </div>

                  {/* Deep link prefill apps */}
                  <a
                    href="https://easypaisa.com.pk"
                    target="_blank"
                    className="btn btn-secondary"
                    style={{ width: '100%', justifyContent: 'center', padding: '16px', fontSize: '14px' }}
                  >
                    <Smartphone size={14} className="inline mr-2" /> Open Wallet App
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
                    {promoDiscount > 0 && <p style={{ fontSize: '11px', color: '#10b981', marginTop: '6px' }}><Check size={12} className="inline mr-1 text-emerald-500" /> Discount coupon active: {promoDiscount}% Off.</p>}
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
                    <Check size={14} className="inline mr-2" /> I Have Transferred
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Verification Timeline status checks */}
          {verificationStatus !== 'idle' && (
            <div className="card" style={{ padding: '28px' }}>
              <h3 style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '18px', fontWeight: 700, color: 'white', marginBottom: '16px' }}>
                <ShieldCheck size={18} className="inline mr-2 text-indigo-400" /> AI Transaction Verification Corridor
              </h3>

              {verificationStatus === 'running' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: '#818cf8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px' }}><Check size={12} className="text-white" /></div>
                    <span style={{ fontSize: '13px', color: 'white', fontWeight: 600 }}>1. Receiving reference handshake logs...</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: autoVerifyStep >= 2 ? '#818cf8' : 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px' }}>
                      {autoVerifyStep >= 2 ? <Check size={12} className="text-white" /> : <div style={{width: 4, height: 4, borderRadius: '50%', background: 'white'}}/>}
                    </div>
                    <span style={{ fontSize: '13px', color: autoVerifyStep >= 2 ? 'white' : 'rgba(255,255,255,0.3)', fontWeight: 600 }}>2. Reconciling digital deposit ledger...</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: autoVerifyStep >= 3 ? '#818cf8' : 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px' }}>
                      {autoVerifyStep >= 3 ? <Check size={12} className="text-white" /> : <div style={{width: 4, height: 4, borderRadius: '50%', background: 'white'}}/>}
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
                <div style={{ textAlign: 'center', padding: '20px 0', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <CheckCircle size={48} className="text-emerald-400 mb-2" />
                  <h4 style={{ fontSize: '16px', fontWeight: 800, color: '#10b981', marginTop: '12px' }}>Automatic Verification Complete</h4>
                  <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', marginTop: '6px' }}>
                    Your deposit reference has resolved. Premium SaaS configurations are active!
                  </p>
                  <button onClick={() => setVerificationStatus('idle')} className="btn btn-primary btn-sm" style={{ marginTop: '16px' }}>Return to settings</button>
                </div>
              )}

              {/* Fallback Form requested only if auto-verify fails */}
              {verificationStatus === 'fallback_proof' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '32px' }}>
                  <div>
                    <h4 style={{ fontSize: '18px', fontWeight: 800, color: 'white', marginBottom: '12px' }}>Manual Receipt Verification</h4>
                    <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)', lineHeight: 1.5, marginBottom: '24px' }}>
                      Automated verification may take up to 24 hours depending on the bank network. Please upload your transaction receipt screenshot for instant manual approval by our team.
                    </p>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '24px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '11px', color: '#818cf8', fontWeight: 700, marginBottom: '8px', letterSpacing: '1px' }}>TRANSACTION ID / REFERENCE NUMBER</label>
                        <input 
                          type="text" 
                          placeholder="e.g. 9988776655" 
                          className="input" 
                          value={trxIdInput} 
                          onChange={e => setTrxIdInput(e.target.value)} 
                          style={{ padding: '12px 16px', fontSize: '14px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)' }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '11px', color: '#818cf8', fontWeight: 700, marginBottom: '8px', letterSpacing: '1px' }}>RECEIPT SCREENSHOT</label>
                        <div style={{ position: 'relative', width: '100%' }}>
                          <input 
                            type="file"
                            accept="image/*"
                            onChange={e => setReceiptFile(e.target.files?.[0] || null)}
                            style={{ 
                              position: 'absolute', width: '100%', height: '100%', opacity: 0, cursor: 'pointer', zIndex: 10 
                            }}
                          />
                          <div style={{ 
                            padding: '24px', 
                            background: receiptFile ? 'rgba(16,185,129,0.05)' : 'rgba(99,102,241,0.05)', 
                            border: receiptFile ? '1px dashed rgba(16,185,129,0.4)' : '1px dashed rgba(99,102,241,0.3)', 
                            borderRadius: '12px', 
                            textAlign: 'center',
                            transition: 'all 0.2s ease'
                          }}>
                            <div style={{ fontSize: '24px', marginBottom: '8px' }}>{receiptFile ? '✅' : '📤'}</div>
                            <div style={{ fontSize: '14px', fontWeight: 600, color: receiptFile ? '#10b981' : 'white' }}>
                              {receiptFile ? receiptFile.name : 'Click or drag receipt image here'}
                            </div>
                            <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', marginTop: '4px' }}>PNG, JPG, or PDF up to 5MB</div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <button 
                      onClick={handleSubmitFallbackReceipt} 
                      className="btn btn-primary" 
                      style={{ width: '100%', justifyContent: 'center', padding: '16px', fontSize: '14px', fontWeight: 700 }}
                    >
                      🚀 Submit for Fast-Track Approval
                    </button>
                    
                    <p style={{ textAlign: 'center', fontSize: '12px', color: 'rgba(255,255,255,0.4)', marginTop: '16px' }}>
                      Alternative: Email receipt to <a href="mailto:artasyaskar@gmail.com" style={{ color: '#818cf8' }}>artasyaskar@gmail.com</a>
                    </p>
                  </div>
                  
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ padding: '32px', background: 'rgba(255,255,255,0.02)', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.05)', textAlign: 'center' }}>
                      <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚡</div>
                      <h4 style={{ fontSize: '16px', fontWeight: 700, color: 'white', marginBottom: '12px' }}>Why upload?</h4>
                      <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', lineHeight: 1.5 }}>
                        Manual verification skips the bank settlement delay and grants you instant premium access within minutes of our admins reviewing the receipt.
                      </p>
                    </div>
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
