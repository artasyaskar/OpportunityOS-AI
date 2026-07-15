'use client';

import React, { useState } from 'react';
import { EvidenceDocument, DocumentStatus } from '@/lib/repositories/EvidenceRepository';

interface EvidenceReviewProps {
  document: EvidenceDocument;
  onAccept: (documentId: string, updatedData: any) => Promise<void>;
  onReject: (documentId: string) => Promise<void>;
}

export function EvidenceReview({ document, onAccept, onReject }: EvidenceReviewProps) {
  const [editedData, setEditedData] = useState<any>(document.extractedData || {});
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (document.status !== DocumentStatus.NEEDS_REVIEW) {
    return null;
  }

  const handleAccept = async () => {
    setIsSubmitting(true);
    await onAccept(document.id, editedData);
    setIsSubmitting(false);
  };

  const handleReject = async () => {
    setIsSubmitting(true);
    await onReject(document.id);
    setIsSubmitting(false);
  };

  const handleEditChange = (key: string, value: string) => {
    setEditedData((prev: any) => ({ ...prev, [key]: value }));
  };

  return (
    <div className="card animate-fade-in p-6 border border-indigo-500/30 bg-indigo-500/5 rounded-xl mt-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <span className="text-xl">🔍</span> Review Extracted Evidence
          </h3>
          <p className="text-sm text-white/50">
            {document.parserUsed || 'AI'} extracted the following facts from {document.fileName}. Please verify them before they are added to your Canonical Profile.
          </p>
        </div>
        <span className="badge badge-amber text-xs uppercase font-bold tracking-wider px-2 py-1">
          Needs Review
        </span>
      </div>

      <div className="space-y-4 mb-6">
        {Object.entries(editedData).map(([key, value]) => {
          if (typeof value === 'object') return null; // Skip complex nested for MVP UI simplicity

          return (
            <div key={key} className="flex flex-col gap-1 border-b border-white/5 pb-3">
              <span className="text-xs font-semibold text-white/40 uppercase tracking-wider">
                {key}
              </span>
              {isEditing ? (
                <input
                  type="text"
                  value={String(value)}
                  onChange={(e) => handleEditChange(key, e.target.value)}
                  className="input bg-white/5 border border-white/10 text-white rounded p-2 text-sm"
                />
              ) : (
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-white">{String(value)}</span>
                  <span className="text-xs text-indigo-400">
                    Source: {document.type.toUpperCase()}
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={handleAccept}
          disabled={isSubmitting}
          className="btn btn-primary btn-sm px-6"
        >
          {isSubmitting ? 'Saving...' : (isEditing ? 'Save & Accept' : '✓ Accept All')}
        </button>
        
        {!isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            disabled={isSubmitting}
            className="btn btn-secondary btn-sm px-6"
          >
            ✎ Edit
          </button>
        )}

        {isEditing && (
          <button
            onClick={() => {
              setIsEditing(false);
              setEditedData(document.extractedData || {}); // reset
            }}
            disabled={isSubmitting}
            className="btn btn-ghost btn-sm px-4"
          >
            Cancel Edit
          </button>
        )}

        <button
          onClick={handleReject}
          disabled={isSubmitting}
          className="btn border border-rose-500/30 text-rose-400 hover:bg-rose-500/10 btn-sm ml-auto px-6"
        >
          ✕ Reject
        </button>
      </div>
    </div>
  );
}
