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

export async function runReadinessAgent(profile: UserProfile, evidenceContext?: string): Promise<ReadinessResult> {
  const prompt = `Analyze document readiness score for this profile: ${JSON.stringify(profile)}. Verified Vault Evidence: ${evidenceContext || 'No documents in vault yet'}. Output JSON strictly adhering to ReadinessResult schema with readinessScore (0-100), confidence ('High' | 'Medium' | 'Low'), analysis string, breakdown object for resume, transcript, essays, recommendations (each having score, status, details), and recommendations array.`;
  const response = await aiRouter.runWithRetry<ReadinessResult>(
    'ReadinessAgent',
    async (provider) => {
      return provider.generateJSON<ReadinessResult>(
        prompt,
        'You are the Application Readiness Agent.'
      );
    },
    { format: 'json', taskType: 'complex_reasoning', cacheKey: `readiness_${profile?.name || 'user'}_${evidenceContext?.length || 0}`, userId: profile?.userId }
  );
  return response.content;
}
