import { aiRouter } from '../router';
import { SECURE_PROMPTS } from '@/lib/prompts';
import { type UserProfile, type Opportunity } from '@/lib/gemini';

export async function runDiscoveryAgent(profile: UserProfile, evidenceContext?: string): Promise<Opportunity[]> {
  const prompt = SECURE_PROMPTS.DISCOVERY(profile, evidenceContext);
  const response = await aiRouter.runWithRetry<Opportunity[]>(
    'DiscoveryAgent',
    async (provider) => {
      return provider.generateJSON<Opportunity[]>(
        prompt,
        'You are the Opportunity Discovery Agent for OpportunityOS AI.'
      );
    },
    { format: 'json', taskType: 'complex_reasoning', cacheKey: `discovery_${profile.name}_${evidenceContext?.length}`, userId: profile.userId }
  );
  return response.content;
}
