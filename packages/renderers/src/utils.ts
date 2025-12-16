/**
 * Utility functions for section renderers
 */

import type { Section } from './types';

/**
 * Get data from section with fallback to default value
 * Supports both 'data' and 'content' fields for compatibility
 */
export function getData<T>(section: Section, key: string, defaultValue: T): T {
  // Try data first, then content
  const data = section.data ?? section.content ?? {};
  return (data[key] as T) ?? defaultValue;
}

/**
 * Get content data from section (alias for getData)
 */
export function getContent<T>(section: Section, key: string, defaultValue: T): T {
  return getData(section, key, defaultValue);
}

/**
 * Merge classnames together, filtering out falsy values
 */
export function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ');
}

/**
 * Generate an id-safe slug from a string
 */
export function toSlug(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}
