import { aiRouter } from '../router';
import { SECURE_PROMPTS } from '@/lib/prompts';
import { type UserProfile, type Opportunity } from '@/lib/gemini';
import { SEED_OPPORTUNITIES } from '@/lib/opportunities';
import { RankingService } from '@/lib/services/RankingService';
import { calculateCompatibilityScore } from '@/lib/scoringEngine';

interface DiscoverySelection {
  id: string;
  matchReason?: string;
  eligibilityScore?: number;
}

/**
 * GROUNDED discovery: the AI ranks REAL opportunities from our catalog — it can
 * never invent one. Any id the model returns that isn't in the catalog is
 * discarded. If the AI call fails entirely, we fall back to the deterministic
 * RankingService so the user still gets evidence-based results.
 */
export async function runDiscoveryAgent(
  profile: UserProfile,
  evidenceContext?: string,
  corpus: Opportunity[] = SEED_OPPORTUNITIES
): Promise<Opportunity[]> {
  const byId = new Map(corpus.map(o => [o.id, o]));
  const candidates = corpus.map(o => ({
    id: o.id, title: o.title, provider: o.provider, country: o.country,
    type: o.type as string, tags: o.tags,
  }));

  const prompt = SECURE_PROMPTS.DISCOVERY(profile, evidenceContext, candidates);

  const response = await aiRouter.runWithRetry<DiscoverySelection[]>(
    'DiscoveryAgent',
    async (provider) => {
      return provider.generateJSON<DiscoverySelection[]>(
        prompt,
        'You are the Opportunity Discovery Agent for OpportunityOS AI. You only ever recommend real opportunities from the provided catalog.'
      );
    },
    { format: 'json', taskType: 'complex_reasoning', cacheKey: `discovery_${profile.userId}_${evidenceContext?.length}`, userId: profile.userId }
  );

  // Map AI selections back to REAL opportunities; silently drop any invented ids.
  const selected: Opportunity[] = (response.content || [])
    .map(sel => {
      const real = byId.get(sel.id);
      if (!real) return null;
      return sel.eligibilityScore !== undefined
        ? { ...real, eligibilityScore: sel.eligibilityScore }
        : real;
    })
    .filter((o): o is Opportunity => o !== null);

  // If the model returned nothing usable, fall back to deterministic ranking.
  if (selected.length === 0) {
    return RankingService
      .rank(corpus, o => calculateCompatibilityScore(profile, o), { profile })
      .slice(0, 12)
      .map(r => r.opportunity);
  }

  return selected;
}
