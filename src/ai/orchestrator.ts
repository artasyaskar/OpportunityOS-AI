import { UserProfile, Opportunity } from '@/lib/gemini';
import { EvidenceEngine, EvidenceNode } from '@/lib/services/EvidenceEngine';
import { MatchingAgent } from './agents/matching/MatchingAgent';
import { StrategyAgent } from './agents/application/StrategyAgent';

export interface AgentContext {
  profile: UserProfile;
  opportunity: Opportunity;
  evidence: EvidenceNode[];
  sharedMemory: Record<string, any>; // Used to pass state sequentially between agents
}

/**
 * AI Orchestrator
 * Central controller that enforces strict Evidence rules and coordinates agents sequentially.
 * Agents NEVER talk to each other directly. They always read from and write to the AgentContext.
 */
export class AIOrchestrator {
  private context: AgentContext;

  constructor(profile: UserProfile, opportunity: Opportunity) {
    this.context = {
      profile,
      opportunity,
      evidence: EvidenceEngine.extractEvidence(profile),
      sharedMemory: {}
    };
  }

  /**
   * Run the standard Application Evaluation workflow:
   * Matching -> Strategy
   */
  async runEvaluationWorkflow() {
    console.log('[Orchestrator] Starting Evaluation Workflow...');
    
    // 1. Matching Agent
    const matchingAgent = new MatchingAgent(this.context);
    const matchResult = await matchingAgent.execute();
    this.context.sharedMemory.matchResult = matchResult;

    // 2. Strategy Agent
    const strategyAgent = new StrategyAgent(this.context);
    const strategyResult = await strategyAgent.execute();
    this.context.sharedMemory.strategyResult = strategyResult;

    return {
      matchResult,
      strategyResult
    };
  }
}
