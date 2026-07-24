'use client';

import { useState, useRef, useEffect } from 'react';
import { useDialog } from '@/components/ui/DialogProvider';
import { useRouter } from 'next/navigation';
import { useProfile } from '@/components/auth/ProfileContext';
import { useAuth } from '@/components/auth/AuthProvider';
import { storageProvider } from '@/lib/storage/StorageManager';
import { ValidationPipeline } from '@/lib/storage/ValidationPipeline';
import { EvidenceRepository } from '@/lib/repositories/EvidenceRepository';
import { motion } from 'framer-motion';
import { UploadCloud, FileText, BarChart, FlaskConical, BookUser, MessageCircle, Briefcase, Rocket, Download, Check, X, Info } from 'lucide-react';

const STEPS = [
  { id: 1, title: 'The Vision', desc: 'Identity & Goals' },
  { id: 2, title: 'Academic DNA', desc: 'Education Details' },
  { id: 3, title: 'Global Readiness', desc: 'Languages & Tests' },
  { id: 4, title: 'Professional Assets', desc: 'Skills & Links' },
  { id: 5, title: 'Evidence Vault', desc: 'Upload Documents' },
];

const AGENT_SEQUENCE = [
  { name: 'Reading Resume', delay: 0 },
  { name: 'Understanding Career Goals', delay: 800 },
  { name: 'Analyzing Skills', delay: 1600 },
  { name: 'Searching 100,000+ Opportunities...', delay: 2400 },
  { name: 'Calculating Success Probability', delay: 3200 },
  { name: 'Building Personal Strategy', delay: 4000 },
];

interface UploadedFile {
  name: string;
  size: string;
  source: 'local' | 'drive' | 'dropbox';
}

export default function OnboardingPage() {
  const { toast, confirm, prompt, showAILoading, hideAILoading } = useDialog();
  const [step, setStep] = useState(1);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzingProgress, setAnalyzingProgress] = useState(0);
  const [activeAgents, setActiveAgents] = useState<number[]>([]);
  const [done, setDone] = useState(false);
  const router = useRouter();

  const { updateProfile } = useProfile();
  const { user, getIdToken } = useAuth();

  // Document Upload States
  const [uploadedResume, setUploadedResume] = useState<UploadedFile | null>(null);
  const [uploadedTranscripts, setUploadedTranscripts] = useState<UploadedFile[]>([]);
  const [uploadedResearchPapers, setUploadedResearchPapers] = useState<UploadedFile[]>([]);
  const [linkedinConnected, setLinkedinConnected] = useState<string | null>(null);

  const [uploadedPassport, setUploadedPassport] = useState<UploadedFile | null>(null);
  const [uploadedIelts, setUploadedIelts] = useState<UploadedFile | null>(null);
  const [ieltsStatus, setIeltsStatus] = useState('Not Planned');
  const [ieltsDate, setIeltsDate] = useState('');
  const [ieltsExpected, setIeltsExpected] = useState('');
  const [activeTestInfo, setActiveTestInfo] = useState<string | null>(null);
  
  // OCR Mocks
  const [ocrConfirming, setOcrConfirming] = useState<string | null>(null);
  const [ocrData, setOcrData] = useState<any>(null);


  // Modal Control States
  const [activeUploadModal, setActiveUploadModal] = useState<'resume' | 'transcript' | 'research' | 'linkedin' | 'passport' | 'ielts' | null>(null);
  const [simulatedProgress, setSimulatedProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [linkedinInput, setLinkedinInput] = useState('');
  const [dragActive, setDragActive] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [profile, setProfile] = useState({
    name: '',
    email: '',
    country: '',
    goal: '',
    level: 'undergraduate',
    discipline: 'Technology & Engineering',
    careerGoal: '',
    targetOpportunities: [] as string[],
    education: '',
    gpa: '',
    previousEducation: '',
    previousDegreeField: '',
    englishTest: 'Not Planned',
    englishScore: '',
    englishDate: '',
    standardizedTestType: '',
    standardizedTestScore: '',
    skills: '',
    experience: '',
    dynamicLinks: {} as Record<string, string>,
  });

  const update = (key: string, val: string) =>
    setProfile(p => ({ ...p, [key]: val }));

  const toggleOpportunity = (type: string) => {
    setProfile(p => ({
      ...p,
      targetOpportunities: p.targetOpportunities.includes(type)
        ? p.targetOpportunities.filter(t => t !== type)
        : [...p.targetOpportunities, type],
    }));
  };

  useEffect(() => {
    if (analyzing) {
      const interval = setInterval(() => {
        setAnalyzingProgress(prev => {
          if (prev >= 100) {
            clearInterval(interval);
            return 100;
          }
          return prev + 1;
        });
      }, 40);
      return () => clearInterval(interval);
    }
  }, [analyzing]);

  const handleAnalyze = async () => {
    setAnalyzing(true);
    await updateProfile(profile);

    if (uploadedResume) localStorage.setItem('onboarding_resume', uploadedResume.name);
    if (uploadedTranscripts.length > 0) localStorage.setItem('onboarding_transcript', uploadedTranscripts[0].name);
    if (linkedinConnected) localStorage.setItem('onboarding_linkedin', linkedinConnected);
    if (uploadedPassport) localStorage.setItem('onboarding_passport', uploadedPassport.name);
    if (uploadedIelts) localStorage.setItem('onboarding_ielts', uploadedIelts.name);
    localStorage.setItem('ielts_status', ieltsStatus);
    if (ieltsDate) localStorage.setItem('ielts_planned_date', ieltsDate);
    if (ieltsExpected) localStorage.setItem('ielts_expected_score', ieltsExpected);
    
    // Animate progress smoothly instead of fake setTimeouts
    setAnalyzingProgress(100);
    setActiveAgents(AGENT_SEQUENCE.map((_, i) => i));
    setDone(true);
  };

  const [extractionLoading, setExtractionLoading] = useState(false);
  const [extractedFields, setExtractedFields] = useState<Record<string, boolean>>({});

  const handleNextStep = async () => {
    setStep(s => s + 1);
  };

  const startRealUpload = async (files: File[]) => {
    setIsUploading(true);
    setSimulatedProgress(0);
    try {
      const newFilesData: UploadedFile[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        await ValidationPipeline.validate(file);
        
        setSimulatedProgress(Math.floor((i / files.length) * 100));

        // 1. Client-Side Hashing for Deduplication
        const hashBuffer = await crypto.subtle.digest('SHA-256', await file.arrayBuffer());
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

        const token = await getIdToken();
        
        // 2. Request Presigned URL
        const presignRes = await fetch('/api/documents/presign', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            filename: file.name,
            contentType: file.type,
            size: file.size,
            hash: hashHex,
            type: activeUploadModal || 'other'
          })
        });

        const presignData = await presignRes.json();
        if (!presignRes.ok) {
          throw new Error(presignData.error || 'Failed to get upload URL');
        }

        // 3. Stream Proxy Upload (Bypasses Next.js FormData bottlenecks & R2 CORS)
        if (presignData.uploadUrl) {
          await new Promise<void>((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.open('PUT', presignData.uploadUrl);
            xhr.setRequestHeader('Content-Type', file.type);
            xhr.setRequestHeader('Authorization', `Bearer ${token}`);
            
            xhr.upload.onprogress = (e) => {
              if (e.lengthComputable) {
                const percentComplete = Math.round((e.loaded / e.total) * 100);
                const baseProgress = (i / files.length) * 100;
                const fileProgress = (percentComplete / files.length);
                setSimulatedProgress(Math.min(99, Math.floor(baseProgress + fileProgress)));
              }
            };
            
            xhr.onload = () => {
              if (xhr.status >= 200 && xhr.status < 300) {
                resolve();
              } else {
                reject(new Error('Direct upload failed. Please try again.'));
              }
            };
            
            xhr.onerror = () => reject(new Error('Network error during upload'));
            xhr.send(file);
          });
        }

        // 4. Trigger Server Parsing
        fetch('/api/documents/parse', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ documentId: presignData.documentId, userId: user?.uid }),
        }).catch(err => console.error('Parse API trigger failed', err));

        const sizeStr = (file.size / (1024 * 1024)).toFixed(2) + ' MB';
        newFilesData.push({ name: file.name, size: sizeStr, source: 'local' });
      }

      setSimulatedProgress(100);
      
      if (activeUploadModal === 'passport') {
        setUploadedPassport(newFilesData[0]);
      } else if (activeUploadModal === 'ielts') {
        setUploadedIelts(newFilesData[0]);
      } else if (activeUploadModal === 'resume') {
        setUploadedResume(newFilesData[0]);
      } else if (activeUploadModal === 'transcript') {
        setUploadedTranscripts(prev => [...prev, ...newFilesData]);
      } else if (activeUploadModal === 'research') {
        setUploadedResearchPapers(prev => [...prev, ...newFilesData]);
      }
    } catch (e: any) {
      toast(e.message);
    } finally {
      setIsUploading(false);
      setActiveUploadModal(null);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files);
      if ((activeUploadModal === 'transcript' || activeUploadModal === 'research') && files.length > 5) {
        toast('You can only upload up to 5 files at a time.');
        return;
      }
      startRealUpload(files);
    }
  };

  const triggerFileSelect = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // Drag and Drop handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const files = Array.from(e.dataTransfer.files);
      if ((activeUploadModal === 'transcript' || activeUploadModal === 'research') && files.length > 5) {
        toast('You can only upload up to 5 files at a time.');
        return;
      }
      startRealUpload(files);
    }
  };

  const connectLinkedin = () => {
    if (linkedinInput.trim().startsWith('http') || linkedinInput.includes('linkedin.com/')) {
      setLinkedinConnected(linkedinInput);
      setActiveUploadModal(null);
      setLinkedinInput('');
    } else {
      toast('Please enter a valid LinkedIn URL');
    }
  };

  if (analyzing || done) {
    return (
      <div className="page-transition" style={{ minHeight: '100vh', background: 'var(--bg-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
        <div style={{ maxWidth: '500px', width: '100%' }}>
          <h2 style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '32px', fontWeight: 800, color: 'white', marginBottom: '40px', animation: done ? 'none' : 'pulse-glow 3s infinite alternate' }}>
            Building Opportunity DNA...
          </h2>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', fontSize: '20px', fontFamily: 'Space Grotesk, sans-serif' }}>
            {AGENT_SEQUENCE.map((agent, i) => {
              const isActive = activeAgents.includes(i);
              if (!isActive) return null;
              
              const isCurrent = activeAgents[activeAgents.length - 1] === i && !done;
              
              return (
                <div key={agent.name} className="animate-slide-up" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: isCurrent ? 'white' : 'rgba(255,255,255,0.4)' }}>
                  <span>{agent.name}</span>
                  {!isCurrent ? (
                    <Check size={14} className="text-emerald-500 font-bold" />
                  ) : (
                    <span className="agent-status-dot running" style={{ display: 'inline-block' }} />
                  )}
                </div>
              );
            })}
          </div>

          {done && (
            <div className="animate-slide-up" style={{ marginTop: '48px', animationDelay: '0.2s', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '32px' }}>
              <div style={{ fontSize: '20px', color: 'white', fontFamily: 'Space Grotesk, sans-serif', marginBottom: '24px', fontWeight: 700 }}>
                Done.
              </div>
              <button
                className="btn btn-primary btn-lg"
                onClick={() => router.push('/dashboard')}
                style={{ width: '100%', justifyContent: 'center', padding: '16px', fontSize: '18px' }}
              >
                Welcome to Mission Control →
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'radial-gradient(ellipse at 50% 0%, rgba(99,102,241,0.12) 0%, var(--bg-primary) 60%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
      }}
    >
      <div style={{ width: '100%', maxWidth: '680px' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '40px', position: 'relative' }}>
          {/* Sandbox Button Removed to enforce authentic extraction */}
          <div style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '24px', fontWeight: 800, color: 'white', marginBottom: '8px' }}>
            Build Your <span className="gradient-text">Opportunity Profile</span>
          </div>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '14px' }}>
            The more you share, the smarter your AI Chief Officer becomes.
          </p>
        </div>

        {/* Step Progress */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '36px', justifyContent: 'center' }}>
          {STEPS.map(s => (
            <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div
                style={{
                  width: '32px', height: '32px', borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '13px', fontWeight: 700,
                  background: s.id < step ? 'var(--emerald)' : s.id === step ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : 'rgba(255,255,255,0.06)',
                  color: s.id <= step ? 'white' : 'rgba(255,255,255,0.3)',
                  border: s.id === step ? '2px solid rgba(99,102,241,0.5)' : 'none',
                  transition: 'all 0.3s ease',
                  boxShadow: s.id === step ? '0 0 16px rgba(99,102,241,0.4)' : 'none',
                }}
              >
                {s.id < step ? <Check size={16} /> : s.id}
              </div>
              {s.id < STEPS.length && (
                <div style={{ width: '32px', height: '2px', background: s.id < step ? 'var(--emerald)' : 'rgba(255,255,255,0.08)', borderRadius: '1px', transition: 'all 0.3s ease' }} />
              )}
            </div>
          ))}
        </div>

        {/* Step Title */}
        <div style={{ marginBottom: '24px' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(99,102,241,0.8)', letterSpacing: '2px', marginBottom: '4px' }}>
            STEP {step} OF {STEPS.length}
          </div>
          <div style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '22px', fontWeight: 700, color: 'white' }}>
            {STEPS[step - 1].title}
          </div>
        </div>

        {/* Form Card */}
        <div className="glass-bright" style={{ padding: '36px', borderRadius: '20px' }}>
          {step === 1 && (
            <div style={{ display: 'grid', gap: '20px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'rgba(255,255,255,0.6)', marginBottom: '8px' }}>Full Name *</label>
                <input className="input" placeholder="John Doe" value={profile.name} onChange={e => update('name', e.target.value)} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'rgba(255,255,255,0.6)', marginBottom: '8px' }}>Country of Residence *</label>
                <input className="input" placeholder="United States" value={profile.country} onChange={e => update('country', e.target.value)} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'rgba(255,255,255,0.6)', marginBottom: '8px' }}>Current Study Level</label>
                  <select className="input" value={profile.level} onChange={e => update('level', e.target.value)} style={{ appearance: 'none' }}>
                    <option value="highschool">High School</option>
                    <option value="undergraduate">Undergraduate (Bachelor's)</option>
                    <option value="masters">Master's</option>
                    <option value="phd">PhD</option>
                    <option value="postdoc">Postdoc</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'rgba(255,255,255,0.6)', marginBottom: '8px' }}>Broad Discipline</label>
                  <select className="input" value={profile.discipline} onChange={e => update('discipline', e.target.value)} style={{ appearance: 'none' }}>
                    <option value="Technology & Engineering">Technology & Engineering</option>
                    <option value="Medical & Healthcare">Medical & Healthcare</option>
                    <option value="Business & Management">Business & Management</option>
                    <option value="Arts & Design">Arts & Design</option>
                    <option value="Natural Sciences">Natural Sciences</option>
                    <option value="Humanities & Law">Humanities & Law</option>
                  </select>
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'rgba(255,255,255,0.6)', marginBottom: '8px' }}>One-line Goal *</label>
                <input className="input" placeholder="Win a fully-funded scholarship to study AI at a top UK university" value={profile.goal} onChange={e => update('goal', e.target.value)} />
              </div>
            </div>
          )}

          {step === 2 && (
            <div style={{ display: 'grid', gap: '20px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'rgba(255,255,255,0.6)', marginBottom: '8px' }}>Current/Most Recent Institution</label>
                <input className="input" placeholder="e.g. Harvard University" value={profile.education} onChange={e => update('education', e.target.value)} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'rgba(255,255,255,0.6)', marginBottom: '8px' }}>GPA / Grade</label>
                <input className="input" placeholder="e.g. 3.90 / 4.0 or 85%" value={profile.gpa} onChange={e => update('gpa', e.target.value)} />
              </div>
              
              {profile.level === 'undergraduate' && (
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'rgba(255,255,255,0.6)', marginBottom: '8px' }}>Previous Education (High School Track)</label>
                  <select className="input" value={profile.previousEducation} onChange={e => update('previousEducation', e.target.value)} style={{ appearance: 'none' }}>
                    <option value="">Select Track</option>
                    <option value="Pre-Medical">Pre-Medical</option>
                    <option value="Pre-Engineering">Pre-Engineering</option>
                    <option value="ICS">ICS (Computer Science)</option>
                    <option value="ICOM">ICOM (Commerce)</option>
                    <option value="FA">FA (Arts)</option>
                    <option value="A Levels">A Levels</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              )}

              {(profile.level === 'masters' || profile.level === 'phd' || profile.level === 'postdoc') && (
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'rgba(255,255,255,0.6)', marginBottom: '8px' }}>Previous Degree Field</label>
                  <input className="input" placeholder={profile.level === 'masters' ? "e.g. Bachelor's in Computer Science" : "e.g. Master's in Data Science"} value={profile.previousDegreeField} onChange={e => update('previousDegreeField', e.target.value)} />
                </div>
              )}
            </div>
          )}

          {step === 3 && (
            <div style={{ display: 'grid', gap: '24px' }}>
              <div style={{ padding: '20px', borderRadius: '12px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <h4 style={{ color: 'white', fontSize: '14px', fontWeight: 600, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}><MessageCircle size={18} /> English Proficiency</h4>
                <div style={{ display: 'grid', gap: '16px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'rgba(255,255,255,0.6)', marginBottom: '8px' }}>Have you taken an English test?</label>
                    <select className="input" value={profile.englishTest} onChange={e => update('englishTest', e.target.value)} style={{ appearance: 'none' }}>
                      <option value="Not Planned">Not Planned</option>
                      <option value="IELTS">IELTS</option>
                      <option value="TOEFL">TOEFL</option>
                      <option value="PTE">PTE Academic</option>
                      <option value="Duolingo">Duolingo English Test (DET)</option>
                      <option value="Cambridge">Cambridge English</option>
                      <option value="MOI">Medium of Instruction (MOI) Letter</option>
                    </select>
                  </div>
                  {profile.englishTest !== 'Not Planned' && profile.englishTest !== 'MOI' && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'rgba(255,255,255,0.6)', marginBottom: '8px' }}>Score / Band</label>
                        <input className="input" placeholder="e.g. 7.5" value={profile.englishScore} onChange={e => update('englishScore', e.target.value)} />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'rgba(255,255,255,0.6)', marginBottom: '8px' }}>Test Date (Optional)</label>
                        <input type="date" className="input" value={profile.englishDate} onChange={e => update('englishDate', e.target.value)} />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div style={{ padding: '20px', borderRadius: '12px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <h4 style={{ color: 'white', fontSize: '14px', fontWeight: 600, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}><FileText size={18} /> Standardized Tests</h4>
                <div style={{ display: 'grid', gap: '16px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'rgba(255,255,255,0.6)', marginBottom: '8px' }}>Select Test (if applicable)</label>
                    <select className="input" value={profile.standardizedTestType} onChange={e => { update('standardizedTestType', e.target.value); setActiveTestInfo(e.target.value); }} style={{ appearance: 'none' }}>
                      <option value="">None / Not Planned</option>
                      <option value="GRE">GRE</option>
                      <option value="GMAT">GMAT</option>
                      <option value="SAT">SAT</option>
                      <option value="ACT">ACT</option>
                      <option value="LSAT">LSAT</option>
                      <option value="MCAT">MCAT</option>
                      <option value="GATE">GATE</option>
                    </select>
                  </div>
                  
                  {activeTestInfo && activeTestInfo !== '' && (
                    <div style={{ background: 'rgba(99,102,241,0.1)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(99,102,241,0.2)', fontSize: '12px', color: 'rgba(255,255,255,0.8)' }}>
                      <strong style={{ color: '#818cf8' }}>What is {activeTestInfo}?</strong><br/>
                      {activeTestInfo === 'GRE' && 'Graduate Record Examinations. Often required for Master’s/PhD programs in the US.'}
                      {activeTestInfo === 'GMAT' && 'Graduate Management Admission Test. Required for many MBA and business programs.'}
                      {activeTestInfo === 'SAT' && 'Scholastic Assessment Test. Widely used for undergraduate admissions in the US.'}
                      {activeTestInfo === 'ACT' && 'American College Testing. Another major undergraduate admissions test in the US.'}
                      {activeTestInfo === 'LSAT' && 'Law School Admission Test. Required for law schools (JD programs) in the US and Canada.'}
                      {activeTestInfo === 'MCAT' && 'Medical College Admission Test. Required for medical schools in the US and Canada.'}
                      {activeTestInfo === 'GATE' && 'Graduate Aptitude Test in Engineering. Primarily used in India for engineering Master’s programs.'}
                    </div>
                  )}

                  {profile.standardizedTestType !== '' && (
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'rgba(255,255,255,0.6)', marginBottom: '8px' }}>Score (or Expected Score)</label>
                      <input className="input" placeholder="e.g. 320" value={profile.standardizedTestScore} onChange={e => update('standardizedTestScore', e.target.value)} />
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {step === 4 && (
            <div style={{ display: 'grid', gap: '20px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'rgba(255,255,255,0.6)', marginBottom: '8px' }}>Skills (comma-separated)</label>
                <textarea className="input" placeholder="Python, Machine Learning, Research, Leadership, Public Speaking..." value={profile.skills} onChange={e => update('skills', e.target.value)} rows={3} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'rgba(255,255,255,0.6)', marginBottom: '8px' }}>Work / Research Experience Summary</label>
                <textarea className="input" placeholder="2 years as research assistant at AI Lab, published 2 papers..." value={profile.experience} onChange={e => update('experience', e.target.value)} rows={4} />
              </div>
              
              <div style={{ marginTop: '8px' }}>
                <h4 style={{ color: 'white', fontSize: '14px', fontWeight: 600, marginBottom: '12px' }}>Professional Links</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  {profile.discipline === 'Technology & Engineering' && (
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'rgba(255,255,255,0.6)', marginBottom: '8px' }}>GitHub Profile</label>
                      <input className="input" placeholder="github.com/username" value={profile.dynamicLinks['github'] || ''} onChange={e => setProfile(p => ({...p, dynamicLinks: {...p.dynamicLinks, github: e.target.value}}))} />
                    </div>
                  )}
                  {profile.discipline === 'Medical & Healthcare' && (
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'rgba(255,255,255,0.6)', marginBottom: '8px' }}>ORCID / ResearchGate</label>
                      <input className="input" placeholder="orcid.org/..." value={profile.dynamicLinks['orcid'] || ''} onChange={e => setProfile(p => ({...p, dynamicLinks: {...p.dynamicLinks, orcid: e.target.value}}))} />
                    </div>
                  )}
                  {profile.discipline === 'Arts & Design' && (
                    <>
                      <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'rgba(255,255,255,0.6)', marginBottom: '8px' }}>Behance / Dribbble</label>
                        <input className="input" placeholder="behance.net/..." value={profile.dynamicLinks['behance'] || ''} onChange={e => setProfile(p => ({...p, dynamicLinks: {...p.dynamicLinks, behance: e.target.value}}))} />
                      </div>
                    </>
                  )}
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'rgba(255,255,255,0.6)', marginBottom: '8px' }}>LinkedIn Profile</label>
                    <input className="input" placeholder="linkedin.com/in/..." value={profile.dynamicLinks['linkedin'] || ''} onChange={e => setProfile(p => ({...p, dynamicLinks: {...p.dynamicLinks, linkedin: e.target.value}}))} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'rgba(255,255,255,0.6)', marginBottom: '8px' }}>Personal Website</label>
                    <input className="input" placeholder="yourdomain.com" value={profile.dynamicLinks['website'] || ''} onChange={e => setProfile(p => ({...p, dynamicLinks: {...p.dynamicLinks, website: e.target.value}}))} />
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 5 && (
            <div style={{ display: 'grid', gap: '16px' }}>
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px', marginBottom: '8px' }}>
                Upload your resume and academic records to construct your Opportunity DNA. All files are parsed securely.
              </p>
              
              <div style={{
                background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.08) 0%, rgba(139, 92, 246, 0.08) 100%)',
                border: '1px solid rgba(99, 102, 241, 0.2)',
                borderRadius: '12px',
                padding: '16px',
                display: 'flex',
                gap: '12px',
                alignItems: 'flex-start',
                marginBottom: '8px'
              }}>
                <div style={{ color: '#818cf8', marginTop: '2px', flexShrink: 0 }}>
                  <Info size={18} />
                </div>
                <div style={{ flex: 1 }}>
                  <h4 style={{ color: '#e0e7ff', fontSize: '13px', fontWeight: 600, marginBottom: '4px' }}>Missing some documents?</h4>
                  <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '12px', lineHeight: 1.5 }}>
                    You can safely skip this step and click <strong>Activate AI Analysis</strong>. You will be able to securely upload or update your evidence anytime from the Evidence Vault in your dashboard later.
                  </p>
                </div>
              </div>
              
              {/* Resume Row */}
              <div
                className="glass"
                onClick={() => setActiveUploadModal('resume')}
                style={{ padding: '20px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '16px', cursor: 'pointer', transition: 'all 0.2s ease', border: uploadedResume ? '1px solid rgba(16,185,129,0.3)' : '1px solid rgba(255,255,255,0.08)' }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = uploadedResume ? 'rgba(16,185,129,0.5)' : 'rgba(99,102,241,0.3)')}
                onMouseLeave={e => (e.currentTarget.style.borderColor = uploadedResume ? 'rgba(16,185,129,0.3)' : 'rgba(255,255,255,0.08)')}
              >
                <div style={{ display: 'flex', color: 'white' }}><FileText size={24} /></div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'white' }}>Resume / CV</div>
                  <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', marginTop: '2px' }}>
                    {uploadedResume ? <span style={{ color: '#10b981', fontWeight: 600 }}>Connected: {uploadedResume.name}</span> : 'System Storage (.pdf, .doc, .docx)'}
                  </div>
                </div>
                {uploadedResume ? (
                  <button onClick={(e) => { e.stopPropagation(); setUploadedResume(null); }} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', fontSize: '12px', cursor: 'pointer' }}>Disconnect <X size={12} /></button>
                ) : <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)' }}>Upload →</span>}
              </div>

              {/* Transcript Row */}
              <div
                className="glass"
                onClick={() => setActiveUploadModal('transcript')}
                style={{ padding: '20px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '16px', cursor: 'pointer', transition: 'all 0.2s ease', border: uploadedTranscripts.length > 0 ? '1px solid rgba(16,185,129,0.3)' : '1px solid rgba(255,255,255,0.08)' }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = uploadedTranscripts.length > 0 ? 'rgba(16,185,129,0.5)' : 'rgba(99,102,241,0.3)')}
                onMouseLeave={e => (e.currentTarget.style.borderColor = uploadedTranscripts.length > 0 ? 'rgba(16,185,129,0.3)' : 'rgba(255,255,255,0.08)')}
              >
                <div style={{ display: 'flex', color: 'white' }}><BarChart size={24} /></div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'white' }}>Academic Records (Transcripts / Degree)</div>
                  <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', marginTop: '2px' }}>
                    {uploadedTranscripts.length > 0 ? <span style={{ color: '#10b981', fontWeight: 600 }}>Connected: {uploadedTranscripts[0].name}</span> : 'System Storage (.pdf, .png, .jpg)'}
                  </div>
                </div>
                {uploadedTranscripts.length > 0 ? (
                  <button onClick={(e) => { e.stopPropagation(); setUploadedTranscripts([]); }} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', fontSize: '12px', cursor: 'pointer' }}>Disconnect <X size={12} /></button>
                ) : <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)' }}>Upload →</span>}
              </div>
              
              {/* Passport Row */}
              <div
                className="glass"
                onClick={() => setActiveUploadModal('passport')}
                style={{ padding: '20px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '16px', cursor: 'pointer', transition: 'all 0.2s ease', border: uploadedPassport ? '1px solid rgba(16,185,129,0.3)' : '1px solid rgba(255,255,255,0.08)' }}
              >
                <div style={{ display: 'flex', color: 'white' }}><BookUser size={24} /></div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'white' }}>Passport (Optional)</div>
                  <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', marginTop: '2px' }}>
                    {uploadedPassport ? <span style={{ color: '#10b981', fontWeight: 600 }}>Verified: {uploadedPassport.name}</span> : 'Missing. Some international opportunities require it.'}
                  </div>
                </div>
                {uploadedPassport ? (
                  <button onClick={(e) => { e.stopPropagation(); setUploadedPassport(null); }} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>Remove <X size={12} /></button>
                ) : <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)' }}>Upload →</span>}
              </div>
            </div>
          )}
        </div>

        {/* Navigation Buttons */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '24px' }}>
          {step > 1 ? (
            <button className="btn btn-secondary" onClick={() => setStep(s => s - 1)}>
              ← Back
            </button>
          ) : (
            <div />
          )}

          {step < STEPS.length ? (
            <button className="btn btn-primary" onClick={handleNextStep}>
              {extractionLoading ? 'Extracting...' : 'Continue →'}
            </button>
          ) : (
            <button className="btn btn-primary" onClick={handleAnalyze} style={{ animation: 'pulse-glow 2s ease-in-out infinite', display: 'flex', alignItems: 'center' }}>
              <Rocket size={18} style={{ marginRight: 8 }} /> Activate AI Analysis
            </button>
          )}
        </div>
      </div>

      {/* ======================== MODAL DIALOGS ======================== */}

      {/* OCR Confirmation Modal */}
      {ocrConfirming && ocrData && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(2, 4, 8, 0.85)', backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, padding: '20px' }}>
          <div className="glass-bright animate-slide-up" style={{ width: '100%', maxWidth: '420px', padding: '32px', borderRadius: '24px' }}>
            <h3 style={{ fontSize: '20px', fontWeight: 800, color: 'white', marginBottom: '16px' }}>AI Detected Info</h3>
            <div style={{ background: 'rgba(0,0,0,0.2)', padding: '16px', borderRadius: '12px', marginBottom: '24px' }}>
              {ocrConfirming === 'passport' && (
                <>
                  <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginBottom: '4px' }}>Passport Number</div>
                  <input className="input" value={ocrData.number} onChange={e => setOcrData({...ocrData, number: e.target.value})} style={{ marginBottom: '12px' }} />
                  <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginBottom: '4px' }}>Expiry Date</div>
                  <input type="date" className="input" value={ocrData.expiry} onChange={e => setOcrData({...ocrData, expiry: e.target.value})} />
                </>
              )}
              {ocrConfirming === 'ielts' && (
                <>
                  <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginBottom: '4px' }}>Overall Band</div>
                  <input className="input" value={ocrData.overall} onChange={e => setOcrData({...ocrData, overall: e.target.value})} />
                </>
              )}
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setOcrConfirming(null)}>Cancel</button>
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => {
                if (ocrConfirming === 'passport') setUploadedPassport({ name: 'passport_scan.pdf', size: '1.2 MB', source: 'local' });
                if (ocrConfirming === 'ielts') { setUploadedIelts({ name: 'ielts_report.pdf', size: '0.8 MB', source: 'local' }); setIeltsStatus('Uploaded'); }
                setOcrConfirming(null);
                setActiveUploadModal(null);
              }}><Check size={14} className="inline mr-1" /> Confirm</button>
            </div>
          </div>
        </div>
      )}

      {activeUploadModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(2, 4, 8, 0.85)',
            backdropFilter: 'blur(12px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px',
          }}
          onClick={() => {
            if (!isUploading) setActiveUploadModal(null);
          }}
        >
          <div
            className="glass-bright animate-slide-up"
            style={{
              width: '100%',
              maxWidth: '520px',
              padding: '32px',
              borderRadius: '24px',
              boxShadow: 'var(--glass-shadow)',
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
              <div>
                <h3 style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '20px', fontWeight: 800, color: 'white' }}>
                  {activeUploadModal === 'resume' ? 'Upload Resume / CV' : activeUploadModal === 'transcript' ? 'Upload Academic Transcripts' : activeUploadModal === 'research' ? 'Upload Research Papers' : activeUploadModal === 'passport' ? 'Upload Passport' : activeUploadModal === 'ielts' ? 'Upload IELTS' : 'Connect LinkedIn'}
                </h3>
                <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', marginTop: '4px' }}>
                  Choose a provider to link your document.
                </p>
              </div>
              <button
                onClick={() => setActiveUploadModal(null)}
                disabled={isUploading}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'rgba(255,255,255,0.4)',
                  fontSize: '20px',
                  cursor: 'pointer',
                }}
              >
                ✕
              </button>
            </div>

            {/* Content Logic */}
            {activeUploadModal === 'linkedin' ? (
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'rgba(255,255,255,0.6)', marginBottom: '8px' }}>
                  LinkedIn Profile URL
                </label>
                <input
                  className="input"
                  placeholder="https://www.linkedin.com/in/ahmad-khan"
                  value={linkedinInput}
                  onChange={e => setLinkedinInput(e.target.value)}
                  style={{ marginBottom: '20px' }}
                />
                <button className="btn btn-primary" onClick={connectLinkedin} style={{ width: '100%', justifyContent: 'center' }}>
                  Connect Profile Link
                </button>
              </div>
            ) : (
              <div>
                {isUploading ? (
                  <div style={{ padding: '40px 0', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <motion.div
                      animate={{ y: [0, -10, 0], scale: [1, 1.05, 1] }}
                      transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                      style={{ marginBottom: '24px', background: 'rgba(99,102,241,0.1)', padding: '20px', borderRadius: '50%', boxShadow: '0 0 30px rgba(99,102,241,0.3)' }}
                    >
                      <UploadCloud size={48} color="#818cf8" strokeWidth={1.5} />
                    </motion.div>
                    
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      style={{ fontSize: '16px', fontWeight: 700, color: 'white', marginBottom: '12px' }}
                    >
                      Encrypting & Uploading to Vault...
                    </motion.div>
                    
                    <div style={{ width: '100%', maxWidth: '320px', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', height: '8px', overflow: 'hidden', position: 'relative', marginBottom: '12px' }}>
                      <motion.div
                        style={{ height: '100%', background: 'linear-gradient(90deg, #6366f1, #8b5cf6, #ec4899)' }}
                        initial={{ width: 0 }}
                        animate={{ width: `${simulatedProgress}%` }}
                        transition={{ ease: "easeOut", duration: 0.2 }}
                      />
                    </div>
                    
                    <div style={{ fontSize: '13px', fontWeight: 600, color: 'rgba(255,255,255,0.6)', fontVariantNumeric: 'tabular-nums' }}>
                      {simulatedProgress}% <span style={{ color: 'rgba(255,255,255,0.3)' }}>• SECURE TRANSFER</span>
                    </div>
                  </div>
                ) : (
                  <div>
                      <div
                        onDragEnter={handleDrag}
                        onDragLeave={handleDrag}
                        onDragOver={handleDrag}
                        onDrop={handleDrop}
                        onClick={triggerFileSelect}
                        style={{
                          border: dragActive ? '2px dashed #818cf8' : '2px dashed rgba(255,255,255,0.1)',
                          background: dragActive ? 'rgba(99,102,241,0.06)' : 'rgba(255,255,255,0.02)',
                          borderRadius: '16px',
                          padding: '40px 20px',
                          textAlign: 'center',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                        }}
                      >
                        <input
                          type="file"
                          ref={fileInputRef}
                          style={{ display: 'none' }}
                          onChange={handleFileChange}
                          accept={activeUploadModal === 'resume' ? '.pdf,.doc,.docx' : '.pdf,.png,.jpg,.jpeg'}
                          multiple={activeUploadModal === 'transcript' || activeUploadModal === 'research'}
                        />
                        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px', color: 'white' }}><Download size={40} /></div>
                        <div style={{ fontSize: '14px', fontWeight: 600, color: 'white', marginBottom: '6px' }}>
                          Drag & drop {activeUploadModal === 'transcript' || activeUploadModal === 'research' ? 'files' : 'file'} here or click to browse
                        </div>
                        <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>
                          Supports {activeUploadModal === 'resume' ? 'PDF, DOC, DOCX' : 'PDF, PNG, JPG'} up to 10MB
                        </div>
                      </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
