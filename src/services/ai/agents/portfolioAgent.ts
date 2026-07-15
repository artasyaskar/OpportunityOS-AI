import { aiRouter } from '../router';
import { PROMPTS, type Application } from '@/lib/gemini';

export interface PortfolioResult {
  healthScore: number;
  diversityScore: number;
  stats: {
    total: number;
    applied: number;
    pending: number;
    accepted: number;
    rejected: number;
    potentialValue: string;
  };
  analysis: string;
  recommendations: string[];
  riskLevel: 'high' | 'medium' | 'low';
  topOpportunity: string;
}

export async function runPortfolioAgent(
  applications: Application[],
  evidenceContext?: string,
  userId?: string
): Promise<PortfolioResult> {
  const prompt = PROMPTS.PORTFOLIO(applications, evidenceContext);
  const response = await aiRouter.runWithRetry<PortfolioResult>(
    'PortfolioAgent',
    async (provider) => {
      return provider.generateJSON<PortfolioResult>(
        prompt,
        'You are the Portfolio Agent.'
      );
    },
    { format: 'json', taskType: 'complex_reasoning', cacheKey: `portfolio_${applications.length}_${evidenceContext?.length}`, userId }
  );
  return response.content;
}
