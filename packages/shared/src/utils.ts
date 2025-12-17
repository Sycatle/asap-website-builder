/**
 * @asap/shared - Shared utility functions for the ASAP platform
 * 
 * This is the single source of truth for all shared utilities.
 * Import from here instead of duplicating utility functions.
 */

import { SLUG_MIN_LENGTH, SLUG_REGEX, ASAP_DOMAIN } from './constants';
import type { Section, Theme } from './types';

// ============================================
// String Utilities
// ============================================

/**
 * Converts text to a URL-safe slug.
 * Handles special characters, accents, and ensures proper formatting.
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
 * Alias for slugify (for backward compatibility)
 */
export const toSlug = slugify;

/**
 * Validates a slug format.
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

// ============================================
// URL Utilities
// ============================================

/**
 * Generates the full URL for a website.
 */
export function getWebsiteUrl(slug: string): string {
  return `https://${slug}.${ASAP_DOMAIN}`;
}

/**
 * Generates the display URL (without protocol).
 */
export function getWebsiteDisplayUrl(slug: string): string {
  return `${slug}.${ASAP_DOMAIN}`;
}

// ============================================
// Section Data Utilities
// ============================================

/**
 * Get data from section with fallback to default value
 * Supports both 'data' and 'content' fields for compatibility
 */
export function getData<T>(section: Section, key: string, defaultValue: T): T {
  const data = section.data ?? section.content ?? {};
  return (data[key] as T) ?? defaultValue;
}

/**
 * Get content data from section (alias for getData)
 */
export const getContent = getData;

// ============================================
// Theme Utilities
// ============================================

/**
 * Convert hex color to RGB values for CSS custom properties
 */
export function hexToRgb(hex: string): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return '99 102 241'; // Default to indigo
  
  return `${parseInt(result[1], 16)} ${parseInt(result[2], 16)} ${parseInt(result[3], 16)}`;
}

/**
 * Build theme CSS custom properties from a theme object
 */
export function buildThemeStyles(theme?: Theme): string {
  if (!theme) return '';
  
  const styles: string[] = [];
  
  if (theme.primaryColor) {
    styles.push(`--color-primary: ${hexToRgb(theme.primaryColor)};`);
  }
  if (theme.secondaryColor) {
    styles.push(`--color-secondary: ${hexToRgb(theme.secondaryColor)};`);
  }
  if (theme.accentColor) {
    styles.push(`--color-accent: ${hexToRgb(theme.accentColor)};`);
  }
  if (theme.backgroundColor) {
    styles.push(`--color-background: ${hexToRgb(theme.backgroundColor)};`);
  }
  if (theme.foregroundColor) {
    styles.push(`--color-foreground: ${hexToRgb(theme.foregroundColor)};`);
  }
  if (theme.mutedColor) {
    styles.push(`--color-muted: ${hexToRgb(theme.mutedColor)};`);
  }
  if (theme.borderColor) {
    styles.push(`--color-border: ${hexToRgb(theme.borderColor)};`);
  }
  
  return styles.join(' ');
}

// ============================================
// Class Name Utilities
// ============================================

/**
 * Merge classnames together, filtering out falsy values
 * Simple version - for complex merging, use tailwind-merge in the web app
 */
export function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ');
}
