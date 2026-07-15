import { BaseAgent } from '../BaseAgent';
import { generateJSON, PROMPTS } from '@/lib/gemini';
import { EvidenceEngine } from '@/lib/services/EvidenceEngine';

export interface MatchingResult {
  eligibilityScore: number;
  eligible: boolean;
  strengths: { factor: string, evidenceRef: string }[];
  weaknesses: string[];
  missingRequirements: string[];
  summary: string;
}

export class MatchingAgent extends BaseAgent<MatchingResult> {
  async execute(): Promise<MatchingResult> {
    console.log('[MatchingAgent] Executing...');
    
    // Build the guarded prompt
    const basePrompt = `
You are the Matching Agent. Analyze if this user qualifies for the opportunity based STRICTLY on the Evidence List.
Opportunity: ${JSON.stringify(this.context.opportunity)}

Return JSON:
{
  "eligibilityScore": 0-100,
  "eligible": true|false,
  "strengths": [{ "factor": "reason", "evidenceRef": "Source from Evidence List" }],
  "weaknesses": ["gap 1"],
  "missingRequirements": ["item 1"],
  "summary": "One paragraph explanation using ONLY verified facts."
}
    `;
    
    const guardedPrompt = EvidenceEngine.buildGuardrailPrompt(basePrompt, this.context.evidence);
    
    // Call the LLM
    const result = await generateJSON<MatchingResult>(guardedPrompt);
    return result;
  }
}
