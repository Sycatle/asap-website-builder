/**
 * WebSocket-related types
 */

import type { JsonValue } from './common';

// ============================================
// WEBSOCKET EVENT DATA TYPES
// ============================================

/**
 * Website presence user data from WebSocket
 * Matches the server-side WebsitePresenceUser structure
 */
export interface WebsitePresenceUser {
  id: string;
  email: string;
  name?: string;
  avatar?: string;
  joined_at?: string;
  current_page?: string;
}

/**
 * WebSocket event data payloads
 */
export interface WebSocketEventData {
  users?: WebsitePresenceUser[];
  user?: WebsitePresenceUser;
  user_id?: string;
  field?: string;
  context?: string;
  website_id?: string;
  extension_id?: string;
  // Allow additional dynamic properties
  [key: string]: WebsitePresenceUser[] | WebsitePresenceUser | JsonValue | undefined;
}

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
  details?: Record<string, unknown>;
}
