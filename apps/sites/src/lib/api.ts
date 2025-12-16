/**
 * Public API client for fetching published website data
 */

const API_URL = import.meta.env.PUBLIC_API_URL || 'http://localhost:3000/api';

export interface PublicWebsite {
  id: string;
  slug: string;
  title: string;
  tagline: string;
  status: 'published' | 'draft';
  metadata: {
    theme?: Theme;
    seo?: SEOMetadata;
    favicon?: string;
    logo?: string;
    socialImage?: string;
  };
  created_at: string;
  updated_at: string;
}

export interface Theme {
  mode: 'dark' | 'light';
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  backgroundColor: string;
  foregroundColor: string;
  mutedColor: string;
  borderColor: string;
  fontFamily?: string;
}

export interface SEOMetadata {
  title?: string;
  description?: string;
  keywords?: string[];
  author?: string;
  image?: string;
  twitterHandle?: string;
  canonicalUrl?: string;
  noIndex?: boolean;
  noFollow?: boolean;
}

export interface PublicSection {
  id: string;
  website_id: string;
  section_type: SectionType;
  title: string;
  layout: string;
  content: Record<string, unknown>;
  settings: Record<string, unknown>;
  visible: boolean;
  order_index: number;
}

export type SectionType = 
  | 'hero'
  | 'about'
  | 'skills'
  | 'projects'
  | 'experience'
  | 'education'
  | 'contact'
  | 'testimonials'
  | 'services'
  | 'pricing'
  | 'faq'
  | 'gallery'
  | 'blog'
  | 'custom';

export interface PublicPage {
  id: string;
  website_id: string;
  slug: string;
  title: string;
  description?: string;
  is_homepage: boolean;
  visible: boolean;
  order_index: number;
  sections: PublicSection[];
}

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
 * Fetch sections for a public website
 */
export async function getPublicSections(slug: string): Promise<PublicSection[]> {
  try {
    const response = await fetch(`${API_URL}/public/websites/${slug}/sections`);
    
    if (!response.ok) {
      if (response.status === 404) {
        return [];
      }
      throw new Error(`Failed to fetch sections: ${response.statusText}`);
    }
    
    return response.json();
  } catch (error) {
    console.error('Error fetching sections:', error);
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
