import { format, formatDistanceToNow } from 'date-fns';

// ============================================
// Configuration constants
// ============================================

/** The base domain for ASAP sites */
export const ASAP_DOMAIN = 'asap.cool';

/** Minimum length for slugs */
export const SLUG_MIN_LENGTH = 3;

/** Regex pattern for validating slugs */
export const SLUG_REGEX = /^[a-z0-9-]+$/;

// ============================================
// Formatting utilities
// ============================================

export function formatBytes(bytes: number, decimals: number = 2): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

export function formatDate(date: string | Date): string {
  return format(new Date(date), 'PPP');
}

export function formatRelativeTime(date: string | Date): string {
  return formatDistanceToNow(new Date(date), { addSuffix: true });
}

/**
 * Converts text to a URL-safe slug.
 * Handles special characters, accents, and ensures proper formatting.
 * @param text The text to convert to a slug
 * @returns A URL-safe slug string
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/[^a-z0-9]+/g, '-')     // Replace non-alphanumeric with hyphens
    .replace(/^-+|-+$/g, '')          // Remove leading/trailing hyphens
    .replace(/--+/g, '-');            // Collapse multiple hyphens
}

/**
 * Validates a slug format.
 * @param slug The slug to validate
 * @returns Object with isValid boolean and optional error message
 */
export function validateSlug(slug: string): { isValid: boolean; error?: string } {
  if (!slug || slug.trim().length === 0) {
    return { isValid: false, error: 'Veuillez entrer une URL pour votre site' };
  }
  
  if (slug.length < SLUG_MIN_LENGTH) {
    return { isValid: false, error: `L'URL doit contenir au moins ${SLUG_MIN_LENGTH} caractères` };
  }
  
  if (!SLUG_REGEX.test(slug)) {
    return { isValid: false, error: "L'URL ne peut contenir que des lettres minuscules, des chiffres et des tirets" };
  }
  
  return { isValid: true };
}

/**
 * Generates the full URL for a website.
 * @param slug The website slug
 * @returns The full public URL
 */
export function getWebsiteUrl(slug: string): string {
  return `https://${slug}.${ASAP_DOMAIN}`;
}

/**
 * Generates the display URL (without protocol).
 * @param slug The website slug
 * @returns The display URL string
 */
export function getWebsiteDisplayUrl(slug: string): string {
  return `${slug}.${ASAP_DOMAIN}`;
}
