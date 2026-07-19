// Legacy re-export — All opportunity data now lives in opportunities-data.ts
// This file is preserved for backward compatibility.
import type { Opportunity } from './gemini';
import { GLOBAL_OPPORTUNITIES, getCategories, getCountries, getRegions, getCategoryCounts } from './opportunities-data';

// Re-export the new database as the old name for backward compat
export const SEED_OPPORTUNITIES: Opportunity[] = GLOBAL_OPPORTUNITIES;

// Opportunity Graph Engine: Dynamic metadata populator
SEED_OPPORTUNITIES.forEach((opp) => {
  if (!opp.prestigeScore) opp.prestigeScore = opp.id.includes('gates') || opp.id.includes('fulbright') || opp.id.includes('rhodes') ? 95 : 82;
  if (!opp.difficulty) opp.difficulty = (opp.successProbability || 50) < 50 ? 'hard' : (opp.successProbability || 50) < 75 ? 'medium' : 'easy';
  if (!opp.competitionLevel) opp.competitionLevel = (opp.successProbability || 50) < 50 ? 'high' : (opp.successProbability || 50) < 75 ? 'medium' : 'low';
  if (!opp.officialSource) opp.officialSource = opp.url || 'https://www.google.com';
  if (!opp.careerValue) opp.careerValue = opp.fundingLevel?.toLowerCase().includes('full') ? '$220,000+' : '$55,000+';
  if (!opp.skillsRequired) opp.skillsRequired = opp.requirements?.slice(0, 3) || ['Academic Excellence', 'Language Proficiency', 'References'];
});

export const getOpportunitiesByType = (type: string) =>
  SEED_OPPORTUNITIES.filter(opp => opp.type === type);

export const getOpportunitiesByCountry = (country: string) =>
  SEED_OPPORTUNITIES.filter(opp =>
    opp.country.toLowerCase().includes(country.toLowerCase())
  );

export const getTopOpportunities = (limit = 6) =>
  [...SEED_OPPORTUNITIES]
    .sort((a, b) => (b.successProbability || 0) - (a.successProbability || 0))
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
