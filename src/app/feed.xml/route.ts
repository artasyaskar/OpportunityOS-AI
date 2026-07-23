import { GLOBAL_OPPORTUNITIES } from '@/lib/opportunities-data';
import { SITE_URL, SITE_NAME, DEFAULT_DESCRIPTION } from '@/lib/seo';

export async function GET() {
  const sortedOpps = [...GLOBAL_OPPORTUNITIES].sort((a, b) => new Date(b.lastUpdatedDate || 0).getTime() - new Date(a.lastUpdatedDate || 0).getTime()).slice(0, 50);
  
  const rss = `<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0">
<channel>
  <title>${SITE_NAME} Opportunities</title>
  <link>${SITE_URL}</link>
  <description>${DEFAULT_DESCRIPTION}</description>
  <language>en-us</language>
  ${sortedOpps.map(opp => `<item>
    <title>${opp.title.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</title>
    <link>${SITE_URL}/opportunities/${opp.id}</link>
    <description>${opp.description.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</description>
    <pubDate>${new Date(opp.lastUpdatedDate || Date.now()).toUTCString()}</pubDate>
  </item>`).join('\n  ')}
</channel>
</rss>`;

  return new Response(rss, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
}
