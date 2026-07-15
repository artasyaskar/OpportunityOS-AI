'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { PipelineService } from '@/lib/services/PipelineService';
import { OpportunityApplication } from '@/lib/repositories/PipelineRepository';

interface PipelineContextType {
  pipeline: OpportunityApplication[];
  isLoading: boolean;
  error: string | null;
  updatePipeline: (updates: OpportunityApplication[]) => Promise<void>;
  addOpportunity: (opp: OpportunityApplication) => Promise<void>;
  updateOpportunity: (id: string, updates: Partial<OpportunityApplication>) => Promise<void>;
  reloadPipeline: () => Promise<void>;
}

const PipelineContext = createContext<PipelineContextType | undefined>(undefined);

export function PipelineProvider({ children }: { children: ReactNode }) {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [pipeline, setPipeline] = useState<OpportunityApplication[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadPipeline = async () => {
    if (authLoading) return;
    if (!isAuthenticated || !user?.uid) {
      setPipeline([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const data = await PipelineService.getPipeline(user.uid);
      setPipeline(data);
    } catch (err: any) {
      console.error('Failed to load pipeline:', err);
      setError('Failed to load pipeline.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPipeline();
  }, [user, isAuthenticated, authLoading]);

  const updatePipeline = async (newPipeline: OpportunityApplication[]) => {
    if (!user?.uid) return;
    setPipeline(newPipeline); // optimistic
    try {
      await PipelineService.savePipeline(user.uid, newPipeline);
    } catch (err: any) {
      console.error('Failed to save pipeline:', err);
      setError('Failed to save pipeline.');
      loadPipeline(); // rollback
    }
  };

  const addOpportunity = async (opp: OpportunityApplication) => {
    if (!user?.uid) return;
    const newPipeline = [...pipeline, opp];
    await updatePipeline(newPipeline);
  };

  const updateOpportunity = async (id: string, updates: Partial<OpportunityApplication>) => {
    if (!user?.uid) return;
    const newPipeline = pipeline.map(o => o.id === id ? { ...o, ...updates } : o);
    await updatePipeline(newPipeline);
  };

  return (
    <PipelineContext.Provider value={{ pipeline, isLoading: isLoading || authLoading, error, updatePipeline, addOpportunity, updateOpportunity, reloadPipeline: loadPipeline }}>
      {children}
    </PipelineContext.Provider>
  );
}

export function usePipeline() {
  const context = useContext(PipelineContext);
  if (context === undefined) {
    throw new Error('usePipeline must be used within a PipelineProvider');
  }
  return context;
}
