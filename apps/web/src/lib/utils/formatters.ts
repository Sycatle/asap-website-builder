import { format, formatDistanceToNow } from 'date-fns';

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

/** Regex pattern for validating slugs */
export const SLUG_REGEX = /^[a-z0-9-]+$/;
