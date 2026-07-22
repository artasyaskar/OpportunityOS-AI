import type { Opportunity } from '../gemini';

// ============================================================
//  OPPORTUNITY NORMALIZATION SERVICE
// ============================================================
// Single responsibility: turn messy/varied opportunity fields into a
// canonical form so they can be compared, deduplicated, and ranked reliably.
// Pure functions only — no I/O, no side effects. This is the foundation the
// DeduplicationService and future ingestion providers build on.

/** Common legal/organizational suffixes and noise words to strip from org names. */
const ORG_NOISE = [
  'inc', 'incorporated', 'llc', 'ltd', 'limited', 'gmbh', 'foundation',
  'the', 'group', 'corp', 'corporation', 'co', 'company', 'org', 'organization',
  'university of', 'university', 'college', 'institute', 'programme', 'program',
];

/** Known provider aliases → canonical name. Extend as new sources are ingested. */
const PROVIDER_ALIASES: Record<string, string> = {
  'daad': 'german academic exchange service',
  'german academic exchange service (daad)': 'german academic exchange service',
  'fcdo': 'uk government',
  'uk government (fcdo)': 'uk government',
  'us department of state': 'u.s. department of state',
  'u.s. department of state': 'u.s. department of state',
  'google llc': 'google',
  'google inc': 'google',
  'alphabet': 'google',
  'meta platforms': 'meta',
  'facebook': 'meta',
  'aws': 'amazon web services',
  'amazon web services': 'amazon web services',
  'yc': 'y combinator',
};

export class NormalizationService {
  /** Lowercase, trim, collapse whitespace, strip diacritics. */
  static normalizeText(value?: string | null): string {
    if (!value) return '';
    return value
      .normalize('NFKD')
      .replace(/[̀-ͯ]/g, '') // strip accents
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')    // punctuation → space
      .replace(/\s+/g, ' ')
      .trim();
  }

  /** Canonicalize an organization/provider name for comparison. */
  static normalizeOrganization(provider?: string | null): string {
    const base = this.normalizeText(provider);
    if (!base) return '';

    // Resolve known aliases first (on the raw-normalized string).
    if (PROVIDER_ALIASES[base]) return PROVIDER_ALIASES[base];

    // Otherwise strip noise words token-by-token.
    const tokens = base.split(' ').filter(t => t && !ORG_NOISE.includes(t));
    const cleaned = tokens.join(' ').trim();
    return PROVIDER_ALIASES[cleaned] || cleaned || base;
  }

  /** Normalize a title (used for fuzzy dedup); strips years and edition noise. */
  static normalizeTitle(title?: string | null): string {
    return this.normalizeText(title)
      .replace(/\b(19|20)\d{2}\b/g, '')          // remove years e.g. 2027
      .replace(/\b\d{4}\s*\d{4}\b/g, '')         // remove ranges e.g. 2027 2028
      .replace(/\b(edition|cohort|batch|round|intake|programme|program)\b/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /** Canonicalize a URL: lowercase host, strip protocol, www, trailing slash, query/hash. */
  static normalizeUrl(url?: string | null): string {
    if (!url) return '';
    try {
      const withProto = /^https?:\/\//i.test(url) ? url : `https://${url}`;
      const u = new URL(withProto);
      const host = u.hostname.replace(/^www\./i, '').toLowerCase();
      const path = u.pathname.replace(/\/+$/, '').toLowerCase();
      return `${host}${path}`;
    } catch {
      // Fallback for malformed URLs — best-effort string cleanup.
      return url
        .replace(/^https?:\/\//i, '')
        .replace(/^www\./i, '')
        .replace(/[?#].*$/, '')
        .replace(/\/+$/, '')
        .toLowerCase()
        .trim();
    }
  }

  /** Extract the registrable-ish domain from a URL (host without path). */
  static normalizeDomain(url?: string | null): string {
    const normalized = this.normalizeUrl(url);
    return normalized.split('/')[0] || '';
  }

  /** Canonicalize a country string to a comparable token. */
  static normalizeCountry(country?: string | null): string {
    const base = this.normalizeText(country);
    const map: Record<string, string> = {
      'usa': 'united states', 'us': 'united states', 'america': 'united states',
      'uk': 'united kingdom', 'britain': 'united kingdom', 'great britain': 'united kingdom',
      'uae': 'united arab emirates', 'korea': 'south korea', 'russia': 'russian federation',
    };
    return map[base] || base;
  }

  /** Parse a deadline string into a Date (or null if invalid). */
  static normalizeDeadline(deadline?: string | null): Date | null {
    if (!deadline) return null;
    const d = new Date(deadline);
    return isNaN(d.getTime()) ? null : d;
  }

  /**
   * Parse a funding value into a comparable number.
   * Accepts a numeric amount or free-text like "€1,400/month" / "Full Funding".
   */
  static normalizeFunding(opp: Pick<Opportunity, 'fundingAmount' | 'fundingLevel'>): number {
    if (typeof opp.fundingAmount === 'number' && opp.fundingAmount > 0) {
      return opp.fundingAmount;
    }
    const text = opp.fundingLevel || '';
    const match = text.replace(/,/g, '').match(/\d+(\.\d+)?/);
    return match ? parseFloat(match[0]) : 0;
  }

  /**
   * Produce a stable, normalized copy of an opportunity with canonical helper
   * fields attached (never mutates the original). Used by dedup + ranking.
   */
  static enrich(opp: Opportunity): Opportunity & {
    _normProvider: string;
    _normTitle: string;
    _normDomain: string;
    _normCountry: string;
    _fundingValue: number;
  } {
    return {
      ...opp,
      _normProvider: this.normalizeOrganization(opp.provider),
      _normTitle: this.normalizeTitle(opp.title),
      _normDomain: this.normalizeDomain(opp.url || opp.officialSource),
      _normCountry: this.normalizeCountry(opp.country),
      _fundingValue: this.normalizeFunding(opp),
    };
  }
}
