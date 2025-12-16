/**
 * Public API client for fetching published website data
 * These endpoints don't require authentication
 */

const API_URL = import.meta.env.PUBLIC_API_URL || 'http://localhost:3000/api';

export interface PublicWebsite {
  id: string;
  account_id: string;
  slug: string;
  title: string;
  tagline: string;
  status: string;
  creation_mode: string;
  preset_id?: string;
  metadata: Record<string, any>;
  data: Record<string, any>;
}

export interface PublicSection {
  id: string;
  website_id: string;
  section_type: string;
  title: string;
  layout: string;
  content: Record<string, any>;
  settings: Record<string, any>;
  visible: boolean;
  order_index: number;
}

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
