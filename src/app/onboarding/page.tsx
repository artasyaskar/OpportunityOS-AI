'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useProfile } from '@/components/auth/ProfileContext';
import { useAuth } from '@/components/auth/AuthProvider';
import { storageProvider } from '@/lib/storage/StorageManager';
import { ValidationPipeline } from '@/lib/storage/ValidationPipeline';

const STEPS = [
  { id: 1, title: 'Verify Your Academic Profile', desc: 'Upload Evidence Documents' },
  { id: 2, title: 'Define Goals', desc: 'Your target countries and fields' },
  { id: 3, title: 'Academic Profile', desc: 'Institution & GPA grades' },
  { id: 4, title: 'Skills & Assets', desc: 'What you bring to the table' },
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
  const [step, setStep] = useState(1);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzingProgress, setAnalyzingProgress] = useState(0);
  const [activeAgents, setActiveAgents] = useState<number[]>([]);
  const [done, setDone] = useState(false);
  const router = useRouter();

  const { updateProfile } = useProfile();
  const { user } = useAuth();

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
    education: '',
    gpa: '',
    field: '',
    level: 'undergraduate',
    skills: '',
    experience: '',
    careerGoal: '',
    targetOpportunities: [] as string[],
    githubUrl: '',
    portfolioUrl: '',
    toeflScore: '',
    greScore: '',
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
    await updateProfile(profile);

    if (uploadedResume) localStorage.setItem('onboarding_resume', uploadedResume.name);
    if (uploadedTranscripts.length > 0) localStorage.setItem('onboarding_transcript', uploadedTranscripts[0].name);
    if (linkedinConnected) localStorage.setItem('onboarding_linkedin', linkedinConnected);
    if (uploadedPassport) localStorage.setItem('onboarding_passport', uploadedPassport.name);
    if (uploadedIelts) localStorage.setItem('onboarding_ielts', uploadedIelts.name);
    localStorage.setItem('ielts_status', ieltsStatus);
    if (ieltsDate) localStorage.setItem('ielts_planned_date', ieltsDate);
    if (ieltsExpected) localStorage.setItem('ielts_expected_score', ieltsExpected);
    
    setAnalyzing(true);
    
    setTimeout(() => {
      setAnalyzingProgress(100);
      setActiveAgents(AGENT_SEQUENCE.map((_, i) => i));
      setTimeout(() => setDone(true), 800);
    }, 2000);
  };

  const [extractionLoading, setExtractionLoading] = useState(false);
  const [extractedFields, setExtractedFields] = useState<Record<string, boolean>>({});

  const handleNextStep = async () => {
    if (step === 1 && (uploadedResume || uploadedTranscripts.length > 0 || linkedinConnected || uploadedResearchPapers.length > 0)) {
      setExtractionLoading(true);
      // Simulate calling ParserAgent/EvidenceEngine
      await new Promise(r => setTimeout(r, 1500));
      
      const newProfile = { ...profile };
      const newlyExtracted: Record<string, boolean> = { ...extractedFields };
      
      // removed hardcoded mock data (NUST, 3.72, etc.) to prevent false AI extractions
      // User will manually fill these fields until PDF text extraction is fully implemented.
      
      setProfile(newProfile);
      setExtractedFields(newlyExtracted);
      setExtractionLoading(false);
    }
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

        const formData = new FormData();
        formData.append('file', file);
        formData.append('type', activeUploadModal || 'other');
        formData.append('userId', user?.uid || '');

        const res = await fetch('/api/documents/upload', {
          method: 'POST',
          body: formData,
        });

        let data: any = {};
        try {
          data = await res.json();
        } catch (e) {
          console.error('Failed to parse upload response', e);
        }

        if (!res.ok) {
          throw new Error('Upload failed: ' + (data.error || res.statusText));
        }

        const docId = await import('@/lib/repositories/EvidenceRepository').then(m => 
          m.EvidenceRepository.addDocument(user?.uid || '', {
            type: (activeUploadModal || 'other') as any,
            status: 'QUEUED' as any,
            fileName: file.name,
            fileUrl: data.fileUrl,
            fileHash: data.hash,
            size: file.size,
            mimeType: file.type
          })
        );
        
        fetch('/api/documents/parse', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ documentId: docId, userId: user?.uid }),
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
      alert(e.message);
    } finally {
      setIsUploading(false);
      setActiveUploadModal(null);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files);
      if ((activeUploadModal === 'transcript' || activeUploadModal === 'research') && files.length > 5) {
        alert('You can only upload up to 5 files at a time.');
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
        alert('You can only upload up to 5 files at a time.');
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
      alert('Please enter a valid LinkedIn URL');
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
                    <span style={{ color: '#10b981', fontWeight: 700 }}>✓</span>
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
          <button 
            className="btn btn-ghost btn-sm"
            style={{ position: 'absolute', top: 0, right: 0, border: '1px solid rgba(255,255,255,0.1)', fontSize: '11px' }}
            onClick={() => setProfile({
              name: 'Demo Candidate',
              email: 'demo@example.com',
              country: 'Pakistan',
              goal: 'Win a fully-funded scholarship to study AI at a top European university',
              education: 'NUST (National University of Sciences and Technology)',
              gpa: '3.72',
              field: 'Computer Science',
              level: 'undergraduate',
              skills: 'Python, Machine Learning, Research, Leadership',
              experience: 'Final-year CS student, 1 research paper, 2 internships',
              careerGoal: 'Become a lead AI researcher bridging the gap in healthcare AI for developing countries.',
              targetOpportunities: ['Scholarships', 'Fellowships'],
              githubUrl: '',
              portfolioUrl: '',
              toeflScore: '',
              greScore: '',
            })}
          >
            Load Sandbox Profile Data
          </button>
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
                {s.id < step ? '✓' : s.id}
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
            <div style={{ display: 'grid', gap: '16px' }}>
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px', marginBottom: '8px' }}>
                Upload your resume, transcripts, and LinkedIn profile to construct your Opportunity DNA. All files are parsed securely.
              </p>
              
              {/* Resume Row */}
              <div
                className="glass"
                onClick={() => {
                  setActiveUploadModal('resume');
                }}
                style={{ padding: '20px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '16px', cursor: 'pointer', transition: 'all 0.2s ease', border: uploadedResume ? '1px solid rgba(16,185,129,0.3)' : '1px solid rgba(255,255,255,0.08)' }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = uploadedResume ? 'rgba(16,185,129,0.5)' : 'rgba(99,102,241,0.3)')}
                onMouseLeave={e => (e.currentTarget.style.borderColor = uploadedResume ? 'rgba(16,185,129,0.3)' : 'rgba(255,255,255,0.08)')}
              >
                <span style={{ fontSize: '24px' }}>📄</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'white' }}>Resume / CV</div>
                  <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', marginTop: '2px' }}>
                    {uploadedResume ? (
                      <span style={{ color: '#10b981', fontWeight: 600 }}>
                        Connected: {uploadedResume.name} ({uploadedResume.size}) via {uploadedResume.source}
                      </span>
                    ) : (
                      'System Storage, Google Drive, or Dropbox (.pdf, .doc, .docx)'
                    )}
                  </div>
                </div>
                {uploadedResume ? (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setUploadedResume(null);
                    }}
                    style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', fontSize: '12px', cursor: 'pointer' }}
                  >
                    Disconnect ✕
                  </button>
                ) : (
                  <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)' }}>Upload →</span>
                )}
              </div>

              {/* Transcript Row */}
              <div
                className="glass"
                onClick={() => {
                  setActiveUploadModal('transcript');
                }}
                style={{ padding: '20px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '16px', cursor: 'pointer', transition: 'all 0.2s ease', border: uploadedTranscripts.length > 0 ? '1px solid rgba(16,185,129,0.3)' : '1px solid rgba(255,255,255,0.08)' }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = uploadedTranscripts.length > 0 ? 'rgba(16,185,129,0.5)' : 'rgba(99,102,241,0.3)')}
                onMouseLeave={e => (e.currentTarget.style.borderColor = uploadedTranscripts.length > 0 ? 'rgba(16,185,129,0.3)' : 'rgba(255,255,255,0.08)')}
              >
                <span style={{ fontSize: '24px' }}>📊</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'white' }}>Academic Transcripts</div>
                  <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', marginTop: '2px' }}>
                    {uploadedTranscripts.length > 0 ? (
                      <span style={{ color: '#10b981', fontWeight: 600 }}>
                        Connected: {uploadedTranscripts[0].name} ({uploadedTranscripts[0].size}) via {uploadedTranscripts[0].source}
                      </span>
                    ) : (
                      'System Storage (.pdf, .png, .jpg)'
                    )}
                  </div>
                </div>
                {uploadedTranscripts.length > 0 ? (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setUploadedTranscripts([]);
                    }}
                    style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', fontSize: '12px', cursor: 'pointer' }}
                  >
                    Disconnect ✕
                  </button>
                ) : (
                  <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)' }}>Upload →</span>
                )}
              </div>
              
              {/* Research Papers Row */}
              <div
                className="glass"
                onClick={() => {
                  setActiveUploadModal('research');
                }}
                style={{ padding: '20px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '16px', cursor: 'pointer', transition: 'all 0.2s ease', border: uploadedResearchPapers.length > 0 ? '1px solid rgba(16,185,129,0.3)' : '1px solid rgba(255,255,255,0.08)' }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = uploadedResearchPapers.length > 0 ? 'rgba(16,185,129,0.5)' : 'rgba(99,102,241,0.3)')}
                onMouseLeave={e => (e.currentTarget.style.borderColor = uploadedResearchPapers.length > 0 ? 'rgba(16,185,129,0.3)' : 'rgba(255,255,255,0.08)')}
              >
                <span style={{ fontSize: '24px' }}>🔬</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'white' }}>Research Papers & Publications</div>
                  <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', marginTop: '2px' }}>
                    {uploadedResearchPapers.length > 0 ? (
                      <span style={{ color: '#10b981', fontWeight: 600 }}>
                        {uploadedResearchPapers.length} paper(s) uploaded
                      </span>
                    ) : (
                      'System Storage (.pdf)'
                    )}
                  </div>
                </div>
                {uploadedResearchPapers.length > 0 ? (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setUploadedResearchPapers([]);
                    }}
                    style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', fontSize: '12px', cursor: 'pointer' }}
                  >
                    Remove ✕
                  </button>
                ) : (
                  <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)' }}>Upload →</span>
                )}
              </div>


              {/* Passport Row */}
              <div
                className="glass"
                onClick={() => {
                  setActiveUploadModal('passport');
                }}
                style={{ padding: '20px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '16px', cursor: 'pointer', transition: 'all 0.2s ease', border: uploadedPassport ? '1px solid rgba(16,185,129,0.3)' : '1px solid rgba(255,255,255,0.08)' }}
              >
                <span style={{ fontSize: '24px' }}>🛂</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'white' }}>Passport</div>
                  <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', marginTop: '2px' }}>
                    {uploadedPassport ? (
                      <span style={{ color: '#10b981', fontWeight: 600 }}>
                        Verified: {uploadedPassport.name}
                      </span>
                    ) : (
                      'Missing. Some international opportunities require it. Upload later.'
                    )}
                  </div>
                </div>
                {uploadedPassport ? (
                  <button onClick={(e) => { e.stopPropagation(); setUploadedPassport(null); }} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', fontSize: '12px', cursor: 'pointer' }}>Remove ✕</button>
                ) : (
                  <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)' }}>Upload →</span>
                )}
              </div>

              {/* IELTS Row */}
              <div
                className="glass"
                style={{ padding: '20px', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '16px', border: uploadedIelts ? '1px solid rgba(16,185,129,0.3)' : '1px solid rgba(255,255,255,0.08)' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <span style={{ fontSize: '24px' }}>🗣️</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: 'white' }}>IELTS</div>
                    <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', marginTop: '2px' }}>
                      {uploadedIelts ? <span style={{ color: '#10b981', fontWeight: 600 }}>Verified: {uploadedIelts.name}</span> : 'Some opportunities require IELTS.'}
                    </div>
                  </div>
                  {!uploadedIelts && (
                    <select className="input" style={{ width: '150px', padding: '6px 10px', fontSize: '12px' }} value={ieltsStatus} onChange={e => setIeltsStatus(e.target.value)}>
                      <option value="Not Planned">Not Planned</option>
                      <option value="Scheduled">Scheduled</option>
                      <option value="Result Pending">Result Pending</option>
                      <option value="Upload Now">Upload Now</option>
                    </select>
                  )}
                  {uploadedIelts && (
                    <button onClick={(e) => { e.stopPropagation(); setUploadedIelts(null); setIeltsStatus('Not Planned'); }} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', fontSize: '12px', cursor: 'pointer' }}>Remove ✕</button>
                  )}
                </div>

                {ieltsStatus === 'Scheduled' && !uploadedIelts && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', paddingLeft: '40px' }}>
                    <div>
                      <label style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)' }}>Exam Date</label>
                      <input type="date" className="input" style={{ padding: '8px' }} value={ieltsDate} onChange={e => setIeltsDate(e.target.value)} />
                    </div>
                    <div>
                      <label style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)' }}>Expected Band</label>
                      <input type="number" step="0.5" className="input" style={{ padding: '8px' }} placeholder="7.0" value={ieltsExpected} onChange={e => setIeltsExpected(e.target.value)} />
                    </div>
                  </div>
                )}
                
                {ieltsStatus === 'Upload Now' && !uploadedIelts && (
                  <div style={{ paddingLeft: '40px' }}>
                     <button className="btn btn-secondary btn-sm" onClick={() => { setActiveUploadModal('ielts'); }}>Open Uploader</button>
                  </div>
                )}
              </div>

              {/* LinkedIn Row */}
              <div
                className="glass"
                onClick={() => {
                  setActiveUploadModal('linkedin');
                }}
                style={{ padding: '20px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '16px', cursor: 'pointer', transition: 'all 0.2s ease', border: linkedinConnected ? '1px solid rgba(16,185,129,0.3)' : '1px solid rgba(255,255,255,0.08)' }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = linkedinConnected ? 'rgba(16,185,129,0.5)' : 'rgba(99,102,241,0.3)')}
                onMouseLeave={e => (e.currentTarget.style.borderColor = linkedinConnected ? 'rgba(16,185,129,0.3)' : 'rgba(255,255,255,0.08)')}
              >
                <span style={{ fontSize: '24px' }}>💼</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'white' }}>LinkedIn Profile URL</div>
                  <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', marginTop: '2px' }}>
                    {linkedinConnected ? (
                      <span style={{ color: '#10b981', fontWeight: 600 }}>
                        Linked: {linkedinConnected}
                      </span>
                    ) : (
                      'Paste your LinkedIn URL to ingest your experience'
                    )}
                  </div>
                </div>
                {linkedinConnected ? (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setLinkedinConnected(null);
                    }}
                    style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', fontSize: '12px', cursor: 'pointer' }}
                  >
                    Disconnect ✕
                  </button>
                ) : (
                  <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)' }}>Connect →</span>
                )}
              </div>
            </div>
          )}

          {step === 2 && (
            <div style={{ display: 'grid', gap: '20px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'rgba(255,255,255,0.6)', marginBottom: '8px' }}>Full Name *</label>
                <input className="input" placeholder="John Doe" value={profile.name} onChange={e => update('name', e.target.value)} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'rgba(255,255,255,0.6)', marginBottom: '8px' }}>Country of Residence *</label>
                <input className="input" placeholder="United States" value={profile.country} onChange={e => update('country', e.target.value)} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'rgba(255,255,255,0.6)', marginBottom: '8px' }}>One-line Goal *</label>
                <input className="input" placeholder="Win a fully-funded scholarship to study AI at a top UK university" value={profile.goal} onChange={e => update('goal', e.target.value)} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'rgba(255,255,255,0.6)', marginBottom: '8px' }}>Career Vision</label>
                <textarea className="input" placeholder="Become a lead AI researcher in developing countries..." value={profile.careerGoal} onChange={e => update('careerGoal', e.target.value)} rows={3} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'rgba(255,255,255,0.6)', marginBottom: '12px' }}>Target Opportunity Types</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                  {['Scholarships', 'Fellowships', 'Grants', 'Remote Jobs', 'Accelerators', 'Competitions'].map(type => {
                    const selected = profile.targetOpportunities.includes(type);
                    return (
                      <button
                        key={type}
                        type="button"
                        onClick={() => toggleOpportunity(type)}
                        style={{
                          padding: '10px',
                          borderRadius: '10px',
                          border: selected ? '1px solid rgba(99,102,241,0.6)' : '1px solid rgba(255,255,255,0.1)',
                          background: selected ? 'rgba(99,102,241,0.15)' : 'transparent',
                          color: selected ? '#818cf8' : 'rgba(255,255,255,0.5)',
                          fontSize: '12px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                        }}
                      >
                        {type}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div style={{ display: 'grid', gap: '20px' }}>
              <div>
                <label style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 600, color: 'rgba(255,255,255,0.6)', marginBottom: '8px' }}>
                  <span>Current/Most Recent Institution</span>
                  {extractedFields.education && <span style={{ color: '#10b981' }}>✓ Extracted by AI</span>}
                </label>
                <input 
                  className="input" 
                  style={extractedFields.education ? { borderColor: 'rgba(16,185,129,0.5)', background: 'rgba(16,185,129,0.05)' } : {}}
                  placeholder="e.g. Harvard University" 
                  value={profile.education} 
                  onChange={e => update('education', e.target.value)} 
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 600, color: 'rgba(255,255,255,0.6)', marginBottom: '8px' }}>
                    <span>GPA / Grade</span>
                    {extractedFields.gpa && <span style={{ color: '#10b981' }}>✓ Extracted</span>}
                  </label>
                  <input 
                    className="input" 
                    style={extractedFields.gpa ? { borderColor: 'rgba(16,185,129,0.5)', background: 'rgba(16,185,129,0.05)' } : {}}
                    placeholder="e.g. 3.90 / 4.0" 
                    value={profile.gpa} 
                    onChange={e => update('gpa', e.target.value)} 
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'rgba(255,255,255,0.6)', marginBottom: '8px' }}>Study Level</label>
                  <select className="input" value={profile.level} onChange={e => update('level', e.target.value)} style={{ appearance: 'none' }}>
                    <option value="undergraduate">Undergraduate</option>
                    <option value="masters">Masters</option>
                    <option value="phd">PhD</option>
                    <option value="postdoc">Postdoc</option>
                  </select>
                </div>
              </div>
              <div>
                <label style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 600, color: 'rgba(255,255,255,0.6)', marginBottom: '8px' }}>
                  <span>Field of Study</span>
                  {extractedFields.field && <span style={{ color: '#10b981' }}>✓ Extracted by AI</span>}
                </label>
                <input 
                  className="input" 
                  style={extractedFields.field ? { borderColor: 'rgba(16,185,129,0.5)', background: 'rgba(16,185,129,0.05)' } : {}}
                  placeholder="e.g. Computer Science" 
                  value={profile.field} 
                  onChange={e => update('field', e.target.value)} 
                />
              </div>
            </div>
          )}

          {step === 4 && (
            <div style={{ display: 'grid', gap: '20px' }}>
              <div>
                <label style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 600, color: 'rgba(255,255,255,0.6)', marginBottom: '8px' }}>
                  <span>Skills (comma-separated)</span>
                  {extractedFields.skills && <span style={{ color: '#10b981' }}>✓ Extracted from Document</span>}
                </label>
                <textarea 
                  className="input" 
                  style={extractedFields.skills ? { borderColor: 'rgba(16,185,129,0.5)', background: 'rgba(16,185,129,0.05)' } : {}}
                  placeholder="Python, Machine Learning, Research, Leadership, Public Speaking..." 
                  value={profile.skills} 
                  onChange={e => update('skills', e.target.value)} 
                  rows={3} 
                />
              </div>
              <div>
                <label style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 600, color: 'rgba(255,255,255,0.6)', marginBottom: '8px' }}>
                  <span>Work / Research Experience</span>
                  {extractedFields.experience && <span style={{ color: '#10b981' }}>✓ Extracted from Document</span>}
                </label>
                <textarea 
                  className="input" 
                  style={extractedFields.experience ? { borderColor: 'rgba(16,185,129,0.5)', background: 'rgba(16,185,129,0.05)' } : {}}
                  placeholder="2 years as research assistant at AI Lab, published 2 papers..." 
                  value={profile.experience} 
                  onChange={e => update('experience', e.target.value)} 
                  rows={4} 
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'rgba(255,255,255,0.6)', marginBottom: '8px' }}>GitHub Profile URL</label>
                  <input className="input" placeholder="github.com/username" value={profile.githubUrl} onChange={e => update('githubUrl', e.target.value)} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'rgba(255,255,255,0.6)', marginBottom: '8px' }}>Personal Portfolio URL</label>
                  <input className="input" placeholder="johndoe.com" value={profile.portfolioUrl} onChange={e => update('portfolioUrl', e.target.value)} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'rgba(255,255,255,0.6)', marginBottom: '8px' }}>TOEFL / IELTS Score</label>
                  <input className="input" placeholder="e.g. 110 / 8.0" value={profile.toeflScore} onChange={e => update('toeflScore', e.target.value)} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'rgba(255,255,255,0.6)', marginBottom: '8px' }}>GRE / GMAT Score</label>
                  <input className="input" placeholder="e.g. 320" value={profile.greScore} onChange={e => update('greScore', e.target.value)} />
                </div>
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
            <button className="btn btn-primary" onClick={handleAnalyze} style={{ animation: 'pulse-glow 2s ease-in-out infinite' }}>
              🚀 Activate AI Analysis
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
              }}>✓ Confirm</button>
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
                  <div style={{ padding: '40px 0', textAlign: 'center' }}>
                    <div style={{ fontSize: '32px', animation: 'rotate-slow 2s linear infinite', marginBottom: '16px' }}>🔄</div>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: 'white', marginBottom: '8px' }}>
                      Uploading to OpportunityOS Secure Vault...
                    </div>
                    <div className="progress-bar" style={{ maxWidth: '300px', margin: '0 auto' }}>
                      <div className="progress-fill" style={{ width: `${simulatedProgress}%` }} />
                    </div>
                    <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginTop: '8px' }}>
                      {simulatedProgress}% uploaded
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
                        <div style={{ fontSize: '40px', marginBottom: '16px' }}>📥</div>
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
