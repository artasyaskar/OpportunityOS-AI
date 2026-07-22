// ============================================================
//  Public catalog helpers (SEO / programmatic pages)
// ============================================================
// Server-side, read-only accessors over the real seed dataset used to
// build public, indexable pages. Slug-based lookups keep URLs stable
// and human-readable. No fabricated data — everything derives from
// GLOBAL_OPPORTUNITIES.

import { GLOBAL_OPPORTUNITIES } from './opportunities-data';
import type { Opportunity } from './gemini';
import { toSlug } from './seo';

export type { Opportunity };

/** All opportunities that are safe to expose publicly (verified/real). */
export function allPublicOpportunities(): Opportunity[] {
  return GLOBAL_OPPORTUNITIES;
}

export function getOpportunityBySlug(slug: string): Opportunity | undefined {
  return GLOBAL_OPPORTUNITIES.find((o) => o.id === slug);
}

// ---- Category (type) facets ----
export interface Facet {
  slug: string;
  label: string;
  count: number;
}

export function categoryFacets(): Facet[] {
  const map = new Map<string, { label: string; count: number }>();
  for (const o of GLOBAL_OPPORTUNITIES) {
    const label = String(o.type);
    const slug = toSlug(label);
    const cur = map.get(slug) || { label, count: 0 };
    cur.count += 1;
    map.set(slug, cur);
  }
  return [...map.entries()]
    .map(([slug, v]) => ({ slug, ...v }))
    .sort((a, b) => b.count - a.count);
}

export function countryFacets(): Facet[] {
  const map = new Map<string, { label: string; count: number }>();
  for (const o of GLOBAL_OPPORTUNITIES) {
    if (!o.country) continue;
    const label = o.country;
    const slug = toSlug(label);
    const cur = map.get(slug) || { label, count: 0 };
    cur.count += 1;
    map.set(slug, cur);
  }
  return [...map.entries()]
    .map(([slug, v]) => ({ slug, ...v }))
    .sort((a, b) => b.count - a.count);
}

export function opportunitiesByCategorySlug(slug: string): Opportunity[] {
  return GLOBAL_OPPORTUNITIES.filter((o) => toSlug(String(o.type)) === slug);
}

export function opportunitiesByCountrySlug(slug: string): Opportunity[] {
  return GLOBAL_OPPORTUNITIES.filter((o) => o.country && toSlug(o.country) === slug);
}

export function facetLabel(facets: Facet[], slug: string): string | undefined {
  return facets.find((f) => f.slug === slug)?.label;
}

/** Related opportunities: same type first, then same country. Excludes self. */
export function relatedOpportunities(opp: Opportunity, limit = 6): Opportunity[] {
  const others = GLOBAL_OPPORTUNITIES.filter((o) => o.id !== opp.id);
  const sameType = others.filter((o) => o.type === opp.type);
  const sameCountry = others.filter((o) => o.type !== opp.type && o.country === opp.country);
  return [...sameType, ...sameCountry].slice(0, limit);
}

/** Simple public text search over indexable fields. */
export function searchPublic(query: string): Opportunity[] {
  const q = query.toLowerCase().trim();
  if (!q) return GLOBAL_OPPORTUNITIES;
  return GLOBAL_OPPORTUNITIES.filter(
    (o) =>
      o.title.toLowerCase().includes(q) ||
      o.provider.toLowerCase().includes(q) ||
      o.description.toLowerCase().includes(q) ||
      o.country.toLowerCase().includes(q) ||
      o.tags?.some((t) => t.toLowerCase().includes(q))
  );
}
