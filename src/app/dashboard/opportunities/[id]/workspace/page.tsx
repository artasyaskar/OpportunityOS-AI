'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useState } from 'react';
import { SEED_OPPORTUNITIES } from '@/lib/opportunities';
import { RequirementMatrix } from '@/components/ui/RequirementMatrix';
import { ReadinessScore } from '@/components/ui/ReadinessScore';
import { usePipeline } from '@/components/auth/PipelineContext';
import { Building2, MapPin, DollarSign, Rocket, BarChart3, CheckSquare, FileText, PenLine, File, Mail, GraduationCap } from 'lucide-react';

export default function WorkspacePage() {
  const { id } = useParams();
  const opportunity = SEED_OPPORTUNITIES.find(o => o.id === id);
  const [activeTab, setActiveTab] = useState<'overview' | 'requirements' | 'documents' | 'timeline'>('overview');
  const { updateOpportunity } = usePipeline();

  if (!opportunity) {
    return (
      <div className="dashboard-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <h2>Opportunity Not Found</h2>
      </div>
    );
  }

  const requirementsData: { type: 'gpa' | 'ielts' | 'toefl' | 'degree' | 'country'; value: string | number; label: string }[] = [
    { type: 'gpa', value: parseFloat(opportunity.requiredGPA || '0'), label: 'Minimum GPA' },
    { type: 'country', value: opportunity.country, label: 'Target Country Match' },
  ];

  if (opportunity.requirements?.some(r => r.toLowerCase().includes('ielts'))) {
    requirementsData.push({ type: 'ielts' as const, value: 6.5, label: 'English Proficiency (IELTS)' });
  }

  return (
    <div className="dashboard-content">
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
        <Link href="/dashboard/portfolio" style={{ color: 'rgba(255,255,255,0.4)', textDecoration: 'none' }}>← Back to Portfolio</Link>
        <span style={{ color: 'rgba(255,255,255,0.2)' }}>|</span>
        <span style={{ fontSize: '13px', color: '#818cf8', fontWeight: 600 }}>Opportunity Workspace</span>
      </div>

      {/* Header Info */}
      <div className="card-magnetic glow-border" style={{ padding: '32px', marginBottom: '32px', background: 'linear-gradient(135deg, rgba(99,102,241,0.05) 0%, rgba(16,185,129,0.02) 100%)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
              <span className="badge badge-indigo">{opportunity.type}</span>
              <span className="badge badge-emerald">Verified DB</span>
            </div>
            <h1 style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '32px', fontWeight: 800, color: 'white', marginBottom: '8px' }}>
              {opportunity.title}
            </h1>
            <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.6)', display: 'flex', gap: '16px', alignItems: 'center' }}>
              <span><Building2 size={14} className="inline mr-1 text-indigo-400" /> {opportunity.provider}</span>
              <span><MapPin size={14} className="inline mr-1 text-rose-400" /> {opportunity.country}</span>
              <span style={{ color: '#10b981', fontWeight: 600 }}><DollarSign size={14} className="inline mr-1" /> {opportunity.fundingLevel}</span>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', fontWeight: 700, marginBottom: '4px' }}>DEADLINE</div>
            <div style={{ fontSize: '20px', fontWeight: 800, color: '#f43f5e' }}>{opportunity.deadline}</div>
            <Link href="/dashboard/builder" className="btn btn-primary" style={{ marginTop: '16px' }}>
              <Rocket size={14} className="inline mr-2" /> Launch AI Builder
            </Link>
          </div>
        </div>
      </div>

      {/* Tabs Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: '32px' }}>
        
        {/* Sidebar Navigation */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {[
            { id: 'overview', label: <><BarChart3 size={14} className="inline mr-1" /> Overview</> },
            { id: 'requirements', label: <><CheckSquare size={14} className="inline mr-1" /> Requirements Matrix</> },
            { id: 'documents', label: <><FileText size={14} className="inline mr-1" /> Application Documents</> },
            { id: 'timeline', label: '⏰ Timeline & Tasks' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              style={{
                padding: '12px 16px',
                borderRadius: '12px',
                border: 'none',
                background: activeTab === tab.id ? 'rgba(99,102,241,0.1)' : 'transparent',
                color: activeTab === tab.id ? 'white' : 'rgba(255,255,255,0.5)',
                textAlign: 'left',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                borderLeft: activeTab === tab.id ? '3px solid #818cf8' : '3px solid transparent',
                transition: 'all 0.2s ease'
              }}
            >
              {tab.label}
            </button>
          ))}
          
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', margin: '16px 0', paddingTop: '16px' }}>
            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', fontWeight: 600, marginBottom: '12px', paddingLeft: '16px' }}>PIPELINE STAGE</div>
            <select 
              className="input" 
              style={{ padding: '8px 12px', fontSize: '12px' }}
              onChange={(e) => updateOpportunity(id as string, { stage: e.target.value as any })}
            >
              <option value="wishlist">Wishlist</option>
              <option value="preparing">Preparing</option>
              <option value="submitted">Submitted</option>
              <option value="interview">Interview</option>
              <option value="visa">Visa / Travel</option>
              <option value="enrolled">Enrolled</option>
            </select>
          </div>
        </div>

        {/* Content Area */}
        <div>
          {activeTab === 'overview' && (
            <div className="animate-slide-up">
              <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'white', marginBottom: '16px' }}>About this Opportunity</h2>
              <div className="card" style={{ padding: '24px', marginBottom: '24px', fontSize: '14px', color: 'rgba(255,255,255,0.8)', lineHeight: 1.6 }}>
                {opportunity.description}
              </div>
            </div>
          )}

          {activeTab === 'requirements' && (
            <div className="animate-slide-up">
              <div style={{ marginBottom: '24px' }}>
                <ReadinessScore requirements={requirementsData} />
              </div>
              <RequirementMatrix requirements={requirementsData} />
              
              <div className="card" style={{ padding: '24px', marginTop: '24px' }}>
                <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'white', marginBottom: '16px' }}>Raw Requirements</h3>
                <ul style={{ paddingLeft: '20px', color: 'rgba(255,255,255,0.6)', fontSize: '13px', lineHeight: 1.6 }}>
                  {(opportunity.requirements || []).map((req, i) => (
                    <li key={i} style={{ marginBottom: '8px' }}>{req}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {activeTab === 'documents' && (
            <div className="animate-slide-up">
              <div style={{ display: 'grid', gap: '16px' }}>
                {[
                  { name: 'Statement of Purpose', status: 'Drafting in Builder', color: '#f59e0b', icon: <PenLine size={16} className="text-amber-500" /> },
                  { name: 'Curriculum Vitae (CV)', status: 'Generated & Linked', color: '#10b981', icon: <File size={16} className="text-emerald-500" /> },
                  { name: 'Letter of Recommendation 1', status: 'Missing', color: '#f43f5e', icon: <Mail size={16} className="text-rose-500" /> },
                  { name: 'Official Transcripts', status: 'Linked from Vault', color: '#10b981', icon: <GraduationCap size={16} className="text-emerald-500" /> }
                ].map((doc, i) => (
                  <div key={i} className="card" style={{ padding: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <span style={{ fontSize: '24px' }}>{doc.icon}</span>
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: 600, color: 'white' }}>{doc.name}</div>
                        <div style={{ fontSize: '12px', color: doc.color, fontWeight: 600, marginTop: '4px' }}>{doc.status}</div>
                      </div>
                    </div>
                    {doc.status.includes('Missing') ? (
                      <button className="btn btn-secondary btn-sm">Request</button>
                    ) : doc.status.includes('Drafting') ? (
                      <Link href="/dashboard/builder" className="btn btn-primary btn-sm">Open Builder</Link>
                    ) : (
                      <button className="btn btn-secondary btn-sm">View</button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'timeline' && (
            <div className="animate-slide-up">
              <div className="card" style={{ padding: '32px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', position: 'relative' }}>
                  <div style={{ position: 'absolute', left: '15px', top: '20px', bottom: '20px', width: '2px', background: 'rgba(255,255,255,0.1)' }} />
                  {[
                    { date: 'Today', title: 'Begin SOP Draft', status: 'Active', dotColor: '#818cf8' },
                    { date: 'In 2 Weeks', title: 'Request Recommendations', status: 'Upcoming', dotColor: 'rgba(255,255,255,0.2)' },
                    { date: '1 Month Before', title: 'Final Review', status: 'Upcoming', dotColor: 'rgba(255,255,255,0.2)' },
                    { date: opportunity.deadline, title: 'Submission Deadline', status: 'Critical', dotColor: '#f43f5e' }
                  ].map((task, i) => (
                    <div key={i} style={{ display: 'flex', gap: '20px', position: 'relative', zIndex: 1 }}>
                      <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--bg-secondary)', border: `4px solid ${task.dotColor}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }} />
                      <div style={{ flex: 1, marginTop: '6px' }}>
                        <div style={{ fontSize: '14px', fontWeight: 700, color: 'white' }}>{task.title}</div>
                        <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', marginTop: '4px' }}>{task.date}</div>
                      </div>
                      <div style={{ marginTop: '6px' }}>
                        <span style={{ fontSize: '10px', padding: '4px 8px', borderRadius: '4px', background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)' }}>
                          {task.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
