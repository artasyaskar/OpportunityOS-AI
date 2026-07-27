import { aiRouter } from '../router';
import { PROMPTS, type Opportunity } from '@/lib/gemini';

export interface ReviewResult {
  overallScore: number;
  scores: {
    relevance: number;
    clarity: number;
    impact: number;
    authenticity: number;
    structure: number;
  };
  strengths: string[];
  improvements: string[];
  specificFeedback: Array<{ quote: string; suggestion: string }>;
  verdict: 'strong' | 'good' | 'needs_work' | 'revise';
}

export async function runApplicationReviewerAgent(
  essay: string,
  opportunity: Opportunity,
  userId?: string
): Promise<ReviewResult> {
  const prompt = PROMPTS.REVIEWER(essay, opportunity);
  const response = await aiRouter.runWithRetry<ReviewResult>(
    'ApplicationReviewerAgent',
    async (provider) => {
      return provider.generateJSON<ReviewResult>(
        prompt,
        'You are the Application Reviewer Agent.'
      );
    },
    { format: 'json', taskType: 'complex_reasoning', cacheKey: `reviewer_${opportunity?.id || 'none'}_${essay?.length || 0}`, userId }
  );
  return response.content;
}
