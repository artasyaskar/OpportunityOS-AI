import { aiRouter } from '../router';
import { PROMPTS, type Opportunity } from '@/lib/gemini';

export interface PlannerResult {
  totalDays: number;
  phases: Array<{
    phase: string;
    days: string;
    tasks: Array<{ day: number; task: string; priority: 'critical' | 'high' | 'medium' | 'low'; duration: string }>;
  }>;
  criticalMilestones: Array<{ day: number; milestone: string; buffer: string }>;
}

export async function runSubmissionPlannerAgent(
  opportunity: Opportunity,
  daysUntilDeadline: number,
  userId?: string
): Promise<PlannerResult> {
  const prompt = PROMPTS.PLANNER(opportunity, daysUntilDeadline);
  const response = await aiRouter.runWithRetry<PlannerResult>(
    'SubmissionPlannerAgent',
    async (provider) => {
      return provider.generateJSON<PlannerResult>(
        prompt,
        'You are the Submission Planner Agent.'
      );
    },
    { format: 'json', taskType: 'complex_reasoning', cacheKey: `planner_${opportunity?.id || 'opp_default'}_${daysUntilDeadline}`, userId }
  );
  return response.content;
}
