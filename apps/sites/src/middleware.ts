/**
 * Middleware for Astro - Adds caching headers and performance optimizations
 */
import { defineMiddleware } from 'astro:middleware';
import { getCacheHeaders, SECURITY_HEADERS, PERFORMANCE_HEADERS } from './lib/cache-headers';

export const onRequest = defineMiddleware(async (context, next) => {
  const response = await next();
  
  // Clone headers to modify
  const headers = new Headers(response.headers);
  
  // Get content type
  const contentType = headers.get('Content-Type') || 'text/html';
  
  // Add cache headers based on content type
  const cacheHeaders = getCacheHeaders(contentType);
  for (const [key, value] of Object.entries(cacheHeaders)) {
    if (!headers.has(key)) {
      headers.set(key, value);
    }
  }
  
  // Add security headers
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    if (!headers.has(key)) {
      headers.set(key, value);
    }
  }
  
  // Add ETag for caching validation (based on content hash would be ideal)
  // For now, use weak ETag based on URL and timestamp
  const url = context.url.pathname;
  const isHtml = contentType.includes('text/html');
  
  if (isHtml && !headers.has('ETag')) {
    // Use weak ETag for HTML (allows compression)
    const etag = `W/"${Buffer.from(url).toString('base64').slice(0, 16)}"`;
    headers.set('ETag', etag);
  }
  
  // Add Server-Timing header for performance debugging
  const serverTiming = `cdn-cache;desc="miss"`;
  headers.set('Server-Timing', serverTiming);
  
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
});
