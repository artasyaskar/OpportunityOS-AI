'use client';

import { useEffect, useState } from 'react';

export type ToastType = 'success' | 'error';

interface ToastProps {
  message: string | null;
  type: ToastType;
  onClose: () => void;
}

export default function Toast({ message, type, onClose }: ToastProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (message) {
      setIsVisible(true);
      const timer = setTimeout(() => {
        setIsVisible(false);
        setTimeout(onClose, 300); // Wait for fade out animation
      }, 5000); // Auto close after 5s
      
      return () => clearTimeout(timer);
    }
  }, [message, onClose]);

  if (!message) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: '24px',
        right: '24px',
        zIndex: 99999,
        background: type === 'success' 
          ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.9) 0%, rgba(6, 78, 59, 0.95) 100%)' 
          : 'linear-gradient(135deg, rgba(244, 63, 94, 0.9) 0%, rgba(136, 19, 55, 0.95) 100%)',
        color: '#fff',
        padding: '16px 24px',
        borderRadius: '12px',
        boxShadow: `0 10px 30px rgba(0,0,0,0.6), inset 0 2px 4px rgba(255,255,255,0.2), 0 0 0 1px ${type === 'success' ? 'rgba(16, 185, 129, 0.4)' : 'rgba(244, 63, 94, 0.4)'}`,
        backdropFilter: 'blur(12px)',
        transform: isVisible ? 'translateY(0) scale(1)' : 'translateY(-20px) scale(0.95)',
        opacity: isVisible ? 1 : 0,
        transition: 'all 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        fontWeight: 600,
        fontSize: '14px',
        textShadow: '0 2px 4px rgba(0,0,0,0.4)',
        maxWidth: '350px',
      }}
    >
      <span style={{ fontSize: '20px' }}>
        {type === 'success' ? '✨' : '⚠️'}
      </span>
      {message}
      <button 
        onClick={() => {
          setIsVisible(false);
          setTimeout(onClose, 300);
        }}
        style={{
          background: 'none', border: 'none', color: 'rgba(255,255,255,0.6)', cursor: 'pointer',
          marginLeft: 'auto', fontSize: '18px', display: 'flex', alignItems: 'center'
        }}
      >
        ×
      </button>
    </div>
  );
}
