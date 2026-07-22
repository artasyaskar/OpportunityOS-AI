import type { Opportunity } from '../gemini';
import { NormalizationService } from './NormalizationService';

// ============================================================
//  OPPORTUNITY DEDUPLICATION SERVICE
// ============================================================
// Single responsibility: detect and merge duplicate opportunities.
// Depends only on NormalizationService (Dependency Inversion) so the matching
// rules stay decoupled from how fields are canonicalized.
//
// Duplicate signals (any strong signal OR enough weak signals => duplicate):
//   1. Same normalized URL / domain path        (strong)
//   2. Same normalized provider + fuzzy title    (strong)
//   3. Same domain + similar title + same country (weak combo)

export interface DuplicateGroup {
  canonical: Opportunity;
  duplicates: Opportunity[];
  reason: string;
}

export interface DedupResult {
  unique: Opportunity[];
  groups: DuplicateGroup[];
  removedCount: number;
}

/** Token-set (Jaccard) similarity of two normalized strings, 0..1. */
function jaccardSimilarity(a: string, b: string): number {
  if (!a || !b) return 0;
  if (a === b) return 1;
  const setA = new Set(a.split(' ').filter(Boolean));
  const setB = new Set(b.split(' ').filter(Boolean));
  if (setA.size === 0 || setB.size === 0) return 0;
  let intersection = 0;
  setA.forEach(t => { if (setB.has(t)) intersection++; });
  const union = setA.size + setB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

export class DeduplicationService {
  /** Similarity threshold above which two titles are considered "the same". */
  static readonly TITLE_SIMILARITY_THRESHOLD = 0.72;

  /**
   * Decide whether two opportunities are duplicates and explain why.
   * Returns a reason string when duplicate, or null otherwise.
   */
  static duplicateReason(a: Opportunity, b: Opportunity): string | null {
    const na = NormalizationService.enrich(a);
    const nb = NormalizationService.enrich(b);

    // 1. Identical canonical URL (path-level) — strongest signal.
    const urlA = NormalizationService.normalizeUrl(a.url || a.officialSource);
    const urlB = NormalizationService.normalizeUrl(b.url || b.officialSource);
    if (urlA && urlB && urlA === urlB) {
      return 'identical official URL';
    }

    const titleSim = jaccardSimilarity(na._normTitle, nb._normTitle);

    // 2. Same provider + highly similar title.
    if (na._normProvider && na._normProvider === nb._normProvider &&
        titleSim >= this.TITLE_SIMILARITY_THRESHOLD) {
      return `same provider + similar title (${(titleSim * 100).toFixed(0)}%)`;
    }

    // 3. Same domain + similar title + same country (weak combo).
    if (na._normDomain && na._normDomain === nb._normDomain &&
        titleSim >= this.TITLE_SIMILARITY_THRESHOLD &&
        na._normCountry === nb._normCountry) {
      return `same domain + country + similar title (${(titleSim * 100).toFixed(0)}%)`;
    }

    return null;
  }

  /**
   * Choose which of two duplicate entries should be canonical.
   * Prefers: verified > fresher data > more complete > has funding number.
   */
  static pickCanonical(a: Opportunity, b: Opportunity): Opportunity {
    const score = (o: Opportunity): number => {
      let s = 0;
      if (o.verified) s += 4;
      if (o.verificationStatus === 'verified') s += 2;
      s += (o.dataFreshnessScore || 0) / 20;                 // 0..5
      s += o.requirements?.length ? 1 : 0;
      s += o.fundingAmount ? 1 : 0;
      s += o.description?.length ? Math.min(o.description.length / 200, 2) : 0;
      const lu = NormalizationService.normalizeDeadline(o.lastUpdatedDate);
      if (lu) s += lu.getTime() / 1e13;                       // tiny recency tie-break
      return s;
    };
    return score(a) >= score(b) ? a : b;
  }

  /**
   * Merge duplicate entries: keep the canonical, backfill any missing fields
   * from the duplicate so no real data is lost.
   */
  static merge(canonical: Opportunity, duplicate: Opportunity): Opportunity {
    const merged: Opportunity = { ...canonical };
    (Object.keys(duplicate) as (keyof Opportunity)[]).forEach(key => {
      const cur = merged[key];
      const dup = duplicate[key];
      const isEmpty = cur === undefined || cur === null || cur === '' ||
        (Array.isArray(cur) && cur.length === 0);
      if (isEmpty && dup !== undefined && dup !== null) {
        // @ts-expect-error — safe field-by-field backfill
        merged[key] = dup;
      }
    });
    return merged;
  }

  /**
   * Deduplicate a list of opportunities. O(n²) worst case but fine for the
   * seed-scale dataset; ingestion providers call this per-batch, not per-item.
   */
  static deduplicate(opportunities: Opportunity[]): DedupResult {
    const unique: Opportunity[] = [];
    const groups: DuplicateGroup[] = [];
    let removedCount = 0;

    for (const opp of opportunities) {
      let matchedIndex = -1;
      let reason = '';

      for (let i = 0; i < unique.length; i++) {
        const r = this.duplicateReason(unique[i], opp);
        if (r) { matchedIndex = i; reason = r; break; }
      }

      if (matchedIndex === -1) {
        unique.push(opp);
      } else {
        const existing = unique[matchedIndex];
        const canonical = this.pickCanonical(existing, opp);
        const duplicate = canonical === existing ? opp : existing;
        unique[matchedIndex] = this.merge(canonical, duplicate);
        removedCount++;

        const group = groups.find(g => g.canonical.id === existing.id || g.canonical.id === opp.id);
        if (group) {
          group.duplicates.push(duplicate);
        } else {
          groups.push({ canonical: unique[matchedIndex], duplicates: [duplicate], reason });
        }
      }
    }

    return { unique, groups, removedCount };
  }

  /**
   * Guard used on ingest: returns the existing match if `candidate` duplicates
   * anything already in `existing`, else null (safe to insert).
   */
  static findExisting(candidate: Opportunity, existing: Opportunity[]): Opportunity | null {
    for (const e of existing) {
      if (this.duplicateReason(e, candidate)) return e;
    }
    return null;
  }
}
