import { aiRouter } from '../router';
import { PROMPTS, type UserProfile, type Opportunity } from '@/lib/gemini';

export interface RejectionResult {
  likelyCauses: string[];
  primaryWeakness: string;
  improvementStrategy: Array<{ area: string; action: string; timeline: string }>;
  reapplyRecommendation: 'yes' | 'no' | 'with_changes';
  alternativeOpportunities: string[];
  motivationalNote: string;
}

export async function runRejectionLearningAgent(
  rejection: string,
  profile: UserProfile,
  opportunity: Opportunity
): Promise<RejectionResult> {
  const prompt = PROMPTS.REJECTION_LEARNING(profile, opportunity, rejection);
  const response = await aiRouter.runWithRetry<RejectionResult>(
    'RejectionLearningAgent',
    async (provider) => {
      return provider.generateJSON<RejectionResult>(
        prompt,
        'You are the Rejection Learning Agent.'
      );
    },
    { format: 'json', taskType: 'complex_reasoning', cacheKey: `rejection_${opportunity.id}_${rejection.substring(0,20)}`, userId: profile.userId }
  );
  return response.content;
}
