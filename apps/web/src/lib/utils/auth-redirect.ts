/**
 * Authentication redirect utilities
 * Handles redirects to the accounts app for authentication
 */

/**
 * Get the accounts app base URL
 */
export function getAccountsUrl(): string {
  return import.meta.env.PUBLIC_ACCOUNTS_URL || 'http://localhost:4323';
}

/**
 * Get the current app base URL
 */
export function getAppUrl(): string {
  return import.meta.env.PUBLIC_SITE_URL || 'http://localhost:4321';
}

/**
 * Build URL to login page with redirect back to current location
 */
export function getLoginUrl(redirectTo?: string): string {
  const accountsUrl = getAccountsUrl();
  const redirect = redirectTo || (typeof window !== 'undefined' ? window.location.href : getAppUrl());
  return `${accountsUrl}/login?redirect=${encodeURIComponent(redirect)}`;
}

/**
 * Build URL to signup page with redirect back to current location
 */
export function getSignupUrl(redirectTo?: string): string {
  const accountsUrl = getAccountsUrl();
  const redirect = redirectTo || (typeof window !== 'undefined' ? window.location.href : getAppUrl());
  return `${accountsUrl}/signup?redirect=${encodeURIComponent(redirect)}`;
}

/**
 * Build URL to account settings page
 */
export function getSettingsUrl(section?: string): string {
  const accountsUrl = getAccountsUrl();
  if (section) {
    return `${accountsUrl}/settings/${section}`;
  }
  return `${accountsUrl}/settings`;
}

/**
 * Build URL to forgot password page
 */
export function getForgotPasswordUrl(): string {
  return `${getAccountsUrl()}/forgot-password`;
}

/**
 * Redirect to login page
 * Use this when user needs to authenticate
 */
export function redirectToLogin(redirectTo?: string): void {
  if (typeof window !== 'undefined') {
    window.location.href = getLoginUrl(redirectTo);
  }
}

/**
 * Redirect to signup page
 */
export function redirectToSignup(redirectTo?: string): void {
  if (typeof window !== 'undefined') {
    window.location.href = getSignupUrl(redirectTo);
  }
}

/**
 * Check if current page is on the accounts domain
 */
export function isAccountsApp(): boolean {
  if (typeof window === 'undefined') return false;
  const accountsUrl = getAccountsUrl();
  return window.location.origin === new URL(accountsUrl).origin;
}

/**
 * Check if current page is on the main app domain
 */
export function isMainApp(): boolean {
  if (typeof window === 'undefined') return false;
  const appUrl = getAppUrl();
  return window.location.origin === new URL(appUrl).origin;
}
