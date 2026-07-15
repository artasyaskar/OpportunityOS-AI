import { aiRouter } from '../router';
import { PROMPTS, type UserProfile, type Opportunity } from '@/lib/gemini';

export interface ProbabilityResult {
  successProbability: number;
  confidence: 'high' | 'medium' | 'low';
  factors: {
    academic: { score: number; note: string };
    experience: { score: number; note: string };
    skills: { score: number; note: string };
    leadership: { score: number; note: string };
    fit: { score: number; note: string };
  };
  strengths: string[];
  weaknesses: string[];
  recommendation: 'apply_now' | 'strengthen_first' | 'skip';
  reasoning: string;
}

export async function runProbabilityEngine(
  profile: UserProfile,
  opportunity: Opportunity,
  evidenceContext?: string
): Promise<ProbabilityResult> {
  const prompt = PROMPTS.PROBABILITY(profile, opportunity, evidenceContext);
  const response = await aiRouter.runWithRetry<ProbabilityResult>(
    'ProbabilityEngine',
    async (provider) => {
      return provider.generateJSON<ProbabilityResult>(
        prompt,
        'You are the Opportunity Probability Engine.'
      );
    },
    { 
      format: 'json', 
      taskType: 'complex_reasoning', 
      cacheKey: `probability_${opportunity.id}_${evidenceContext?.length}`,
      userId: profile.userId
    }
  );
  return response.content;
}
