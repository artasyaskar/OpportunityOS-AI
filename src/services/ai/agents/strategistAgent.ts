import { aiRouter } from '../router';
import { PROMPTS, type UserProfile, type Opportunity } from '@/lib/gemini';

export interface StrategistResult {
  opportunityId: string;
  recommendation: 'apply' | 'wait' | 'skip';
  priority: number;
  reasoning: string;
  bestTimeToApply: string;
  winProbabilityRank: number;
}

export async function runStrategistAgent(
  profile: UserProfile,
  opportunities: Opportunity[],
  evidenceContext?: string
): Promise<StrategistResult[]> {
  const prompt = PROMPTS.STRATEGIST(profile, opportunities, evidenceContext);
  const response = await aiRouter.runWithRetry<StrategistResult[]>(
    'StrategistAgent',
    async (provider) => {
      return provider.generateJSON<StrategistResult[]>(
        prompt,
        'You are the Opportunity Strategist Agent.'
      );
    },
    { format: 'json', taskType: 'complex_reasoning', cacheKey: `strategist_${opportunities?.length || 0}_${evidenceContext?.length || 0}`, userId: profile.userId }
  );
  return response.content;
}
