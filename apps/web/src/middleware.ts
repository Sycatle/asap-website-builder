import { defineMiddleware } from 'astro/middleware';

/**
 * Routes that don't require authentication
 */
const PUBLIC_ROUTES = [
  '/',           // Landing page
  '/pricing',    // Pricing page
  '/health',     // Health check
];

/**
 * Check if a route is public (doesn't require auth)
 */
function isPublicRoute(pathname: string): boolean {
  // Check exact matches
  if (PUBLIC_ROUTES.includes(pathname)) {
    return true;
  }
  // API routes are handled by the API server
  if (pathname.startsWith('/api/')) {
    return true;
  }
  // Static assets
  if (pathname.startsWith('/_astro/') || pathname.startsWith('/assets/')) {
    return true;
  }
  return false;
}

/**
 * Get the accounts app URL for redirects
 */
function getAccountsUrl(path: string = '/'): string {
  const accountsBaseUrl = import.meta.env.PUBLIC_ACCOUNTS_URL || 'http://localhost:4323';
  return `${accountsBaseUrl}${path}`;
}

/**
 * Build login redirect URL with return path
 */
function buildLoginRedirect(currentUrl: URL): string {
  const redirect = encodeURIComponent(currentUrl.href);
  return getAccountsUrl(`/login?redirect=${redirect}`);
}

/**
 * Security middleware for MVP
 * - Redirects unauthenticated users to accounts app
 * - Adds essential security headers to all responses
 */
export const onRequest = defineMiddleware(async (context, next) => {
  const { pathname } = context.url;
  
  // Skip auth check for public routes
  if (!isPublicRoute(pathname)) {
    // Check for auth token in cookies (set by API)
    // Note: HttpOnly cookies can't be read by JS, but Astro middleware can read them
    const authToken = context.cookies.get('asap_access_token')?.value;
    
    // Also check localStorage token via a custom header (set by client-side JS)
    // This is a fallback for environments where cookies may not work
    const headerToken = context.request.headers.get('x-auth-token');
    
    // For SSR pages, we can only check cookies
    // Client-side hydration will handle localStorage-based auth
    if (!authToken && !headerToken) {
      // For API-like requests (fetch), return 401
      const acceptHeader = context.request.headers.get('accept') || '';
      if (acceptHeader.includes('application/json')) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      // For browser navigation, redirect to login
      // Note: We only redirect on initial page loads, not client-side navigation
      // Client-side auth state is managed by the React app
      // return context.redirect(buildLoginRedirect(context.url));
      
      // For MVP: Let client-side handle auth redirects to avoid SSR issues
      // The React app will redirect if user is not authenticated
    }
  }
  
  const response = await next();
  
  // Skip CSP in development mode - it interferes with Vite HMR
  if (import.meta.env.DEV) {
    // Only add basic security headers in dev
    response.headers.set('X-Frame-Options', 'DENY');
    response.headers.set('X-Content-Type-Options', 'nosniff');
    return response;
  }
  
  // Get the API URL for CSP connect-src directive
  const { getApiBaseUrl } = await import('./lib/api/base-url');
  const apiUrl = getApiBaseUrl();
  // Extract the origin (protocol + host) for CSP - CSP needs the origin, not paths
  const apiOrigin = new URL(apiUrl).origin;
  const apiHost = new URL(apiUrl).host;
  
  // Security headers (production only for full CSP)
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
    
    // Content Security Policy (production)
    'Content-Security-Policy': [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      `img-src 'self' data: blob: ${apiOrigin} https://avatars.githubusercontent.com https://images.unsplash.com`,
      "font-src 'self' https://fonts.gstatic.com",
      `connect-src 'self' ${apiOrigin} wss://${apiHost}`,
      "frame-ancestors 'none'",
      "form-action 'self'",
      "base-uri 'self'",
      "upgrade-insecure-requests",
    ].join('; '),
  };
  
  // Apply headers to the response
  Object.entries(securityHeaders).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  
  return response;
});
