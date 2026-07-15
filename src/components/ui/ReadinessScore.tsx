'use client';

import React from 'react';
import { useProfile } from '../auth/ProfileContext';

interface Requirement {
  type: 'gpa' | 'ielts' | 'toefl' | 'degree' | 'country';
  value: string | number;
}

interface ReadinessScoreProps {
  requirements: Requirement[];
}

export function ReadinessScore({ requirements }: ReadinessScoreProps) {
  const { profile } = useProfile();
  
  if (!profile) return null;

  const checkRequirement = (req: Requirement) => {
    switch (req.type) {
      case 'gpa':
        return parseFloat(profile.gpa || '0') >= (req.value as number);
      case 'ielts':
        const userIelts = parseFloat((profile.toeflScore || '').split('/')[1] || (profile.toeflScore || '0'));
        return userIelts >= (req.value as number);
      case 'toefl':
        const userToefl = parseInt((profile.toeflScore || '').split('/')[0] || (profile.toeflScore || '0'));
        return userToefl >= (req.value as number);
      case 'degree':
        return profile.level?.toLowerCase() === (req.value as string).toLowerCase();
      case 'country':
        return profile.country?.toLowerCase() === (req.value as string).toLowerCase();
      default:
        return false;
    }
  };

  const total = requirements.length;
  if (total === 0) return null;

  const passed = requirements.filter(req => checkRequirement(req)).length;
  const percentage = Math.round((passed / total) * 100);

  let color = '#f43f5e';
  let label = 'Low Readiness';
  if (percentage === 100) {
    color = '#10b981';
    label = 'Verified Eligible';
  } else if (percentage >= 50) {
    color = '#f59e0b';
    label = 'Action Required';
  }

  return (
    <div className="card" style={{ padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderLeft: `4px solid ${color}` }}>
      <div>
        <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', fontWeight: 700, letterSpacing: '1px', marginBottom: '4px' }}>
          EVIDENCE-BASED READINESS
        </div>
        <div style={{ fontSize: '14px', fontWeight: 600, color: 'white' }}>
          {label}
        </div>
        <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>
          {passed} of {total} requirements met
        </div>
      </div>
      <div style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '24px', fontWeight: 800, color }}>
        {percentage}%
      </div>
    </div>
  );
}
