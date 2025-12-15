/**
 * WebSocket Notification Events - Phase 2
 * 
 * Types and handlers for real-time notification events
 */

import type { Notification, NotificationCategory, NotificationPriority } from '../api/notifications';

// ============================================
// WebSocket Event Types
// ============================================

export type NotificationEventType = 
  | 'notification:new'           // New notification received
  | 'notification:read'          // Notification marked as read
  | 'notification:deleted'       // Notification deleted
  | 'notification:count'         // Unread count update
  | 'notification:batch-read'    // Multiple notifications marked as read
  | 'notification:settings';     // Settings changed

// ============================================
// Event Payloads
// ============================================

/** New notification event */
export interface NewNotificationEvent {
  type: 'notification:new';
  data: {
    notification: Notification;
    unread_count: number;
  };
}

/** Notification read event */
export interface NotificationReadEvent {
  type: 'notification:read';
  data: {
    notification_id: string;
    unread_count: number;
  };
}

/** Notification deleted event */
export interface NotificationDeletedEvent {
  type: 'notification:deleted';
  data: {
    notification_id: string;
    unread_count: number;
  };
}

/** Unread count update event */
export interface NotificationCountEvent {
  type: 'notification:count';
  data: {
    unread_count: number;
  };
}

/** Batch read event */
export interface NotificationBatchReadEvent {
  type: 'notification:batch-read';
  data: {
    notification_ids: string[];
    unread_count: number;
  };
}

/** Settings changed event */
export interface NotificationSettingsEvent {
  type: 'notification:settings';
  data: {
    push_enabled: boolean;
    email_enabled: boolean;
    enabled_categories: NotificationCategory[];
  };
}

// Union type for all notification events
export type NotificationEvent = 
  | NewNotificationEvent
  | NotificationReadEvent
  | NotificationDeletedEvent
  | NotificationCountEvent
  | NotificationBatchReadEvent
  | NotificationSettingsEvent;

// ============================================
// Event Handlers Type
// ============================================

export interface NotificationEventHandlers {
  onNewNotification?: (notification: Notification, unreadCount: number) => void;
  onNotificationRead?: (notificationId: string, unreadCount: number) => void;
  onNotificationDeleted?: (notificationId: string, unreadCount: number) => void;
  onUnreadCountUpdate?: (unreadCount: number) => void;
  onBatchRead?: (notificationIds: string[], unreadCount: number) => void;
  onSettingsChanged?: (settings: NotificationSettingsEvent['data']) => void;
}

// ============================================
// Helper Functions
// ============================================

/**
 * Check if an event is a notification event
 */
export function isNotificationEvent(type: string): type is NotificationEventType {
  return type.startsWith('notification:');
}

/**
 * Parse notification event from WebSocket message
 */
export function parseNotificationEvent(type: string, data: unknown): NotificationEvent | null {
  if (!isNotificationEvent(type)) {
    return null;
  }

  return {
    type: type as NotificationEventType,
    data: data as NotificationEvent['data'],
  } as NotificationEvent;
}

/**
 * Create a notification event for sending via WebSocket
 */
export function createNotificationEvent<T extends NotificationEventType>(
  type: T,
  data: Extract<NotificationEvent, { type: T }>['data']
): { type: T; data: typeof data } {
  return { type, data };
}
