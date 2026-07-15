'use client';

import { useEffect, useState } from 'react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export default function AuthModal({ isOpen, onClose, title, children }: AuthModalProps) {
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    if (isOpen) setShouldRender(true);
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!shouldRender) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0, left: 0, right: 0, bottom: 0,
        zIndex: 99990,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        backgroundColor: 'rgba(5, 7, 10, 0.7)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        opacity: isOpen ? 1 : 0,
        transition: 'opacity 0.3s ease',
      }}
      onClick={onClose}
    >
      {/* Modal Container */}
      <div
        className="chassis"
        style={{
          width: '100%',
          maxWidth: '600px',
          maxHeight: '85vh',
          display: 'flex',
          flexDirection: 'column',
          transform: isOpen ? 'translateY(0) scale(1)' : 'translateY(20px) scale(0.95)',
          transition: 'all 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)',
          padding: '32px',
          position: 'relative',
        }}
        onClick={e => e.stopPropagation()} // Prevent closing when clicking inside
        onTransitionEnd={() => {
          if (!isOpen) setShouldRender(false);
        }}
      >
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            background: 'rgba(255,255,255,0.1)',
            border: '1px solid rgba(255,255,255,0.1)',
            color: 'rgba(255,255,255,0.8)',
            width: '32px',
            height: '32px',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            fontSize: '18px',
            transition: 'all 0.2s',
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
          onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
        >
          ×
        </button>

        <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#fff', marginBottom: '20px', textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>
          {title}
        </h2>

        {/* Scrollable Content Area */}
        <div 
          style={{ 
            overflowY: 'auto', 
            flex: 1, 
            paddingRight: '12px',
            color: 'rgba(255,255,255,0.8)',
            fontSize: '14px',
            lineHeight: 1.6,
          }}
          className="modal-content-scroll"
        >
          {children}
        </div>
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        .modal-content-scroll::-webkit-scrollbar { width: 6px; }
        .modal-content-scroll::-webkit-scrollbar-track { background: rgba(0,0,0,0.2); border-radius: 4px; }
        .modal-content-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.2); border-radius: 4px; }
        .modal-content-scroll::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.3); }
      `}} />
    </div>
  );
}
