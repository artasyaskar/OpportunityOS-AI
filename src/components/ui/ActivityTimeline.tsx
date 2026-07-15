'use client';

import React, { useState, useEffect } from 'react';
import { ActivityLogger, ActivityEvent } from '@/lib/services/ActivityLogger';

export function ActivityTimeline() {
  const [events, setEvents] = useState<ActivityEvent[]>([]);

  useEffect(() => {
    setEvents(ActivityLogger.getHistory());

    const handleNewEvent = (e: any) => {
      setEvents(prev => [e.detail, ...prev].slice(0, 50));
    };

    window.addEventListener('activity-logged', handleNewEvent);
    return () => window.removeEventListener('activity-logged', handleNewEvent);
  }, []);

  if (events.length === 0) {
    return (
      <div className="card" style={{ padding: '32px', textAlign: 'center' }}>
        <div style={{ fontSize: '32px', marginBottom: '16px', opacity: 0.5 }}>🕰️</div>
        <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.6)', marginBottom: '8px' }}>No Activity Logged Yet</div>
        <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>
          Start uploading documents or generating applications to build your timeline.
        </div>
      </div>
    );
  }

  const getIcon = (type: string) => {
    switch (type) {
      case 'UPLOAD': return '📄';
      case 'DOCUMENT_GENERATED': return '🤖';
      case 'OPPORTUNITY_SAVED': return '⭐';
      case 'PROFILE_UPDATED': return '👤';
      case 'STATUS_CHANGED': return '🔄';
      default: return '📍';
    }
  };

  const getColor = (type: string) => {
    switch (type) {
      case 'UPLOAD': return '#3b82f6';
      case 'DOCUMENT_GENERATED': return '#10b981';
      case 'OPPORTUNITY_SAVED': return '#f59e0b';
      case 'PROFILE_UPDATED': return '#8b5cf6';
      case 'STATUS_CHANGED': return '#f43f5e';
      default: return '#6366f1';
    }
  };

  const getTimeAgo = (ts: number) => {
    const diff = Math.floor((Date.now() - ts) / 1000);
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  return (
    <div className="card" style={{ padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'white', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>🕰️</span> Platform Activity Timeline
        </h3>
        <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', background: 'rgba(255,255,255,0.05)', padding: '2px 8px', borderRadius: '12px' }}>
          Last {events.length} events
        </span>
      </div>

      <div style={{ position: 'relative', paddingLeft: '16px' }}>
        <div style={{ position: 'absolute', top: '8px', bottom: 0, left: '23px', width: '2px', background: 'rgba(255,255,255,0.1)' }} />
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {events.map((ev, idx) => (
            <div key={ev.id} style={{ display: 'flex', gap: '16px', position: 'relative', zIndex: 1 }}>
              <div style={{ 
                width: '16px', height: '16px', borderRadius: '50%', background: '#0a0c10', 
                border: `2px solid ${getColor(ev.type)}`, display: 'flex', alignItems: 'center', justifyContent: 'center',
                marginTop: '4px'
              }} />
              
              <div className="glass-panel" style={{ flex: 1, padding: '16px', borderRadius: '12px', background: 'rgba(255,255,255,0.02)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '16px' }}>{getIcon(ev.type)}</span>
                    <span style={{ fontSize: '14px', fontWeight: 600, color: 'white' }}>{ev.title}</span>
                  </div>
                  <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>{getTimeAgo(ev.timestamp)}</span>
                </div>
                <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)', lineHeight: 1.5 }}>
                  {ev.description}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
