// =============================================================================
// Telemetry & A/B Testing Engine — OpportunityOS AI
// Zero-overhead structured logger for tracking speed, reliability, and quality.
// =============================================================================

export interface StageLatency {
  preProcessingMs: number;
  strategistMs: number;
  writerMs: number;
  editorMs: number;
  scoringMs: number;
  totalMs: number;
}

export interface TelemetryRecord {
  id: string;
  timestamp: string;
  agentName: string;
  userId?: string;
  opportunityId?: string;
  latency: StageLatency;
  tokenUsage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  payloadSizes: {
    promptCharLength: number;
    responseCharLength: number;
  };
  providersUsed: {
    strategistProvider?: string;
    writerProvider?: string;
    editorProvider?: string;
    failoversCount: number;
  };
  qualityScore: {
    overall: number;
    humanScore: number;
    specificity: number;
    flow: number;
    readability: number;
    professionalism: number;
    storytelling: number;
    diversity: number;
  };
  hallucination?: {
    verified: boolean;
    unsupportedClaims: number;
    corrected: boolean;
  };
  humanizeIterations?: number;
  rewriteTriggered: boolean;
  abVariant: 'variant_a' | 'variant_b';
}

class TelemetryService {
  private records: TelemetryRecord[] = [];
  private readonly maxRecords = 200; // In-memory ring buffer

  /**
   * Log a structured telemetry record.
   */
  log(record: TelemetryRecord): void {
    this.records.unshift(record);
    if (this.records.length > this.maxRecords) {
      this.records.pop();
    }

    // Print clean single-line structured log to server console
    const factStatus = record.hallucination
      ? (record.hallucination.verified ? 'ok' : `${record.hallucination.unsupportedClaims} flagged`)
      : 'ok';
    console.log(
      `[Telemetry] ID:${record.id} | Agent:${record.agentName} | Total:${record.latency.totalMs}ms (W:${record.latency.writerMs}ms, E:${record.latency.editorMs}ms) | Naturalness:${record.qualityScore.humanScore}/100 Overall:${record.qualityScore.overall}/100 | EditPasses:${record.humanizeIterations || 0} | Facts:${factStatus} | Provider:${record.providersUsed.writerProvider || 'none'}`
    );
  }

  /**
   * Get recent telemetry records for dashboard / debugging.
   */
  getRecentLogs(limit: number = 50): TelemetryRecord[] {
    return this.records.slice(0, limit);
  }

  /**
   * Get summary analytics across A/B variants.
   */
  getABAnalytics(): {
    variantA: { count: number; avgScore: number; avgLatencyMs: number };
    variantB: { count: number; avgScore: number; avgLatencyMs: number };
  } {
    const varA = this.records.filter(r => r.abVariant === 'variant_a');
    const varB = this.records.filter(r => r.abVariant === 'variant_b');

    const avg = (arr: TelemetryRecord[], key: 'qualityScore' | 'latency') => {
      if (arr.length === 0) return 0;
      const sum = arr.reduce((acc, r) => acc + (key === 'qualityScore' ? r.qualityScore.overall : r.latency.totalMs), 0);
      return Math.round(sum / arr.length);
    };

    return {
      variantA: { count: varA.length, avgScore: avg(varA, 'qualityScore'), avgLatencyMs: avg(varA, 'latency') },
      variantB: { count: varB.length, avgScore: avg(varB, 'qualityScore'), avgLatencyMs: avg(varB, 'latency') },
    };
  }

  /**
   * Determine A/B variant randomly (50/50 split).
   */
  getABVariant(): 'variant_a' | 'variant_b' {
    return Math.random() > 0.5 ? 'variant_a' : 'variant_b';
  }
}

export const telemetry = new TelemetryService();
