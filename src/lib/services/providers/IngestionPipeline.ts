import type { Opportunity } from '../../gemini';
import { DeduplicationService } from '../DeduplicationService';
import { providerRegistry } from './providerRegistry';
import type { ProviderFetchOptions } from './OpportunityProvider';

// ============================================================
//  INGESTION PIPELINE (Phase 10)
// ============================================================
// Orchestrates: run providers → validate → normalize → deduplicate (within the
// batch AND against the existing corpus) → hand back a clean, ready-to-persist
// set. The engine (ranking/matching) never sees duplicates or fabricated data
// because everything enters through this single, controlled seam.
//
// Persistence is injected (Dependency Inversion) so the pipeline has no direct
// Firestore dependency and stays unit-testable.

export interface IngestionReport {
  providersRun: string[];
  fetched: number;
  afterDedup: number;
  newRecords: number;
  mergedIntoExisting: number;
  skipped: number;
  warnings: string[];
  persisted: boolean;
}

export interface IngestionOptions extends ProviderFetchOptions {
  /** Restrict to specific provider ids; defaults to all enabled providers. */
  providerIds?: string[];
  /** Existing corpus to dedup against (e.g. current Firestore contents). */
  existing?: Opportunity[];
  /** Optional persistence sink. When omitted, the pipeline is a dry run. */
  persist?: (records: Opportunity[]) => Promise<void>;
}

export class IngestionPipeline {
  /**
   * Run the ingestion pipeline end to end.
   */
  static async run(options: IngestionOptions = {}): Promise<IngestionReport> {
    const providers = options.providerIds
      ? options.providerIds.map(id => providerRegistry.get(id)).filter(Boolean)
      : providerRegistry.enabled();

    const warnings: string[] = [];
    const providersRun: string[] = [];
    let collected: Opportunity[] = [];

    // 1. Fetch from every selected provider.
    for (const provider of providers) {
      if (!provider) continue;
      try {
        const result = await provider.fetch(options);
        providersRun.push(provider.metadata.id);
        collected.push(...result.opportunities);
        warnings.push(...result.warnings);
      } catch (err: any) {
        warnings.push(`Provider "${provider.metadata.id}" failed: ${err?.message || err}`);
      }
    }

    const fetched = collected.length;

    // 2. Normalize light-touch (ensure officialSource mirrors a real url).
    collected = collected.map(opp => ({
      ...opp,
      officialSource: opp.officialSource || opp.url,
    }));

    // 3. Deduplicate within the freshly-fetched batch.
    const { unique } = DeduplicationService.deduplicate(collected);
    const afterDedup = unique.length;

    // 4. Split into "new" vs "merge into existing corpus".
    const existing = options.existing || [];
    const toPersist: Opportunity[] = [];
    let newRecords = 0;
    let mergedIntoExisting = 0;

    for (const candidate of unique) {
      const match = DeduplicationService.findExisting(candidate, existing);
      if (match) {
        const canonical = DeduplicationService.pickCanonical(match, candidate);
        const duplicate = canonical === match ? candidate : match;
        const merged = { ...DeduplicationService.merge(canonical, duplicate), id: canonical.id };
        toPersist.push(merged);
        mergedIntoExisting++;
      } else {
        toPersist.push(candidate);
        newRecords++;
      }
    }

    const skipped = fetched - afterDedup;

    // 5. Persist (or dry run).
    let persisted = false;
    if (options.persist && toPersist.length > 0) {
      await options.persist(toPersist);
      persisted = true;
    }

    return {
      providersRun,
      fetched,
      afterDedup,
      newRecords,
      mergedIntoExisting,
      skipped,
      warnings,
      persisted,
    };
  }
}
