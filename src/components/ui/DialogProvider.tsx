'use client';

import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback } from 'react';
import { X, CheckCircle, AlertTriangle, Info, Loader2, Sparkles, BrainCircuit } from 'lucide-react';

interface ToastOptions {
  message: string;
  type?: 'success' | 'error' | 'info';
  duration?: number;
}

interface DialogContextType {
  toast: (options: ToastOptions | string) => void;
  confirm: (message: string, title?: string) => Promise<boolean>;
  prompt: (message: string, placeholder?: string, defaultValue?: string) => Promise<string | null>;
  showAILoading: (message?: string) => void;
  hideAILoading: () => void;
}

const DialogContext = createContext<DialogContextType | undefined>(undefined);

export function useDialog() {
  const context = useContext(DialogContext);
  if (!context) {
    throw new Error('useDialog must be used within a DialogProvider');
  }
  return context;
}

export function DialogProvider({ children }: { children: ReactNode }) {
  // Toast State
  const [toasts, setToasts] = useState<(ToastOptions & { id: string })[]>([]);

  // Confirm State
  const [confirmConfig, setConfirmConfig] = useState<{
    isOpen: boolean;
    message: string;
    title: string;
    resolve: (value: boolean) => void;
  } | null>(null);

  // Prompt State
  const [promptConfig, setPromptConfig] = useState<{
    isOpen: boolean;
    message: string;
    placeholder: string;
    defaultValue: string;
    value: string;
    resolve: (value: string | null) => void;
  } | null>(null);

  // AI Loading State
  const [aiLoadingConfig, setAiLoadingConfig] = useState<{
    isOpen: boolean;
    message: string;
  }>({ isOpen: false, message: 'Processing intelligence...' });

  const aiPhases = [
    'Initializing neural pathways...',
    'Extracting semantic nodes...',
    'Analyzing context density...',
    'Synthesizing parameters...',
    'Structuring insights...'
  ];
  const [phaseIndex, setPhaseIndex] = useState(0);

  useEffect(() => {
    if (aiLoadingConfig.isOpen) {
      const interval = setInterval(() => {
        setPhaseIndex(prev => (prev + 1) % aiPhases.length);
      }, 2500);
      return () => clearInterval(interval);
    }
  }, [aiLoadingConfig.isOpen]);

  const toast = useCallback((options: ToastOptions | string) => {
    const opts = typeof options === 'string' ? { message: options } : options;
    const id = Math.random().toString(36).substring(2, 9);
    setToasts(prev => [...prev, { ...opts, id }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, opts.duration || 4000);
  }, []);

  const confirm = useCallback((message: string, title: string = 'Confirmation') => {
    return new Promise<boolean>((resolve) => {
      setConfirmConfig({ isOpen: true, message, title, resolve });
    });
  }, []);

  const handleConfirmClose = (result: boolean) => {
    if (confirmConfig) {
      confirmConfig.resolve(result);
      setConfirmConfig(null);
    }
  };

  const promptAction = useCallback((message: string, placeholder: string = 'Enter value...', defaultValue: string = '') => {
    return new Promise<string | null>((resolve) => {
      setPromptConfig({ isOpen: true, message, placeholder, defaultValue, value: defaultValue, resolve });
    });
  }, []);

  const handlePromptClose = (submit: boolean) => {
    if (promptConfig) {
      promptConfig.resolve(submit ? promptConfig.value : null);
      setPromptConfig(null);
    }
  };

  const showAILoading = useCallback((message: string = 'Synthesizing knowledge graph...') => {
    setPhaseIndex(0);
    setAiLoadingConfig({ isOpen: true, message });
  }, []);

  const hideAILoading = useCallback(() => {
    setAiLoadingConfig({ isOpen: false, message: '' });
  }, []);

  return (
    <DialogContext.Provider value={{ toast, confirm, prompt: promptAction, showAILoading, hideAILoading }}>
      {children}

      {/* TOASTS */}
      <div style={{ position: 'fixed', top: '24px', right: '24px', zIndex: 9999, display: 'flex', flexDirection: 'column', gap: '12px', pointerEvents: 'none' }}>
        {toasts.map(t => (
          <div key={t.id} style={{
            background: 'rgba(15,23,42,0.95)',
            border: `1px solid ${t.type === 'error' ? '#ef4444' : t.type === 'success' ? '#10b981' : '#6366f1'}`,
            borderRadius: '12px',
            padding: '16px 20px',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
            pointerEvents: 'auto',
            animation: 'slideIn 0.3s ease forwards',
            minWidth: '300px'
          }}>
            {t.type === 'error' ? <AlertTriangle color="#ef4444" size={20} /> : t.type === 'success' ? <CheckCircle color="#10b981" size={20} /> : <Info color="#6366f1" size={20} />}
            <span style={{ fontSize: '14px', fontWeight: 500 }}>{t.message}</span>
          </div>
        ))}
      </div>

      {/* CONFIRM MODAL */}
      {confirmConfig?.isOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }}>
          <div style={{ background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', padding: '32px', borderRadius: '24px', width: '100%', maxWidth: '400px', textAlign: 'center', animation: 'scaleUp 0.3s ease' }}>
            <AlertTriangle color="#f59e0b" size={48} style={{ margin: '0 auto 16px' }} />
            <h3 style={{ fontSize: '20px', fontWeight: 700, color: 'white', marginBottom: '12px' }}>{confirmConfig.title}</h3>
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '15px', marginBottom: '32px', lineHeight: 1.5 }}>{confirmConfig.message}</p>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={() => handleConfirmClose(false)} style={{ flex: 1, padding: '12px', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', color: 'white', border: '1px solid rgba(255,255,255,0.1)', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
              <button onClick={() => handleConfirmClose(true)} style={{ flex: 1, padding: '12px', borderRadius: '12px', background: '#6366f1', color: 'white', border: 'none', fontWeight: 600, cursor: 'pointer' }}>Confirm</button>
            </div>
          </div>
        </div>
      )}

      {/* PROMPT MODAL */}
      {promptConfig?.isOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }}>
          <div style={{ background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', padding: '32px', borderRadius: '24px', width: '100%', maxWidth: '400px', animation: 'scaleUp 0.3s ease' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'white', marginBottom: '16px' }}>{promptConfig.message}</h3>
            <input 
              autoFocus
              type="text" 
              placeholder={promptConfig.placeholder} 
              value={promptConfig.value}
              onChange={e => setPromptConfig({ ...promptConfig, value: e.target.value })}
              onKeyDown={e => e.key === 'Enter' && handlePromptClose(true)}
              style={{ width: '100%', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)', padding: '14px', borderRadius: '12px', color: 'white', fontSize: '15px', marginBottom: '24px', outline: 'none' }}
            />
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button onClick={() => handlePromptClose(false)} style={{ padding: '10px 20px', borderRadius: '10px', background: 'transparent', color: 'rgba(255,255,255,0.7)', border: 'none', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
              <button onClick={() => handlePromptClose(true)} style={{ padding: '10px 20px', borderRadius: '10px', background: '#6366f1', color: 'white', border: 'none', fontWeight: 600, cursor: 'pointer' }}>Submit</button>
            </div>
          </div>
        </div>
      )}

      {/* AI LOADING OVERLAY */}
      {aiLoadingConfig.isOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(15,23,42,0.85)', backdropFilter: 'blur(16px)', animation: 'fadeIn 0.4s ease' }}>
          
          <div style={{ position: 'relative', width: '120px', height: '120px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '40px' }}>
            <div style={{ position: 'absolute', inset: 0, border: '2px solid rgba(99,102,241,0.2)', borderRadius: '50%', animation: 'spin 3s linear infinite' }}></div>
            <div style={{ position: 'absolute', inset: '10px', border: '2px solid transparent', borderTopColor: '#6366f1', borderBottomColor: '#a855f7', borderRadius: '50%', animation: 'spin 2s ease-in-out infinite alternate' }}></div>
            <div style={{ position: 'absolute', inset: '25px', border: '2px solid transparent', borderLeftColor: '#10b981', borderRadius: '50%', animation: 'spin 1.5s linear infinite reverse' }}></div>
            <BrainCircuit size={40} color="#c084fc" style={{ animation: 'pulse 2s ease-in-out infinite' }} />
          </div>

          <h2 className="gradient-text" style={{ fontSize: '28px', fontWeight: 800, marginBottom: '16px', letterSpacing: '-0.5px' }}>
            {aiLoadingConfig.message}
          </h2>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'rgba(99,102,241,0.1)', padding: '12px 24px', borderRadius: '100px', border: '1px solid rgba(99,102,241,0.2)' }}>
            <Sparkles size={16} color="#6366f1" />
            <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '15px', fontFamily: 'monospace' }}>
              {aiPhases[phaseIndex]}
            </span>
          </div>

        </div>
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        @keyframes scaleUp { from { transform: scale(0.95); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        @keyframes pulse { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.7; transform: scale(0.9); } }
      `}} />
    </DialogContext.Provider>
  );
}
