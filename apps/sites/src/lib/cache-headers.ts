/**
 * Cache headers middleware for public sites
 * Adds aggressive caching for static assets and appropriate caching for dynamic content
 */
import type { APIRoute } from 'astro';

/**
 * Cache control configuration by content type
 */
export const CACHE_CONFIG = {
  // Static assets - cache for 1 year (immutable)
  static: {
    'Cache-Control': 'public, max-age=31536000, immutable',
    'Vary': 'Accept-Encoding',
  },
  
  // Fonts - cache for 1 year
  fonts: {
    'Cache-Control': 'public, max-age=31536000, immutable',
    'Access-Control-Allow-Origin': '*',
  },
  
  // Images - cache for 1 week, stale-while-revalidate
  images: {
    'Cache-Control': 'public, max-age=604800, stale-while-revalidate=86400',
    'Vary': 'Accept-Encoding, Accept',
  },
  
  // HTML pages - cache for 1 hour, stale-while-revalidate
  html: {
    'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
    'Vary': 'Accept-Encoding',
  },
  
  // API responses - short cache
  api: {
    'Cache-Control': 'public, max-age=60, stale-while-revalidate=300',
    'Vary': 'Accept-Encoding, Accept',
  },
  
  // Sitemap/robots - cache for 1 day
  seo: {
    'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
  },
} as const;

/**
 * Security headers for all responses
 */
export const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'SAMEORIGIN',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
} as const;

/**
 * Performance headers
 */
export const PERFORMANCE_HEADERS = {
  // Enable early hints for faster resource loading
  'Link': '</fonts/inter-var.woff2>; rel=preload; as=font; type=font/woff2; crossorigin',
} as const;

/**
 * Get cache headers based on content type
 */
export function getCacheHeaders(contentType: string): Record<string, string> {
  if (contentType.includes('text/html')) {
    return { ...CACHE_CONFIG.html, ...SECURITY_HEADERS };
  }
  
  if (contentType.includes('image/')) {
    return { ...CACHE_CONFIG.images, ...SECURITY_HEADERS };
  }
  
  if (contentType.includes('font/') || contentType.includes('woff')) {
    return { ...CACHE_CONFIG.fonts };
  }
  
  if (contentType.includes('text/css') || contentType.includes('javascript')) {
    return { ...CACHE_CONFIG.static, ...SECURITY_HEADERS };
  }
  
  if (contentType.includes('xml') || contentType.includes('text/plain')) {
    return { ...CACHE_CONFIG.seo, ...SECURITY_HEADERS };
  }
  
  if (contentType.includes('json')) {
    return { ...CACHE_CONFIG.api, ...SECURITY_HEADERS };
  }
  
  return { ...SECURITY_HEADERS };
}

/**
 * Apply cache headers to response
 */
export function withCacheHeaders(response: Response, contentType?: string): Response {
  const headers = new Headers(response.headers);
  const type = contentType || headers.get('Content-Type') || 'text/html';
  
  const cacheHeaders = getCacheHeaders(type);
  
  for (const [key, value] of Object.entries(cacheHeaders)) {
    if (!headers.has(key)) {
      headers.set(key, value);
    }
  }
  
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
