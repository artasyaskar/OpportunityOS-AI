'use client';

import React from 'react';
import { useProfile } from '../auth/ProfileContext';
import { StatusIcon } from '@/lib/uiIcons';

interface Requirement {
  type: 'gpa' | 'ielts' | 'toefl' | 'degree' | 'country';
  value: string | number;
  label: string;
}

export function RequirementMatrix({ requirements }: { requirements: Requirement[] }) {
  const { profile } = useProfile();
  
  if (!profile) return null;

  const checkRequirement = (req: Requirement) => {
    switch (req.type) {
      case 'gpa':
        return {
          pass: parseFloat(profile.gpa || '0') >= (req.value as number),
          userValue: profile.gpa || 'Missing',
        };
      case 'ielts':
        const userIelts = parseFloat((profile.toeflScore || '').split('/')[1] || (profile.toeflScore || '0'));
        return {
          pass: userIelts >= (req.value as number),
          userValue: userIelts || 'Missing',
        };
      case 'toefl':
        const userToefl = parseInt((profile.toeflScore || '').split('/')[0] || (profile.toeflScore || '0'));
        return {
          pass: userToefl >= (req.value as number),
          userValue: userToefl || 'Missing',
        };
      case 'degree':
        return {
          pass: profile.level?.toLowerCase() === (req.value as string).toLowerCase(),
          userValue: profile.level || 'Missing',
        };
      case 'country':
        return {
          pass: profile.country?.toLowerCase() === (req.value as string).toLowerCase(),
          userValue: profile.country || 'Missing',
        };
      default:
        return { pass: false, userValue: 'Unknown' };
    }
  };

  const results = requirements.map(req => ({
    ...req,
    ...checkRequirement(req)
  }));

  const allPass = results.every(r => r.pass);

  return (
    <div className="card" style={{ padding: '24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div>
          <h3 style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '16px', fontWeight: 700, color: 'white', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <StatusIcon status={allPass ? 'success' : 'warning'} size={20} /> Requirement Verification Matrix
          </h3>
          <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginTop: '4px' }}>
            Strict evaluation against your verified Evidence Vault.
          </p>
        </div>
        <span className={`badge ${allPass ? 'badge-emerald' : 'badge-amber'}`}>
          {allPass ? 'ELIGIBLE' : 'ACTION REQUIRED'}
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {results.map((res, idx) => (
          <div key={idx} className="glass-sm" style={{ padding: '16px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderLeft: `4px solid ${res.pass ? '#10b981' : '#f43f5e'}` }}>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 700, color: 'white' }}>{res.label}</div>
              <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginTop: '4px', display: 'flex', gap: '12px' }}>
                <span>Required: <strong style={{ color: 'white' }}>{res.value}</strong></span>
                <span>Your Evidence: <strong style={{ color: res.pass ? '#10b981' : '#f43f5e' }}>{res.userValue}</strong></span>
              </div>
            </div>
            {res.pass ? (
              <span style={{ fontSize: '12px', fontWeight: 800, color: '#10b981', background: 'rgba(16,185,129,0.1)', padding: '6px 12px', borderRadius: '20px', display: 'flex', alignItems: 'center', gap: '4px' }}>PASS <StatusIcon status="success" size={14} /></span>
            ) : (
              <span style={{ fontSize: '12px', fontWeight: 800, color: '#f43f5e', background: 'rgba(244,63,94,0.1)', padding: '6px 12px', borderRadius: '20px', display: 'flex', alignItems: 'center', gap: '4px' }}>MISSING <StatusIcon status="error" size={14} /></span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
