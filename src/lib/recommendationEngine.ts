import type { Opportunity, UserProfile } from './gemini';
import { calculateCompatibilityScore, generateExplainability } from './scoringEngine';
import { RankingService, type UserPreferenceSignals, type RankingSignal } from './services/RankingService';

// ========================
// OPPORTUNITY FEED CATEGORIES
// ========================

export interface CategorizedFeed {
  recommended: OpportunityWithScore[];
  easyWins: OpportunityWithScore[];
  dreamOpportunities: OpportunityWithScore[];
  closingSoon: OpportunityWithScore[];
  allRanked: OpportunityWithScore[];
}

export interface OpportunityWithScore extends Opportunity {
  compatibilityScore: number;
  rankScore: number;                 // NEW: composite smart-ranking score (0..100)
  rankingSignals: RankingSignal[];   // NEW: explainable ranking breakdown
  explainability: {
    reasons: string[];
    isHighlyCompatible: boolean;
  };
}

/**
 * Main AI Ranking Engine
 * Processes a raw list of opportunities and ranks/categorizes them based on the
 * UserProfile using the composite, explainable RankingService.
 *
 * Backward compatible: same signature + CategorizedFeed shape as before, with
 * two additive fields (rankScore, rankingSignals). `prefs` is optional so the
 * ranking adapts to saved/hidden/rejected history when available.
 */
export function generatePersonalizedFeed(
  profile: UserProfile | null,
  opportunities: Opportunity[],
  prefs?: UserPreferenceSignals
): CategorizedFeed {
  const now = new Date();

  // 1. Compute compatibility + explainability once per opportunity.
  const compatibilityCache = new Map<string, number>();
  const scoreFor = (opp: Opportunity): number => {
    if (!compatibilityCache.has(opp.id)) {
      compatibilityCache.set(opp.id, calculateCompatibilityScore(profile, opp));
    }
    return compatibilityCache.get(opp.id)!;
  };

  // 2. Smart composite ranking (compatibility + deadline + funding + prestige +
  //    freshness + competition + adaptive preference feedback).
  const ranked = RankingService.rank(opportunities, scoreFor, { prefs, profile, now });

  // 3. Attach explainability and build the enriched list, preserving rank order.
  const scoredOpportunities: OpportunityWithScore[] = ranked.map(r => {
    const compatibilityScore = r.compatibilityScore;
    const explainability = generateExplainability(profile, r.opportunity);
    return {
      ...r.opportunity,
      compatibilityScore,
      rankScore: r.rankScore,
      rankingSignals: r.signals,
      explainability,
    };
  });

  // allRanked is already sorted by composite rankScore (desc).
  const allRanked = scoredOpportunities;

  // 4. Categorize into Feeds (thresholds preserved from the original engine).

  // "Recommended For You" -> Highly compatible (score >= 60)
  let recommended = allRanked.filter(o => o.compatibilityScore >= 60);
  // Guarantee a minimum of 12 recommendations so new users don't see an empty feed
  if (recommended.length < 12) {
    const toAdd = allRanked.filter(o => !recommended.includes(o)).slice(0, 12 - recommended.length);
    recommended = [...recommended, ...toAdd];
  }

  // "Easy Wins" -> Good compatibility AND low/medium competition
  let easyWins = allRanked.filter(o =>
    o.compatibilityScore >= 55 &&
    (o.competitionLevel === 'low' || o.competitionLevel === 'medium')
  );
  if (easyWins.length < 6) {
    const lowComp = allRanked.filter(o => o.competitionLevel === 'low' || o.competitionLevel === 'medium');
    const toAdd = lowComp.filter(o => !easyWins.includes(o)).slice(0, 6 - easyWins.length);
    easyWins = [...easyWins, ...toAdd];
  }

  // "Dream Opportunities" -> High prestige (>=90) OR full funding
  const dreamOpportunities = allRanked.filter(o => {
    const isHighPrestige = (o.prestigeScore || 0) >= 90;
    const isFullFunding = o.fundingLevel?.toLowerCase().includes('full') || (o.fundingAmount || 0) > 50000;
    return isHighPrestige || isFullFunding;
  });

  // "Closing Soon" -> Deadline within the next 45 days, still ordered by rankScore
  const closingSoon = allRanked.filter(o => {
    if (!o.deadline) return false;
    const deadlineDate = new Date(o.deadline);
    const diffDays = Math.ceil((deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays > 0 && diffDays <= 45;
  });

  return {
    recommended,
    easyWins,
    dreamOpportunities,
    closingSoon,
    allRanked,
  };
}
