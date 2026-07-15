import { aiRouter } from '../router';
import { type UserProfile } from '@/lib/gemini';

export interface ReadinessResult {
  readinessScore: number;
  confidence: string;
  analysis: string;
  breakdown: {
    resume: { score: number; status: string; details: string };
    transcript: { score: number; status: string; details: string };
    essays: { score: number; status: string; details: string };
    recommendations: { score: number; status: string; details: string };
  };
  recommendations: string[];
}

export async function runReadinessAgent(profile: UserProfile): Promise<ReadinessResult> {
  const prompt = `Analyze document readiness score for this profile: ${JSON.stringify(profile)}. Output JSON in the format of ReadinessResult.`;
  const response = await aiRouter.runWithRetry<ReadinessResult>(
    'ReadinessAgent',
    async (provider) => {
      return provider.generateJSON<ReadinessResult>(
        prompt,
        'You are the Readiness Agent.'
      );
    },
    { format: 'json', taskType: 'complex_reasoning', cacheKey: `readiness_${profile.name}`, userId: profile.userId }
  );
  return response.content;
}
