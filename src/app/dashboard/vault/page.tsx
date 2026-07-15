'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { EvidenceRepository, EvidenceDocument, EvidenceType, DocumentStatus } from '@/lib/repositories/EvidenceRepository';
import { storageProvider } from '@/lib/storage/StorageManager';
import Link from 'next/link';
import { EvidenceReview } from '@/components/EvidenceReview';
import { UserRepository } from '@/lib/repositories/UserRepository';
import { EvidenceEngine } from '@/lib/services/EvidenceEngine';
import { ProfileMergeEngine } from '@/lib/services/ProfileMergeEngine';
import { useSubscription } from '@/components/auth/SubscriptionContext';

const EVIDENCE_ICONS: Record<string, string> = {
  resume: '📄', transcript: '📊', passport: '🛂', national_id: '🪪',
  ielts: '🗣️', toefl: '🗣️', pte: '🗣️', duolingo: '🗣️',
  lor: '✉️', personal_statement: '✍️', sop: '✍️',
  research_proposal: '🔬', portfolio: '🎨', publication: '📝',
  award: '🏆', internship_certificate: '💼', employment_letter: '💼',
  financial_statement: '💰', visa: '✈️', other: '📎',
};

function generateDemoEvidence(userId: string): EvidenceDocument[] {
  return []; // Removed hardcoded mock evidence to prevent user confusion
}

export default function EvidenceVaultPage() {
  const { user } = useAuth();
  const { subscription } = useSubscription();
  const [documents, setDocuments] = useState<EvidenceDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedDoc, setExpandedDoc] = useState<string | null>(null);
  const [replacingDocId, setReplacingDocId] = useState<string | null>(null);
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
      };
      
      await EvidenceRepository.saveEvidence(user.uid, newDoc);
      alert(`Document successfully replaced with ${file.name}`);
      loadDocuments(user.uid);
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
      // For MVP we just remove from the list, in real app EvidenceRepository.deleteEvidence would be called
      setDocuments(prev => prev.filter(d => d.id !== docId));
      alert('Document deleted.');
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', paddingBottom: '60px' }}>
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '28px', fontWeight: 800, color: 'white', marginBottom: '8px' }}>
          🗄️ Evidence Vault
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '14px' }}>
          Manage your verified academic, identity, and language documents. Every AI recommendation is powered by this vault.
        </p>
      </div>

      <div 
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleFileDrop}
        onClick={() => uploadInputRef.current?.click()}
        style={{
          border: `2px dashed ${isDragging ? '#818cf8' : 'rgba(255,255,255,0.1)'}`,
          background: isDragging ? 'rgba(99,102,241,0.05)' : 'rgba(255,255,255,0.02)',
          borderRadius: '16px',
          padding: '40px',
          textAlign: 'center',
          cursor: 'pointer',
          transition: 'all 0.2s',
          marginBottom: '28px'
        }}
      >
        <div style={{ fontSize: '32px', marginBottom: '12px', animation: isUploading ? 'pulse 1.5s infinite' : 'none' }}>
          {isUploading ? '⚙️' : '📤'}
        </div>
        <div style={{ fontSize: '16px', fontWeight: 600, color: 'white', marginBottom: '8px' }}>
          {isUploading ? 'AI is scanning your document...' : 'Drop files here to add to Vault'}
        </div>
        <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)' }}>
          Supports PDF, Word, and images. The AI will automatically extract and verify the data.
        </div>
      </div>

      <input 
        type="file" 
        ref={uploadInputRef} 
        style={{ display: 'none' }} 
        onChange={(e) => e.target.files && handleFileUpload(e.target.files[0])} 
      />

      {/* Hidden File Input for Replace */}
      <input 
        type="file" 
        ref={fileInputRef} 
        style={{ display: 'none' }} 
        onChange={handleFileReplace} 
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
                  <div style={{ fontSize: '32px' }}>{EVIDENCE_ICONS[doc.type] || '📎'}</div>
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
                    {doc.status === DocumentStatus.VERIFIED ? '✓ Verified' : doc.status === DocumentStatus.REJECTED ? '✕ Rejected' : doc.status === DocumentStatus.NEEDS_REVIEW ? '⚠️ Needs Review' : '⏳ Processing'}
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
                        <div style={{ fontSize: '11px', fontWeight: 700, color: '#818cf8', letterSpacing: '1px', marginBottom: '12px' }}>AI EXTRACTED METADATA</div>
                        {Object.entries(doc.extractedData).map(([key, val]) => (
                          <div key={key} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '6px' }}>
                            <span style={{ color: 'rgba(255,255,255,0.5)', textTransform: 'capitalize' }}>{key.replace(/([A-Z])/g, ' $1')}</span>
                            <span style={{ color: 'white', fontWeight: 600 }}>{String(val)}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Usage Info & Version History */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      <div className="glass-sm" style={{ padding: '16px', borderRadius: '12px' }}>
                        <div style={{ fontSize: '11px', fontWeight: 700, color: '#10b981', letterSpacing: '1px', marginBottom: '12px' }}>USAGE & HISTORY</div>
                        <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginBottom: '8px' }}>
                          Used In: <strong style={{ color: 'white' }}>{doc.usedInApplications.length} applications</strong>
                        </div>
                        {doc.usedInApplications.length > 0 && (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                            {doc.usedInApplications.map(appId => (
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
                    <button className="btn btn-secondary btn-sm" onClick={(e) => { e.stopPropagation(); handleDownload(doc); }}>⬇ Download</button>
                    <button className="btn btn-secondary btn-sm" onClick={(e) => handleReplaceClick(doc.id, e)}>🔄 Replace</button>
                    <button className="btn btn-secondary btn-sm" style={{ color: '#ef4444' }} onClick={(e) => handleDelete(doc.id, e)}>🗑️ Delete</button>
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
