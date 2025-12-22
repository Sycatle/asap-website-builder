/**
 * Extension-related types
 */

import type { JsonObject } from './common';

// ============================================
// CONFIG SCHEMA TYPES (Schema-driven UI)
// ============================================

/**
 * Field types supported by the schema renderer
 */
export type FieldType = 
  | 'text' 
  | 'textarea' 
  | 'number' 
  | 'boolean' 
  | 'select' 
  | 'url' 
  | 'email' 
  | 'password'
  | 'color'
  | 'date';

/**
 * A single configuration field
 */
export interface ConfigField {
  key: string;
  type: FieldType;
  label: string;
  description?: string;
  placeholder?: string;
  required?: boolean;
  default?: unknown;
  options?: { value: string; label: string }[];  // For 'select' type
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    message?: string;
  };
}

/**
 * An action button (e.g., "Synchronize", "Test connection")
 */
export interface ConfigAction {
  key: string;
  label: string;
  description?: string;
  endpoint: string;       // Relative to module endpoint, e.g., "/sync"
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  style?: 'primary' | 'secondary' | 'danger';
  confirm?: string;       // Confirmation message before executing
  refreshAfter?: boolean; // Reload data after action
}

/**
 * Display configuration for data lists
 */
export interface DataDisplayField {
  key: string;
  label?: string;
  type?: 'text' | 'link' | 'badge' | 'date' | 'number' | 'image' | 'title' | 'subtitle' | 'meta' | 'stat' | 'description';
  linkKey?: string;       // For 'link' type, which field contains the URL
  colorKey?: string;      // For 'badge' type with dynamic colors
  icon?: string;          // Icon for meta fields
  prefix?: string;        // Prefix for display (e.g., "@" for username)
  linkPrefix?: string;    // URL prefix for links
}

export interface DataDisplay {
  type: 'list' | 'table' | 'stats' | 'custom' | 'profile' | 'avatarList';
  source: string;         // Data key in module response (e.g., "projects")
  title?: string;
  emptyMessage?: string;
  fields?: DataDisplayField[];
  stats?: {               // For 'stats' type
    key: string;
    label: string;
    icon?: string;
  }[];
}

/**
 * Complete configuration schema for an extension
 */
export interface ConfigSchema {
  fields?: ConfigField[];
  actions?: ConfigAction[];
  dataDisplay?: DataDisplay[];
  sections?: {            // Group fields into sections
    key: string;
    title: string;
    description?: string;
    fields: string[];     // References to field keys
  }[];
}

// ============================================
// EXTENSION TYPES
// ============================================

export interface Extension {
  id: string;
  name: string;
  slug: string;
  version: string;
  description: string;
  category: string;
  default_settings: Record<string, unknown>;
  config_schema?: ConfigSchema;  // Schema for dynamic UI generation
  icon?: string;                 // Icon identifier or SVG
}

/**
 * Extension data returned when fetching config (includes dynamic data)
 */
export interface ExtensionData {
  extension: Extension;
  settings: Record<string, unknown>;
  enabled?: boolean;             // Whether extension is activated for website
  data?: Record<string, unknown>;    // Dynamic data (e.g., projects, stats)
  lastSync?: string;
}

export interface WebsiteExtension {
  id: string;
  website_id: string;
  extension_id: string;
  extension_name: string;
  extension_slug: string;
  settings: Record<string, unknown>;
  enabled: boolean;
  activated_at: string;
  category: string;
}

export interface ActivateExtensionRequest {
  extension_id: string;
  settings?: Record<string, unknown>;
}

export interface UpdateExtensionSettingsRequest {
  settings: Record<string, unknown>;
  enabled?: boolean;
}

// ============================================
// EXTENSION DATA TYPES (specific extensions)
// ============================================

/**
 * GitHub extension data
 */
export interface GitHubExtensionData {
  username?: string;
  repos?: Array<{
    id: number;
    name: string;
    description: string | null;
    url: string;
    stars: number;
    forks: number;
    language: string | null;
    topics: string[];
  }>;
  stats?: {
    total_repos: number;
    total_stars: number;
    followers: number;
    following: number;
  };
  lastSync?: string;
}

/**
 * Blog extension data
 */
export interface BlogExtensionData {
  posts?: Array<{
    id: string;
    title: string;
    slug: string;
    excerpt?: string;
    published_at?: string;
    status: 'draft' | 'published';
  }>;
}

/**
 * Contact form extension data
 */
export interface ContactExtensionData {
  submissions?: Array<{
    id: string;
    name: string;
    email: string;
    message: string;
    submitted_at: string;
    read: boolean;
  }>;
  settings?: {
    email_notifications: boolean;
    auto_reply: boolean;
  };
}

/**
 * Generic extension data - use specific types when available
 */
export type ExtensionDataPayload = 
  | GitHubExtensionData 
  | BlogExtensionData 
  | ContactExtensionData 
  | JsonObject;
