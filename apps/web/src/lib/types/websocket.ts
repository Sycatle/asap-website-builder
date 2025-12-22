/**
 * WebSocket-related types
 */

import type { JsonValue } from './common';

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
