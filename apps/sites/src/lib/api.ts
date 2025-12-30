/**
 * Public API client for fetching published website data
 * Uses types from @asap/shared to maintain single source of truth
 */

import type { 
  Website, 
  Element,
  Page, 
  Theme, 
  SEOMetadata,
  ElementType 
} from '@asap/shared';
import { hexToRgb, buildThemeStyles } from '@asap/shared';

// Re-export types for backward compatibility
export type { Website, Element, Page, Theme, SEOMetadata, ElementType };

// Re-export utilities
export { hexToRgb, buildThemeStyles };

const API_URL = import.meta.env.PUBLIC_API_URL || 'http://localhost:3000/api';

// Alias types for backward compatibility
export type PublicWebsite = Website;
export type PublicElement = Element;
export type PublicPage = Page & { elements: Element[] };

/**
 * Fetch a public website by slug
 */
export async function getPublicWebsite(slug: string): Promise<PublicWebsite | null> {
  try {
    const response = await fetch(`${API_URL}/public/websites/${slug}`);
    
    if (response.status === 404) {
      return null;
    }
    
    if (!response.ok) {
      throw new Error(`Failed to fetch website: ${response.statusText}`);
    }
    
    return response.json();
  } catch (error) {
    console.error('Error fetching website:', error);
    return null;
  }
}

/**
 * Fetch elements for a public website
 */
export async function getPublicElements(slug: string): Promise<PublicElement[]> {
  try {
    const response = await fetch(`${API_URL}/public/websites/${slug}/elements`);
    
    if (!response.ok) {
      if (response.status === 404) {
        return [];
      }
      throw new Error(`Failed to fetch elements: ${response.statusText}`);
    }
    
    return response.json();
  } catch (error) {
    console.error('Error fetching elements:', error);
    return [];
  }
}

/**
 * Fetch pages for a public website
 */
export async function getPublicPages(slug: string): Promise<PublicPage[]> {
  try {
    const response = await fetch(`${API_URL}/public/websites/${slug}/pages`);
    
    if (!response.ok) {
      if (response.status === 404) {
        return [];
      }
      throw new Error(`Failed to fetch pages: ${response.statusText}`);
    }
    
    return response.json();
  } catch (error) {
    console.error('Error fetching pages:', error);
    return [];
  }
}

/**
 * Get all published website slugs (for static generation)
 */
export async function getAllPublishedSlugs(): Promise<string[]> {
  try {
    const response = await fetch(`${API_URL}/public/websites`);
    
    if (!response.ok) {
      return [];
    }
    
    const websites: PublicWebsite[] = await response.json();
    return websites.map(w => w.slug);
  } catch (error) {
    console.error('Error fetching slugs:', error);
    return [];
  }
}
