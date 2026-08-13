import { aiRouter } from '../router';
import { PROMPTS, type UserProfile, type Opportunity } from '@/lib/gemini';

export interface EligibilityResult {
  eligibilityScore: number;
  eligible: boolean;
  strengths: string[];
  weaknesses: string[];
  missingRequirements: string[];
  summary: string;
}

export async function runEligibilityAgent(
  profile: UserProfile,
  opportunity: Opportunity,
  evidenceContext?: string
): Promise<EligibilityResult> {
  const prompt = PROMPTS.ELIGIBILITY(profile, opportunity, evidenceContext);
  const response = await aiRouter.runWithRetry<EligibilityResult>(
    'EligibilityAgent',
    async (provider) => {
      return provider.generateJSON<EligibilityResult>(
        prompt,
        'You are the Eligibility Intelligence Agent.'
      );
    },
    { format: 'json', taskType: 'complex_reasoning', cacheKey: `eligibility_${opportunity?.id || 'opp_default'}_${evidenceContext?.length}`, userId: profile?.userId }
  );
  return response.content;
}
