import { aiRouter } from '../router';
import { PROMPTS } from '@/lib/gemini';

export interface ComplianceResult {
  overallCompliant: boolean;
  completionPercentage: number;
  checklist: Array<{ requirement: string; status: 'complete' | 'incomplete' | 'warning'; note: string }>;
  criticalIssues: string[];
  warnings: string[];
}

export async function runComplianceAgent(
  requirements: string[],
  documents: Record<string, string>,
  userId?: string
): Promise<ComplianceResult> {
  const prompt = PROMPTS.COMPLIANCE(requirements, documents);
  const response = await aiRouter.runWithRetry<ComplianceResult>(
    'ComplianceAgent',
    async (provider) => {
      return provider.generateJSON<ComplianceResult>(
        prompt,
        'You are the Compliance Agent.'
      );
    },
    { format: 'json', taskType: 'complex_reasoning', cacheKey: `compliance_${requirements?.length || 0}`, userId }
  );
  return response.content;
}
