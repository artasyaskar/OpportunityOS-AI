'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { PaymentMerchantConfig } from '@/lib/paymentAdapter';
import { SubscriptionRecord } from '@/lib/subscription';
import { fetchPaymentMerchants, adminUpdateMerchants, fetchPendingSubscriptions, adminApproveSubscription, adminRejectSubscription } from '@/lib/db';

export default function AdminDashboardPage() {
  const { user, getIdToken } = useAuth();
  
  // Security
  const [password, setPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  
  // Data
  const [metrics, setMetrics] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [activeTab, setActiveTab] = useState<'telemetry' | 'billing_ops' | 'merchants'>('telemetry');
  const [merchants, setMerchants] = useState<PaymentMerchantConfig[]>([]);
  const [pendingQueue, setPendingQueue] = useState<{uid: string, sub: SubscriptionRecord}[]>([]);

  useEffect(() => {
    fetchPaymentMerchants().then(m => setMerchants(m));
    fetchPendingSubscriptions().then(q => setPendingQueue(q));
  }, []);

  const handleMerchantChange = (index: number, field: keyof PaymentMerchantConfig, value: any) => {
    const updated = [...merchants];
    updated[index] = { ...updated[index], [field]: value };
    setMerchants(updated);
    adminUpdateMerchants(updated);
  };

  const handleApprove = async (uid: string, subToApprove: SubscriptionRecord) => {
    await adminApproveSubscription(uid, subToApprove);
    const updatedQueue = await fetchPendingSubscriptions();
    setPendingQueue(updatedQueue);
    alert('Subscription approved!');
    fetchData(); // refresh telemetry
  };

  const handleReject = async (uid: string) => {
    await adminRejectSubscription(uid);
    const updatedQueue = await fetchPendingSubscriptions();
    setPendingQueue(updatedQueue);
    alert('Payment proof rejected. Subscription reverted to Free.');
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

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', paddingBottom: '60px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '28px', fontWeight: 800, color: 'white', marginBottom: '8px' }}>
            👑 Executive Admin Dashboard
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '14px' }}>
            Real-time platform telemetry and revenue tracking.
          </p>
        </div>
        <button className="btn btn-secondary" onClick={fetchData} disabled={loading}>
          {loading ? 'Refreshing...' : '🔄 Refresh Data'}
        </button>
      </div>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '32px' }}>
        {['telemetry', 'billing_ops', 'merchants'].map(tab => (
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

      {activeTab === 'telemetry' && metrics && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '16px', marginBottom: '32px' }}>
          {[
            { label: 'Total Sign-ups', value: metrics.totalSignups, color: '#6366f1' },
            { label: 'Paid Users', value: metrics.paidUsers, color: '#10b981' },
            { label: 'Free Users', value: metrics.freeUsers, color: '#94a3b8' },
            { label: 'MRR', value: `$${metrics.mrr}`, color: '#f59e0b' },
            { label: 'Total Revenue', value: `$${metrics.totalRevenue}`, color: '#06b6d4' },
          ].map(stat => (
            <div key={stat.label} className="glass" style={{ padding: '20px', borderRadius: '12px', textAlign: 'center' }}>
              <div style={{ fontSize: '28px', fontWeight: 900, color: stat.color, fontFamily: 'Space Grotesk, sans-serif' }}>{stat.value}</div>
              <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', fontWeight: 700, marginTop: '8px', letterSpacing: '0.5px' }}>{stat.label.toUpperCase()}</div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'telemetry' && (
        <div className="glass" style={{ borderRadius: '16px', overflow: 'hidden' }}>
          <div style={{ padding: '20px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'white' }}>User Directory</h2>
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
                    <th style={{ padding: '12px 20px', fontSize: '12px', color: 'rgba(255,255,255,0.4)', fontWeight: 600 }}>PLAN</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <td style={{ padding: '12px 20px', fontSize: '14px', color: 'white', fontWeight: 500 }}>{u.name}</td>
                      <td style={{ padding: '12px 20px', fontSize: '13px', color: 'rgba(255,255,255,0.7)' }}>{u.email}</td>
                      <td style={{ padding: '12px 20px', fontSize: '13px', color: 'rgba(255,255,255,0.5)' }}>{u.country}</td>
                      <td style={{ padding: '12px 20px' }}>
                        <span className={`badge ${u.plan === 'Paid' ? 'badge-emerald' : 'badge-slate'}`} style={{ fontSize: '10px' }}>
                          {u.plan}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {users.length === 0 && !loading && (
                    <tr>
                      <td colSpan={4} style={{ padding: '24px', textAlign: 'center', color: 'rgba(255,255,255,0.4)' }}>No users found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'billing_ops' && (
        <div className="card" style={{ padding: '28px' }}>
          <h3 style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '16px', fontWeight: 700, color: 'white', marginBottom: '20px' }}>
            📥 SaaS Payment Verification Queue
          </h3>
          
          {pendingQueue.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {pendingQueue.map(item => (
                <div key={item.uid} className="glass-panel" style={{ padding: '20px', borderRadius: '12px', border: '1px solid rgba(59,130,246,0.3)' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '24px' }}>
                    <div>
                      <h4 style={{ fontSize: '14px', fontWeight: 700, color: 'white', marginBottom: '12px' }}>Receipt Transaction Metadata</h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px', color: 'rgba(255,255,255,0.7)' }}>
                        <div><strong>User ID:</strong> <span style={{ color: 'white' }}>{item.uid}</span></div>
                        <div><strong>Plan Requested:</strong> <span style={{ color: 'white' }}>{item.sub.planId}</span></div>
                        <div><strong>Reference TRX ID:</strong> <span style={{ color: '#10b981', fontFamily: 'monospace' }}>{item.sub.paymentReference}</span></div>
                        <div><strong>Payment Channel:</strong> <span style={{ color: 'white' }}>{item.sub.paymentProvider?.toUpperCase()}</span></div>
                      </div>
                      <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
                        <button onClick={() => handleApprove(item.uid, item.sub)} className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }}>Approve</button>
                        <button onClick={() => handleReject(item.uid)} className="btn btn-ghost" style={{ borderColor: 'rgba(244,63,94,0.3)', color: '#f43f5e' }}>Reject</button>
                      </div>
                    </div>
                    <div>
                      <h4 style={{ fontSize: '14px', fontWeight: 700, color: 'white', marginBottom: '12px' }}>Uploaded Screenshot Verification</h4>
                      <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px dashed rgba(255,255,255,0.1)', height: '180px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                        {item.sub.paymentProofUrl && item.sub.paymentProofUrl !== 'screenshot_pending' ? (
                          <img src={item.sub.paymentProofUrl} alt="Receipt" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
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
              ✓ No pending payment proofs in the queue. Everything is settled.
            </div>
          )}
        </div>
      )}

      {activeTab === 'merchants' && (
        <div className="card" style={{ padding: '28px' }}>
          <h3 style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '16px', fontWeight: 700, color: 'white', marginBottom: '20px' }}>
            🏦 Payment Provider & Merchant Configuration
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
