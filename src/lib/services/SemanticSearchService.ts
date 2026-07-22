import type { Opportunity } from '../gemini';
import { NormalizationService } from './NormalizationService';

// ============================================================
//  SEMANTIC / NATURAL-LANGUAGE SEARCH SERVICE
// ============================================================
// Turns a free-text query like:
//   "fully funded AI scholarships in Germany closing this month"
//   "remote internships for students under 25"
//   "startup grants over $50k"
// into a STRUCTURED intent, then scores/filters the corpus deterministically.
//
// This is NOT an LLM. It's a transparent, explainable parser so results can
// never be hallucinated — every match is traceable to a real field. An LLM
// layer (aiRouter) can sit above this later for phrasing, but the ground truth
// stays here.

export interface ParsedQuery {
  rawQuery: string;
  keywords: string[];
  categories: string[];
  countries: string[];
  fields: string[];             // e.g. "ai", "computer science", "climate"
  fundingIntent: 'fully-funded' | 'paid' | 'any';
  minFunding?: number;
  remoteOnly?: boolean;
  deadlineWithinDays?: number;
  maxAge?: number;
  educationLevels: string[];
}

export interface SemanticSearchResult {
  opportunity: Opportunity;
  score: number;                // 0..100 relevance
  matchReasons: string[];       // explainable — why this matched
}

// --- Lexicons (extendable, kept transparent) ---

const CATEGORY_LEXICON: Record<string, string[]> = {
  Scholarships: ['scholarship', 'scholarships', 'tuition', 'study abroad'],
  Fellowships: ['fellowship', 'fellowships', 'fellow'],
  Grants: ['grant', 'grants', 'funding award', 'research funding'],
  'Research Programs': ['research', 'phd position', 'doctoral', 'postdoc', 'lab'],
  Internships: ['internship', 'internships', 'intern'],
  'Remote Jobs': ['remote job', 'remote work', 'work from home', 'distributed job'],
  Hackathons: ['hackathon', 'hack', 'hackathons'],
  Competitions: ['competition', 'contest', 'pitch competition', 'challenge award'],
  Accelerators: ['accelerator', 'accelerators', 'demo day'],
  Incubators: ['incubator', 'incubators'],
  'AI Challenges': ['ai challenge', 'ml challenge', 'kaggle', 'data science competition'],
  'Climate Programs': ['climate', 'sustainability', 'green', 'environment'],
  'Innovation Programs': ['innovation', 'xprize', 'grand challenge'],
  'Entrepreneurship Programs': ['entrepreneurship', 'startup program', 'founder program'],
  'Government Funding': ['government scholarship', 'government funding', 'state scholarship'],
  'NGO Opportunities': ['ngo', 'nonprofit', 'un ', 'united nations'],
  'Volunteer Programs': ['volunteer', 'volunteering', 'service program'],
  Conferences: ['conference', 'summit', 'symposium'],
  Workshops: ['workshop', 'training', 'bootcamp course'],
  Bootcamps: ['bootcamp', 'summer school', 'retreat'],
  'Exchange Programs': ['exchange', 'study exchange', 'mobility'],
  'Graduate Programs': ['graduate program', 'grad program', 'graduate job'],
};

const FIELD_LEXICON = [
  'ai', 'artificial intelligence', 'machine learning', 'ml', 'data science',
  'computer science', 'cs', 'software', 'engineering', 'robotics', 'biology',
  'medicine', 'health', 'climate', 'environment', 'business', 'finance',
  'economics', 'law', 'design', 'physics', 'chemistry', 'mathematics',
  'blockchain', 'web3', 'cybersecurity', 'stem', 'social impact', 'policy',
];

// country name / alias → canonical country as it appears in the dataset
const COUNTRY_LEXICON: Record<string, string> = {
  germany: 'Germany', uk: 'United Kingdom', 'united kingdom': 'United Kingdom',
  britain: 'United Kingdom', england: 'United Kingdom', usa: 'United States',
  us: 'United States', america: 'United States', 'united states': 'United States',
  canada: 'Canada', australia: 'Australia', france: 'France', china: 'China',
  japan: 'Japan', korea: 'South Korea', 'south korea': 'South Korea',
  singapore: 'Singapore', switzerland: 'Switzerland', netherlands: 'Netherlands',
  italy: 'Italy', turkey: 'Turkey', india: 'India', chile: 'Chile',
  belgium: 'Belgium', hungary: 'Hungary', 'new zealand': 'New Zealand',
  'saudi arabia': 'Saudi Arabia', global: 'Global', europe: 'Europe',
};

const EDUCATION_LEXICON: Record<string, string[]> = {
  undergraduate: ['undergraduate', 'undergrad', 'bachelor', 'bachelors', 'college'],
  masters: ['masters', 'master', 'msc', 'graduate', 'postgraduate'],
  phd: ['phd', 'doctoral', 'doctorate'],
  postdoc: ['postdoc', 'postdoctoral'],
};

export class SemanticSearchService {
  /**
   * Parse a natural-language query into a structured intent.
   * Deterministic, explainable, no external calls.
   */
  static parseQuery(rawQuery: string): ParsedQuery {
    const q = NormalizationService.normalizeText(rawQuery);
    const tokens = q.split(' ').filter(Boolean);

    // Funding intent
    let fundingIntent: ParsedQuery['fundingIntent'] = 'any';
    if (/(fully funded|full funding|fully-funded|100% funded)/.test(q)) fundingIntent = 'fully-funded';
    else if (/(paid|stipend|salary|funded|scholarship)/.test(q)) fundingIntent = 'paid';

    // Min funding e.g. "over $50k", "under 25" handled separately for age
    let minFunding: number | undefined;
    const fundingMatch = q.match(/(?:over|above|more than|at least|min(?:imum)?)\s*\$?\s*([\d,.]+)\s*(k|thousand|m|million)?/);
    if (fundingMatch) {
      let val = parseFloat(fundingMatch[1].replace(/,/g, ''));
      const unit = fundingMatch[2];
      if (unit === 'k' || unit === 'thousand') val *= 1000;
      if (unit === 'm' || unit === 'million') val *= 1000000;
      if (!isNaN(val)) minFunding = val;
    }

    // Age constraint e.g. "under 25", "under age 25"
    let maxAge: number | undefined;
    const ageMatch = q.match(/under (?:age )?(\d{2})/);
    if (ageMatch) maxAge = parseInt(ageMatch[1], 10);

    // Remote
    const remoteOnly = /(remote|work from home|virtual|online)/.test(q) || undefined;

    // Deadline urgency
    let deadlineWithinDays: number | undefined;
    if (/(closing|closes|deadline|ending|expiring)/.test(q) || /(this week|this month|soon|urgent)/.test(q)) {
      if (/this week/.test(q)) deadlineWithinDays = 7;
      else if (/this month/.test(q)) deadlineWithinDays = 31;
      else if (/soon|urgent|closing/.test(q)) deadlineWithinDays = 30;
      const dayMatch = q.match(/(?:within|next|in)\s*(\d+)\s*days?/);
      if (dayMatch) deadlineWithinDays = parseInt(dayMatch[1], 10);
    }

    // Categories
    const categories: string[] = [];
    for (const [cat, syns] of Object.entries(CATEGORY_LEXICON)) {
      if (syns.some(s => q.includes(s))) categories.push(cat);
    }

    // Fields
    const fields = FIELD_LEXICON.filter(f => q.includes(f));

    // Countries
    const countries: string[] = [];
    for (const [alias, canonical] of Object.entries(COUNTRY_LEXICON)) {
      // word-boundary-ish check to avoid "us" matching inside "business"
      const re = new RegExp(`(^|\\s)${alias}($|\\s)`);
      if (re.test(q) && !countries.includes(canonical)) countries.push(canonical);
    }

    // Education levels
    const educationLevels: string[] = [];
    for (const [level, syns] of Object.entries(EDUCATION_LEXICON)) {
      if (syns.some(s => q.includes(s))) educationLevels.push(level);
    }

    // Residual keywords (strip stop/structural words already captured)
    const stop = new Set([
      'i', 'want', 'find', 'show', 'me', 'a', 'an', 'the', 'in', 'for', 'with',
      'and', 'or', 'of', 'to', 'that', 'are', 'is', 'under', 'over', 'this',
      'closing', 'fully', 'funded', 'remote', 'get', 'looking', 'need', 'all',
    ]);
    const keywords = tokens.filter(t => t.length > 2 && !stop.has(t));

    return {
      rawQuery, keywords, categories, countries, fields,
      fundingIntent, minFunding, remoteOnly, deadlineWithinDays, maxAge, educationLevels,
    };
  }

  /**
   * Score a single opportunity against a parsed query. Returns 0 when it fails
   * a HARD filter (country/category/remote explicitly requested but not met).
   */
  static scoreOpportunity(opp: Opportunity, parsed: ParsedQuery, now: Date): SemanticSearchResult {
    const reasons: string[] = [];
    let score = 0;
    const enriched = NormalizationService.enrich(opp);
    const haystack = NormalizationService.normalizeText(
      `${opp.title} ${opp.provider} ${opp.description} ${(opp.tags || []).join(' ')} ${(opp.requiredSkills || []).join(' ')}`
    );

    // --- HARD filters (explicit intent must be satisfied) ---
    if (parsed.categories.length > 0) {
      if (!parsed.categories.includes(opp.type as string)) return { opportunity: opp, score: 0, matchReasons: [] };
      score += 30; reasons.push(`Category: ${opp.type}`);
    }

    if (parsed.countries.length > 0) {
      const oppCountry = NormalizationService.normalizeCountry(opp.country);
      const wanted = parsed.countries.map(c => NormalizationService.normalizeCountry(c));
      const isGlobal = oppCountry === 'global' || (opp.region || '').toLowerCase() === 'global';
      if (!wanted.includes(oppCountry) && !(wanted.includes('europe') && (opp.region || '').toLowerCase() === 'europe') && !isGlobal) {
        return { opportunity: opp, score: 0, matchReasons: [] };
      }
      score += 25; reasons.push(`Location: ${opp.country}`);
    }

    if (parsed.remoteOnly) {
      if (opp.remote !== true) return { opportunity: opp, score: 0, matchReasons: [] };
      score += 15; reasons.push('Remote-friendly');
    }

    // --- Funding intent ---
    if (parsed.fundingIntent === 'fully-funded') {
      const isFull = (opp.fundingLevel || '').toLowerCase().includes('full') || enriched._fundingValue >= 40000;
      if (!isFull) return { opportunity: opp, score: 0, matchReasons: [] };
      score += 20; reasons.push('Fully funded');
    } else if (parsed.fundingIntent === 'paid') {
      if (enriched._fundingValue > 0 || /(stipend|salary|paid|funded)/i.test(opp.fundingLevel || '')) {
        score += 10; reasons.push('Funded / paid');
      }
    }

    if (parsed.minFunding !== undefined) {
      if (enriched._fundingValue < parsed.minFunding) return { opportunity: opp, score: 0, matchReasons: [] };
      score += 10; reasons.push(`Funding ≥ ${parsed.minFunding.toLocaleString()}`);
    }

    // --- Deadline urgency ---
    if (parsed.deadlineWithinDays !== undefined) {
      const deadline = NormalizationService.normalizeDeadline(opp.deadline);
      if (!deadline) return { opportunity: opp, score: 0, matchReasons: [] };
      const days = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      if (days < 0 || days > parsed.deadlineWithinDays) return { opportunity: opp, score: 0, matchReasons: [] };
      score += 20; reasons.push(`Closes in ${days} day${days === 1 ? '' : 's'}`);
    }

    // --- Age constraint (best-effort from requirements text) ---
    if (parsed.maxAge !== undefined) {
      const reqText = (opp.requirements || []).join(' ').toLowerCase();
      const ageInReq = reqText.match(/(?:under|age|aged)\s*(\d{2})/);
      if (ageInReq && parseInt(ageInReq[1], 10) <= parsed.maxAge + 5) {
        score += 8; reasons.push(`Age-eligible (${parsed.maxAge})`);
      }
    }

    // --- Education level ---
    if (parsed.educationLevels.length > 0) {
      const oppLevels = (opp.educationLevel || []).map(l => l.toLowerCase());
      if (parsed.educationLevels.some(l => oppLevels.includes(l))) {
        score += 12; reasons.push(`Level: ${parsed.educationLevels.join('/')}`);
      }
    }

    // --- Field / topic relevance ---
    if (parsed.fields.length > 0) {
      const hit = parsed.fields.filter(f => haystack.includes(f));
      if (hit.length > 0) { score += 15 * hit.length; reasons.push(`Topic: ${hit.join(', ')}`); }
    }

    // --- Free keyword relevance (soft) ---
    if (parsed.keywords.length > 0) {
      const hits = parsed.keywords.filter(k => haystack.includes(k));
      if (hits.length > 0) {
        score += Math.min(20, hits.length * 6);
        reasons.push(`Matches: ${hits.slice(0, 4).join(', ')}`);
      }
    }

    // Small freshness/prestige nudge so ties resolve sensibly.
    score += (opp.dataFreshnessScore || 0) / 50;
    score += (opp.prestigeScore || 0) / 50;

    return { opportunity: opp, score: Math.round(score), matchReasons: reasons };
  }

  /**
   * Full semantic search over a corpus. Returns ranked, explainable results.
   * If the query has no extractable structure, falls back to keyword scoring so
   * a bare word still returns sensible results.
   */
  static search(rawQuery: string, corpus: Opportunity[], now: Date = new Date()): SemanticSearchResult[] {
    const parsed = this.parseQuery(rawQuery);

    const hasStructure =
      parsed.categories.length || parsed.countries.length || parsed.fields.length ||
      parsed.fundingIntent !== 'any' || parsed.remoteOnly || parsed.deadlineWithinDays !== undefined ||
      parsed.minFunding !== undefined || parsed.educationLevels.length;

    const results = corpus
      .map(opp => this.scoreOpportunity(opp, parsed, now))
      .filter(r => r.score > 0)
      .sort((a, b) => b.score - a.score);

    // Fallback: if structured search found nothing but user typed something,
    // do a lenient keyword contains-match so we never show an empty screen for
    // a valid keyword.
    if (results.length === 0 && !hasStructure && parsed.keywords.length > 0) {
      return corpus
        .filter(opp => {
          const hay = NormalizationService.normalizeText(`${opp.title} ${opp.provider} ${opp.description} ${(opp.tags || []).join(' ')}`);
          return parsed.keywords.some(k => hay.includes(k));
        })
        .map(opp => ({ opportunity: opp, score: 50, matchReasons: ['Keyword match'] }));
    }

    return results;
  }
}
