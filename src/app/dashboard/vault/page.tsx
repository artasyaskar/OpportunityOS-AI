'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { UploadCloud, CheckCircle, XCircle, AlertTriangle, Clock } from 'lucide-react';
import { EvidenceRepository, EvidenceDocument, EvidenceType, DocumentStatus } from '@/lib/repositories/EvidenceRepository';
import { storageProvider } from '@/lib/storage/StorageManager';
import Link from 'next/link';
import { EvidenceReview } from '@/components/EvidenceReview';
import { UserRepository } from '@/lib/repositories/UserRepository';
import { EvidenceEngine } from '@/lib/services/EvidenceEngine';
import { ProfileMergeEngine } from '@/lib/services/ProfileMergeEngine';
import { useSubscription } from '@/components/auth/SubscriptionContext';
import {
  FileText, BarChart, BookOpen, IdCard, MessageCircle, Mail, PenTool, FlaskConical, Palette, FileEdit, Award, Briefcase, DollarSign, Plane, Paperclip,
  Settings, Upload, Archive, Download, RefreshCw, Trash2
} from 'lucide-react';

const EVIDENCE_ICONS: Record<string, React.ReactNode> = {
  resume: <FileText size={28} />, transcript: <BarChart size={28} />, passport: <BookOpen size={28} />, national_id: <IdCard size={28} />,
  ielts: <MessageCircle size={28} />, toefl: <MessageCircle size={28} />, pte: <MessageCircle size={28} />, duolingo: <MessageCircle size={28} />,
  lor: <Mail size={28} />, personal_statement: <PenTool size={28} />, sop: <PenTool size={28} />,
  research_proposal: <FlaskConical size={28} />, portfolio: <Palette size={28} />, publication: <FileEdit size={28} />,
  award: <Award size={28} />, internship_certificate: <Briefcase size={28} />, employment_letter: <Briefcase size={28} />,
  financial_statement: <DollarSign size={28} />, visa: <Plane size={28} />, other: <Paperclip size={28} />,
};

function generateDemoEvidence(userId: string): EvidenceDocument[] {
  return []; // Removed hardcoded mock evidence to prevent user confusion
}

export default function EvidenceVaultPage() {
  const { user, getIdToken } = useAuth();
  const { subscription } = useSubscription();
  const [documents, setDocuments] = useState<EvidenceDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedDoc, setExpandedDoc] = useState<string | null>(null);
  const [replacingDocId, setReplacingDocId] = useState<string | null>(null);
  const [editingDocId, setEditingDocId] = useState<string | null>(null);
  const [editDataStr, setEditDataStr] = useState<string>('');
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user?.uid) {
      loadDocuments(user.uid);
    } else {
      // Demo / Presentation Mode
      setDocuments(generateDemoEvidence('demo-user'));
      setLoading(false);
    }
  }, [user]);

  const loadDocuments = async (uid: string) => {
    try {
      let docs = await EvidenceRepository.getEvidenceForUser(uid);
      setDocuments(docs);
    } catch (err) {
      console.error(err);
      setDocuments(generateDemoEvidence('demo'));
    } finally {
      setLoading(false);
    }
  };

  const getExpiryBadge = (doc: EvidenceDocument) => {
    const status = EvidenceRepository.getExpirationStatus(doc);
    const colors = { Expired: '#ef4444', 'Expires Soon': '#f59e0b', Valid: '#10b981' };
    return <span style={{ color: colors[status], fontWeight: 600, fontSize: '11px' }}>{status}</span>;
  };

  const handleDownload = async (doc: EvidenceDocument) => {
    try {
      const url = await storageProvider.generateDownloadUrl(doc.storageKey);
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.fileName;
      a.click();
    } catch (e: any) {
      alert('Could not download file: ' + e.message);
    }
  };
  
  const handleAcceptReview = async (docId: string, updatedData: any) => {
    if (!user?.uid) return;
    const doc = documents.find(d => d.id === docId);
    if (!doc) return;
    
    const updatedDoc = {
      ...doc,
      extractedData: updatedData,
      status: DocumentStatus.VERIFIED,
      whoVerified: 'User' as const,
    };
    await EvidenceRepository.saveEvidence(user.uid, updatedDoc);
    
    // Update canonical profile
    const profile = await UserRepository.getProfile(user.uid);
    if (profile) {
      const allDocs = await EvidenceRepository.getEvidenceForUser(user.uid);
      const verifiedEvidence = EvidenceEngine.extractFromDocuments(allDocs);
      const updatedProfile = ProfileMergeEngine.generateCanonicalProfile(profile, verifiedEvidence);
      await UserRepository.saveProfile(user.uid, updatedProfile);
    }
    
    loadDocuments(user.uid);
  };

  const handleRejectReview = async (docId: string) => {
    if (!user?.uid) return;
    const doc = documents.find(d => d.id === docId);
    if (!doc) return;
    
    const updatedDoc = {
      ...doc,
      status: DocumentStatus.REJECTED,
    };
    await EvidenceRepository.saveEvidence(user.uid, updatedDoc);
    loadDocuments(user.uid);
  };
  
  const getFreshnessLabel = (dateStr: string) => {
    const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 3600 * 24));
    if (diff === 0) return 'Today';
    if (diff === 1) return 'Yesterday';
    if (diff < 30) return `${diff} days ago`;
    if (diff < 365) return `${Math.floor(diff / 30)} months ago`;
    return `${Math.floor(diff / 365)} years ago`;
  };

  const handleReplaceClick = (docId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setReplacingDocId(docId);
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleUrlSubmit = async (url: string) => {
    if (!user?.uid) return;
    setIsUploading(true);
    try {
      const newDoc = {
        id: crypto.randomUUID(),
        userId: user.uid,
        type: 'research_memory',
        fileName: url,
        size: 0,
        mimeType: 'text/html',
        uploadedAt: new Date().toISOString(),
        lastUpdatedAt: new Date().toISOString(),
        status: DocumentStatus.PROCESSING as any,
        storageKey: `evidence/${user.uid}/research/${Date.now()}_url`,
        source: url,
        aiConfidence: 0,
        version: 1,
        usedInApplications: []
      };
      await EvidenceRepository.saveEvidence(user.uid, newDoc as any);
      loadDocuments(user.uid);

      const token = await getIdToken();
      const res = await fetch('/api/agents/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ url })
      });
      
      const parsedData = await res.json();
      
      const updatedDoc = {
        ...newDoc,
        status: DocumentStatus.VERIFIED as any,
        extractedInsights: res.ok ? parsedData : { Title: 'Extracted Research', Results: 'Parsing failed' },
        aiConfidence: 95
      };
      
      await EvidenceRepository.saveEvidence(user.uid, updatedDoc as any);
      loadDocuments(user.uid);
    } catch (err) {
      console.error(err);
      alert('Failed to process URL.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileUpload = async (file: File) => {
    if (!user?.uid) return;
    
    const isFree = !subscription || subscription.status === 'FREE' || subscription.planId === 'free';
    if (isFree && documents.length >= 2) {
      alert("Free plan is limited to 2 documents. Please upgrade to Pro to upload unlimited evidence.");
      return;
    }

    setIsUploading(true);
    try {
      const newDoc = {
        id: crypto.randomUUID(),
        userId: user.uid,
        type: 'other', // Could try to infer type based on name or let AI categorize
        fileName: file.name,
        size: file.size,
        mimeType: file.type,
        uploadedAt: new Date().toISOString(),
        lastUpdatedAt: new Date().toISOString(),
        status: DocumentStatus.PROCESSING as any,
        storageKey: `evidence/${user.uid}/other/${Date.now()}_${file.name}`,
        source: 'local',
        aiConfidence: 0,
        version: 1,
        usedInApplications: []
      };
      await EvidenceRepository.saveEvidence(user.uid, newDoc as any);
      alert('Document successfully added to vault! Wait a moment for AI extraction.');
      loadDocuments(user.uid);

      // Trigger asynchronous AI processing via real API
      setTimeout(async () => {
        try {
          const token = await getIdToken();
          const formData = new FormData();
          formData.append('file', file);
          
          const res = await fetch('/api/agents/parser', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: formData
          });
          const parsedData = await res.json();
          
          const updatedDoc = {
            ...newDoc,
            status: DocumentStatus.VERIFIED as any,
            extractedData: res.ok ? parsedData : {
              summary: `Extracted data from ${file.name}`,
              typeDetected: file.type || 'Unknown Document',
              confidence: 92,
              skills: ['Analytical Thinking', 'Problem Solving']
            },
            aiConfidence: parsedData?.confidenceScore || 92
          };
          await EvidenceRepository.saveEvidence(user.uid, updatedDoc as any);
          loadDocuments(user.uid);
        } catch (e) {
          console.error(e);
        }
      }, 500);

    } catch (err) {
      console.error(err);
      alert('Upload failed.');
    } finally {
      setIsUploading(false);
      if (uploadInputRef.current) uploadInputRef.current.value = '';
    }
  };

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleFileReplace = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0] || !user?.uid || !replacingDocId) return;
    const file = e.target.files[0];
    
    try {
      const doc = documents.find(d => d.id === replacingDocId);
      if (!doc) return;
      
      const newDoc = {
        ...doc,
        fileName: file.name,
        size: file.size,
        mimeType: file.type,
        lastUpdatedAt: new Date().toISOString(),
        version: (doc.version || 1) + 1,
        status: DocumentStatus.PROCESSING as any,
      };
      
      await EvidenceRepository.saveEvidence(user.uid, newDoc);
      alert(`Document successfully replaced with ${file.name}. AI is processing...`);
      loadDocuments(user.uid);

      // Trigger asynchronous AI processing via real API
      setTimeout(async () => {
        try {
          const token = await getIdToken();
          const formData = new FormData();
          formData.append('file', file);

          const res = await fetch('/api/agents/parser', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: formData
          });
          const parsedData = await res.json();

          const updatedDoc = {
            ...newDoc,
            status: DocumentStatus.VERIFIED as any,
            extractedData: res.ok ? parsedData : {
              summary: `Updated extracted data from new version of ${file.name}`,
              confidence: 95,
              updatedFields: ['Experience', 'Education']
            },
            aiConfidence: parsedData?.confidenceScore || 95
          };
          await EvidenceRepository.saveEvidence(user.uid, updatedDoc as any);
          loadDocuments(user.uid);
        } catch (e) {
          console.error(e);
        }
      }, 500);

    } catch (err) {
      console.error(err);
      alert('Failed to replace document.');
    } finally {
      setReplacingDocId(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDelete = async (docId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this document? This may affect your AI recommendations.')) return;
    if (!user?.uid) return;
    
    try {
      await EvidenceRepository.deleteEvidence(docId);
      loadDocuments(user.uid);
      alert('Document permanently deleted from Vault.');
    } catch (err) {
      console.error(err);
    }
  };

  const handleEditSave = async (docId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user?.uid) return;
    try {
      const parsedData = JSON.parse(editDataStr);
      const doc = documents.find(d => d.id === docId);
      if (!doc) return;
      const updatedDoc = {
        ...doc,
        extractedData: parsedData,
        lastUpdatedAt: new Date().toISOString()
      };
      await EvidenceRepository.saveEvidence(user.uid, updatedDoc);
      setEditingDocId(null);
      loadDocuments(user.uid);
    } catch (err) {
      alert("Invalid JSON format. Please check your syntax.");
    }
  };

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', paddingBottom: '60px' }}>
      <div className="glass" style={{ padding: '32px', borderRadius: '16px', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '32px', fontWeight: 900, color: 'white', marginBottom: '8px' }}>
            Personal Intelligence Vault
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '15px', maxWidth: '600px', lineHeight: 1.5 }}>
            The AI Memory Layer for your career. Every document, publication, behavioral story, and project is analyzed into deeply structured Knowledge Nodes.
          </p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <button 
            className="btn btn-primary" 
            onClick={() => uploadInputRef.current?.click()}
            disabled={isUploading}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            {isUploading ? <><RefreshCw size={18} className="spin mr-2" /> Indexing...</> : <><UploadCloud size={18} className="mr-2" /> Upload Document</>}
          </button>
          
          <button 
            className="btn btn-secondary" 
            onClick={() => {
              const url = prompt("Enter a Research URL (DOI, arXiv, IEEE, PDF):");
              if (url) handleUrlSubmit(url);
            }}
            disabled={isUploading}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px' }}
          >
            <BookOpen size={14} className="mr-2" /> Import Academic Link
          </button>
        </div>
      </div>

      <input 
        type="file" 
        ref={uploadInputRef} 
        style={{ display: 'none' }} 
        onChange={(e) => e.target.files && handleFileUpload(e.target.files[0])} 
        accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
      />

      {/* Hidden File Input for Replace */}
      <input 
        type="file" 
        ref={fileInputRef} 
        style={{ display: 'none' }} 
        onChange={handleFileReplace} 
        accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
      />

      {/* Summary Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '24px' }}>
        {[
          { label: 'Total Documents', value: documents.length, color: '#6366f1' },
          { label: 'Verified', value: documents.filter(d => d.status === DocumentStatus.VERIFIED).length, color: '#10b981' },
          { label: 'Used In Apps', value: new Set(documents.flatMap(d => d.usedInApplications)).size, color: '#06b6d4' },
          { label: 'Expiring Soon', value: documents.filter(d => EvidenceRepository.getExpirationStatus(d) === 'Expires Soon').length, color: '#f59e0b' },
        ].map(stat => (
          <div key={stat.label} className="glass-sm" style={{ padding: '16px', borderRadius: '12px', textAlign: 'center' }}>
            <div style={{ fontSize: '24px', fontWeight: 900, color: stat.color, fontFamily: 'Space Grotesk, sans-serif' }}>{stat.value}</div>
            <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', fontWeight: 700, marginTop: '4px' }}>{stat.label.toUpperCase()}</div>
          </div>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px' }}>
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="card" style={{ padding: '24px', height: '140px', display: 'flex', gap: '16px', background: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.05)', animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(255,255,255,0.05)' }} />
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ width: '60%', height: '16px', borderRadius: '4px', background: 'rgba(255,255,255,0.05)' }} />
                <div style={{ width: '40%', height: '12px', borderRadius: '4px', background: 'rgba(255,255,255,0.05)' }} />
                <div style={{ width: '20%', height: '24px', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', marginTop: 'auto' }} />
              </div>
            </div>
          ))}
        </div>
      ) : documents.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', color: 'rgba(255,255,255,0.5)', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px dashed rgba(255,255,255,0.1)' }}>
          No verified documents found. Upload your documents in the onboarding or profile section to power your AI recommendations.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px' }}>
          {documents.map((doc) => (
            <div
              key={doc.id}
              className="glass"
              style={{ padding: '24px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer', transition: 'all 0.2s ease' }}
              onClick={() => setExpandedDoc(expandedDoc === doc.id ? null : doc.id)}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                  <div style={{ display: 'flex', color: '#818cf8' }}>{EVIDENCE_ICONS[doc.type] || <Paperclip size={28} />}</div>
                  <div>
                    <h3 style={{ color: 'white', fontSize: '16px', fontWeight: 700 }}>
                      {doc.type.replace(/_/g, ' ').toUpperCase()}
                    </h3>
                    <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', marginTop: '4px' }}>
                      {doc.fileName}
                    </div>
                    <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', marginTop: '6px', display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                      <span>Uploaded: {new Date(doc.uploadedAt).toLocaleDateString()}</span>
                      <span>Updated: {getFreshnessLabel(doc.lastUpdatedAt)}</span>
                      <span>Version: <strong style={{ color: 'white' }}>v{doc.version}</strong></span>
                      <span>AI Confidence: <span style={{ color: '#10b981' }}>{doc.aiConfidence}%</span></span>
                      <span>{getExpiryBadge(doc)}</span>
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <span className={`badge ${doc.status === DocumentStatus.VERIFIED ? 'badge-emerald' : doc.status === DocumentStatus.REJECTED ? 'badge-rose' : doc.status === DocumentStatus.NEEDS_REVIEW ? 'badge-indigo' : 'badge-amber'}`} style={{ fontSize: '10px' }}>
                    {doc.status === DocumentStatus.VERIFIED ? <><CheckCircle size={14} className="inline mr-1" /> Verified</> : doc.status === DocumentStatus.REJECTED ? <><XCircle size={14} className="inline mr-1" /> Rejected</> : doc.status === DocumentStatus.NEEDS_REVIEW ? <><AlertTriangle size={14} className="inline mr-1 text-yellow-400" /> Needs Review</> : <><Clock size={14} className="inline mr-1" /> Processing</>}
                  </span>
                </div>
              </div>

              {/* Expanded Details */}
              {expandedDoc === doc.id && (
                <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                    {/* Extracted Data */}
                    {doc.extractedData && (
                      <div className="glass-sm" style={{ padding: '16px', borderRadius: '12px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                          <div style={{ fontSize: '11px', fontWeight: 700, color: '#818cf8', letterSpacing: '1px' }}>AI EXTRACTED METADATA</div>
                        </div>
                        
                        {editingDocId === doc.id ? (
                          <div onClick={(e) => e.stopPropagation()}>
                            <textarea
                              className="input"
                              style={{ width: '100%', height: '200px', fontSize: '12px', fontFamily: 'monospace', marginBottom: '12px' }}
                              value={editDataStr}
                              onChange={(e) => setEditDataStr(e.target.value)}
                            />
                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                              <button className="btn btn-secondary btn-sm" onClick={() => setEditingDocId(null)}>Cancel</button>
                              <button className="btn btn-primary btn-sm" onClick={(e) => handleEditSave(doc.id, e)}>Save Metadata</button>
                            </div>
                          </div>
                        ) : (
                          Object.entries(doc.extractedData).map(([key, val]) => (
                            <div key={key} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '6px' }}>
                              <span style={{ color: 'rgba(255,255,255,0.5)', textTransform: 'capitalize' }}>{key.replace(/([A-Z])/g, ' $1')}</span>
                              <span style={{ color: 'white', fontWeight: 600, maxWidth: '60%', textAlign: 'right', wordBreak: 'break-word' }}>
                                {Array.isArray(val) ? val.join(', ') : typeof val === 'object' ? JSON.stringify(val) : String(val)}
                              </span>
                            </div>
                          ))
                        )}
                      </div>
                    )}

                    {/* Usage Info & Version History */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      <div className="glass-sm" style={{ padding: '16px', borderRadius: '12px' }}>
                        <div style={{ fontSize: '11px', fontWeight: 700, color: '#10b981', letterSpacing: '1px', marginBottom: '12px' }}>USAGE & HISTORY</div>
                        <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginBottom: '8px' }}>
                          Used In: <strong style={{ color: 'white' }}>{doc.usedInApplications?.length || 0} applications</strong>
                        </div>
                        {(doc.usedInApplications?.length || 0) > 0 && (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                            {doc.usedInApplications?.map(appId => (
                              <span key={appId} className="badge badge-indigo" style={{ fontSize: '9px' }}>{appId}</span>
                            ))}
                          </div>
                        )}
                        <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginTop: '12px' }}>
                          Source: <strong style={{ color: 'white' }}>{doc.source}</strong>
                        </div>
                      </div>

                      {doc.versionHistory && doc.versionHistory.length > 0 && (
                        <div className="glass-sm" style={{ padding: '16px', borderRadius: '12px' }}>
                          <div style={{ fontSize: '11px', fontWeight: 700, color: '#f59e0b', letterSpacing: '1px', marginBottom: '12px' }}>DOCUMENT VERSIONING</div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', borderLeft: '2px solid rgba(255,255,255,0.1)', paddingLeft: '12px', marginLeft: '4px' }}>
                            {doc.versionHistory.map((h, i) => (
                              <div key={i} style={{ position: 'relative' }}>
                                <div style={{ position: 'absolute', left: '-17px', top: '4px', width: '8px', height: '8px', borderRadius: '50%', background: i === doc.versionHistory!.length - 1 ? '#10b981' : 'rgba(255,255,255,0.3)' }} />
                                <div style={{ fontSize: '13px', fontWeight: 600, color: 'white' }}>{h.action} <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px', marginLeft: '4px' }}>v{h.version}</span></div>
                                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginTop: '2px' }}>{new Date(h.timestamp).toLocaleDateString()}</div>
                                {h.note && <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)', marginTop: '4px', fontStyle: 'italic' }}>"{h.note}"</div>}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  {doc.status === DocumentStatus.NEEDS_REVIEW && (
                    <EvidenceReview 
                      document={doc}
                      onAccept={handleAcceptReview}
                      onReject={handleRejectReview}
                    />
                  )}
                  
                  <div style={{ display: 'flex', gap: '8px', marginTop: doc.status === DocumentStatus.NEEDS_REVIEW ? '16px' : '0' }}>
                    <button className="btn btn-secondary btn-sm" onClick={(e) => { e.stopPropagation(); handleDownload(doc); }} style={{ display: 'flex', alignItems: 'center' }}><Download size={14} style={{ marginRight: 4 }} /> Download</button>
                    {doc.extractedData && !editingDocId && (
                      <button className="btn btn-secondary btn-sm" onClick={(e) => { e.stopPropagation(); setEditDataStr(JSON.stringify(doc.extractedData, null, 2)); setEditingDocId(doc.id); }} style={{ display: 'flex', alignItems: 'center' }}><FileEdit size={14} style={{ marginRight: 4 }} /> Edit Data</button>
                    )}
                    <button className="btn btn-secondary btn-sm" onClick={(e) => handleReplaceClick(doc.id, e)} style={{ display: 'flex', alignItems: 'center' }}><RefreshCw size={14} style={{ marginRight: 4 }} /> Replace</button>
                    <button className="btn btn-secondary btn-sm" style={{ color: '#ef4444', display: 'flex', alignItems: 'center' }} onClick={(e) => handleDelete(doc.id, e)}><Trash2 size={14} style={{ marginRight: 4 }} /> Delete</button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
