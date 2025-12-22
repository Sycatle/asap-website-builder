/**
 * useSyncWebSocket Hook
 * 
 * Handles real-time sync events via WebSocket
 * and automatically updates React Query cache.
 * 
 * Uses the global WebSocket provider for a single shared connection.
 * Uses centralized sync helpers to avoid duplicates
 * when both API responses and WebSocket events update the cache.
 */

import { useEffect, useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useGlobalWebSocket } from '../components/providers/WebSocketProvider';
import { loggers } from '../lib/logger';
import {
  // Sync helpers for cache updates
  syncWebsiteCreated,
  syncWebsiteUpdated,
  syncWebsiteDeleted,
  syncWebsitePublished,
  syncWebsiteDataUpdated,
  syncPageCreated,
  syncPageUpdated,
  syncPageDeleted,
  syncPagesReordered,
  syncElementCreated,
  syncElementUpdated,
  syncElementDeleted,
  syncElementsReordered,
  syncExtensionActivated,
  syncExtensionDeactivated,
  syncExtensionConfigured,
  syncFileUploaded,
  syncFileDeleted,
} from '../lib/query/syncHelpers';
import { 
  type SyncEventHandlers,
  type SyncEventType,
} from '../lib/websocket/syncEvents';

const wsLogger = loggers.ws;

interface UseSyncWebSocketOptions {
  /** Custom event handlers (called AFTER cache update) */
  handlers?: SyncEventHandlers;
  /** Filter events by website ID (optional) */
  websiteId?: string;
  /** Enable debug logging */
  debug?: boolean;
  /** Disable automatic cache updates (only call handlers) */
  skipCacheUpdate?: boolean;
}

interface UseSyncWebSocketReturn {
  isConnected: boolean;
  reconnectAttempts: number;
}

/**
 * Hook to handle real-time sync events via WebSocket
 * 
 * Automatically updates React Query cache when events are received,
 * ensuring deduplication with API responses.
 * 
 * @example
 * ```tsx
 * // Basic usage - auto-updates cache
 * useSyncWebSocket({
 *   websiteId: '123', // Only listen for events on this website
 *   debug: true,
 * });
 * 
 * // With custom handlers (called after cache update)
 * useSyncWebSocket({
 *   handlers: {
 *     onPageCreated: (data) => {
 *       toast.success('New page created!');
 *     },
 *   },
 * });
 * ```
 */
export function useSyncWebSocket(options: UseSyncWebSocketOptions = {}): UseSyncWebSocketReturn {
  const { handlers, websiteId, debug = false, skipCacheUpdate = false } = options;
  
  const queryClient = useQueryClient();
  
  // Use the global WebSocket connection
  const ws = useGlobalWebSocket();
  
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  // Log helper
  const log = useCallback((...args: unknown[]) => {
    if (debug) {
      wsLogger.debug('Sync:', ...args);
    }
  }, [debug]);

  // Handle incoming WebSocket messages
  const handleMessage = useCallback((eventType: string, data: unknown) => {
    // Filter by website ID if specified
    const eventData = data as Record<string, unknown>;
    if (websiteId) {
      const eventWebsiteId = eventData?.website_id as string | undefined;
      if (eventWebsiteId && eventWebsiteId !== websiteId) {
        log('Ignoring event for different website:', eventType);
        return;
      }
    }

    log('Received sync event:', eventType, data);

    const h = handlersRef.current;

    // Update cache and call handlers based on event type
    switch (eventType) {
      // ========== WEBSITE EVENTS ==========
      case 'sync:website:created':
        if (!skipCacheUpdate && eventData?.website) {
          syncWebsiteCreated(queryClient, eventData.website as any);
        }
        h?.onWebsiteCreated?.(eventData as any);
        break;

      case 'sync:website:updated':
        if (!skipCacheUpdate && eventData?.website) {
          syncWebsiteUpdated(queryClient, eventData.website as any);
        }
        h?.onWebsiteUpdated?.(eventData as any);
        break;

      case 'sync:website:deleted':
        if (!skipCacheUpdate && eventData?.website_id) {
          syncWebsiteDeleted(queryClient, eventData.website_id as string);
        }
        h?.onWebsiteDeleted?.(eventData as any);
        break;

      case 'sync:website:published':
        if (!skipCacheUpdate && eventData?.website_id) {
          syncWebsitePublished(queryClient, eventData.website_id as string);
        }
        h?.onWebsitePublished?.(eventData as any);
        break;

      case 'sync:website:unpublished':
        h?.onWebsiteUnpublished?.(eventData as any);
        break;

      case 'sync:website:data-updated':
        if (!skipCacheUpdate && eventData?.website_id && eventData?.data) {
          syncWebsiteDataUpdated(
            queryClient, 
            eventData.website_id as string, 
            eventData.data as Record<string, unknown>
          );
        }
        h?.onWebsiteDataUpdated?.(eventData as any);
        break;

      // ========== PAGE EVENTS ==========
      case 'sync:page:created':
        if (!skipCacheUpdate && eventData?.website_id && eventData?.page) {
          syncPageCreated(queryClient, eventData.website_id as string, eventData.page as any);
        }
        h?.onPageCreated?.(eventData as any);
        break;

      case 'sync:page:updated':
        if (!skipCacheUpdate && eventData?.website_id && eventData?.page) {
          syncPageUpdated(queryClient, eventData.website_id as string, eventData.page as any);
        }
        h?.onPageUpdated?.(eventData as any);
        break;

      case 'sync:page:deleted':
        if (!skipCacheUpdate && eventData?.website_id && eventData?.page_id) {
          syncPageDeleted(queryClient, eventData.website_id as string, eventData.page_id as string);
        }
        h?.onPageDeleted?.(eventData as any);
        break;

      case 'sync:page:reordered':
        if (!skipCacheUpdate && eventData?.website_id && eventData?.page_ids) {
          syncPagesReordered(queryClient, eventData.website_id as string, eventData.page_ids as string[]);
        }
        h?.onPageReordered?.(eventData as any);
        break;

      // ========== ELEMENT EVENTS ==========
      case 'sync:element:created':
        if (!skipCacheUpdate && eventData?.website_id && eventData?.element) {
          syncElementCreated(queryClient, eventData.website_id as string, eventData.element as any);
        }
        h?.onElementCreated?.(eventData as any);
        break;

      case 'sync:element:updated':
        if (!skipCacheUpdate && eventData?.website_id && eventData?.element_id) {
          syncElementUpdated(
            queryClient, 
            eventData.website_id as string, 
            eventData.element_id as string,
            eventData.element as any
          );
        }
        h?.onElementUpdated?.(eventData as any);
        break;

      case 'sync:element:deleted':
        if (!skipCacheUpdate && eventData?.website_id && eventData?.element_id) {
          syncElementDeleted(queryClient, eventData.website_id as string, eventData.element_id as string);
        }
        h?.onElementDeleted?.(eventData as any);
        break;

      case 'sync:element:reordered':
        if (!skipCacheUpdate && eventData?.website_id && eventData?.element_ids) {
          syncElementsReordered(queryClient, eventData.website_id as string, eventData.element_ids as string[]);
        }
        h?.onElementReordered?.(eventData as any);
        break;

      // ========== EXTENSION EVENTS ==========
      case 'sync:extension:activated':
        if (!skipCacheUpdate && eventData?.website_id && eventData?.extension) {
          syncExtensionActivated(queryClient, eventData.website_id as string, eventData.extension as any);
        }
        h?.onExtensionActivated?.(eventData as any);
        break;

      case 'sync:extension:deactivated':
        if (!skipCacheUpdate && eventData?.website_id && eventData?.extension_id) {
          syncExtensionDeactivated(queryClient, eventData.website_id as string, eventData.extension_id as string);
        }
        h?.onExtensionDeactivated?.(eventData as any);
        break;

      case 'sync:extension:configured':
        if (!skipCacheUpdate && eventData?.website_id && eventData?.extension_id && eventData?.settings) {
          syncExtensionConfigured(
            queryClient, 
            eventData.website_id as string, 
            eventData.extension_id as string,
            eventData.settings as Record<string, unknown>
          );
        }
        h?.onExtensionConfigured?.(eventData as any);
        break;

      // ========== FILE EVENTS ==========
      case 'sync:file:uploaded':
        if (!skipCacheUpdate && eventData?.file) {
          syncFileUploaded(queryClient, eventData.file as any);
        }
        h?.onFileUploaded?.(eventData as any);
        break;

      case 'sync:file:deleted':
        if (!skipCacheUpdate && eventData?.file_id) {
          syncFileDeleted(queryClient, eventData.file_id as string);
        }
        h?.onFileDeleted?.(eventData as any);
        break;

      case 'sync:upload:progress':
        h?.onUploadProgress?.(eventData as any);
        break;

      case 'sync:upload:complete':
        h?.onUploadComplete?.(eventData as any);
        break;

      case 'sync:upload:failed':
        h?.onUploadFailed?.(eventData as any);
        break;

      // ========== PRESENCE EVENTS ==========
      case 'presence:user:online':
        h?.onUserOnline?.(eventData as any);
        break;

      case 'presence:user:offline':
        h?.onUserOffline?.(eventData as any);
        break;

      case 'presence:user:editing':
        h?.onUserEditing?.(eventData as any);
        break;

      case 'presence:user:stopped-editing':
        h?.onUserStoppedEditing?.(eventData as any);
        break;

      case 'presence:users:list':
        h?.onUsersList?.(eventData as any);
        break;

      // ========== LEGACY MODULE EVENTS ==========
      case 'sync:module:activated':
        h?.onModuleActivated?.(eventData as any);
        break;

      case 'sync:module:deactivated':
        h?.onModuleDeactivated?.(eventData as any);
        break;

      case 'sync:module:configured':
        h?.onModuleConfigured?.(eventData as any);
        break;

      case 'sync:module:catalog:updated':
        h?.onModuleCatalogUpdated?.(eventData as any);
        break;
    }
  }, [websiteId, log, queryClient, skipCacheUpdate]);

  // Setup event listeners
  useEffect(() => {
    if (!ws.isConnected) return;

    log('Setting up sync event handlers');

    // All sync event types we want to listen for
    const syncEventTypes: SyncEventType[] = [
      // Website
      'sync:website:created',
      'sync:website:updated',
      'sync:website:deleted',
      'sync:website:published',
      'sync:website:unpublished',
      'sync:website:data-updated',
      // Page
      'sync:page:created',
      'sync:page:updated',
      'sync:page:deleted',
      'sync:page:reordered',
      // Element
      'sync:element:created',
      'sync:element:updated',
      'sync:element:deleted',
      'sync:element:reordered',
      // Extension
      'sync:extension:activated',
      'sync:extension:deactivated',
      'sync:extension:configured',
      // File
      'sync:file:uploaded',
      'sync:file:deleted',
      'sync:upload:progress',
      'sync:upload:complete',
      'sync:upload:failed',
      // Presence
      'presence:user:online',
      'presence:user:offline',
      'presence:user:editing',
      'presence:user:stopped-editing',
      'presence:users:list',
      // Legacy
      'sync:module:activated',
      'sync:module:deactivated',
      'sync:module:configured',
      'sync:module:catalog:updated',
    ];

    // Create handlers map for cleanup
    const handlersMap = new Map<string, (data: unknown) => void>();

    // Subscribe to all sync events
    syncEventTypes.forEach(eventType => {
      const handler = (data: unknown) => handleMessage(eventType, data);
      handlersMap.set(eventType, handler);
      ws.on(eventType, handler);
    });

    return () => {
      log('Cleaning up sync event handlers');
      handlersMap.forEach((handler, eventType) => {
        ws.off(eventType, handler);
      });
    };
  }, [ws.isConnected, ws.on, ws.off, handleMessage, log]);

  // No need to authenticate here - WebSocketProvider handles it automatically

  return {
    isConnected: ws.isConnected,
    reconnectAttempts: ws.reconnectAttempts,
  };
}

export default useSyncWebSocket;
