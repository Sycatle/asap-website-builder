import { defineMiddleware } from 'astro/middleware';

/**
 * Security middleware for MVP
 * Adds essential security headers to all responses
 */
export const onRequest = defineMiddleware(async (context, next) => {
  const response = await next();
  
  // Get the API URL for CSP connect-src directive
  const apiUrl = import.meta.env.PUBLIC_API_URL || 'http://localhost:3000/api';
  // Extract the origin (protocol + host) for CSP - CSP needs the origin, not paths
  const apiOrigin = new URL(apiUrl).origin;
  const apiHost = new URL(apiUrl).host;
  
  // Security headers
  const securityHeaders: Record<string, string> = {
    // Prevent clickjacking
    'X-Frame-Options': 'DENY',
    
    // Prevent MIME type sniffing
    'X-Content-Type-Options': 'nosniff',
    
    // Enable XSS filter (legacy browsers)
    'X-XSS-Protection': '1; mode=block',
    
    // Referrer policy - send origin only for cross-origin requests
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    
    // Permissions policy - disable unused features
    'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
    
    // Content Security Policy
    // Note: 'unsafe-inline' required for Astro's hydration scripts
    // Note: 'unsafe-eval' may be needed for some React features in dev
    'Content-Security-Policy': [
      // Default: only same origin
      "default-src 'self'",
      // Scripts: self + inline for Astro hydration
      "script-src 'self' 'unsafe-inline'",
      // Styles: self + inline for Tailwind
      "style-src 'self' 'unsafe-inline'",
      // Images: self + data URIs + API (for file uploads) + known CDNs
      `img-src 'self' data: blob: ${apiOrigin} https://avatars.githubusercontent.com https://images.unsplash.com`,
      // Fonts: self + Google Fonts
      "font-src 'self' https://fonts.gstatic.com",
      // Connect: self + API origin + WebSocket
      `connect-src 'self' ${apiOrigin} wss://${apiHost} ws://localhost:*`,
      // Frame ancestors: none (anti-clickjacking)
      "frame-ancestors 'none'",
      // Form submissions: self only
      "form-action 'self'",
      // Base URI: self only
      "base-uri 'self'",
      // Upgrade insecure requests in production
      import.meta.env.PROD ? "upgrade-insecure-requests" : "",
    ].filter(Boolean).join('; '),
  };
  
  // Apply headers to the response
  Object.entries(securityHeaders).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  
  return response;
});
