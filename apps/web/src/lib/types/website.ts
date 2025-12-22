/**
 * Website-related types
 */

import type { JsonObject, JsonValue } from './common';

// ============================================
// WEBSITE CORE TYPES
// ============================================

export interface Website {
  id: string;
  account_id: string;
  slug: string;
  title: string;
  tagline: string;
  status: 'draft' | 'published';
  creation_mode: 'from_preset' | 'from_scratch' | 'onboarding';
  preset_id?: string;
  metadata: JsonObject;
  data: WebsiteData;
  created_at?: string;
  updated_at?: string;
}

export interface CreateWebsiteRequest {
  slug: string;
  title: string;
  tagline?: string;
  creation_mode?: 'from_preset' | 'from_scratch' | 'onboarding';
  preset_id?: string;
}

export interface UpdateWebsiteRequest {
  title?: string;
  tagline?: string;
  metadata?: JsonObject;
}

// ============================================
// WEBSITE DATA TYPES
// ============================================

/**
 * Profile data structure for websites
 */
export interface WebsiteProfile {
  name?: string;
  title?: string;
  bio?: string;
  description?: string;
  avatar_url?: string;
  email?: string;
  location?: string;
  social_links?: {
    github?: string;
    twitter?: string;
    linkedin?: string;
    website?: string;
    [key: string]: string | undefined;
  };
}

/**
 * Project structure for portfolio websites
 */
export interface WebsiteProject {
  id: string;
  name: string;
  description?: string;
  url?: string;
  image_url?: string;
  tags?: string[];
  featured?: boolean;
  order?: number;
}

/**
 * Theme settings
 */
export interface ThemeSettings {
  primary_color?: string;
  secondary_color?: string;
  background_color?: string;
  text_color?: string;
  font_heading?: string;
  font_body?: string;
  enable_dark_mode?: boolean;
  border_radius?: string;
}

/**
 * Website data payload - structured JSON data
 */
export interface WebsiteData {
  profile?: WebsiteProfile;
  projects?: WebsiteProject[];
  theme?: ThemeSettings;
  // Allow additional dynamic properties
  [key: string]: WebsiteProfile | WebsiteProject[] | ThemeSettings | JsonValue | undefined;
}
