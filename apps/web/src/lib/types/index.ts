/**
 * Common types shared across the application
 * 
 * These types provide better type safety while maintaining flexibility
 * for dynamic data structures.
 */

// ============================================
// GENERIC DATA TYPES
// ============================================

/**
 * Generic JSON value type - safer than 'any' for JSON data
 */
export type JsonValue = 
  | string 
  | number 
  | boolean 
  | null 
  | JsonValue[] 
  | { [key: string]: JsonValue };

/**
 * Generic JSON object type
 */
export type JsonObject = { [key: string]: JsonValue };

/**
 * Settings/Config object - commonly used for extension settings
 */
export type SettingsObject = Record<string, JsonValue>;

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
 * Website data payload - structured JSON data
 */
export interface WebsiteData {
  profile?: WebsiteProfile;
  projects?: WebsiteProject[];
  theme?: ThemeSettings;
  // Allow additional dynamic properties
  [key: string]: WebsiteProfile | WebsiteProject[] | ThemeSettings | JsonValue | undefined;
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

// ============================================
// EXTENSION DATA TYPES
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

// ============================================
// WEBSOCKET EVENT DATA TYPES
// ============================================

/**
 * Presence user data from WebSocket
 */
export interface PresenceUser {
  id: string;
  email: string;
  username?: string;
  editing?: string;
  editing_context?: string;
  last_active?: string;
}

/**
 * WebSocket event data payloads
 */
export interface WebSocketEventData {
  users?: PresenceUser[];
  user?: PresenceUser;
  user_id?: string;
  field?: string;
  context?: string;
  website_id?: string;
  extension_id?: string;
  module_id?: string;
  // Allow additional dynamic properties
  [key: string]: PresenceUser[] | PresenceUser | JsonValue | undefined;
}

// ============================================
// FORM/UI TYPES
// ============================================

/**
 * Form field value
 */
export type FormFieldValue = string | number | boolean | string[] | null;

/**
 * Form values object
 */
export type FormValues = Record<string, FormFieldValue>;

// ============================================
// CHANGELOG ENTRY TYPE
// ============================================

/**
 * Changelog entry for tracking changes
 */
export interface ChangelogEntry {
  id: string;
  action: 'sync' | 'settings_updated' | 'enabled' | 'disabled' | 'action_executed' | string;
  description: string;
  timestamp: string;
  user?: string;
  details?: JsonObject;
}

// ============================================
// TYPE GUARDS
// ============================================

/**
 * Check if a value is a JsonObject
 */
export function isJsonObject(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Check if a value is a JsonValue
 */
export function isJsonValue(value: unknown): value is JsonValue {
  if (value === null) return true;
  const type = typeof value;
  if (type === 'string' || type === 'number' || type === 'boolean') return true;
  if (Array.isArray(value)) return value.every(isJsonValue);
  if (type === 'object') {
    return Object.values(value as Record<string, unknown>).every(isJsonValue);
  }
  return false;
}
