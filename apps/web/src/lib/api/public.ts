/**
 * Public API client for fetching published website data
 * These endpoints don't require authentication
 * 
 * Uses types from @asap/shared for consistency
 */

import type { Website, Section } from '@asap/shared';

const API_URL = import.meta.env.PUBLIC_API_URL || 'http://localhost:3000/api';

// Re-export types for backward compatibility
export type PublicWebsite = Website;
export type PublicSection = Section;

export const publicAPI = {
  /**
   * Get a published website by slug
   */
  async getWebsiteBySlug(slug: string): Promise<PublicWebsite | null> {
    const response = await fetch(`${API_URL}/public/websites/${slug}`);
    
    if (response.status === 404) {
      return null;
    }
    
    if (!response.ok) {
      throw new Error(`Failed to fetch website: ${response.statusText}`);
    }
    
    return response.json();
  },

  /**
   * Get sections for a published website
   */
  async getWebsiteSections(slug: string): Promise<PublicSection[]> {
    const response = await fetch(`${API_URL}/public/websites/${slug}/sections`);
    
    if (!response.ok) {
      // If sections endpoint doesn't exist, return empty array
      if (response.status === 404) {
        return [];
      }
      throw new Error(`Failed to fetch sections: ${response.statusText}`);
    }
    
    return response.json();
  },
};

export default publicAPI;
