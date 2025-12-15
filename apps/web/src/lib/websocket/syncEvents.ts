/**
 * WebSocket Sync Events - Phase 3
 * 
 * Types and handlers for real-time synchronization events
 */

// ============================================
// WebSocket Sync Event Types
// ============================================

export type SyncEventType =
  // Website events
  | 'sync:website:updated'
  | 'sync:website:deleted'
  | 'sync:website:published'
  | 'sync:website:unpublished'
  
  // Module events
  | 'sync:module:activated'
  | 'sync:module:deactivated'
  | 'sync:module:configured'
  | 'sync:module:catalog:updated'
  
  // Cloud/File events
  | 'sync:file:uploaded'
  | 'sync:file:deleted'
  | 'sync:upload:progress'
  | 'sync:upload:complete'
  | 'sync:upload:failed'
  
  // Presence events
  | 'presence:user:online'
  | 'presence:user:offline'
  | 'presence:user:editing'
  | 'presence:user:stopped-editing'
  | 'presence:users:list';

// ============================================
// Common Types
// ============================================

export interface PresenceUser {
  id: string;
  username: string;
  avatar_url?: string;
  last_seen: string;
}

export interface ResourceReference {
  resource_type: string;
  resource_id: string;
}

// ============================================
// Website Sync Events
// ============================================

export interface WebsiteUpdatedEvent {
  type: 'sync:website:updated';
  data: {
    website_id: string;
    updated_by: string;
    updated_by_name: string;
    changes: {
      fields: string[];
      timestamp: string;
    };
  };
}

export interface WebsiteDeletedEvent {
  type: 'sync:website:deleted';
  data: {
    website_id: string;
    deleted_by: string;
    deleted_by_name: string;
  };
}

export interface WebsitePublishedEvent {
  type: 'sync:website:published';
  data: {
    website_id: string;
    url: string;
    published_by: string;
    published_by_name: string;
  };
}

export interface WebsiteUnpublishedEvent {
  type: 'sync:website:unpublished';
  data: {
    website_id: string;
    unpublished_by: string;
    unpublished_by_name: string;
  };
}

// ============================================
// Module Sync Events
// ============================================

export interface ModuleActivatedEvent {
  type: 'sync:module:activated';
  data: {
    module_id: string;
    module_name: string;
    module_slug: string;
    activated_by: string;
    activated_by_name: string;
  };
}

export interface ModuleDeactivatedEvent {
  type: 'sync:module:deactivated';
  data: {
    module_id: string;
    module_name: string;
    module_slug: string;
    deactivated_by: string;
    deactivated_by_name: string;
  };
}

export interface ModuleConfiguredEvent {
  type: 'sync:module:configured';
  data: {
    module_id: string;
    module_name: string;
    configured_by: string;
    configured_by_name: string;
    config_changes: string[];
  };
}

export interface ModuleCatalogUpdatedEvent {
  type: 'sync:module:catalog:updated';
  data: {
    new_modules: number;
    updated_modules: number;
    updated_by: string;
  };
}

// ============================================
// Cloud/File Sync Events
// ============================================

export interface FileUploadedEvent {
  type: 'sync:file:uploaded';
  data: {
    file_id: string;
    filename: string;
    size: number;
    mime_type: string;
    uploaded_by: string;
    uploaded_by_name: string;
    url: string;
  };
}

export interface FileDeletedEvent {
  type: 'sync:file:deleted';
  data: {
    file_id: string;
    filename: string;
    deleted_by: string;
    deleted_by_name: string;
  };
}

export interface UploadProgressEvent {
  type: 'sync:upload:progress';
  data: {
    upload_id: string;
    filename: string;
    progress: number; // 0-100
    bytes_uploaded: number;
    total_bytes: number;
    speed: number; // bytes per second
    eta: number; // seconds remaining
  };
}

export interface UploadCompleteEvent {
  type: 'sync:upload:complete';
  data: {
    upload_id: string;
    file_id: string;
    filename: string;
    url: string;
  };
}

export interface UploadFailedEvent {
  type: 'sync:upload:failed';
  data: {
    upload_id: string;
    filename: string;
    error: string;
  };
}

// ============================================
// Presence Events
// ============================================

export interface UserOnlineEvent {
  type: 'presence:user:online';
  data: {
    user: PresenceUser;
  };
}

export interface UserOfflineEvent {
  type: 'presence:user:offline';
  data: {
    user_id: string;
  };
}

export interface UserEditingEvent {
  type: 'presence:user:editing';
  data: {
    user: PresenceUser;
    resource_type: string;
    resource_id: string;
    started_at: string;
  };
}

export interface UserStoppedEditingEvent {
  type: 'presence:user:stopped-editing';
  data: {
    user_id: string;
    resource_type: string;
    resource_id: string;
  };
}

export interface UsersListEvent {
  type: 'presence:users:list';
  data: {
    online_users: PresenceUser[];
  };
}

// ============================================
// Union Types
// ============================================

export type SyncEvent =
  // Website
  | WebsiteUpdatedEvent
  | WebsiteDeletedEvent
  | WebsitePublishedEvent
  | WebsiteUnpublishedEvent
  // Module
  | ModuleActivatedEvent
  | ModuleDeactivatedEvent
  | ModuleConfiguredEvent
  | ModuleCatalogUpdatedEvent
  // File
  | FileUploadedEvent
  | FileDeletedEvent
  | UploadProgressEvent
  | UploadCompleteEvent
  | UploadFailedEvent
  // Presence
  | UserOnlineEvent
  | UserOfflineEvent
  | UserEditingEvent
  | UserStoppedEditingEvent
  | UsersListEvent;

// ============================================
// Type Guards
// ============================================

export function isSyncEvent(event: any): event is SyncEvent {
  return (
    event &&
    typeof event === 'object' &&
    'type' in event &&
    'data' in event &&
    typeof event.type === 'string' &&
    event.type.startsWith('sync:') || event.type.startsWith('presence:')
  );
}

export function isWebsiteEvent(event: SyncEvent): event is WebsiteUpdatedEvent | WebsiteDeletedEvent | WebsitePublishedEvent | WebsiteUnpublishedEvent {
  return event.type.startsWith('sync:website:');
}

export function isModuleEvent(event: SyncEvent): event is ModuleActivatedEvent | ModuleDeactivatedEvent | ModuleConfiguredEvent | ModuleCatalogUpdatedEvent {
  return event.type.startsWith('sync:module:');
}

export function isFileEvent(event: SyncEvent): event is FileUploadedEvent | FileDeletedEvent | UploadProgressEvent | UploadCompleteEvent | UploadFailedEvent {
  return event.type.startsWith('sync:file:') || event.type.startsWith('sync:upload:');
}

export function isPresenceEvent(event: SyncEvent): event is UserOnlineEvent | UserOfflineEvent | UserEditingEvent | UserStoppedEditingEvent | UsersListEvent {
  return event.type.startsWith('presence:');
}

// ============================================
// Parser
// ============================================

export function parseSyncEvent(message: any): SyncEvent | null {
  if (!isSyncEvent(message)) {
    return null;
  }
  return message as SyncEvent;
}

// ============================================
// Event Handlers Interface
// ============================================

export interface SyncEventHandlers {
  // Website handlers
  onWebsiteUpdated?: (event: WebsiteUpdatedEvent['data']) => void;
  onWebsiteDeleted?: (event: WebsiteDeletedEvent['data']) => void;
  onWebsitePublished?: (event: WebsitePublishedEvent['data']) => void;
  onWebsiteUnpublished?: (event: WebsiteUnpublishedEvent['data']) => void;
  
  // Module handlers
  onModuleActivated?: (event: ModuleActivatedEvent['data']) => void;
  onModuleDeactivated?: (event: ModuleDeactivatedEvent['data']) => void;
  onModuleConfigured?: (event: ModuleConfiguredEvent['data']) => void;
  onModuleCatalogUpdated?: (event: ModuleCatalogUpdatedEvent['data']) => void;
  
  // File handlers
  onFileUploaded?: (event: FileUploadedEvent['data']) => void;
  onFileDeleted?: (event: FileDeletedEvent['data']) => void;
  onUploadProgress?: (event: UploadProgressEvent['data']) => void;
  onUploadComplete?: (event: UploadCompleteEvent['data']) => void;
  onUploadFailed?: (event: UploadFailedEvent['data']) => void;
  
  // Presence handlers
  onUserOnline?: (event: UserOnlineEvent['data']) => void;
  onUserOffline?: (event: UserOfflineEvent['data']) => void;
  onUserEditing?: (event: UserEditingEvent['data']) => void;
  onUserStoppedEditing?: (event: UserStoppedEditingEvent['data']) => void;
  onUsersList?: (event: UsersListEvent['data']) => void;
}
