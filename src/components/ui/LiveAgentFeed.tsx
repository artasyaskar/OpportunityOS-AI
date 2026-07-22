'use client';

import { useEffect, useState, useRef } from 'react';

import { Telescope, ClipboardCheck, BarChart3, Crosshair, GitCompare, ScanSearch, CalendarDays, ShieldCheck } from 'lucide-react';

// Illustrative capability showcase — describes what each agent does for you,
// not live telemetry. Copy is intentionally about capabilities, not fabricated counts.
const AGENT_MESSAGES = [
  { agent: 'Discovery Agent', icon: <Telescope size={14} />, msg: 'Scans global scholarships, grants & fellowships for your profile.', color: '#6366f1' },
  { agent: 'Eligibility Agent', icon: <ClipboardCheck size={14} />, msg: 'Checks each requirement against your verified evidence.', color: '#10b981' },
  { agent: 'Probability Engine', icon: <BarChart3 size={14} />, msg: 'Estimates your success odds from your evidence graph.', color: '#f59e0b' },
  { agent: 'Strategist Agent', icon: <Crosshair size={14} />, msg: 'Sequences what to apply for and when to maximize ROI.', color: '#ec4899' },
  { agent: 'Gap Analysis Agent', icon: <GitCompare size={14} />, msg: 'Pinpoints exactly what you are missing for each program.', color: '#8b5cf6' },
  { agent: 'Review Agent', icon: <ScanSearch size={14} />, msg: 'Scores and strengthens your essays and statements.', color: '#06b6d4' },
  { agent: 'Planner Agent', icon: <CalendarDays size={14} />, msg: 'Builds a day-by-day timeline to every deadline.', color: '#6366f1' },
  { agent: 'Compliance Agent', icon: <ShieldCheck size={14} />, msg: 'Verifies every requirement is met before you submit.', color: '#ef4444' }
];

export default function LiveAgentFeed() {
  const [messages, setMessages] = useState<typeof AGENT_MESSAGES>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Initial messages
    setMessages([AGENT_MESSAGES[0], AGENT_MESSAGES[1]]);
    
    let index = 2;
    const interval = setInterval(() => {
      setMessages(prev => {
        const newMessages = [...prev, AGENT_MESSAGES[index]];
        if (newMessages.length > 5) newMessages.shift(); // Keep last 5
        return newMessages;
      });
      index = (index + 1) % AGENT_MESSAGES.length;
    }, 3500);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="card-magnetic glow-border" style={{ 
      background: 'rgba(2, 6, 23, 0.7)', 
      backdropFilter: 'blur(10px)',
      border: '1px solid rgba(255,255,255,0.05)',
      borderRadius: '12px',
      overflow: 'hidden',
      height: '240px',
      display: 'flex',
      flexDirection: 'column'
    }}>
      <div style={{ 
        padding: '12px 16px', 
        borderBottom: '1px solid rgba(255,255,255,0.05)',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        fontSize: '12px',
        fontWeight: 600,
        color: 'rgba(255,255,255,0.6)',
        textTransform: 'uppercase',
        letterSpacing: '1px'
      }}>
        <div className="spinner" style={{ width: '12px', height: '12px', border: '2px solid rgba(16,185,129,0.2)', borderTopColor: '#10b981', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
        What Our Agents Do
      </div>
      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px', overflow: 'hidden', flex: 1 }}>
        {messages.map((msg, idx) => (
          <div 
            key={`${msg.agent}-${idx}`} 
            style={{ 
              display: 'flex', 
              alignItems: 'flex-start', 
              gap: '12px',
              animation: 'slideUpFade 0.4s ease-out forwards',
              opacity: 0,
              transform: 'translateY(10px)'
            }}
          >
            <div style={{ 
              color: msg.color, 
              fontSize: '10px', 
              fontWeight: 700, 
              background: `${msg.color}15`, 
              padding: '4px 8px', 
              borderRadius: '4px',
              whiteSpace: 'nowrap',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              <span style={{ display: 'flex', alignItems: 'center' }}>{msg.icon}</span>
              {msg.agent}
            </div>
            <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: '13px', lineHeight: 1.5, fontFamily: 'monospace' }}>
              {msg.msg}
            </div>
          </div>
        ))}
      </div>
      <style>{`
        @keyframes slideUpFade {
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
