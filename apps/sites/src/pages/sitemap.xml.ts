/**
 * Dynamic sitemap.xml generator for each public site
 * Generates a proper XML sitemap with all published pages
 */
import type { APIRoute } from 'astro';
import { getSiteRenderPayload } from '@/lib/site-data';

const API_URL = import.meta.env.INTERNAL_API_URL || import.meta.env.PUBLIC_API_URL || 'http://localhost:3000/api';

export const GET: APIRoute = async ({ request }) => {
  const url = new URL(request.url);
  const host = url.hostname;
  
  // Extract site slug from subdomain
  const subdomain = host.split('.')[0];
  const isSubdomain = host.includes('.asap.cool') && subdomain !== 'www' && subdomain !== 'asap';
  
  // If not a subdomain, try to get slug from path or return empty sitemap
  let siteSlug = isSubdomain ? subdomain : null;
  
  // For non-subdomain access, we can't determine the site
  if (!siteSlug) {
    // Try to extract from referer or return minimal sitemap
    const referer = request.headers.get('referer');
    if (referer) {
      const refUrl = new URL(referer);
      const refSubdomain = refUrl.hostname.split('.')[0];
      if (refUrl.hostname.includes('.asap.cool')) {
        siteSlug = refSubdomain;
      }
    }
  }

  const siteUrl = isSubdomain 
    ? `https://${subdomain}.asap.cool`
    : `https://${host}`;

  // Get site data
  const payload = siteSlug ? await getSiteRenderPayload(siteSlug) : null;

  if (!payload || payload.website.status !== 'published') {
    // Return empty sitemap for unpublished sites
    return new Response(generateEmptySitemap(), {
      status: 200,
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  }

  const { website, pages } = payload;
  const lastMod = website.updated_at || website.created_at || new Date().toISOString();

  // Build sitemap entries
  const urls: SitemapUrl[] = [];

  // Homepage
  urls.push({
    loc: siteUrl,
    lastmod: lastMod.split('T')[0],
    changefreq: 'weekly',
    priority: 1.0,
  });

  // All visible pages
  const visiblePages = pages.filter(p => p.visible !== false && !p.is_homepage);
  for (const page of visiblePages) {
    urls.push({
      loc: `${siteUrl}/${page.slug}`,
      lastmod: lastMod.split('T')[0],
      changefreq: 'weekly',
      priority: 0.8,
    });
  }

  const sitemap = generateSitemap(urls);

  return new Response(sitemap, {
    status: 200,
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=86400',
    },
  });
};

interface SitemapUrl {
  loc: string;
  lastmod?: string;
  changefreq?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
  priority?: number;
}

function generateSitemap(urls: SitemapUrl[]): string {
  const urlEntries = urls.map(url => `
  <url>
    <loc>${escapeXml(url.loc)}</loc>
    ${url.lastmod ? `<lastmod>${url.lastmod}</lastmod>` : ''}
    ${url.changefreq ? `<changefreq>${url.changefreq}</changefreq>` : ''}
    ${url.priority !== undefined ? `<priority>${url.priority.toFixed(1)}</priority>` : ''}
  </url>`).join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
        xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9
        http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">
${urlEntries}
</urlset>`;
}

function generateEmptySitemap(): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
</urlset>`;
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
