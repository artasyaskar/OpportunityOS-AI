import type { Opportunity } from '../../gemini';

// ============================================================
//  OPPORTUNITY PROVIDER ABSTRACTION (Phase 10 — AI Discovery Pipeline)
// ============================================================
// A Provider is an adapter that fetches opportunities from ONE trusted source
// and maps them into our canonical `Opportunity` shape. This is the seam that
// lets future crawlers/integrations (DAAD, Devpost, MLH, official APIs, RSS,
// verified partner feeds) plug in WITHOUT touching the ranking/matching engine.
//
// Design principles:
//   • Interface Segregation — a provider only implements `fetch()` + metadata.
//   • Open/Closed — add sources by adding providers, never by editing consumers.
//   • Trust-first — every provider declares its `trustLevel` and `sourceUrl`;
//     ingestion refuses to persist anything without a real source. NO random
//     scraping: providers target specific, known, legitimate sources only.

export type ProviderTrustLevel =
  | 'official'      // the organization's own site/API (highest trust)
  | 'verified'      // a curated/verified aggregator or partner feed
  | 'community';    // community-sourced; requires review before publish

export interface ProviderMetadata {
  /** Stable unique id, e.g. "daad", "devpost", "seed-dataset". */
  id: string;
  /** Human-readable name shown in admin/ingestion logs. */
  name: string;
  /** The canonical source this provider reads from. */
  sourceUrl: string;
  /** How much we trust records from this provider. */
  trustLevel: ProviderTrustLevel;
  /** Categories this provider is expected to yield (for routing/analytics). */
  categories?: string[];
}

export interface ProviderFetchOptions {
  /** Only return records updated after this date, when the source supports it. */
  since?: Date;
  /** Soft cap on records to pull in one run. */
  limit?: number;
  /** Free-form, provider-specific query hints (e.g. a category filter). */
  query?: Record<string, unknown>;
}

export interface ProviderFetchResult {
  provider: string;
  opportunities: Opportunity[];
  /** Non-fatal issues (skipped/invalid records) for observability. */
  warnings: string[];
  fetchedAt: string;
}

/**
 * The contract every ingestion source implements.
 * Implementations MUST NOT invent data: if the source has no value for a field,
 * leave it undefined rather than fabricating it.
 */
export interface OpportunityProvider {
  readonly metadata: ProviderMetadata;
  /** Whether this provider is currently runnable (e.g. has required config). */
  isEnabled(): boolean;
  /** Fetch + map records from the source into canonical Opportunity objects. */
  fetch(options?: ProviderFetchOptions): Promise<ProviderFetchResult>;
}

/**
 * Base class handling the boilerplate (metadata, result envelope, validation)
 * so concrete providers only implement `load()`.
 */
export abstract class BaseOpportunityProvider implements OpportunityProvider {
  abstract readonly metadata: ProviderMetadata;

  isEnabled(): boolean {
    return true;
  }

  /** Concrete providers implement the actual source read here. */
  protected abstract load(options?: ProviderFetchOptions): Promise<{ opportunities: Opportunity[]; warnings: string[] }>;

  async fetch(options?: ProviderFetchOptions): Promise<ProviderFetchResult> {
    const { opportunities, warnings } = await this.load(options);

    // Guardrail: never emit records without a real source URL. This is what
    // structurally prevents fabricated/placeholder opportunities from entering
    // the pipeline.
    const validated: Opportunity[] = [];
    const allWarnings = [...warnings];
    for (const opp of opportunities) {
      const url = opp.url || opp.officialSource || opp.officialApplicationUrl;
      if (!url || !/^https?:\/\//i.test(url)) {
        allWarnings.push(`Skipped "${opp.title || opp.id}" — missing/invalid official URL.`);
        continue;
      }
      if (!opp.title || !opp.provider) {
        allWarnings.push(`Skipped "${opp.id}" — missing required title/provider.`);
        continue;
      }
      validated.push({
        ...opp,
        source: opp.source || this.metadata.name,
        verificationStatus: opp.verificationStatus || (this.metadata.trustLevel === 'official' ? 'verified' : 'unverified'),
      } as Opportunity);
    }

    return {
      provider: this.metadata.id,
      opportunities: validated,
      warnings: allWarnings,
      // Timestamp injected by the caller-controlled Date to keep this testable.
      fetchedAt: (options as any)?._now?.toISOString?.() || new Date().toISOString(),
    };
  }
}
