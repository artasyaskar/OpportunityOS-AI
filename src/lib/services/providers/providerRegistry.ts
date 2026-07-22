import type { OpportunityProvider } from './OpportunityProvider';
import { SeedDatasetProvider } from './SeedDatasetProvider';
import { ExampleApiProvider } from './ExampleApiProvider';

// ============================================================
//  PROVIDER REGISTRY
// ============================================================
// Single place to register ingestion sources. Consumers (the ingestion
// pipeline, admin tools) discover providers here — Open/Closed: add a source by
// adding a line, never by editing the pipeline.

const PROVIDERS: OpportunityProvider[] = [
  new SeedDatasetProvider(),
  new ExampleApiProvider(), // disabled unless configured — safe to keep listed
];

export const providerRegistry = {
  /** All registered providers. */
  all(): OpportunityProvider[] {
    return PROVIDERS;
  },
  /** Only providers that are currently runnable. */
  enabled(): OpportunityProvider[] {
    return PROVIDERS.filter(p => p.isEnabled());
  },
  /** Look up a single provider by id. */
  get(id: string): OpportunityProvider | undefined {
    return PROVIDERS.find(p => p.metadata.id === id);
  },
  /** Register a provider at runtime (e.g. from a plugin). */
  register(provider: OpportunityProvider): void {
    if (!PROVIDERS.some(p => p.metadata.id === provider.metadata.id)) {
      PROVIDERS.push(provider);
    }
  },
};
