'use client';

import { useState, useEffect } from 'react';
import { useDialog } from '@/components/ui/DialogProvider';
import { useAuth } from '@/components/auth/AuthProvider';
import { PaymentMerchantConfig } from '@/lib/paymentAdapter';
import { SubscriptionRecord } from '@/lib/subscription';
import { fetchPaymentMerchants, adminUpdateMerchants } from '@/lib/db';
import { OpportunityRepository } from '@/lib/repositories/OpportunityRepository';
import { PaymentRequestRepository, PaymentRequest } from '@/lib/repositories/PaymentRequestRepository';
import { GLOBAL_OPPORTUNITIES } from '@/lib/opportunities-data';
import { Crown, RefreshCw, TrendingUp, Search, Telescope, Zap, Rocket, Globe, Flame, Database, Cloud, Brain, Sparkles, FileText, Inbox, Landmark, AlertTriangle, CheckCircle, Users, Shield, Filter } from 'lucide-react';

export default function AdminDashboardPage() {
  const { toast, confirm, prompt, showAILoading, hideAILoading } = useDialog();
  const { user, getIdToken } = useAuth();
  
  // Security
  const [password, setPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  
  // Data
  const [metrics, setMetrics] = useState<any>(null);
  const [aiMetrics, setAiMetrics] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [activeTab, setActiveTab] = useState<'business_intel' | 'opp_intel' | 'system_health' | 'ai_logs' | 'billing_ops' | 'merchants'>('business_intel');
  const [merchants, setMerchants] = useState<PaymentMerchantConfig[]>([]);
  const [pendingQueue, setPendingQueue] = useState<PaymentRequest[]>([]);
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [userFilter, setUserFilter] = useState<'all' | 'monthly' | 'lifetime' | 'free' | 'pro'>('all');
  
  // Opp Intel
  const [dbCount, setDbCount] = useState(0);
  const [seeding, setSeeding] = useState(false);

  useEffect(() => {
    fetchPaymentMerchants().then(m => setMerchants(m));
    PaymentRequestRepository.getPendingRequests().then(q => setPendingQueue(q));
    OpportunityRepository.getAllOpportunities().then(opps => setDbCount(opps.length));
  }, []);

  const handleMerchantChange = (index: number, field: keyof PaymentMerchantConfig, value: any) => {
    const updated = [...merchants];
    updated[index] = { ...updated[index], [field]: value };
    setMerchants(updated);
    adminUpdateMerchants(updated);
  };

  const handleApprove = async (reqId: string) => {
    if (processingIds.has(reqId)) return; // guard against double-clicks
    setProcessingIds(prev => new Set(prev).add(reqId));
    try {
      await PaymentRequestRepository.approvePaymentRequest(reqId);
      toast('Subscription approved!');
      fetchData(); // refresh telemetry
    } catch (e: any) {
      // e.g. the request was already approved/rejected in another tab or a prior click
      toast(`Could not approve payment: ${e?.message || 'Unknown error'}`);
    } finally {
      const updatedQueue = await PaymentRequestRepository.getPendingRequests();
      setPendingQueue(updatedQueue);
      setProcessingIds(prev => {
        const next = new Set(prev);
        next.delete(reqId);
        return next;
      });
    }
  };

  const handleReject = async (reqId: string) => {
    if (processingIds.has(reqId)) return; // guard against double-clicks
    const reason = await prompt('Reason for rejection? (e.g. Invalid receipt, Amount mismatch)') || 'Invalid receipt';
    setProcessingIds(prev => new Set(prev).add(reqId));
    try {
      await PaymentRequestRepository.rejectPaymentRequest(reqId, reason);
      toast('Payment proof rejected. Notification sent to user.');
    } catch (e: any) {
      toast(`Could not reject payment: ${e?.message || 'Unknown error'}`);
    } finally {
      const updatedQueue = await PaymentRequestRepository.getPendingRequests();
      setPendingQueue(updatedQueue);
      setProcessingIds(prev => {
        const next = new Set(prev);
        next.delete(reqId);
        return next;
      });
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === 'Naina2006') {
      setIsAuthenticated(true);
      fetchData();
    } else {
      setError('Incorrect password');
    }
  };

  const handleSeedDatabase = async () => {
    if (!await confirm(`Are you sure you want to seed ${GLOBAL_OPPORTUNITIES.length} opportunities into Firestore? Existing records with the same ID will be overwritten.`)) return;
    setSeeding(true);
    try {
      await OpportunityRepository.seedOpportunitiesToFirestore(GLOBAL_OPPORTUNITIES);
      toast('Seeding complete!');
      const opps = await OpportunityRepository.getAllOpportunities(true);
      setDbCount(opps.length);
    } catch (e: any) {
      toast(`Seeding failed: ${e.message}`);
    }
    setSeeding(false);
  };

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);
    setError('');
    
    try {
      const token = await getIdToken(true);
      const res = await fetch('/api/admin/metrics', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to fetch metrics');
      }
      setMetrics(data.metrics);
      setUsers(data.users);
      if (data.aiMetrics) setAiMetrics(data.aiMetrics);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (user?.email !== 'artasyaskar@gmail.com') {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: '#ef4444' }}>
        <h2>Forbidden</h2>
        <p>You do not have permission to view this page.</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', minHeight: '60vh' }}>
        <form onSubmit={handleLogin} className="glass" style={{ padding: '40px', borderRadius: '16px', width: '100%', maxWidth: '400px', textAlign: 'center' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 800, color: 'white', marginBottom: '8px' }}>Admin Access</h2>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '14px', marginBottom: '24px' }}>Enter the master password to continue.</p>
          
          <input 
            type="password" 
            placeholder="Master Password" 
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{ 
              width: '100%', 
              padding: '12px 16px', 
              borderRadius: '8px', 
              border: '1px solid rgba(255,255,255,0.1)', 
              background: 'rgba(0,0,0,0.2)', 
              color: 'white',
              marginBottom: '16px'
            }}
          />
          
          {error && <div style={{ color: '#ef4444', fontSize: '13px', marginBottom: '16px' }}>{error}</div>}
          
          <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
            Unlock Dashboard
          </button>
        </form>
      </div>
    );
  }

  const handleGrantPro = async (userId: string, userEmail: string, userName: string, planId: string) => {
    try {
      const token = await getIdToken();
      if (!token) return toast('Session expired.');

      const res = await fetch('/api/admin/grant-plan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          userId,
          userEmail,
          userName,
          planId
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to grant plan');
      
      fetchData(); // Refresh metrics and directory
    } catch (err: any) {
      toast(err.message);
    }
  };

  const isMonthlyUser = (u: any) => {
    if (u.plan !== 'Paid') return false;
    if (u.subscriptionType) return u.subscriptionType === 'monthly';
    if (u.planId === 'founder_lifetime' || u.planId === 'professional_lifetime' || (u.planId && u.planId.includes('lifetime'))) return false;
    return u.planId === 'professional_monthly' || u.planId === 'pro_monthly' || !u.planId;
  };

  const isLifetimeUser = (u: any) => {
    if (u.plan !== 'Paid') return false;
    if (u.subscriptionType) return u.subscriptionType === 'lifetime';
    return u.planId === 'founder_lifetime' || u.planId === 'professional_lifetime' || (u.planId && u.planId.includes('lifetime'));
  };

  const isFreeUser = (u: any) => {
    if (u.subscriptionType) return u.subscriptionType === 'free';
    return u.plan === 'Free';
  };

  const filteredUsers = users.filter(u => {
    if (userFilter === 'monthly' && !isMonthlyUser(u)) return false;
    if (userFilter === 'lifetime' && !isLifetimeUser(u)) return false;
    if (userFilter === 'free' && !isFreeUser(u)) return false;
    if (userFilter === 'pro' && u.plan !== 'Paid') return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const nameMatch = (u.name || '').toLowerCase().includes(q);
      const emailMatch = (u.email || '').toLowerCase().includes(q);
      const countryMatch = (u.country || '').toLowerCase().includes(q);
      return nameMatch || emailMatch || countryMatch;
    }
    return true;
  });

  const allCount = users.length;
  const monthlyCount = users.filter(isMonthlyUser).length;
  const lifetimeCount = users.filter(isLifetimeUser).length;
  const freeCount = users.filter(isFreeUser).length;
  const proCount = users.filter(u => u.plan === 'Paid').length;

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', paddingBottom: '60px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '28px', fontWeight: 800, color: 'white', marginBottom: '8px', display: 'flex', alignItems: 'center' }}>
            <Crown size={32} className="text-amber-400 mr-3" /> Executive Admin Dashboard
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '14px' }}>
            Real-time platform telemetry and revenue tracking.
          </p>
        </div>
        <button className="btn btn-secondary flex items-center gap-2" onClick={fetchData} disabled={loading}>
          {loading ? 'Refreshing...' : <><RefreshCw size={16} /> Refresh Data</>}
        </button>
      </div>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '32px' }}>
        {['business_intel', 'opp_intel', 'system_health', 'ai_logs', 'billing_ops', 'merchants'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab as any)}
            style={{
              padding: '8px 16px', borderRadius: '8px',
              border: activeTab === tab ? '1px solid rgba(99,102,241,0.5)' : '1px solid rgba(255,255,255,0.06)',
              background: activeTab === tab ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.02)',
              color: activeTab === tab ? '#818cf8' : 'rgba(255,255,255,0.5)',
              fontSize: '12px', fontWeight: 600, cursor: 'pointer', textTransform: 'capitalize'
            }}
          >
            {tab.replace('_', ' ')}
          </button>
        ))}
      </div>

      {error && (
        <div style={{ padding: '16px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '8px', color: '#ef4444', marginBottom: '24px' }}>
          {error}
        </div>
      )}

      {activeTab === 'business_intel' && metrics && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '16px' }}>
            {/* Total Users Card */}
            <div 
              onClick={() => setUserFilter('all')}
              className="glass" 
              style={{ 
                padding: '24px 20px', 
                borderRadius: '16px', 
                textAlign: 'center', 
                border: userFilter === 'all' ? '1px solid rgba(99,102,241,0.6)' : '1px solid rgba(255,255,255,0.06)',
                background: userFilter === 'all' ? 'rgba(99,102,241,0.1)' : 'rgba(255,255,255,0.02)',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              <div style={{ fontSize: '32px', fontWeight: 900, color: '#6366f1', fontFamily: 'Space Grotesk, sans-serif' }}>{metrics.totalSignups || 0}</div>
              <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', fontWeight: 700, marginTop: '8px', letterSpacing: '0.5px' }}>TOTAL USERS</div>
            </div>

            {/* Free Users Card */}
            <div 
              onClick={() => setUserFilter('free')}
              className="glass" 
              style={{ 
                padding: '24px 20px', 
                borderRadius: '16px', 
                textAlign: 'center', 
                border: userFilter === 'free' ? '1px solid rgba(148,163,184,0.6)' : '1px solid rgba(255,255,255,0.06)',
                background: userFilter === 'free' ? 'rgba(148,163,184,0.1)' : 'rgba(255,255,255,0.02)',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              <div style={{ fontSize: '32px', fontWeight: 900, color: '#94a3b8', fontFamily: 'Space Grotesk, sans-serif' }}>{(metrics.totalSignups || 0) - (metrics.paidUsers || 0)}</div>
              <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', fontWeight: 700, marginTop: '8px', letterSpacing: '0.5px' }}>FREE USERS</div>
            </div>

            {/* Pro Users Card with Interactive Subtext */}
            <div 
              onClick={() => setUserFilter(userFilter === 'pro' ? 'all' : 'pro')}
              className="glass" 
              style={{ 
                padding: '24px 20px', 
                borderRadius: '16px', 
                textAlign: 'center', 
                border: (userFilter === 'pro' || userFilter === 'monthly' || userFilter === 'lifetime') ? '1px solid rgba(16,185,129,0.6)' : '1px solid rgba(255,255,255,0.06)',
                background: (userFilter === 'pro' || userFilter === 'monthly' || userFilter === 'lifetime') ? 'rgba(16,185,129,0.08)' : 'rgba(255,255,255,0.02)',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              <div style={{ fontSize: '32px', fontWeight: 900, color: '#10b981', fontFamily: 'Space Grotesk, sans-serif' }}>{metrics.paidUsers || 0}</div>
              
              {/* Interactive Monthly / Lifetime Subtext Badges */}
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
                <span 
                  onClick={(e) => { e.stopPropagation(); setUserFilter('monthly'); }}
                  style={{
                    fontSize: '11px',
                    fontWeight: 800,
                    color: userFilter === 'monthly' ? '#a855f7' : '#34d399',
                    background: userFilter === 'monthly' ? 'rgba(168,85,247,0.25)' : 'rgba(16,185,129,0.12)',
                    padding: '2px 8px',
                    borderRadius: '10px',
                    border: userFilter === 'monthly' ? '1px solid rgba(168,85,247,0.5)' : '1px solid transparent',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                  title="Click to view Monthly Users"
                >
                  {metrics.monthlyUsers || monthlyCount} Monthly
                </span>
                <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)' }}>•</span>
                <span 
                  onClick={(e) => { e.stopPropagation(); setUserFilter('lifetime'); }}
                  style={{
                    fontSize: '11px',
                    fontWeight: 800,
                    color: userFilter === 'lifetime' ? '#fbbf24' : '#34d399',
                    background: userFilter === 'lifetime' ? 'rgba(245,158,11,0.25)' : 'rgba(16,185,129,0.12)',
                    padding: '2px 8px',
                    borderRadius: '10px',
                    border: userFilter === 'lifetime' ? '1px solid rgba(245,158,11,0.5)' : '1px solid transparent',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                  title="Click to view Lifetime Users"
                >
                  {metrics.lifetimeUsers || lifetimeCount} Lifetime
                </span>
              </div>

              <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', fontWeight: 700, marginTop: '8px', letterSpacing: '0.5px' }}>PRO USERS</div>
            </div>

            {/* Total Revenue Card */}
            <div className="glass" style={{ padding: '24px 20px', borderRadius: '16px', textAlign: 'center', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ fontSize: '32px', fontWeight: 900, color: '#f59e0b', fontFamily: 'Space Grotesk, sans-serif' }}>Rs. {metrics.totalRevenuePKR?.toLocaleString() || 0}</div>
              <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', fontWeight: 700, marginTop: '12px', letterSpacing: '0.5px' }}>TOTAL REVENUE (PKR)</div>
            </div>
          </div>
          
          {/* Live Recent Conversions Ticker */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 20px', background: 'rgba(16,185,129,0.05)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: '12px', marginBottom: '32px' }}>
            <span style={{ display: 'flex', height: '8px', width: '8px', position: 'relative' }}>
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span style={{ fontSize: '13px', color: '#34d399', fontWeight: 600 }}>Live Signal:</span>
            <div style={{ flex: 1, overflow: 'hidden', whiteSpace: 'nowrap' }}>
              <style>{`
                @keyframes marquee-scroll {
                  0% { transform: translateX(100%); }
                  100% { transform: translateX(-100%); }
                }
              `}</style>
              <div style={{ display: 'inline-block', animation: 'marquee-scroll 15s linear infinite', fontSize: '13px', color: 'rgba(255,255,255,0.7)' }}>
                A user from Pakistan just upgraded to Professional Monthly via Easypaisa • New user registered from Unknown • Founder Lifetime plan requested via Manual Bank Transfer...
              </div>
            </div>
          </div>
          
          <div className="glass" style={{ borderRadius: '16px', overflow: 'hidden' }}>
          {/* User Directory Filter Header Controls */}
          <div style={{ 
            padding: '20px 24px', 
            borderBottom: '1px solid rgba(255,255,255,0.08)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '16px',
            background: 'linear-gradient(180deg, rgba(255,255,255,0.02) 0%, rgba(0,0,0,0) 100%)'
          }}>
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'white', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span>User Directory</span>
                <span className="badge badge-indigo" style={{ fontSize: '11px', padding: '2px 8px' }}>
                  {filteredUsers.length} {filteredUsers.length === 1 ? 'user' : 'users'}
                </span>
              </h2>
              <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>
                Filter and manage user subscriptions, plans, and account privileges.
              </p>
            </div>

            {/* Filter Buttons & Search Control Group */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              {/* Search Bar */}
              <div style={{ position: 'relative', minWidth: '220px' }}>
                <Search size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.4)' }} />
                <input 
                  type="text" 
                  placeholder="Search user, email, country..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px 8px 34px',
                    borderRadius: '10px',
                    background: 'rgba(0,0,0,0.3)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: 'white',
                    fontSize: '12px',
                    outline: 'none'
                  }}
                />
              </div>

              {/* Segmented Filter Buttons */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(0,0,0,0.3)', padding: '4px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)' }}>
                {/* All Users Button */}
                <button
                  onClick={() => setUserFilter('all')}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 12px',
                    borderRadius: '8px',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                    background: userFilter === 'all' 
                      ? 'linear-gradient(135deg, rgba(99,102,241,0.3), rgba(79,70,229,0.4))' 
                      : 'transparent',
                    color: userFilter === 'all' ? '#ffffff' : 'rgba(255,255,255,0.6)',
                    border: userFilter === 'all' 
                      ? '1px solid rgba(99,102,241,0.6)' 
                      : '1px solid transparent',
                    boxShadow: userFilter === 'all' ? '0 0 12px rgba(99,102,241,0.3)' : 'none'
                  }}
                >
                  <Users size={13} className={userFilter === 'all' ? 'text-indigo-300' : ''} />
                  <span>All</span>
                  <span style={{
                    fontSize: '10px',
                    padding: '1px 6px',
                    borderRadius: '10px',
                    background: userFilter === 'all' ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.08)',
                    color: 'white',
                    fontWeight: 800
                  }}>
                    {allCount}
                  </span>
                </button>

                {/* Monthly Users Button */}
                <button
                  onClick={() => setUserFilter('monthly')}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 12px',
                    borderRadius: '8px',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                    background: userFilter === 'monthly' 
                      ? 'linear-gradient(135deg, rgba(168,85,247,0.35), rgba(99,102,241,0.45))' 
                      : 'transparent',
                    color: userFilter === 'monthly' ? '#ffffff' : '#c084fc',
                    border: userFilter === 'monthly' 
                      ? '1px solid rgba(168,85,247,0.7)' 
                      : '1px solid transparent',
                    boxShadow: userFilter === 'monthly' ? '0 0 16px rgba(168,85,247,0.4)' : 'none'
                  }}
                >
                  <Zap size={13} className="text-purple-400" />
                  <span>Monthly Users</span>
                  <span style={{
                    fontSize: '10px',
                    padding: '1px 6px',
                    borderRadius: '10px',
                    background: userFilter === 'monthly' ? 'rgba(255,255,255,0.25)' : 'rgba(168,85,247,0.2)',
                    color: 'white',
                    fontWeight: 800
                  }}>
                    {monthlyCount}
                  </span>
                </button>

                {/* Lifetime Users Button */}
                <button
                  onClick={() => setUserFilter('lifetime')}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 12px',
                    borderRadius: '8px',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                    background: userFilter === 'lifetime' 
                      ? 'linear-gradient(135deg, rgba(245,158,11,0.35), rgba(217,119,6,0.45))' 
                      : 'transparent',
                    color: userFilter === 'lifetime' ? '#ffffff' : '#fbbf24',
                    border: userFilter === 'lifetime' 
                      ? '1px solid rgba(245,158,11,0.8)' 
                      : '1px solid transparent',
                    boxShadow: userFilter === 'lifetime' ? '0 0 16px rgba(245,158,11,0.4)' : 'none'
                  }}
                >
                  <Crown size={13} className="text-amber-400" />
                  <span>Lifetime Users</span>
                  <span style={{
                    fontSize: '10px',
                    padding: '1px 6px',
                    borderRadius: '10px',
                    background: userFilter === 'lifetime' ? 'rgba(255,255,255,0.25)' : 'rgba(245,158,11,0.2)',
                    color: 'white',
                    fontWeight: 800
                  }}>
                    {lifetimeCount}
                  </span>
                </button>

                {/* Free Users Button */}
                <button
                  onClick={() => setUserFilter('free')}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 12px',
                    borderRadius: '8px',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                    background: userFilter === 'free' 
                      ? 'linear-gradient(135deg, rgba(148,163,184,0.3), rgba(100,116,139,0.4))' 
                      : 'transparent',
                    color: userFilter === 'free' ? '#ffffff' : 'rgba(255,255,255,0.5)',
                    border: userFilter === 'free' 
                      ? '1px solid rgba(148,163,184,0.6)' 
                      : '1px solid transparent',
                    boxShadow: userFilter === 'free' ? '0 0 12px rgba(148,163,184,0.3)' : 'none'
                  }}
                >
                  <Shield size={13} className="text-slate-400" />
                  <span>Free</span>
                  <span style={{
                    fontSize: '10px',
                    padding: '1px 6px',
                    borderRadius: '10px',
                    background: userFilter === 'free' ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.08)',
                    color: 'white',
                    fontWeight: 800
                  }}>
                    {freeCount}
                  </span>
                </button>
              </div>
            </div>
          </div>
          
          {loading && !users.length ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'rgba(255,255,255,0.5)' }}>Loading users...</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)' }}>
                    <th style={{ padding: '12px 20px', fontSize: '12px', color: 'rgba(255,255,255,0.4)', fontWeight: 600 }}>NAME</th>
                    <th style={{ padding: '12px 20px', fontSize: '12px', color: 'rgba(255,255,255,0.4)', fontWeight: 600 }}>EMAIL</th>
                    <th style={{ padding: '12px 20px', fontSize: '12px', color: 'rgba(255,255,255,0.4)', fontWeight: 600 }}>COUNTRY</th>
                    <th style={{ padding: '12px 20px', fontSize: '12px', color: 'rgba(255,255,255,0.4)', fontWeight: 600 }}>PLAN STATUS</th>
                    <th style={{ padding: '12px 20px', fontSize: '12px', color: 'rgba(255,255,255,0.4)', fontWeight: 600, textAlign: 'right' }}>ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map(u => {
                    const monthly = isMonthlyUser(u);
                    const lifetime = isLifetimeUser(u);
                    
                    return (
                      <tr key={u.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                        <td style={{ padding: '12px 20px', fontSize: '14px', color: 'white', fontWeight: 500 }}>{u.name}</td>
                        <td style={{ padding: '12px 20px', fontSize: '13px', color: 'rgba(255,255,255,0.7)' }}>{u.email}</td>
                        <td style={{ padding: '12px 20px', fontSize: '13px', color: 'rgba(255,255,255,0.5)' }}>{u.country}</td>
                        <td style={{ padding: '12px 20px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {monthly ? (
                              <span className="badge" style={{ 
                                background: 'linear-gradient(135deg, rgba(168,85,247,0.2), rgba(99,102,241,0.2))', 
                                border: '1px solid rgba(168,85,247,0.4)', 
                                color: '#c084fc',
                                fontSize: '10px',
                                padding: '3px 10px',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}>
                                <Zap size={10} className="text-purple-400" /> Monthly Pro
                              </span>
                            ) : lifetime ? (
                              <span className="badge" style={{ 
                                background: 'linear-gradient(135deg, rgba(245,158,11,0.2), rgba(217,119,6,0.2))', 
                                border: '1px solid rgba(245,158,11,0.4)', 
                                color: '#fbbf24',
                                fontSize: '10px',
                                padding: '3px 10px',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}>
                                <Crown size={10} className="text-amber-400" /> Founder Lifetime
                              </span>
                            ) : (
                              <span className="badge badge-slate" style={{ fontSize: '10px', padding: '3px 10px' }}>
                                Free Tier
                              </span>
                            )}
                          </div>
                        </td>
                        <td style={{ padding: '12px 20px', textAlign: 'right' }}>
                          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', alignItems: 'center', minHeight: '24px' }}>
                            {u.planId !== 'professional_monthly' && (
                              <div 
                                onClick={() => handleGrantPro(u.id, u.email, u.name, 'professional_monthly')}
                                style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'rgba(255,255,255,0.01)', cursor: 'crosshair' }}
                                title="Grant Pro Monthly (999)"
                              />
                            )}
                            {u.planId !== 'founder_lifetime' && (
                              <div 
                                onClick={() => handleGrantPro(u.id, u.email, u.name, 'founder_lifetime')}
                                style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'rgba(255,255,255,0.01)', cursor: 'crosshair' }}
                                title="Grant Founder Lifetime (9999)"
                              />
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredUsers.length === 0 && !loading && (
                    <tr>
                      <td colSpan={5} style={{ padding: '40px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', color: 'rgba(255,255,255,0.4)' }}>
                          <Filter size={32} className="text-indigo-400" />
                          <div style={{ fontSize: '14px', fontWeight: 600, color: 'white' }}>No users match the active filter</div>
                          <div style={{ fontSize: '12px' }}>
                            {userFilter !== 'all' ? `No users found under "${userFilter.toUpperCase()}" plan status.` : 'No users match your search query.'}
                          </div>
                          <button 
                            onClick={() => { setUserFilter('all'); setSearchQuery(''); }}
                            className="btn btn-secondary btn-sm"
                            style={{ marginTop: '8px', fontSize: '12px' }}
                          >
                            Reset Filters
                          </button>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </>
    )}

      {activeTab === 'opp_intel' && (
        <div className="card" style={{ padding: '28px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '18px', fontWeight: 700, color: 'white', display: 'flex', alignItems: 'center' }}>
              <Telescope size={20} className="text-indigo-400 mr-2" /> Opportunity Database Intelligence
            </h3>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '32px' }}>
            <div className="glass-panel" style={{ padding: '20px', borderRadius: '12px' }}>
              <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', fontWeight: 600, marginBottom: '8px' }}>FIRESTORE RECORDS</div>
              <div style={{ fontSize: '32px', fontWeight: 800, color: '#10b981' }}>{dbCount}</div>
            </div>
            <div className="glass-panel" style={{ padding: '20px', borderRadius: '12px' }}>
              <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', fontWeight: 600, marginBottom: '8px' }}>SEED DB SIZE</div>
              <div style={{ fontSize: '32px', fontWeight: 800, color: '#8b5cf6' }}>{GLOBAL_OPPORTUNITIES.length}</div>
            </div>
            <div className="glass-panel" style={{ padding: '20px', borderRadius: '12px' }}>
              <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', fontWeight: 600, marginBottom: '8px' }}>STATUS</div>
              <div style={{ fontSize: '24px', fontWeight: 800, color: dbCount >= GLOBAL_OPPORTUNITIES.length ? '#10b981' : '#f59e0b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                {dbCount >= GLOBAL_OPPORTUNITIES.length ? <><CheckCircle size={24} className="text-emerald-500" /> Synchronized</> : <><AlertTriangle size={24} className="text-amber-500" /> Sync Required</>}
              </div>
            </div>
          </div>

          <div className="glass-panel" style={{ padding: '24px', borderRadius: '12px', border: '1px solid rgba(139,92,246,0.3)', background: 'rgba(139,92,246,0.05)' }}>
            <h4 style={{ fontSize: '16px', fontWeight: 700, color: 'white', marginBottom: '12px' }}>Master Seed Operation</h4>
            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)', marginBottom: '20px' }}>
              Executes a batch write operation to populate Firestore with all {GLOBAL_OPPORTUNITIES.length} structured global opportunities from the static definitions. This will overwrite existing records with the same IDs.
            </p>
            <button 
              onClick={handleSeedDatabase} 
              disabled={seeding}
              className="btn btn-primary flex items-center justify-center gap-2" 
              style={{ background: 'linear-gradient(135deg, #8b5cf6, #6366f1)', border: 'none' }}
            >
              {seeding ? <><Zap size={18} /> Seeding in progress (may take 10s)...</> : <><Rocket size={18} /> Execute Master Seed</>}
            </button>
          </div>
        </div>
      )}

      {activeTab === 'system_health' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div className="card" style={{ padding: '28px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '18px', fontWeight: 700, color: 'white', display: 'flex', alignItems: 'center' }}>
                <Globe size={20} className="text-blue-400 mr-2" /> Core Subsystem Health
              </h3>
              <span className="badge badge-emerald" style={{ fontSize: '10px' }}>Uptime: 99.98%</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
              {[
                { name: 'Firebase Auth', status: 'Operational', ping: '24ms', icon: <Flame size={24} className="text-orange-500" />, color: '#10b981' },
                { name: 'Firestore Data', status: 'Operational', ping: '41ms', icon: <Database size={24} className="text-emerald-500" />, color: '#10b981' },
                { name: 'Cloudflare R2', status: 'Operational', ping: '12ms', icon: <Cloud size={24} className="text-sky-400" />, color: '#10b981' },
                { name: 'Vercel Edge', status: 'Operational', ping: '8ms', icon: <Zap size={24} className="text-amber-400" />, color: '#10b981' },
              ].map(sys => (
                <div key={sys.name} className="glass-panel" style={{ padding: '20px', borderRadius: '12px', border: `1px solid ${sys.color}30` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <div>{sys.icon}</div>
                    <span style={{ fontSize: '10px', fontWeight: 700, color: sys.color, background: `${sys.color}15`, padding: '2px 8px', borderRadius: '10px' }}>{sys.status}</span>
                  </div>
                  <h4 style={{ fontSize: '13px', fontWeight: 700, color: 'white', marginBottom: '4px' }}>{sys.name}</h4>
                  <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>Latency: {sys.ping}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="card" style={{ padding: '28px' }}>
            <h3 style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '18px', fontWeight: 700, color: 'white', marginBottom: '20px', display: 'flex', alignItems: 'center' }}>
              <Brain size={20} className="text-purple-400 mr-2" /> AI Fleet Economics & Latency
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              <div className="glass-panel" style={{ padding: '24px', borderRadius: '12px', border: '1px solid rgba(99,102,241,0.2)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <h4 style={{ fontSize: '15px', fontWeight: 700, color: '#818cf8' }}>Gemini Primary Router</h4>
                  <Sparkles size={24} className="text-indigo-400" />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', fontWeight: 700 }}>TOTAL CALLS</div>
                    <div style={{ fontSize: '20px', fontWeight: 800, color: 'white' }}>{aiMetrics?.gemini?.calls || 0}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', fontWeight: 700 }}>AVG LATENCY</div>
                    <div style={{ fontSize: '20px', fontWeight: 800, color: '#10b981' }}>{aiMetrics?.gemini?.avgLatency || '0s'}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', fontWeight: 700 }}>TOKEN USAGE</div>
                    <div style={{ fontSize: '20px', fontWeight: 800, color: 'white' }}>{aiMetrics?.gemini?.tokens || 0}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', fontWeight: 700 }}>ESTIMATED COST</div>
                    <div style={{ fontSize: '20px', fontWeight: 800, color: '#f59e0b' }}>{aiMetrics?.gemini?.cost || '$0.00'}</div>
                  </div>
                </div>
              </div>
              <div className="glass-panel" style={{ padding: '24px', borderRadius: '12px', border: '1px solid rgba(245,158,11,0.2)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <h4 style={{ fontSize: '15px', fontWeight: 700, color: '#fcd34d' }}>Groq Fallback Router</h4>
                  <Zap size={24} className="text-amber-400" />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', fontWeight: 700 }}>FALLBACK EVENTS</div>
                    <div style={{ fontSize: '20px', fontWeight: 800, color: '#f43f5e' }}>{aiMetrics?.groq?.calls || 0}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', fontWeight: 700 }}>AVG LATENCY</div>
                    <div style={{ fontSize: '20px', fontWeight: 800, color: '#10b981' }}>{aiMetrics?.groq?.avgLatency || '0s'}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', fontWeight: 700 }}>TOKEN USAGE</div>
                    <div style={{ fontSize: '20px', fontWeight: 800, color: 'white' }}>{aiMetrics?.groq?.tokens || 0}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', fontWeight: 700 }}>ROUTER HEALTH</div>
                    <div style={{ fontSize: '20px', fontWeight: 800, color: '#10b981' }}>{aiMetrics?.groq?.health || '100%'}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'ai_logs' && (
        <div className="card" style={{ padding: '28px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <h3 style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '18px', fontWeight: 700, color: 'white', display: 'flex', alignItems: 'center' }}>
              <FileText size={20} className="text-slate-300 mr-2" /> AI Executive Timeline (Live Trace)
            </h3>
            <span className="badge badge-indigo">Live Streaming</span>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
            {(aiMetrics?.logs || []).map((log: any, i: number) => (
              <div key={i} style={{ display: 'flex', gap: '16px', padding: '16px', borderBottom: '1px solid rgba(255,255,255,0.06)', alignItems: 'center' }}>
                <div style={{ fontSize: '12px', fontFamily: 'monospace', color: '#10b981', flexShrink: 0 }}>[{log.time}]</div>
                <div style={{ width: '140px', fontSize: '13px', fontWeight: 600, color: '#818cf8', flexShrink: 0 }}>{log.agent}</div>
                <div style={{ flex: 1, fontSize: '13px', color: 'rgba(255,255,255,0.7)' }}>{log.action}</div>
                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', fontFamily: 'monospace' }}>{log.ms}</div>
              </div>
            ))}
            {(!aiMetrics?.logs || aiMetrics.logs.length === 0) && (
              <div style={{ padding: '24px', textAlign: 'center', color: 'rgba(255,255,255,0.4)' }}>
                No active AI traces found yet.
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'billing_ops' && (
        <div className="card" style={{ padding: '28px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '16px', fontWeight: 700, color: 'white', display: 'flex', alignItems: 'center' }}>
              <Inbox size={20} className="text-rose-400 mr-2" /> SaaS Payment Verification Queue
            </h3>
            <input
              type="text"
              placeholder="Search Email, TRX ID, UID, or Name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                padding: '8px 12px',
                borderRadius: '8px',
                border: '1px solid rgba(255,255,255,0.1)',
                background: 'rgba(0,0,0,0.2)',
                color: 'white',
                fontSize: '13px',
                width: '300px'
              }}
            />
          </div>
          
          {(() => {
            const filteredQueue = pendingQueue.filter(item => 
              (item.userEmail && item.userEmail.toLowerCase().includes(searchQuery.toLowerCase())) ||
              (item.userName && item.userName.toLowerCase().includes(searchQuery.toLowerCase())) ||
              (item.uid && item.uid.toLowerCase().includes(searchQuery.toLowerCase())) ||
              (item.paymentReference && item.paymentReference.toLowerCase().includes(searchQuery.toLowerCase()))
            );

            return filteredQueue.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {filteredQueue.map(item => (
                <div key={item.id} className="glass-panel" style={{ padding: '20px', borderRadius: '12px', border: '1px solid rgba(59,130,246,0.3)' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '24px' }}>
                    <div>
                      <h4 style={{ fontSize: '14px', fontWeight: 700, color: 'white', marginBottom: '12px' }}>Receipt Transaction Metadata</h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px', color: 'rgba(255,255,255,0.7)' }}>
                        <div><strong>User Email:</strong> <span style={{ color: 'white' }}>{item.userEmail}</span></div>
                        <div><strong>User ID:</strong> <span style={{ color: 'white' }}>{item.uid}</span></div>
                        <div><strong>Plan Requested:</strong> <span style={{ color: 'white' }}>{item.planId}</span></div>
                        <div><strong>Reference TRX ID:</strong> <span style={{ color: '#10b981', fontFamily: 'monospace' }}>{item.paymentReference}</span></div>
                        <div><strong>Payment Channel:</strong> <span style={{ color: 'white' }}>{item.provider?.toUpperCase()}</span></div>
                      </div>
                      <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
                        <button onClick={() => handleApprove(item.id)} disabled={processingIds.has(item.id)} className="btn btn-primary" style={{ flex: 1, justifyContent: 'center', opacity: processingIds.has(item.id) ? 0.5 : 1, cursor: processingIds.has(item.id) ? 'not-allowed' : 'pointer' }}>{processingIds.has(item.id) ? 'Processing…' : 'Approve'}</button>
                        <button onClick={() => handleReject(item.id)} disabled={processingIds.has(item.id)} className="btn btn-ghost" style={{ borderColor: 'rgba(244,63,94,0.3)', color: '#f43f5e', opacity: processingIds.has(item.id) ? 0.5 : 1, cursor: processingIds.has(item.id) ? 'not-allowed' : 'pointer' }}>Reject</button>
                      </div>
                    </div>
                    <div>
                      <h4 style={{ fontSize: '14px', fontWeight: 700, color: 'white', marginBottom: '12px' }}>Uploaded Screenshot Verification</h4>
                      <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px dashed rgba(255,255,255,0.1)', height: '180px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                        {item.paymentProofUrl && item.paymentProofUrl !== 'screenshot_pending' ? (
                          <img src={item.paymentProofUrl} alt="Receipt" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                        ) : (
                          <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>No screenshot available</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '48px 0', color: 'rgba(255,255,255,0.3)', fontSize: '14px' }}>
                {searchQuery ? 'No payment requests match your search.' : 'No pending payment verification requests.'}
              </div>
            );
          })()}
        </div>
      )}

      {activeTab === 'merchants' && (
        <div className="card" style={{ padding: '28px' }}>
          <h3 style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '16px', fontWeight: 700, color: 'white', marginBottom: '20px', display: 'flex', alignItems: 'center' }}>
            <Landmark size={20} className="text-emerald-400 mr-2" /> Payment Provider & Merchant Configuration
          </h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {merchants.map((m, idx) => (
              <div key={m.providerId} className="glass-panel" style={{ padding: '20px', borderRadius: '12px' }}>
                <h4 style={{ fontSize: '14px', fontWeight: 700, color: '#818cf8', marginBottom: '14px' }}>{m.name} Settings</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginBottom: '6px' }}>Account Title</label>
                    <input 
                      className="input" 
                      value={m.accountTitle} 
                      onChange={e => handleMerchantChange(idx, 'accountTitle', e.target.value)} 
                      style={{ padding: '8px', fontSize: '12px' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginBottom: '6px' }}>Account Number / IBAN</label>
                    <input 
                      className="input" 
                      value={m.accountNumber} 
                      onChange={e => handleMerchantChange(idx, 'accountNumber', e.target.value)} 
                      style={{ padding: '8px', fontSize: '12px' }}
                    />
                  </div>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginBottom: '6px' }}>Transfer Instructions</label>
                  <textarea 
                    className="input" 
                    value={m.instructions} 
                    onChange={e => handleMerchantChange(idx, 'instructions', e.target.value)} 
                    style={{ padding: '8px', fontSize: '12px', height: '60px', resize: 'none' }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
