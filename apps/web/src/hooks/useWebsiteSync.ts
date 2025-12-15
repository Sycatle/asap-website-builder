/**
 * useWebsiteSync Hook
 * 
 * Handles real-time synchronization of website updates via WebSocket
 */

import { useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useWebSocket } from './useWebSocket';
import { 
  type WebsiteUpdatedEvent,
  type WebsiteDeletedEvent,
  type WebsitePublishedEvent,
  type WebsiteUnpublishedEvent,
  parseSyncEvent,
  isWebsiteEvent
} from '../lib/websocket/syncEvents';
import { toast } from 'sonner';

interface UseWebsiteSyncOptions {
  /** Specific website ID to watch (optional) */
  websiteId?: string;
  /** Enable toast notifications for updates */
  showToasts?: boolean;
  /** Custom event handlers */
  handlers?: {
    onUpdated?: (data: WebsiteUpdatedEvent['data']) => void;
    onDeleted?: (data: WebsiteDeletedEvent['data']) => void;
    onPublished?: (data: WebsitePublishedEvent['data']) => void;
    onUnpublished?: (data: WebsiteUnpublishedEvent['data']) => void;
  };
}

/**
 * Hook to handle real-time website synchronization
 * 
 * Automatically invalidates React Query cache when websites are updated.
 * Optionally shows toast notifications and calls custom handlers.
 * 
 * @example
 * ```tsx
 * // Watch specific website
 * useWebsiteSync({ 
 *   websiteId: 'abc123',
 *   showToasts: true 
 * });
 * 
 * // Watch all websites with custom handler
 * useWebsiteSync({
 *   handlers: {
 *     onUpdated: (data) => {
 *       console.log('Website updated:', data.website_id);
 *     }
 *   }
 * });
 * ```
 */
export function useWebsiteSync(options: UseWebsiteSyncOptions = {}) {
  const { websiteId, showToasts = true, handlers } = options;
  
  const queryClient = useQueryClient();
  const ws = useWebSocket({
    url: import.meta.env.PUBLIC_WS_URL || 'ws://localhost:3000/ws',
    autoConnect: true
  });

  // Handle website updated
  const handleWebsiteUpdated = useCallback((data: any) => {
    const event = parseSyncEvent(data);
    if (!event || event.type !== 'sync:website:updated') return;

    const { website_id, updated_by_name, changes } = event.data;

    // Only process if we're watching this specific website or all websites
    if (websiteId && website_id !== websiteId) return;

    // Invalidate queries to refetch data
    queryClient.invalidateQueries({ queryKey: ['website', website_id] });
    queryClient.invalidateQueries({ queryKey: ['websites'] });

    // Show toast notification
    if (showToasts) {
      toast.info('Site mis à jour', {
        description: `Par ${updated_by_name} • ${changes.fields.join(', ')}`
      });
    }

    // Call custom handler
    handlers?.onUpdated?.(event.data);
  }, [websiteId, queryClient, showToasts, handlers]);

  // Handle website deleted
  const handleWebsiteDeleted = useCallback((data: any) => {
    const event = parseSyncEvent(data);
    if (!event || event.type !== 'sync:website:deleted') return;

    const { website_id, deleted_by_name } = event.data;

    if (websiteId && website_id !== websiteId) return;

    // Invalidate queries
    queryClient.invalidateQueries({ queryKey: ['websites'] });
    queryClient.removeQueries({ queryKey: ['website', website_id] });

    if (showToasts) {
      toast.error('Site supprimé', {
        description: `Par ${deleted_by_name}`
      });
    }

    handlers?.onDeleted?.(event.data);
  }, [websiteId, queryClient, showToasts, handlers]);

  // Handle website published
  const handleWebsitePublished = useCallback((data: any) => {
    const event = parseSyncEvent(data);
    if (!event || event.type !== 'sync:website:published') return;

    const { website_id, url, published_by_name } = event.data;

    if (websiteId && website_id !== websiteId) return;

    // Invalidate queries
    queryClient.invalidateQueries({ queryKey: ['website', website_id] });
    queryClient.invalidateQueries({ queryKey: ['websites'] });

    if (showToasts) {
      toast.success('Site publié', {
        description: `Par ${published_by_name}`,
        action: {
          label: 'Voir',
          onClick: () => window.open(url, '_blank')
        }
      });
    }

    handlers?.onPublished?.(event.data);
  }, [websiteId, queryClient, showToasts, handlers]);

  // Handle website unpublished
  const handleWebsiteUnpublished = useCallback((data: any) => {
    const event = parseSyncEvent(data);
    if (!event || event.type !== 'sync:website:unpublished') return;

    const { website_id, unpublished_by_name } = event.data;

    if (websiteId && website_id !== websiteId) return;

    queryClient.invalidateQueries({ queryKey: ['website', website_id] });
    queryClient.invalidateQueries({ queryKey: ['websites'] });

    if (showToasts) {
      toast.info('Site dépublié', {
        description: `Par ${unpublished_by_name}`
      });
    }

    handlers?.onUnpublished?.(event.data);
  }, [websiteId, queryClient, showToasts, handlers]);

  // Register event handlers
  useEffect(() => {
    if (!ws.isConnected) return;

    ws.on('sync:website:updated', handleWebsiteUpdated);
    ws.on('sync:website:deleted', handleWebsiteDeleted);
    ws.on('sync:website:published', handleWebsitePublished);
    ws.on('sync:website:unpublished', handleWebsiteUnpublished);

    return () => {
      ws.off('sync:website:updated', handleWebsiteUpdated);
      ws.off('sync:website:deleted', handleWebsiteDeleted);
      ws.off('sync:website:published', handleWebsitePublished);
      ws.off('sync:website:unpublished', handleWebsiteUnpublished);
    };
  }, [ws, handleWebsiteUpdated, handleWebsiteDeleted, handleWebsitePublished, handleWebsiteUnpublished]);

  return {
    isConnected: ws.isConnected
  };
}
