/**
 * Security utilities for URL validation and sanitization
 */

// Allowed hosts for redirects (production and development)
const ALLOWED_REDIRECT_HOSTS = [
  // Production
  'app.asap.cool',
  'accounts.asap.cool',
  'asap.cool',
  // Development
  'localhost:4321',  // web app
  'localhost:4322',  // sites app
  'localhost:4323',  // accounts app
];

/**
 * Validate that a redirect URL is safe
 */
export function isValidRedirectUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  
  // Allow relative URLs starting with /
  if (url.startsWith('/') && !url.startsWith('//')) {
    return true;
  }
  
  // Check absolute URLs
  try {
    const parsed = new URL(url);
    const host = parsed.host;
    return ALLOWED_REDIRECT_HOSTS.includes(host);
  } catch {
    return false;
  }
}

/**
 * Get a safe redirect URL, returning default if invalid
 */
export function getSafeRedirectUrl(url: string | null | undefined, defaultUrl = '/'): string {
  return isValidRedirectUrl(url) ? url! : defaultUrl;
}

/**
 * Build the web app URL for redirect after auth
 */
export function getAppUrl(path: string = '/'): string {
  const appBaseUrl = import.meta.env.PUBLIC_APP_URL || 'http://localhost:4321';
  return `${appBaseUrl}${path}`;
}

/**
 * Build the accounts URL
 */
export function getAccountsUrl(path: string = '/'): string {
  const accountsBaseUrl = import.meta.env.PUBLIC_ACCOUNTS_URL || 'http://localhost:4323';
  return `${accountsBaseUrl}${path}`;
}
