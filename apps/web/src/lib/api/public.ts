/**
 * Public API client for fetching published website data
 * These endpoints don't require authentication
 * 
 * V1: Uses FreelanceDevProfile structure instead of dynamic sections
 */

import type { Website, FreelanceDevProfile } from '@asap/shared';
import { getApiBaseUrl } from './base-url';

const API_URL = getApiBaseUrl();

// Re-export types for backward compatibility
export type PublicWebsite = Website;
export type PublicProfile = FreelanceDevProfile;

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
   * Get profile data for a published website (V1: FreelanceDevProfile)
   */
  async getWebsiteProfile(slug: string): Promise<PublicProfile | null> {
    const response = await fetch(`${API_URL}/public/websites/${slug}/profile`);
    
    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      throw new Error(`Failed to fetch profile: ${response.statusText}`);
    }
    
    return response.json();
  },
};

export default publicAPI;
