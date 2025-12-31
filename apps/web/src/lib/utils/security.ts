/**
 * Security utilities for URL validation and sanitization
 */

// Allowed internal paths for redirects
const ALLOWED_REDIRECT_PREFIXES = ['/app', '/preview', '/onboarding'];

// Allowed external domains for action URLs
const ALLOWED_EXTERNAL_DOMAINS = [
  'asap.cool',
  'asap.com',
  // Add trusted domains here
];

/**
 * Validate that a redirect URL is safe (internal only)
 */
export function isValidRedirectUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  
  // Must start with / (relative URL)
  if (!url.startsWith('/')) return false;
  
  // Prevent protocol-relative URLs (//evil.com)
  if (url.startsWith('//')) return false;
  
  // Must match allowed prefixes
  return ALLOWED_REDIRECT_PREFIXES.some(prefix => url.startsWith(prefix));
}

/**
 * Get a safe redirect URL, returning default if invalid
 */
export function getSafeRedirectUrl(url: string | null | undefined, defaultUrl = '/app'): string {
  return isValidRedirectUrl(url) ? url! : defaultUrl;
}

/**
 * Validate that an external URL is from a trusted domain
 */
export function isValidExternalUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    
    // Must be HTTPS
    if (parsed.protocol !== 'https:') return false;
    
    // Check if domain is allowed
    const hostname = parsed.hostname.toLowerCase();
    return ALLOWED_EXTERNAL_DOMAINS.some(domain => 
      hostname === domain || hostname.endsWith(`.${domain}`)
    );
  } catch {
    return false;
  }
}

/**
 * Validate action URL (internal or trusted external)
 */
export function isValidActionUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  
  // Internal URLs starting with /
  if (url.startsWith('/')) {
    // Prevent protocol-relative URLs
    if (url.startsWith('//')) return false;
    return true;
  }
  
  // External URLs must be from trusted domains
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return isValidExternalUrl(url);
  }
  
  return false;
}

/**
 * Safely open a URL, with validation
 */
export function safeNavigate(url: string, options?: { newTab?: boolean }): boolean {
  if (!isValidActionUrl(url)) {
    console.warn('Blocked navigation to untrusted URL:', url);
    return false;
  }
  
  if (options?.newTab || url.startsWith('http')) {
    window.open(url, '_blank', 'noopener,noreferrer');
  } else {
    window.location.href = url;
  }
  
  return true;
}

/**
 * Open external URL with noopener/noreferrer
 */
export function openExternalUrl(url: string): void {
  window.open(url, '_blank', 'noopener,noreferrer');
}

/**
 * Escape HTML special characters to prevent XSS
 * Use this when interpolating user data into i18n strings rendered with dangerouslySetInnerHTML
 */
export function escapeHtml(str: string | null | undefined): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
