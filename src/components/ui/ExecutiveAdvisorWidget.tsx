'use client';

import { useState, useEffect, useRef } from 'react';
import { useProfile } from '@/components/auth/ProfileContext';
import { useAuth } from '@/components/auth/AuthProvider';
import { Bot, Zap, X } from 'lucide-react';

interface Message {
  sender: 'ai' | 'user';
  text: string;
  evidenceUsed?: string[];
  confidenceScore?: number;
}

export default function ExecutiveAdvisorWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [inputVal, setInputVal] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [userName, setUserName] = useState('Candidate');
  
  const [coords, setCoords] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [hasDragged, setHasDragged] = useState(false);
  const [isDesktop, setIsDesktop] = useState(true);
  const dragStart = useRef({ x: 0, y: 0 });

  const [messages, setMessages] = useState<Message[]>([
    { 
      sender: 'ai', 
      text: "Good afternoon. I've synced your latest opportunity data. How can I help you strategize today?" 
    }
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { profile } = useProfile();
  const { getIdToken } = useAuth();

  // Sync profile details and track device size
  useEffect(() => {
    if (profile?.name) {
      setUserName(profile.name.split(' ')[0]);
    }

    const handleResize = () => {
      setIsDesktop(window.innerWidth > 1024);
    };
    handleResize();
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [profile]);

  // Draggable logic mouse & touch listeners
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      setHasDragged(true);
      let newX = e.clientX - dragStart.current.x;
      let newY = e.clientY - dragStart.current.y;
      
      const minX = -window.innerWidth + 100;
      const maxX = 50;
      const minY = -window.innerHeight + 100;
      const maxY = 50;
      
      newX = Math.max(minX, Math.min(newX, maxX));
      newY = Math.max(minY, Math.min(newY, maxY));

      setCoords({ x: newX, y: newY });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isDragging) return;
      setHasDragged(true);
      const touch = e.touches[0];
      let newX = touch.clientX - dragStart.current.x;
      let newY = touch.clientY - dragStart.current.y;
      
      const minX = -window.innerWidth + 100;
      const maxX = 50;
      const minY = -window.innerHeight + 100;
      const maxY = 50;
      
      newX = Math.max(minX, Math.min(newX, maxX));
      newY = Math.max(minY, Math.min(newY, maxY));

      setCoords({ x: newX, y: newY });
    };

    const handleTouchEnd = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      window.addEventListener('touchmove', handleTouchMove, { passive: false });
      window.addEventListener('touchend', handleTouchEnd);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isDragging]);

  const handleMouseDown = (e: React.MouseEvent) => {
    // Prevent drag on inputs/buttons inside the header, but allow dragging the closed widget
    if (isOpen && (e.target as HTMLElement).tagName === 'BUTTON') return;
    if (!isDesktop) return;
    setIsDragging(true);
    setHasDragged(false);
    dragStart.current = {
      x: e.clientX - coords.x,
      y: e.clientY - coords.y
    };
    e.preventDefault();
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (isOpen && (e.target as HTMLElement).tagName === 'BUTTON') return;
    if (!isDesktop) return;
    const touch = e.touches[0];
    setIsDragging(true);
    setHasDragged(false);
    dragStart.current = {
      x: touch.clientX - coords.x,
      y: touch.clientY - coords.y
    };
  };

  // Scroll to bottom on message updates
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleSendMessage = async (text: string) => {
    if (!text.trim()) return;

    const updatedMessages = [...messages, { sender: 'user', text } as Message];
    setMessages(updatedMessages);
    setInputVal('');
    setIsTyping(true);

    try {
      const token = await getIdToken();
      const res = await fetch('/api/agents/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ message: text, profile })
      });
      const data = await res.json();
      if (res.status === 402) {
        setMessages(prev => [...prev, { sender: 'ai', text: "You've used all your AI credits for now. Upgrade your plan to keep strategizing with me." }]);
        return;
      }
      if (!res.ok) throw new Error(data.error || 'Failed to fetch reply');

      setMessages(prev => [...prev, { 
        sender: 'ai', 
        text: data.reply || 'I am unable to provide a strategic recommendation at this time.',
        evidenceUsed: data.evidenceUsed,
        confidenceScore: data.confidenceScore
      }]);
    } catch (e: any) {
      console.error(e);
      setMessages(prev => [...prev, { sender: 'ai', text: "I encountered an error connecting to the strategic database. Please check your network connection and try again." }]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSendMessage(inputVal);
    }
  };

  const widgetTransform = isDesktop
    ? { transform: `translate3d(${coords.x}px, ${coords.y}px, 0)` }
    : {};

  return (
    <div 
      className="advisor-widget" 
      style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        zIndex: 99999,
        ...widgetTransform,
        cursor: isDragging ? 'grabbing' : 'auto'
      }}
    >
      {!isOpen ? (
        <div
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
          onClick={() => {
            if (!hasDragged) setIsOpen(true);
          }}
          className="card-magnetic glow-border page-transition"
          style={{
            background: 'linear-gradient(135deg, #1e1b4b, #312e81)',
            border: '1px solid rgba(99,102,241,0.4)',
            borderRadius: '24px',
            padding: '12px 20px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
            cursor: isDragging ? 'grabbing' : 'pointer',
            userSelect: 'none'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center' }}><Bot size={20} /></div>
          <div className="advisor-widget-btn-text" style={{ textAlign: 'left' }}>
            <div style={{ fontSize: '13px', fontWeight: 700, color: 'white' }}>Ask Executive Advisor</div>
            <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.6)' }}>Online • Context Loaded</div>
          </div>
        </div>
      ) : (
        <div
          className="advisor-chat-window card-magnetic glow-border page-transition"
          style={{
            width: '340px',
            background: 'var(--bg-primary)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '16px',
            overflow: 'hidden',
            boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
            display: 'flex',
            flexDirection: 'column'
          }}
        >
          {/* Header (Draggable Handle) */}
          <div 
            onMouseDown={handleMouseDown}
            onTouchStart={handleTouchStart}
            style={{ 
              background: 'linear-gradient(90deg, #1e1b4b, #312e81)', 
              padding: '16px', 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              cursor: isDesktop ? 'grab' : 'default',
              userSelect: 'none'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', pointerEvents: 'none' }}>
              <span style={{ display: 'flex', alignItems: 'center' }}><Bot size={20} /></span>
              <div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: 'white' }}>Executive AI</div>
                <div style={{ fontSize: '10px', color: '#10b981' }}>● System Active</div>
              </div>
            </div>
            <button 
              onMouseDown={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}
              onClick={() => setIsOpen(false)} 
              style={{ 
                background: 'rgba(255,255,255,0.1)', 
                border: 'none', 
                color: 'white', 
                cursor: 'pointer', 
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '18px',
                transition: 'background 0.2s',
                pointerEvents: 'auto'
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(244,63,94,0.8)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.1)')}
            >
              <X size={18} />
            </button>
          </div>

          {/* Chat Logs */}
          <div style={{ padding: '16px', height: '280px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px', background: 'var(--bg-secondary)', flex: 1 }}>
            {messages.map((msg, idx) => (
              <div
                key={idx}
                style={{
                  alignSelf: msg.sender === 'ai' ? 'flex-start' : 'flex-end',
                  background: msg.sender === 'ai' ? 'rgba(255,255,255,0.05)' : 'var(--indigo)',
                  padding: '10px 14px',
                  borderRadius: '12px',
                  fontSize: '12px',
                  color: 'white',
                  border: msg.sender === 'ai' ? '1px solid rgba(255,255,255,0.05)' : 'none',
                  maxWidth: '85%',
                  lineHeight: 1.5,
                  wordBreak: 'break-word'
                }}
              >
                {msg.text}
                {msg.sender === 'ai' && (msg.evidenceUsed || msg.confidenceScore) && (
                  <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px dashed rgba(255,255,255,0.1)', fontSize: '10px' }}>
                    {msg.confidenceScore && (
                      <div style={{ color: msg.confidenceScore > 80 ? '#10b981' : '#f59e0b', fontWeight: 600, marginBottom: '4px' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}><Zap size={10} /> Confidence: {msg.confidenceScore}%</span>
                      </div>
                    )}
                    {msg.evidenceUsed && msg.evidenceUsed.length > 0 && (
                      <div style={{ color: 'rgba(255,255,255,0.5)' }}>
                        <span style={{ fontWeight: 600, color: '#818cf8' }}>Evidence: </span>
                        {msg.evidenceUsed.join(' • ')}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}

            {isTyping && (
              <div style={{ alignSelf: 'flex-start', background: 'rgba(255,255,255,0.03)', padding: '8px 12px', borderRadius: '12px', fontSize: '11px', color: 'rgba(255,255,255,0.4)', border: '1px solid rgba(255,255,255,0.02)' }}>
                Thinking...
              </div>
            )}

            <div ref={messagesEndRef} />

            {/* Quick Actions Chips */}
            {messages.length === 1 && !isTyping && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '10px' }}>
                <button 
                  onClick={() => handleSendMessage('Check my IELTS gap')}
                  style={{ background: 'rgba(99,102,241,0.1)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.2)', padding: '8px', borderRadius: '6px', fontSize: '11px', cursor: 'pointer', textAlign: 'left' }}
                >
                  → Check my IELTS gap
                </button>
                <button 
                  onClick={() => handleSendMessage('Draft Chevening SOP')}
                  style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981', border: '1px solid rgba(16,185,129,0.2)', padding: '8px', borderRadius: '6px', fontSize: '11px', cursor: 'pointer', textAlign: 'left' }}
                >
                  → Draft Chevening SOP
                </button>
              </div>
            )}
          </div>

          {/* Chat Inputs */}
          <div style={{ padding: '12px', background: 'var(--bg-primary)', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
            <input
              type="text"
              placeholder="Ask anything..."
              value={inputVal}
              onChange={e => setInputVal(e.target.value)}
              onKeyDown={handleKeyPress}
              style={{ 
                width: '100%', 
                padding: '10px 12px', 
                borderRadius: '8px', 
                background: 'rgba(255,255,255,0.02)', 
                border: '1px solid rgba(255,255,255,0.1)', 
                color: 'white', 
                fontSize: '12px',
                outline: 'none'
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
