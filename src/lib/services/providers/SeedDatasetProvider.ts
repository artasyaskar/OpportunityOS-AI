import type { Opportunity } from '../../gemini';
import { GLOBAL_OPPORTUNITIES } from '../../opportunities-data';
import { BaseOpportunityProvider, type ProviderMetadata, type ProviderFetchOptions } from './OpportunityProvider';

// ============================================================
//  SEED DATASET PROVIDER (reference implementation)
// ============================================================
// Wraps the curated in-repo dataset behind the provider interface, so the seed
// corpus flows through the exact same ingestion pipeline (normalize → dedup →
// persist) as any future external source. This is the template a real crawler
// (DAAD / Devpost / MLH adapter) copies.

export class SeedDatasetProvider extends BaseOpportunityProvider {
  readonly metadata: ProviderMetadata = {
    id: 'seed-dataset',
    name: 'OpportunityOS Curated Dataset',
    sourceUrl: 'internal://opportunities-data',
    trustLevel: 'verified',
  };

  protected async load(options?: ProviderFetchOptions): Promise<{ opportunities: Opportunity[]; warnings: string[] }> {
    let data = [...GLOBAL_OPPORTUNITIES];
    if (options?.since) {
      data = data.filter(o => {
        const lu = o.lastUpdatedDate ? new Date(o.lastUpdatedDate) : null;
        return lu ? lu >= options.since! : true;
      });
    }
    if (options?.limit) data = data.slice(0, options.limit);
    return { opportunities: data, warnings: [] };
  }
}
