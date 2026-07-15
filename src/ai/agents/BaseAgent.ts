import { AgentContext } from '../orchestrator';

export abstract class BaseAgent<T = any> {
  protected context: AgentContext;

  constructor(context: AgentContext) {
    this.context = context;
  }

  /**
   * The core logic for this agent. Must be implemented by the child.
   */
  abstract execute(): Promise<T>;

  /**
   * Helper to fetch evidence of a specific type.
   */
  protected getEvidenceByType(type: string) {
    return this.context.evidence.filter((e: any) => e.type === type);
  }

  /**
   * Helper to explicitly format a claim based on evidence.
   */
  protected mapToTransparencyStatus(evidenceExists: boolean, factValue: any): { status: 'Verified' | 'Missing' | 'Weak' | 'Not Provided', value: any } {
    if (!evidenceExists || !factValue) {
      return { status: 'Not Provided', value: 'Not Provided' };
    }
    // If we wanted to check 'Weak', we would need threshold logic, but as a base we return Verified.
    return { status: 'Verified', value: factValue };
  }
}
