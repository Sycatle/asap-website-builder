/**
 * useNotificationWebSocket Hook
 * 
 * Handles real-time notification events via WebSocket
 * and syncs them with the notifications store.
 */

import { useEffect, useCallback, useRef } from 'react';
import { useNotificationsStore } from '../lib/store/notificationsStore';
import { useAuthStore } from '../lib/store/authStore';
import { useWebSocket } from './useWebSocket';
import { 
  isNotificationEvent, 
  parseNotificationEvent,
  type NotificationEvent,
  type NotificationEventHandlers 
} from '../lib/websocket/notificationEvents';

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
  
  const { isAuthenticated } = useAuthStore();
  const { 
    setUnreadCount, 
    addNotification, 
    removeNotification,
    setNotificationRead,
    fetchNotifications 
  } = useNotificationsStore();
  
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  // Get token from localStorage
  const getToken = useCallback(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('auth_token');
    }
    return null;
  }, []);

  // Get WebSocket URL from env
  const wsUrl = import.meta.env.PUBLIC_WS_URL || 
    (typeof window !== 'undefined' 
      ? `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws`
      : 'ws://localhost:3000/ws');

  // Use the WebSocket hook
  const ws = useWebSocket({
    url: wsUrl,
    autoConnect: isAuthenticated,
  });

  // Log helper
  const log = useCallback((...args: unknown[]) => {
    if (debug) {
      console.log('[NotificationWS]', ...args);
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

  // Authenticate when connected
  useEffect(() => {
    const token = getToken();
    if (ws.isConnected && isAuthenticated && token) {
      log('Authenticating WebSocket connection');
      ws.send('auth', { token });
    }
  }, [ws.isConnected, isAuthenticated, getToken, ws.send, log]);

  return {
    isConnected: ws.isConnected,
    reconnectAttempts: ws.reconnectAttempts,
  };
}

export default useNotificationWebSocket;
