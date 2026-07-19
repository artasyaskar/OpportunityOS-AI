import type { Opportunity, UserProfile } from './gemini';
import { calculateCompatibilityScore, generateExplainability } from './scoringEngine';

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
  explainability: {
    reasons: string[];
    isHighlyCompatible: boolean;
  };
}

/**
 * Main AI Ranking Engine
 * Processes a raw list of opportunities and ranks/categorizes them based on the UserProfile
 */
export function generatePersonalizedFeed(
  profile: UserProfile | null,
  opportunities: Opportunity[]
): CategorizedFeed {
  const now = new Date();

  // 1. Calculate scores and attach explainability for all opportunities
  const scoredOpportunities: OpportunityWithScore[] = opportunities.map(opp => {
    const compatibilityScore = calculateCompatibilityScore(profile, opp);
    const explainability = generateExplainability(profile, opp);

    return {
      ...opp,
      compatibilityScore,
      explainability
    };
  });

  // 2. Sort by highest compatibility score first (weighted ranking)
  // If scores are equal, sort by prestige/roi
  const allRanked = [...scoredOpportunities].sort((a, b) => {
    if (a.compatibilityScore !== b.compatibilityScore) {
      return b.compatibilityScore - a.compatibilityScore;
    }
    // Tie-breaker: prestige or ROI
    return (b.prestigeScore || 50) - (a.prestigeScore || 50);
  });

  // 3. Categorize into Feeds

  // "Recommended For You" -> Highly compatible (score >= 80)
  const recommended = allRanked.filter(o => o.compatibilityScore >= 80);

  // "Easy Wins" -> High compatibility AND low/medium competition
  const easyWins = allRanked.filter(o => 
    o.compatibilityScore >= 70 && 
    (o.competitionLevel === 'low' || o.competitionLevel === 'medium')
  );

  // "Dream Opportunities" -> High prestige (>=90) OR full funding, regardless of current score
  // but sorted by score so we show the ones they are closest to first
  const dreamOpportunities = allRanked.filter(o => {
    const isHighPrestige = (o.prestigeScore || 0) >= 90;
    const isFullFunding = o.fundingLevel?.toLowerCase().includes('full') || (o.fundingAmount || 0) > 50000;
    return isHighPrestige || isFullFunding;
  });

  // "Closing Soon" -> Deadline is within the next 45 days, ranked by compatibility
  const closingSoon = allRanked.filter(o => {
    if (!o.deadline) return false;
    const deadlineDate = new Date(o.deadline);
    const diffTime = deadlineDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 && diffDays <= 45;
  });

  return {
    recommended,
    easyWins,
    dreamOpportunities,
    closingSoon,
    allRanked
  };
}
