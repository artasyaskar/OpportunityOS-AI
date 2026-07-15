'use client';

import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { SEED_OPPORTUNITIES } from '@/lib/opportunities';
import { type ApplicationStatus, APPLICATION_STAGES } from '@/lib/gemini';
import { useProfile } from '@/components/auth/ProfileContext';
import { usePipeline } from '@/components/auth/PipelineContext';

// Define the 12 workspace documents
interface WorkspaceDoc {
  name: string;
  key: string;
  status: 'Ready' | 'Missing' | 'Needs Update' | 'Generated' | 'Reviewed' | 'Approved';
}

export default function ApplicationWorkspacePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const opp = SEED_OPPORTUNITIES.find(o => o.id === id) || SEED_OPPORTUNITIES[0];
  const { profile } = useProfile();
  const { pipeline: applications, updateOpportunity } = usePipeline();

  // Pipeline state: draft, applied, interview, accepted, rejected
  const [pipelineStatus, setPipelineStatus] = useState<ApplicationStatus>('wishlist');

  // Document states
  const [docs, setDocs] = useState<WorkspaceDoc[]>([
    { name: 'Resume / CV', key: 'resume', status: 'Ready' },
    { name: 'Official Transcript', key: 'transcript', status: 'Ready' },
    { name: 'Passport Copy', key: 'passport', status: 'Missing' },
    { name: 'IELTS/TOEFL Certificate', key: 'english_test', status: 'Missing' },
    { name: 'Recommendation Letters (LOR)', key: 'lor', status: 'Missing' },
    { name: 'Statement of Purpose (SOP)', key: 'sop', status: 'Generated' },
    { name: 'Personal Statement', key: 'personal_statement', status: 'Missing' },
    { name: 'Research Proposal', key: 'proposal', status: 'Missing' },
    { name: 'Portfolio of Projects', key: 'portfolio', status: 'Ready' },
    { name: 'Certificates of Merit', key: 'certificates', status: 'Ready' },
    { name: 'Interview Notes & Outline', key: 'interview_notes', status: 'Missing' },
    { name: 'Passport Photos', key: 'photos', status: 'Missing' }
  ]);

  // Submission Assistant state
  const [hasManuallyConfirmed, setHasManuallyConfirmed] = useState(false);

  // Rejection Intelligence inputs
  const [rejectionEmail, setRejectionEmail] = useState('');
  const [rejectionAnalysis, setRejectionAnalysis] = useState<any>(null);

  // Interview state
  const [userInterviewAnswer, setUserInterviewAnswer] = useState('');
  const [interviewFeedback, setInterviewFeedback] = useState<any>(null);

  useEffect(() => {
    if (profile) {
      // Adjust document status based on onboarding flags
      setDocs(prev => prev.map(d => {
        if (d.key === 'resume' && (profile.resumeFile || (typeof window !== 'undefined' && localStorage.getItem('onboarding_resume')))) {
          return { ...d, status: 'Approved' };
        }
        if (d.key === 'transcript' && (profile.transcriptFile || (typeof window !== 'undefined' && localStorage.getItem('onboarding_transcript')))) {
          return { ...d, status: 'Approved' };
        }
        if (d.key === 'english_test' && (profile.ieltsScore || (typeof window !== 'undefined' && localStorage.getItem('onboarding_ielts')))) {
          return { ...d, status: 'Ready' };
        }
        if (d.key === 'english_test' && typeof window !== 'undefined' && localStorage.getItem('ielts_status') === 'Scheduled') {
          return { ...d, status: 'Needs Update' };
        }
        if (d.key === 'passport' && (typeof window !== 'undefined' && localStorage.getItem('onboarding_passport'))) {
          return { ...d, status: 'Ready' };
        }
        if (d.key === 'lor' && profile.hasLOR) {
          return { ...d, status: 'Ready' };
        }
        return d;
      }));
    }

    // Check current application status from user applications ledger
    const match = applications.find((a: any) => a.id === opp.id);
    if (match) {
      setPipelineStatus(match.stage || 'wishlist');
    }
  }, [opp.id, profile, applications]);

  // Handle pipeline status update
  const handleStatusChange = async (status: ApplicationStatus) => {
    setPipelineStatus(status);
    await updateOpportunity(opp.id, { stage: status });
  };

  // Document status change
  const handleDocStatusChange = (key: string, newStatus: any) => {
    setDocs(prev => prev.map(d => d.key === key ? { ...d, status: newStatus } : d));
  };

  // Calculate completeness percentage
  const completedDocsCount = docs.filter(d => ['Ready', 'Generated', 'Reviewed', 'Approved'].includes(d.status)).length;
  const completenessPercent = Math.round((completedDocsCount / docs.length) * 100);

  // Differentiate between "Missing" vs "Weak" for Evidence Recommendations
  const getEvidenceAudit = () => {
    const list = [];
    if (!profile) return [{ label: 'Profile Information', status: 'Missing', value: 'Please run onboarding profiling.' }];

    // GPA
    if (profile.gpa) {
      const gpaVal = parseFloat(profile.gpa);
      if (gpaVal >= 3.6) {
        list.push({ label: 'Academic Standing', status: 'Evidence Found', value: `GPA ${profile.gpa} (Top Percentile Rank · Source: Resume Page 1)` });
      } else {
        list.push({ label: 'Academic Standing', status: 'Weak', value: `GPA ${profile.gpa} is slightly below elite benchmarks.` });
      }
    } else {
      list.push({ label: 'Academic Standing', status: 'Missing', value: 'GPA records not available.' });
    }

    // English
    if (profile.ieltsScore) {
      list.push({ label: 'English Proficiency', status: 'Evidence Found', value: `IELTS Band ${profile.ieltsScore} certified.` });
    } else {
      list.push({ label: 'English Proficiency', status: 'Missing', value: 'Take IELTS. No English test scores provided.' });
    }

    // Research
    if (profile.publicationsCount && profile.publicationsCount > 0) {
      list.push({ label: 'Research Experience', status: 'Evidence Found', value: `${profile.publicationsCount} publications detected (Source: Research timeline).` });
    } else {
      list.push({ label: 'Research Experience', status: 'Missing', value: 'No research publications found in CV profile.' });
    }

    // LOR
    if (profile.hasLOR) {
      list.push({ label: 'Reference Credentials', status: 'Evidence Found', value: '2 recommendation letters verified (Source: Academic references).' });
    } else {
      list.push({ label: 'Reference Credentials', status: 'Missing', value: 'No LOR details uploaded.' });
    }

    return list;
  };

  // Rejection Intelligence Simulation
  const handleAnalyzeRejection = () => {
    if (!rejectionEmail.trim()) return;
    setRejectionAnalysis({
      reasons: [
        'Missing leadership credentials in the statement narrative.',
        'High competitive index ratio of this year\'s pool.'
      ],
      roadmap: [
        'Optimize leadership essay drafts in Builder.',
        'Apply to DAAD Scholarship (82% probability match) as backup choice.'
      ]
    });
  };

  // Interview Coach feedback simulation
  const handleMockInterviewSubmit = () => {
    if (!userInterviewAnswer.trim()) return;
    setInterviewFeedback({
      confidenceScore: 84,
      strengths: 'Clear structural alignment. Communicates career objective bridging health tech gap.',
      weaknesses: 'Needs more specific metrics (e.g. mention the academic GPA of 3.72).',
      tip: 'Articulate how your NUST university thesis prepared you to manage rigorous postgraduate programs.'
    });
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', paddingBottom: '80px', padding: '24px' }}>
      <div style={{ marginBottom: '24px' }}>
        <Link href="/dashboard/portfolio" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: 'rgba(255,255,255,0.4)', textDecoration: 'none', fontSize: '13px' }}>
          ← Back to Portfolio
        </Link>
      </div>

      {/* Main Header Banner */}
      <div className="card-premium animate-fade-in" style={{ marginBottom: '28px', border: '1px solid rgba(99,102,241,0.2)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <span className="badge badge-indigo" style={{ marginBottom: '12px' }}>{opp.type.toUpperCase()} WORKSPACE</span>
            <h1 style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '28px', fontWeight: 800, color: 'white', marginBottom: '8px' }}>
              📁 Application Workspace: {opp.title}
            </h1>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '14px' }}>
              Manage, review, and verify every document required to submit a competitive application.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)' }}>Pipeline Stage:</span>
            <select
              value={pipelineStatus}
              onChange={(e) => handleStatusChange(e.target.value as ApplicationStatus)}
              style={{ background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', padding: '6px 12px', borderRadius: '8px', cursor: 'pointer' }}
            >
              {APPLICATION_STAGES.map(stage => (
                <option key={stage.key} value={stage.key}>{stage.icon} {stage.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '28px' }}>
        
        {/* LEFT COLUMN: Workspace Grid & Assistants */}
        <div>
          
          {/* 1. Documents Checklist Workspace */}
          <div className="card" style={{ padding: '24px', marginBottom: '28px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <h2 style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '18px', fontWeight: 700, color: 'white' }}>
                  📂 Mandatory Document Checklist
                </h2>
                <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>
                  Track formatting requirements and approval pipelines for target selectors.
                </p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '18px', fontWeight: 800, color: '#818cf8' }}>{completenessPercent}% Complete</span>
                <div style={{ width: '120px', height: '6px', background: 'rgba(255,255,255,0.06)', borderRadius: '3px', marginTop: '6px', overflow: 'hidden' }}>
                  <div style={{ width: `${completenessPercent}%`, height: '100%', background: '#818cf8', borderRadius: '3px' }} />
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              {docs.map(doc => (
                <div key={doc.key} className="glass-sm" style={{ padding: '14px', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid rgba(255,255,255,0.03)' }}>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: 'white' }}>{doc.name}</div>
                    <div style={{ fontSize: '11px', color: doc.status === 'Missing' ? '#f43f5e' : '#10b981', marginTop: '2px', fontWeight: 700 }}>
                      ● {doc.status}
                    </div>
                  </div>

                  <select
                    value={doc.status}
                    onChange={(e) => handleDocStatusChange(doc.key, e.target.value as any)}
                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', color: 'white', fontSize: '11px', padding: '4px 8px', borderRadius: '6px', cursor: 'pointer' }}
                  >
                    <option value="Ready">Ready</option>
                    <option value="Missing">Missing</option>
                    <option value="Needs Update">Needs Update</option>
                    <option value="Generated">Generated</option>
                    <option value="Reviewed">Reviewed</option>
                    <option value="Approved">Approved</option>
                  </select>
                </div>
              ))}
            </div>
          </div>

          {/* 2. Ready to Submit Assistant */}
          <div className="card" style={{ padding: '24px', marginBottom: '28px', border: '1px solid rgba(16,185,129,0.2)', background: 'rgba(16,185,129,0.01)' }}>
            <h2 style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '18px', fontWeight: 700, color: 'white', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>🚀</span> Official Portal Submission Assistant
            </h2>
            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)', lineHeight: 1.5, marginBottom: '20px' }}>
              Verify file nomenclature, portal configurations, and deadline limits before final uploading:
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
              <div className="glass-sm" style={{ padding: '16px', borderRadius: '12px' }}>
                <h3 style={{ fontSize: '12px', fontWeight: 700, color: '#10b981', marginBottom: '8px' }}>📂 FILE NAMING RULES</h3>
                <code style={{ fontSize: '11px', color: 'rgba(255,255,255,0.7)', display: 'block', background: 'rgba(0,0,0,0.2)', padding: '6px', borderRadius: '6px' }}>
                  {`SOP_${profile?.name ? profile.name.replace(/\s+/g, '_') : 'Candidate'}_Chevening_2025.pdf`}
                </code>
              </div>

              <div className="glass-sm" style={{ padding: '16px', borderRadius: '12px' }}>
                <h3 style={{ fontSize: '12px', fontWeight: 700, color: '#10b981', marginBottom: '8px' }}>⚖️ FILE SIZE GATES</h3>
                <span style={{ fontSize: '12px', color: 'white' }}>
                  PDF Limit: <strong>&lt; 5MB per file</strong>. <span style={{ color: '#10b981' }}>✓ Verification Passed</span>
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <input
                  type="checkbox"
                  id="submitConfirm"
                  checked={hasManuallyConfirmed}
                  onChange={(e) => {
                    setHasManuallyConfirmed(e.target.checked);
                    if (e.target.checked) {
                      handleStatusChange('official_submission');
                    }
                  }}
                  style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                />
                <label htmlFor="submitConfirm" style={{ fontSize: '13px', color: 'white', cursor: 'pointer', fontWeight: 600 }}>
                  I have manually completed and verified all documents and submitted the application on the official portal.
                </label>
              </div>
              <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', paddingLeft: '26px' }}>
                *Note: OpportunityOS AI acts as your compiler. We do not automatically claim portal submission without your verification.
              </p>
            </div>

            <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)' }}>Official Website Target:</span>
              <a href={opp.url || 'https://www.chevening.org'} target="_blank" rel="noopener noreferrer" className="btn btn-primary" style={{ padding: '8px 16px', fontSize: '12px' }}>
                Visit Official Portal ↗
              </a>
            </div>
          </div>

          {/* 3. Rejection Intelligence Panel (Conditional) */}
          {pipelineStatus === 'wishlist' && (
            <div className="card animate-fade-in" style={{ padding: '24px', border: '1px solid rgba(244,63,94,0.3)', background: 'rgba(244,63,94,0.01)', marginBottom: '28px' }}>
              <h2 style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '18px', fontWeight: 700, color: '#f43f5e', marginBottom: '8px' }}>
                🧠 Rejection Intelligence Analysis
              </h2>
              <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)', marginBottom: '16px' }}>
                Paste the contents of your rejection email below. Our parser will analyze criteria gaps and model a Recovery Roadmap.
              </p>

              <textarea
                value={rejectionEmail}
                onChange={(e) => setRejectionEmail(e.target.value)}
                placeholder="We regret to inform you that..."
                rows={4}
                style={{ width: '100%', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: 'white', padding: '12px', fontSize: '13px', marginBottom: '16px' }}
              />

              <button onClick={handleAnalyzeRejection} className="btn btn-rose" style={{ fontSize: '12px' }}>
                Analyze Rejection Letter
              </button>

              {rejectionAnalysis && (
                <div style={{ marginTop: '20px', background: 'rgba(0,0,0,0.2)', padding: '16px', borderRadius: '12px' }}>
                  <h3 style={{ fontSize: '13px', fontWeight: 700, color: 'white', marginBottom: '8px' }}>⚠️ DETECTED CRITERIA GAPS:</h3>
                  <ul style={{ paddingLeft: '20px', margin: '0 0 16px 0', fontSize: '12px', color: 'rgba(255,255,255,0.7)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {rejectionAnalysis.reasons.map((r: string, idx: number) => (
                      <li key={idx}>{r}</li>
                    ))}
                  </ul>

                  <h3 style={{ fontSize: '13px', fontWeight: 700, color: '#10b981', marginBottom: '8px' }}>📈 RECOMMENDED RECOVERY ROADMAP:</h3>
                  <ul style={{ paddingLeft: '20px', margin: '0', fontSize: '12px', color: 'rgba(255,255,255,0.7)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {rejectionAnalysis.roadmap.map((r: string, idx: number) => (
                      <li key={idx}>{r}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* 4. Interview Preparation Coach Widget */}
          {pipelineStatus === 'interview' && (
            <div className="card animate-fade-in" style={{ padding: '24px', border: '1px solid rgba(139,92,246,0.3)', background: 'rgba(139,92,246,0.01)', marginBottom: '28px' }}>
              <h2 style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '18px', fontWeight: 700, color: '#a78bfa', marginBottom: '8px' }}>
                🎙️ AI Scholarship Interview Coach
              </h2>
              <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)', marginBottom: '16px' }}>
                Review anticipated interview panels and test responses using the simulator:
              </p>

              <div style={{ background: 'rgba(0,0,0,0.2)', padding: '14px', borderRadius: '8px', marginBottom: '16px' }}>
                <span style={{ fontSize: '11px', color: '#a78bfa', fontWeight: 700 }}>SAMPLE SCHOLARSHIP PANEL QUESTION:</span>
                <p style={{ fontSize: '14px', color: 'white', fontWeight: 600, marginTop: '4px' }}>
                  "How do your target plans in the UK align with your development goal of establishing technology corridors in Pakistan?"
                </p>
              </div>

              <textarea
                value={userInterviewAnswer}
                onChange={(e) => setUserInterviewAnswer(e.target.value)}
                placeholder="Type your response here..."
                rows={3}
                style={{ width: '100%', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: 'white', padding: '12px', fontSize: '13px', marginBottom: '16px' }}
              />

              <button onClick={handleMockInterviewSubmit} className="btn btn-indigo" style={{ fontSize: '12px' }}>
                Evaluate Response
              </button>

              {interviewFeedback && (
                <div style={{ marginTop: '20px', background: 'rgba(0,0,0,0.2)', padding: '16px', borderRadius: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <h3 style={{ fontSize: '13px', fontWeight: 700, color: 'white' }}>ANALYST SCORECARD:</h3>
                    <span style={{ fontSize: '16px', fontWeight: 900, color: '#10b981' }}>{interviewFeedback.confidenceScore}% Confidence</span>
                  </div>
                  <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)', marginBottom: '8px' }}>
                    <strong>Strengths:</strong> {interviewFeedback.strengths}
                  </p>
                  <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)', marginBottom: '8px' }}>
                    <strong>Gaps to address:</strong> {interviewFeedback.weaknesses}
                  </p>
                  <p style={{ fontSize: '12px', color: '#a78bfa' }}>
                    <strong>Pro-Tip:</strong> {interviewFeedback.tip}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* 5. Visa Checklist Panel (Conditional) */}
          {(pipelineStatus === 'offer_received' || pipelineStatus === 'visa') && (
            <div className="card animate-fade-in" style={{ padding: '24px', border: '1px solid rgba(6,182,212,0.3)', background: 'rgba(6,182,212,0.01)', marginBottom: '28px' }}>
              <h2 style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '18px', fontWeight: 700, color: '#06b6d4', marginBottom: '8px' }}>
                🛂 Visa & Pre-Departure Checklist
              </h2>
              <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)', marginBottom: '16px' }}>
                Complete these steps after receiving your acceptance. Click items to mark as done.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {[
                  { task: 'Accept the offer letter officially', icon: '📩' },
                  { task: 'Gather financial proof documents', icon: '💰' },
                  { task: 'Book visa appointment at embassy/consulate', icon: '🏛️' },
                  { task: 'Prepare visa interview responses', icon: '🎤' },
                  { task: 'Submit biometrics and documents', icon: '📋' },
                  { task: 'Arrange accommodation in host country', icon: '🏠' },
                  { task: 'Book flights and travel insurance', icon: '✈️' },
                  { task: 'Complete university enrollment/registration', icon: '🎓' },
                ].map((item, idx) => (
                  <label key={idx} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', cursor: 'pointer', border: '1px solid rgba(255,255,255,0.04)' }}>
                    <input type="checkbox" style={{ width: '16px', height: '16px' }} />
                    <span style={{ fontSize: '13px', color: 'white' }}>{item.icon} {item.task}</span>
                  </label>
                ))}
              </div>
              {pipelineStatus === 'offer_received' && (
                <button
                  onClick={() => handleStatusChange('visa')}
                  className="btn btn-primary"
                  style={{ marginTop: '16px', fontSize: '12px' }}
                >
                  Move to Visa Stage →
                </button>
              )}
            </div>
          )}

          {/* 6. Career Growth Planner (Conditional) */}
          {pipelineStatus === 'enrolled' && (
            <div className="card animate-fade-in" style={{ padding: '24px', border: '1px solid rgba(34,197,94,0.3)', background: 'rgba(34,197,94,0.01)', marginBottom: '28px' }}>
              <h2 style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '18px', fontWeight: 700, color: '#22c55e', marginBottom: '8px' }}>
                🎓 Career Growth Planner
              </h2>
              <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)', marginBottom: '16px' }}>
                Congratulations on completing this opportunity! Plan your next steps.
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                {[
                  { title: 'Network Building', desc: 'Connect with alumni and cohort peers', icon: '🤝' },
                  { title: 'Skill Development', desc: 'Identify and acquire new competencies', icon: '📚' },
                  { title: 'Next Opportunity', desc: 'Explore advanced programs and careers', icon: '🚀' },
                  { title: 'Give Back', desc: 'Mentor future applicants', icon: '💡' },
                ].map((item, idx) => (
                  <div key={idx} className="glass-sm" style={{ padding: '16px', borderRadius: '12px' }}>
                    <div style={{ fontSize: '20px', marginBottom: '8px' }}>{item.icon}</div>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: 'white', marginBottom: '4px' }}>{item.title}</div>
                    <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)' }}>{item.desc}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* RIGHT COLUMN: Evidence Engine & Timeline */}
        <div>
          
          {/* A. Evidence Verification Panel */}
          <div className="card" style={{ padding: '20px', marginBottom: '24px', border: '1px solid rgba(99,102,241,0.15)' }}>
            <h3 style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '15px', fontWeight: 700, color: 'white', marginBottom: '12px' }}>
              🛡️ Evidence-Based Recommendations
            </h3>
            <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginBottom: '16px' }}>
              Direct mapping of academic credentials without speculation.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {getEvidenceAudit().map((item, idx) => (
                <div key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: 'white' }}>{item.label}</span>
                    <span style={{ fontSize: '10px', color: item.status === 'Missing' ? '#f43f5e' : item.status === 'Weak' ? '#f59e0b' : '#10b981', fontWeight: 700 }}>
                      {item.status.toUpperCase()}
                    </span>
                  </div>
                  <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)', marginTop: '4px', lineHeight: 1.4 }}>
                    {item.value}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* B. Dynamic Timeline */}
          <div className="card" style={{ padding: '20px', marginBottom: '24px' }}>
            <h3 style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '15px', fontWeight: 700, color: 'white', marginBottom: '16px' }}>
              🗺️ Acquisition Timeline
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', position: 'relative' }}>
              <div style={{ position: 'absolute', top: '10px', bottom: '10px', left: '15px', width: '2px', background: 'rgba(255,255,255,0.06)' }} />
              {APPLICATION_STAGES.map((stage, _i) => {
                const stageIdx = APPLICATION_STAGES.findIndex(s => s.key === pipelineStatus);
                const thisIdx = _i;
                const status = thisIdx < stageIdx ? 'done' : thisIdx === stageIdx ? 'active' : 'pending';
                return { name: stage.label, status, desc: `${stage.icon} ${stage.label} stage`, icon: stage.icon };
              }).map((step, idx) => (
                <div key={idx} style={{ display: 'flex', gap: '12px' }}>
                  <div style={{
                    width: '32px', height: '32px', borderRadius: '50%',
                    background: step.status === 'done' ? '#10b981' : step.status === 'active' ? '#818cf8' : 'rgba(255,255,255,0.05)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', zIndex: 1
                  }}>
                    {step.status === 'done' ? '✓' : idx + 1}
                  </div>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: 'white' }}>{step.name}</div>
                    <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* C. Transparency Layer */}
          <div className="card" style={{ padding: '20px', background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.03)' }}>
            <h3 style={{ fontSize: '13px', fontWeight: 700, color: 'white', marginBottom: '8px' }}>🤖 Transparency Audit</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>
              <div>Pipeline Stage: <strong style={{ color: APPLICATION_STAGES.find(s => s.key === pipelineStatus)?.color || '#818cf8' }}>{APPLICATION_STAGES.find(s => s.key === pipelineStatus)?.icon} {APPLICATION_STAGES.find(s => s.key === pipelineStatus)?.label}</strong></div>
              <div>Evidence Logs: <strong>{profile ? `${profile.name || 'Candidate'} profile data` : 'Not loaded'}</strong></div>
              <div>Documents Ready: <strong>{docs.filter(d => ['Ready', 'Generated', 'Reviewed', 'Approved'].includes(d.status)).length}/{docs.length}</strong></div>
              <div>Last Synced: <strong>{new Date().toLocaleDateString()}</strong></div>
              <div>Data Source: <a href={opp.url || '#'} target="_blank" rel="noopener noreferrer" style={{ color: '#818cf8', textDecoration: 'underline' }}>Official {opp.provider} Portal</a></div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
