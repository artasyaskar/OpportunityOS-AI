'use client';

import { useEffect, useState, useRef } from 'react';

const AGENT_MESSAGES = [
  { agent: 'Discovery Agent', icon: '🔭', msg: 'Indexed 42 new Y-Combinator grants globally.', color: '#6366f1' },
  { agent: 'Eligibility Agent', icon: '✅', msg: 'Matched 12 users to Gates Cambridge Scholarship.', color: '#10b981' },
  { agent: 'Probability Engine', icon: '📊', msg: 'Recalculated success odds for Oxford applicants (+14%).', color: '#f59e0b' },
  { agent: 'Strategist Agent', icon: '♟️', msg: 'Identified critical timeline advantage for EU candidates.', color: '#ec4899' },
  { agent: 'Gap Analysis Agent', icon: '🗺️', msg: 'Flagged IELTS requirement update for Chevening 2027.', color: '#8b5cf6' },
  { agent: 'Review Agent', icon: '🔍', msg: 'Analyzed 150 successful SOPs for Tech Fellowships.', color: '#06b6d4' },
  { agent: 'Discovery Agent', icon: '🔭', msg: 'Scanned 120 new open positions at DeepMind & OpenAI.', color: '#6366f1' },
  { agent: 'Compliance Agent', icon: '📋', msg: 'Verified visa sponsorship criteria for US programs.', color: '#ef4444' }
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
        Live Global Agent Sync
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
              <span>{msg.icon}</span>
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
