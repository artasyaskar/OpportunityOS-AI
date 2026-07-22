import { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/seo';
import {
  allPublicOpportunities,
  categoryFacets,
  countryFacets,
} from '@/lib/catalog';

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  // Static marketing / legal pages
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: SITE_URL, changeFrequency: 'daily', priority: 1 },
    { url: `${SITE_URL}/opportunities`, changeFrequency: 'daily', priority: 0.9 },
    { url: `${SITE_URL}/about`, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${SITE_URL}/pricing`, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${SITE_URL}/faq`, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${SITE_URL}/signup`, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${SITE_URL}/login`, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${SITE_URL}/privacy`, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${SITE_URL}/terms`, changeFrequency: 'yearly', priority: 0.3 },
  ].map((r) => ({ ...r, lastModified: now }));

  // Programmatic category & country hub pages
  const categoryRoutes: MetadataRoute.Sitemap = categoryFacets().map((f) => ({
    url: `${SITE_URL}/opportunities/category/${f.slug}`,
    lastModified: now,
    changeFrequency: 'weekly',
    priority: 0.8,
  }));

  const countryRoutes: MetadataRoute.Sitemap = countryFacets().map((f) => ({
    url: `${SITE_URL}/opportunities/country/${f.slug}`,
    lastModified: now,
    changeFrequency: 'weekly',
    priority: 0.7,
  }));

  // Individual opportunity detail pages
  const opportunityRoutes: MetadataRoute.Sitemap = allPublicOpportunities().map((o) => ({
    url: `${SITE_URL}/opportunities/${o.id}`,
    lastModified: o.lastUpdatedDate ? new Date(o.lastUpdatedDate) : now,
    changeFrequency: 'weekly',
    priority: 0.6,
  }));

  return [...staticRoutes, ...categoryRoutes, ...countryRoutes, ...opportunityRoutes];
}
