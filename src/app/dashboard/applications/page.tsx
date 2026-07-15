'use client';

import { useState } from 'react';
import Link from 'next/link';
import { SEED_OPPORTUNITIES } from '@/lib/opportunities';
import { APPLICATION_STAGES, type ApplicationStatus } from '@/lib/gemini';
import { usePipeline } from '@/components/auth/PipelineContext';

export default function ApplicationsPage() {
  const { pipeline: applications, isLoading: loading } = usePipeline();

  const getStageInfo = (status: string) => {
    return APPLICATION_STAGES.find(s => s.key === status) || APPLICATION_STAGES[0];
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '64px 0', color: 'rgba(255,255,255,0.4)' }}>
        Loading tracker...
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '28px', fontWeight: 800, color: 'white', marginBottom: '8px' }}>
            📋 Applications Tracker
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '14px' }}>
            Track progress across all 9 pipeline stages — from wishlist to completion.
          </p>
        </div>
        <Link href="/dashboard/opportunities" className="btn btn-primary btn-sm">
          Browse Opportunities
        </Link>
      </div>

      {/* Pipeline Summary Bar */}
      {applications.length > 0 && (
        <div className="card" style={{ padding: '16px 20px', marginBottom: '24px', display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
          {APPLICATION_STAGES.map(stage => {
            const count = applications.filter(a => a.stage === stage.key).length;
            return (
              <div
                key={stage.key}
                style={{
                  padding: '6px 12px',
                  borderRadius: '20px',
                  fontSize: '11px',
                  fontWeight: 700,
                  background: count > 0 ? `${stage.color}20` : 'rgba(255,255,255,0.02)',
                  color: count > 0 ? stage.color : 'rgba(255,255,255,0.25)',
                  border: `1px solid ${count > 0 ? stage.color + '40' : 'rgba(255,255,255,0.05)'}`,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <span>{stage.icon}</span>
                <span>{stage.label}</span>
                {count > 0 && (
                  <span style={{
                    background: stage.color,
                    color: 'white',
                    borderRadius: '50%',
                    width: '18px',
                    height: '18px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '10px',
                    marginLeft: '2px',
                  }}>
                    {count}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}

      {applications.length === 0 ? (
        <div
          className="card"
          style={{
            padding: '48px 24px',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '16px',
            border: '1px dashed rgba(255,255,255,0.1)',
            background: 'rgba(255,255,255,0.01)'
          }}
        >
          <div style={{ fontSize: '48px' }}>📁</div>
          <div>
            <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'white', marginBottom: '6px', fontFamily: 'Space Grotesk, sans-serif' }}>
              No Active Applications Yet
            </h3>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px', maxWidth: '380px', margin: '0 auto' }}>
              Select a matching opportunity from the explorer and click "Start Application" to begin tracking your journey through all 9 pipeline stages.
            </p>
          </div>
          <Link href="/dashboard/opportunities" className="btn btn-primary btn-sm" style={{ marginTop: '8px' }}>
            Explore Curated Opportunities
          </Link>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '16px' }}>
          {applications.map(app => {
            const opp = SEED_OPPORTUNITIES.find(o => o.id === app.id);
            if (!opp) return null;

            const stage = getStageInfo(app.stage);
            const deadline = app.deadline || opp.deadline;
            const daysLeft = deadline ? Math.ceil((new Date(deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null;

            return (
              <div key={app.id} className="card" style={{ padding: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '20px', marginBottom: '16px' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                      <span
                        className="badge"
                        style={{ background: `${stage.color}20`, color: stage.color, border: `1px solid ${stage.color}40`, fontSize: '10px' }}
                      >
                        {stage.icon} {stage.label}
                      </span>
                      {deadline && (
                        <span style={{ fontSize: '11px', color: daysLeft !== null && daysLeft < 14 ? '#f43f5e' : 'rgba(255,255,255,0.4)' }}>
                          {daysLeft !== null && daysLeft > 0 ? `${daysLeft} days left` : daysLeft === 0 ? 'Due today' : deadline}
                        </span>
                      )}
                    </div>
                    <h2 style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '18px', fontWeight: 700, color: 'white', marginBottom: '4px' }}>
                      {opp.title}
                    </h2>
                    <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>
                      {opp.provider} · {opp.country}
                    </p>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    {opp.fundingLevel && (
                      <div style={{ fontSize: '12px', color: '#10b981', fontWeight: 600, marginBottom: '4px' }}>
                        {opp.fundingLevel.split('+')[0].trim()}
                      </div>
                    )}
                    <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)' }}>
                      Deadline: {deadline}
                    </div>
                  </div>
                </div>

                {/* Stage Progress Bar */}
                <div style={{ display: 'flex', gap: '2px', marginBottom: '16px' }}>
                  {APPLICATION_STAGES.map((s, i) => {
                    const currentIdx = APPLICATION_STAGES.findIndex(st => st.key === app.stage);
                    return (
                      <div
                        key={s.key}
                        style={{
                          flex: 1,
                          height: '4px',
                          borderRadius: '2px',
                          background: i <= currentIdx ? stage.color : 'rgba(255,255,255,0.06)',
                          transition: 'background 0.3s',
                        }}
                      />
                    );
                  })}
                </div>

                {/* Action buttons */}
                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                  <Link href={`/dashboard/applications/${app.id}`} className="btn btn-indigo btn-sm">
                    📁 Open Workspace
                  </Link>
                  <Link href={`/dashboard/builder?title=${encodeURIComponent(opp.title)}`} className="btn btn-secondary btn-sm">
                    ✍️ Builder
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
