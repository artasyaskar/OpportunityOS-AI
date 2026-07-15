import { BaseAgent } from '../BaseAgent';
import { generateJSON } from '@/lib/gemini';
import { EvidenceEngine } from '@/lib/services/EvidenceEngine';
import { MatchingResult } from '../matching/MatchingAgent';

export interface StrategyResult {
  recommendedApproach: 'apply_now' | 'strengthen_first' | 'skip';
  actionPlan: { step: number, action: string, priority: 'high' | 'medium' | 'low' }[];
  timelineDays: number;
}

export class StrategyAgent extends BaseAgent<StrategyResult> {
  async execute(): Promise<StrategyResult> {
    console.log('[StrategyAgent] Executing...');
    
    // The StrategyAgent reads from the shared memory what the MatchingAgent produced
    const matchResult: MatchingResult = this.context.sharedMemory.matchResult;
    
    if (!matchResult) {
      throw new Error('StrategyAgent requires MatchingAgent to run first.');
    }

    const basePrompt = `
You are the Strategy Agent. Based on the Match Result, create an actionable plan.
Opportunity: ${JSON.stringify(this.context.opportunity)}
Match Score: ${matchResult.eligibilityScore}
Weaknesses to address: ${JSON.stringify(matchResult.weaknesses)}

Return JSON:
{
  "recommendedApproach": "apply_now|strengthen_first|skip",
  "actionPlan": [
    { "step": 1, "action": "Specific action to address a weakness", "priority": "high" }
  ],
  "timelineDays": 30
}
    `;

    const guardedPrompt = EvidenceEngine.buildGuardrailPrompt(basePrompt, this.context.evidence);
    const result = await generateJSON<StrategyResult>(guardedPrompt);
    return result;
  }
}
