/**
 * useNotificationWebSocket Hook
 * 
 * Handles real-time notification events via WebSocket
 * and syncs them with the notifications store.
 * 
 * Uses the global WebSocket provider for a single shared connection.
 */

import { useEffect, useCallback, useRef } from 'react';
import { useNotificationsStore } from '../lib/store/notificationsStore';
import { useGlobalWebSocket } from '../components/providers/WebSocketProvider';
import { loggers } from '../lib/logger';
import { 
  isNotificationEvent, 
  parseNotificationEvent,
  type NotificationEvent,
  type NotificationEventHandlers 
} from '../lib/websocket/notificationEvents';

const wsLogger = loggers.ws;

interface UseNotificationWebSocketOptions {
  /** Custom event handlers (optional - store is updated automatically) */
  handlers?: NotificationEventHandlers;
  /** Enable debug logging */
  debug?: boolean;
}

/**
 * Hook to handle real-time notification events
 * 
 * Automatically syncs WebSocket notification events with the notifications store.
 * Provides optional custom handlers for additional processing.
 * 
 * @example
 * ```tsx
 * // Basic usage - store is updated automatically
 * useNotificationWebSocket();
 * 
 * // With custom handlers
 * useNotificationWebSocket({
 *   handlers: {
 *     onNewNotification: (notification) => {
 *       toast.info(notification.title);
 *     }
 *   }
 * });
 * ```
 */
export function useNotificationWebSocket(options: UseNotificationWebSocketOptions = {}) {
  const { handlers, debug = false } = options;
  
  const { 
    setUnreadCount, 
    addNotification, 
    removeNotification,
    setNotificationRead,
    fetchNotifications 
  } = useNotificationsStore();
  
  // Use the global WebSocket connection
  const ws = useGlobalWebSocket();
  
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  // Log helper
  const log = useCallback((...args: unknown[]) => {
    if (debug) {
      wsLogger.debug('Notification:', ...args);
    }
  }, [debug]);

  // Handle notification events
  const handleNotificationEvent = useCallback((event: NotificationEvent) => {
    log('Received event:', event.type, event.data);
    
    switch (event.type) {
      case 'notification:new': {
        const { notification, unread_count } = event.data;
        // Add to store
        addNotification(notification);
        setUnreadCount(unread_count);
        // Call custom handler
        handlersRef.current?.onNewNotification?.(notification, unread_count);
        break;
      }
      
      case 'notification:read': {
        const { notification_id, unread_count } = event.data;
        // Update store
        setNotificationRead([notification_id]);
        setUnreadCount(unread_count);
        // Call custom handler
        handlersRef.current?.onNotificationRead?.(notification_id, unread_count);
        break;
      }
      
      case 'notification:deleted': {
        const { notification_id, unread_count } = event.data;
        // Remove from store
        removeNotification(notification_id);
        setUnreadCount(unread_count);
        // Call custom handler
        handlersRef.current?.onNotificationDeleted?.(notification_id, unread_count);
        break;
      }
      
      case 'notification:count': {
        const { unread_count } = event.data;
        // Just update count
        setUnreadCount(unread_count);
        // Call custom handler
        handlersRef.current?.onUnreadCountUpdate?.(unread_count);
        break;
      }
      
      case 'notification:batch-read': {
        const { notification_ids, unread_count } = event.data;
        // Update store
        setNotificationRead(notification_ids);
        setUnreadCount(unread_count);
        // Call custom handler
        handlersRef.current?.onBatchRead?.(notification_ids, unread_count);
        break;
      }
      
      case 'notification:settings': {
        // Settings changed - could trigger a refetch if needed
        handlersRef.current?.onSettingsChanged?.(event.data);
        break;
      }
    }
  }, [addNotification, removeNotification, setNotificationRead, setUnreadCount, log]);

  // Setup event listeners
  useEffect(() => {
    if (!ws.isConnected) return;

    log('Setting up notification event handlers');

    // Create handler for each notification event type
    const eventHandler = (data: unknown) => {
      // This is called for specific events
    };

    // Generic message handler for all notification events
    const messageHandler = (type: string, data: unknown) => {
      if (isNotificationEvent(type)) {
        const event = parseNotificationEvent(type, data);
        if (event) {
          handleNotificationEvent(event);
        }
      }
    };

    // Subscribe to all notification events
    const eventTypes = [
      'notification:new',
      'notification:read',
      'notification:deleted',
      'notification:count',
      'notification:batch-read',
      'notification:settings',
    ];

    eventTypes.forEach(eventType => {
      ws.on(eventType, (data: unknown) => {
        const event = parseNotificationEvent(eventType, data);
        if (event) {
          handleNotificationEvent(event);
        }
      });
    });

    return () => {
      log('Cleaning up notification event handlers');
      eventTypes.forEach(eventType => {
        ws.off(eventType, eventHandler);
      });
    };
  }, [ws.isConnected, ws.on, ws.off, handleNotificationEvent, log]);

  // No need to authenticate here - WebSocketProvider handles it automatically

  return {
    isConnected: ws.isConnected,
    reconnectAttempts: ws.reconnectAttempts,
  };
}

export default useNotificationWebSocket;
