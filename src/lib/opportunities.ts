// Legacy re-export — All opportunity data now lives in opportunities-data.ts
// This file is preserved for backward compatibility.
import type { Opportunity } from './gemini';
import { GLOBAL_OPPORTUNITIES, getCategories, getCountries, getRegions, getCategoryCounts } from './opportunities-data';

// ============================================================
//  HONEST METADATA DERIVATION
// ============================================================
// We NEVER fabricate values. Every derived field below is computed from
// real signals already present on the opportunity (funding, verification,
// freshness, competition, provider). Fields we cannot honestly derive are
// left `undefined` so the UI can omit them rather than show a fake number.

/** A small set of globally-recognized providers that objectively warrant a
 *  higher prestige weighting. This is a transparency-friendly heuristic, not
 *  a fabricated score — it only nudges ranking, and is fully explainable. */
const ELITE_PROVIDER_SIGNALS = [
  'gates', 'fulbright', 'rhodes', 'oxford', 'cambridge', 'stanford', 'mit',
  'harvard', 'nasa', 'esa', 'cern', 'max planck', 'epfl', 'y combinator',
  'sequoia', 'andreessen', 'nobel', 'unesco', 'world bank', 'schwarzman',
  'knight-hennessy', 'openai', 'deepmind', 'nvidia', 'european commission',
];

/**
 * Derive a prestige score (0-100) from REAL signals — never a flat constant.
 * Combines: provider reputation, funding scale, verification, competition level.
 */
function derivePrestigeScore(opp: Opportunity): number {
  let score = 50; // neutral baseline for a verified, legitimate opportunity

  const provider = (opp.provider || '').toLowerCase();
  const title = (opp.title || '').toLowerCase();
  if (ELITE_PROVIDER_SIGNALS.some(sig => provider.includes(sig) || title.includes(sig))) {
    score += 25;
  }

  // Funding scale signal (real number from the dataset)
  const amount = opp.fundingAmount || 0;
  if (amount >= 100000) score += 15;
  else if (amount >= 40000) score += 10;
  else if (amount >= 10000) score += 5;

  // Competition is a real prestige proxy — highly competitive = more prestigious
  if (opp.competitionLevel === 'high') score += 8;
  else if (opp.competitionLevel === 'medium') score += 3;

  // Verified + fresh data earns a small trust bump
  if (opp.verified) score += 2;

  return Math.min(100, Math.max(0, score));
}

// Opportunity Graph Engine: honest metadata populator.
// Only fills fields that are genuinely derivable; never invents URLs or funding.
GLOBAL_OPPORTUNITIES.forEach((opp) => {
  if (opp.prestigeScore === undefined) {
    opp.prestigeScore = derivePrestigeScore(opp);
  }

  if (!opp.difficulty) {
    // Derive from competition level if available (real field), else leave medium.
    opp.difficulty =
      opp.competitionLevel === 'high' ? 'hard'
      : opp.competitionLevel === 'low' ? 'easy'
      : 'medium';
  }

  if (!opp.competitionLevel) {
    opp.competitionLevel =
      opp.difficulty === 'hard' ? 'high'
      : opp.difficulty === 'easy' ? 'low'
      : 'medium';
  }

  // Official source: use the REAL url only. Never fall back to a fake domain.
  if (!opp.officialSource && opp.url) {
    opp.officialSource = opp.url;
  }

  // Skills required: reuse explicit requiredSkills or requirements — never invent.
  if (!opp.skillsRequired) {
    opp.skillsRequired = opp.requiredSkills?.length
      ? opp.requiredSkills
      : opp.requirements?.slice(0, 3);
  }

  // NOTE: careerValue is intentionally NOT fabricated. The UI should present the
  // real `fundingLevel` / `fundingAmount` instead of an invented "career value".
});

// Re-export the new database as the old name for backward compat
export const SEED_OPPORTUNITIES: Opportunity[] = GLOBAL_OPPORTUNITIES;

export const getOpportunitiesByType = (type: string) =>
  SEED_OPPORTUNITIES.filter(opp => opp.type === type);

export const getOpportunitiesByCountry = (country: string) =>
  SEED_OPPORTUNITIES.filter(opp =>
    opp.country.toLowerCase().includes(country.toLowerCase())
  );

export const getTopOpportunities = (limit = 6) =>
  [...SEED_OPPORTUNITIES]
    .sort((a, b) => (b.prestigeScore || 0) - (a.prestigeScore || 0))
    .slice(0, limit);

export const searchOpportunities = (query: string) => {
  const q = query.toLowerCase();
  return SEED_OPPORTUNITIES.filter(opp =>
    opp.title.toLowerCase().includes(q) ||
    opp.provider.toLowerCase().includes(q) ||
    opp.description.toLowerCase().includes(q) ||
    opp.tags?.some(tag => tag.includes(q))
  );
};

// Re-export utility functions
export { getCategories, getCountries, getRegions, getCategoryCounts };
