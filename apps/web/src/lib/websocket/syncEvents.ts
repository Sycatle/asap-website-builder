/**
 * WebSocket Sync Events
 * 
 * Types and handlers for real-time synchronization events
 */

// ============================================
// WebSocket Sync Event Types
// ============================================

export type SyncEventType =
  // Website events
  | 'sync:website:created'
  | 'sync:website:updated'
  | 'sync:website:deleted'
  | 'sync:website:published'
  | 'sync:website:unpublished'
  | 'sync:website:data-updated'
  
  // Page events
  | 'sync:page:created'
  | 'sync:page:updated'
  | 'sync:page:deleted'
  | 'sync:page:reordered'
  
  // Element events
  | 'sync:element:created'
  | 'sync:element:updated'
  | 'sync:element:deleted'
  | 'sync:element:reordered'
  
  // Extension events
  | 'sync:extension:activated'
  | 'sync:extension:deactivated'
  | 'sync:extension:configured'
  
  // Cloud/File events
  | 'sync:file:uploaded'
  | 'sync:file:deleted'
  | 'sync:upload:progress'
  | 'sync:upload:complete'
  | 'sync:upload:failed'
  
  // Website Presence events
  | 'presence:website:users'
  | 'presence:website:user-joined'
  | 'presence:website:user-left'
  | 'presence:website:user-page-updated';

// ============================================
// Common Types
// ============================================

// Import and re-export WebsitePresenceUser from centralized types
import type { WebsitePresenceUser } from '../types/websocket';
export type { WebsitePresenceUser };

export interface ResourceReference {
  resource_type: string;
  resource_id: string;
}

// ============================================
// Website Sync Events
// ============================================

export interface WebsiteCreatedEvent {
  type: 'sync:website:created';
  data: {
    website: {
      id: string;
      account_id: string;
      slug: string;
      title: string;
      tagline: string;
      status: string;
      creation_mode: string;
      preset_id: string | null;
      metadata: Record<string, unknown>;
      data: Record<string, unknown>;
    };
  };
}

export interface WebsiteUpdatedEvent {
  type: 'sync:website:updated';
  data: {
    website_id: string;
    website: {
      title?: string;
      tagline?: string;
      metadata?: Record<string, unknown>;
    };
  };
}

export interface WebsiteDeletedEvent {
  type: 'sync:website:deleted';
  data: {
    website_id: string;
  };
}

export interface WebsitePublishedEvent {
  type: 'sync:website:published';
  data: {
    website_id: string;
    status: string;
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

export interface WebsiteDataUpdatedEvent {
  type: 'sync:website:data-updated';
  data: {
    website_id: string;
    data: Record<string, unknown>;
  };
}

// ============================================
// Page Sync Events
// ============================================

export interface PageCreatedEvent {
  type: 'sync:page:created';
  data: {
    website_id: string;
    page: {
      id: string;
      website_id: string;
      slug: string;
      title: string;
      description: string;
      is_homepage: boolean;
      order: number;
      visible: boolean;
      metadata: Record<string, unknown>;
    };
  };
}

export interface PageUpdatedEvent {
  type: 'sync:page:updated';
  data: {
    website_id: string;
    page_id: string;
    page: {
      slug?: string;
      title?: string;
      description?: string;
      is_homepage?: boolean;
      order?: number;
      visible?: boolean;
      metadata?: Record<string, unknown>;
    };
  };
}

export interface PageDeletedEvent {
  type: 'sync:page:deleted';
  data: {
    website_id: string;
    page_id: string;
  };
}

export interface PageReorderedEvent {
  type: 'sync:page:reordered';
  data: {
    website_id: string;
    page_ids: string[];
  };
}

// ============================================
// Element Sync Events
// ============================================

export interface ElementCreatedEvent {
  type: 'sync:element:created';
  data: {
    website_id: string;
    element: {
      id: string;
      website_id: string;
      extension_id: string | null;
      element_type: string;
      slug: string;
      title: string;
      order: number;
      layout: string;
      settings: Record<string, unknown>;
      data: Record<string, unknown>;
      visible: boolean;
    };
  };
}

export interface ElementUpdatedEvent {
  type: 'sync:element:updated';
  data: {
    website_id: string;
    element_id: string;
    element: {
      title?: string;
      layout?: string;
      settings?: Record<string, unknown>;
      data?: Record<string, unknown>;
      visible?: boolean;
    };
  };
}

export interface ElementDeletedEvent {
  type: 'sync:element:deleted';
  data: {
    website_id: string;
    element_id: string;
  };
}

export interface ElementReorderedEvent {
  type: 'sync:element:reordered';
  data: {
    website_id: string;
    element_ids: string[];
  };
}

// ============================================
// Extension Sync Events
// ============================================

export interface ExtensionActivatedEvent {
  type: 'sync:extension:activated';
  data: {
    website_id: string;
    extension_slug: string;
    extension: {
      extension_id: string;
      extension_name: string | null;
      settings: Record<string, unknown> | null;
    };
  };
}

export interface ExtensionDeactivatedEvent {
  type: 'sync:extension:deactivated';
  data: {
    website_id: string;
    extension_slug: string;
  };
}

export interface ExtensionConfiguredEvent {
  type: 'sync:extension:configured';
  data: {
    website_id: string;
    extension_slug: string;
    config: Record<string, unknown>;
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
// Website Presence Events (Primary System)
// ============================================

/** Event sent when the users list for a website is requested/updated */
export interface WebsiteUsersEvent {
  type: 'presence:website:users';
  data: {
    website_id: string;
    users: WebsitePresenceUser[];
  };
}

/** Event sent when a user joins a website presence room */
export interface WebsiteUserJoinedEvent {
  type: 'presence:website:user-joined';
  data: {
    website_id: string;
    user: WebsitePresenceUser;
  };
}

/** Event sent when a user leaves a website presence room */
export interface WebsiteUserLeftEvent {
  type: 'presence:website:user-left';
  data: {
    website_id: string;
    user_id: string;
  };
}

/** Event sent when a user's current page is updated */
export interface WebsiteUserPageUpdatedEvent {
  type: 'presence:website:user-page-updated';
  data: {
    website_id: string;
    user_id: string;
    current_page: string;
    user: WebsitePresenceUser;
  };
}

// ============================================
// Union Types
// ============================================

export type WebsiteSyncEvent =
  | WebsiteCreatedEvent
  | WebsiteUpdatedEvent
  | WebsiteDeletedEvent
  | WebsitePublishedEvent
  | WebsiteUnpublishedEvent
  | WebsiteDataUpdatedEvent;

export type PageSyncEvent =
  | PageCreatedEvent
  | PageUpdatedEvent
  | PageDeletedEvent
  | PageReorderedEvent;

export type ElementSyncEvent =
  | ElementCreatedEvent
  | ElementUpdatedEvent
  | ElementDeletedEvent
  | ElementReorderedEvent;

export type ExtensionSyncEvent =
  | ExtensionActivatedEvent
  | ExtensionDeactivatedEvent
  | ExtensionConfiguredEvent;

export type FileSyncEvent =
  | FileUploadedEvent
  | FileDeletedEvent
  | UploadProgressEvent
  | UploadCompleteEvent
  | UploadFailedEvent;

export type WebsitePresenceEvent =
  | WebsiteUsersEvent
  | WebsiteUserJoinedEvent
  | WebsiteUserLeftEvent
  | WebsiteUserPageUpdatedEvent;

export type SyncEvent =
  // Website
  | WebsiteCreatedEvent
  | WebsiteUpdatedEvent
  | WebsiteDeletedEvent
  | WebsitePublishedEvent
  | WebsiteUnpublishedEvent
  | WebsiteDataUpdatedEvent
  // Page
  | PageCreatedEvent
  | PageUpdatedEvent
  | PageDeletedEvent
  | PageReorderedEvent
  // Element
  | ElementCreatedEvent
  | ElementUpdatedEvent
  | ElementDeletedEvent
  | ElementReorderedEvent
  // Extension
  | ExtensionActivatedEvent
  | ExtensionDeactivatedEvent
  | ExtensionConfiguredEvent
  // File
  | FileUploadedEvent
  | FileDeletedEvent
  | UploadProgressEvent
  | UploadCompleteEvent
  | UploadFailedEvent
  // Website Presence
  | WebsiteUsersEvent
  | WebsiteUserJoinedEvent
  | WebsiteUserLeftEvent
  | WebsiteUserPageUpdatedEvent;

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
    (event.type.startsWith('sync:') || event.type.startsWith('presence:'))
  );
}

export function isWebsiteEvent(event: SyncEvent): event is WebsiteSyncEvent {
  return event.type.startsWith('sync:website:');
}

export function isPageEvent(event: SyncEvent): event is PageSyncEvent {
  return event.type.startsWith('sync:page:');
}

export function isElementEvent(event: SyncEvent): event is ElementSyncEvent {
  return event.type.startsWith('sync:element:');
}

export function isExtensionEvent(event: SyncEvent): event is ExtensionSyncEvent {
  return event.type.startsWith('sync:extension:');
}

export function isFileEvent(event: SyncEvent): event is FileSyncEvent {
  return event.type.startsWith('sync:file:') || event.type.startsWith('sync:upload:');
}

export function isPresenceEvent(event: SyncEvent): event is WebsitePresenceEvent {
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
  onWebsiteCreated?: (event: WebsiteCreatedEvent['data']) => void;
  onWebsiteUpdated?: (event: WebsiteUpdatedEvent['data']) => void;
  onWebsiteDeleted?: (event: WebsiteDeletedEvent['data']) => void;
  onWebsitePublished?: (event: WebsitePublishedEvent['data']) => void;
  onWebsiteUnpublished?: (event: WebsiteUnpublishedEvent['data']) => void;
  onWebsiteDataUpdated?: (event: WebsiteDataUpdatedEvent['data']) => void;
  
  // Page handlers
  onPageCreated?: (event: PageCreatedEvent['data']) => void;
  onPageUpdated?: (event: PageUpdatedEvent['data']) => void;
  onPageDeleted?: (event: PageDeletedEvent['data']) => void;
  onPageReordered?: (event: PageReorderedEvent['data']) => void;
  
  // Element handlers
  onElementCreated?: (event: ElementCreatedEvent['data']) => void;
  onElementUpdated?: (event: ElementUpdatedEvent['data']) => void;
  onElementDeleted?: (event: ElementDeletedEvent['data']) => void;
  onElementReordered?: (event: ElementReorderedEvent['data']) => void;
  
  // Extension handlers
  onExtensionActivated?: (event: ExtensionActivatedEvent['data']) => void;
  onExtensionDeactivated?: (event: ExtensionDeactivatedEvent['data']) => void;
  onExtensionConfigured?: (event: ExtensionConfiguredEvent['data']) => void;
  
  // File handlers
  onFileUploaded?: (event: FileUploadedEvent['data']) => void;
  onFileDeleted?: (event: FileDeletedEvent['data']) => void;
  onUploadProgress?: (event: UploadProgressEvent['data']) => void;
  onUploadComplete?: (event: UploadCompleteEvent['data']) => void;
  onUploadFailed?: (event: UploadFailedEvent['data']) => void;
  
  // Website Presence handlers
  onWebsiteUsers?: (event: WebsiteUsersEvent['data']) => void;
  onWebsiteUserJoined?: (event: WebsiteUserJoinedEvent['data']) => void;
  onWebsiteUserLeft?: (event: WebsiteUserLeftEvent['data']) => void;
}
