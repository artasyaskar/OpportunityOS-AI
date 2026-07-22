import type { Opportunity } from '../../gemini';
import { BaseOpportunityProvider, type ProviderMetadata, type ProviderFetchOptions } from './OpportunityProvider';

// ============================================================
//  EXAMPLE EXTERNAL PROVIDER (template — disabled by default)
// ============================================================
// Demonstrates how a future integration plugs in WITHOUT touching the engine.
// It is intentionally disabled and does NOT scrape anything. A real
// implementation would call a specific, legitimate source (an official API,
// an RSS feed, or a documented export) inside `load()` and map the response
// into canonical `Opportunity` objects — leaving unknown fields undefined
// rather than fabricating them.
//
// To activate a real provider:
//   1. Set the required credentials/config (checked in `isEnabled`).
//   2. Implement `load()` against the official source.
//   3. Register it in providerRegistry.ts.

export class ExampleApiProvider extends BaseOpportunityProvider {
  readonly metadata: ProviderMetadata = {
    id: 'example-api',
    name: 'Example Official API (template)',
    sourceUrl: 'https://api.example.org/opportunities',
    trustLevel: 'official',
  };

  /** Disabled until a real endpoint + credentials are configured. */
  isEnabled(): boolean {
    return Boolean(process.env.EXAMPLE_API_KEY);
  }

  protected async load(_options?: ProviderFetchOptions): Promise<{ opportunities: Opportunity[]; warnings: string[] }> {
    if (!this.isEnabled()) {
      return { opportunities: [], warnings: ['ExampleApiProvider is disabled (no EXAMPLE_API_KEY configured).'] };
    }

    // --- Real implementation sketch (kept inert on purpose) ---
    // const res = await fetch(this.metadata.sourceUrl, {
    //   headers: { Authorization: `Bearer ${process.env.EXAMPLE_API_KEY}` },
    // });
    // const json = await res.json();
    // const opportunities = json.items.map(mapExternalRecordToOpportunity);
    // return { opportunities, warnings: [] };

    return { opportunities: [], warnings: [] };
  }
}
