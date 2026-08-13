import { aiRouter } from '../router';
import { PROMPTS, type UserProfile, type Opportunity } from '@/lib/gemini';

export interface GapAnalysisResult {
  currentState: string;
  targetState: string;
  gaps: Array<{ item: string; priority: 'critical' | 'high' | 'medium' | 'low'; timeEstimate: string }>;
  actionPlan: Array<{ step: number; action: string; timeline: string; resources: string[] }>;
  readinessPercentage: number;
  estimatedTimeToReady: string;
  simulatorLevers?: Array<{
    name: string;
    min: number;
    max: number;
    step: number;
    current: number;
    target: number;
    impactMultiplier: number;
  }>;
}

export async function runGapAnalysisAgent(
  profile: UserProfile,
  opportunity: Opportunity,
  evidenceContext?: string
): Promise<GapAnalysisResult> {
  const prompt = PROMPTS.GAP_ANALYSIS(profile, opportunity, evidenceContext);
  const response = await aiRouter.runWithRetry<GapAnalysisResult>(
    'GapAnalysisAgent',
    async (provider) => {
      return provider.generateJSON<GapAnalysisResult>(
        prompt,
        'You are the Gap Analysis Agent.'
      );
    },
    { format: 'json', taskType: 'complex_reasoning', cacheKey: `gap_${opportunity?.id || 'opp_default'}_${evidenceContext?.length}`, userId: profile?.userId }
  );
  return response.content;
}
