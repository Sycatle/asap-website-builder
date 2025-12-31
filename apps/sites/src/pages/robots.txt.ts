/**
 * Dynamic robots.txt generator for each public site
 * Allows search engines to index published sites while blocking drafts
 */
import type { APIRoute } from 'astro';

export const GET: APIRoute = async ({ request }) => {
  const url = new URL(request.url);
  const host = url.hostname;
  
  // Extract site slug from subdomain (e.g., "mysite.asap.cool" -> "mysite")
  const subdomain = host.split('.')[0];
  const isSubdomain = host.includes('.asap.cool') && subdomain !== 'www' && subdomain !== 'asap';
  
  // Base URL for sitemap
  const siteUrl = isSubdomain 
    ? `https://${subdomain}.asap.cool`
    : `https://${host}`;

  const robotsTxt = `# robots.txt for ${siteUrl}
# Generated dynamically by ASAP

User-agent: *
Allow: /

# Sitemap location
Sitemap: ${siteUrl}/sitemap.xml

# Crawl-delay for politeness
Crawl-delay: 1

# Disallow admin/api paths if accessed directly
Disallow: /api/
Disallow: /_astro/

# Allow all public content
Allow: /*.css
Allow: /*.js
Allow: /*.png
Allow: /*.jpg
Allow: /*.jpeg
Allow: /*.gif
Allow: /*.webp
Allow: /*.svg
Allow: /*.woff2

# Google specific
User-agent: Googlebot
Allow: /
Crawl-delay: 0

# Bing specific
User-agent: Bingbot
Allow: /
Crawl-delay: 1
`;

  return new Response(robotsTxt, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=86400',
      'X-Robots-Tag': 'noindex', // Don't index the robots.txt itself
    },
  });
};
