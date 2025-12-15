/**
 * useModuleSync Hook
 * 
 * Handles real-time synchronization of module updates via WebSocket
 */

import { useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useWebSocket } from './useWebSocket';
import { 
  type ModuleActivatedEvent,
  type ModuleDeactivatedEvent,
  type ModuleConfiguredEvent,
  type ModuleCatalogUpdatedEvent,
  parseSyncEvent
} from '../lib/websocket/syncEvents';
import { toast } from 'sonner';

interface UseModuleSyncOptions {
  /** Enable toast notifications for updates */
  showToasts?: boolean;
  /** Custom event handlers */
  handlers?: {
    onActivated?: (data: ModuleActivatedEvent['data']) => void;
    onDeactivated?: (data: ModuleDeactivatedEvent['data']) => void;
    onConfigured?: (data: ModuleConfiguredEvent['data']) => void;
    onCatalogUpdated?: (data: ModuleCatalogUpdatedEvent['data']) => void;
  };
}

/**
 * Hook to handle real-time module synchronization
 * 
 * Automatically updates module state when modules are activated/deactivated.
 * Shows toast notifications and invalidates relevant queries.
 * 
 * @example
 * ```tsx
 * // Basic usage
 * useModuleSync({ showToasts: true });
 * 
 * // With custom handlers
 * useModuleSync({
 *   handlers: {
 *     onActivated: (data) => {
 *       console.log('Module activated:', data.module_name);
 *     }
 *   }
 * });
 * ```
 */
export function useModuleSync(options: UseModuleSyncOptions = {}) {
  const { showToasts = true, handlers } = options;
  
  const queryClient = useQueryClient();
  const ws = useWebSocket({
    url: import.meta.env.PUBLIC_WS_URL || 'ws://localhost:3000/ws',
    autoConnect: true
  });

  // Handle module activated
  const handleModuleActivated = useCallback((data: any) => {
    const event = parseSyncEvent(data);
    if (!event || event.type !== 'sync:module:activated') return;

    const { module_id, module_name, activated_by_name } = event.data;

    // Update module in cache
    queryClient.setQueryData(['modules'], (old: any[] | undefined) => {
      if (!old) return old;
      return old.map(m => 
        m.id === module_id || m.slug === event.data.module_slug
          ? { ...m, is_active: true }
          : m
      );
    });

    // Also invalidate to ensure fresh data
    queryClient.invalidateQueries({ queryKey: ['modules'] });
    queryClient.invalidateQueries({ queryKey: ['module', module_id] });

    if (showToasts) {
      toast.success(`Module ${module_name} activé`, {
        description: `Par ${activated_by_name}`
      });
    }

    handlers?.onActivated?.(event.data);
  }, [queryClient, showToasts, handlers]);

  // Handle module deactivated
  const handleModuleDeactivated = useCallback((data: any) => {
    const event = parseSyncEvent(data);
    if (!event || event.type !== 'sync:module:deactivated') return;

    const { module_id, module_name, deactivated_by_name } = event.data;

    // Update module in cache
    queryClient.setQueryData(['modules'], (old: any[] | undefined) => {
      if (!old) return old;
      return old.map(m => 
        m.id === module_id || m.slug === event.data.module_slug
          ? { ...m, is_active: false }
          : m
      );
    });

    queryClient.invalidateQueries({ queryKey: ['modules'] });
    queryClient.invalidateQueries({ queryKey: ['module', module_id] });

    if (showToasts) {
      toast.info(`Module ${module_name} désactivé`, {
        description: `Par ${deactivated_by_name}`
      });
    }

    handlers?.onDeactivated?.(event.data);
  }, [queryClient, showToasts, handlers]);

  // Handle module configured
  const handleModuleConfigured = useCallback((data: any) => {
    const event = parseSyncEvent(data);
    if (!event || event.type !== 'sync:module:configured') return;

    const { module_id, module_name, configured_by_name, config_changes } = event.data;

    // Invalidate module queries to refetch with new config
    queryClient.invalidateQueries({ queryKey: ['module', module_id] });
    queryClient.invalidateQueries({ queryKey: ['modules'] });

    if (showToasts) {
      toast.info(`Configuration de ${module_name} mise à jour`, {
        description: `Par ${configured_by_name} • ${config_changes.join(', ')}`
      });
    }

    handlers?.onConfigured?.(event.data);
  }, [queryClient, showToasts, handlers]);

  // Handle module catalog updated
  const handleModuleCatalogUpdated = useCallback((data: any) => {
    const event = parseSyncEvent(data);
    if (!event || event.type !== 'sync:module:catalog:updated') return;

    const { new_modules, updated_modules } = event.data;

    // Invalidate catalog query
    queryClient.invalidateQueries({ queryKey: ['modules', 'catalog'] });
    queryClient.invalidateQueries({ queryKey: ['modules'] });

    if (showToasts) {
      const message = [];
      if (new_modules > 0) message.push(`${new_modules} nouveau${new_modules > 1 ? 'x' : ''}`);
      if (updated_modules > 0) message.push(`${updated_modules} mis à jour`);
      
      toast.success('Catalogue de modules mis à jour', {
        description: message.join(' • ')
      });
    }

    handlers?.onCatalogUpdated?.(event.data);
  }, [queryClient, showToasts, handlers]);

  // Register event handlers
  useEffect(() => {
    if (!ws.isConnected) return;

    ws.on('sync:module:activated', handleModuleActivated);
    ws.on('sync:module:deactivated', handleModuleDeactivated);
    ws.on('sync:module:configured', handleModuleConfigured);
    ws.on('sync:module:catalog:updated', handleModuleCatalogUpdated);

    return () => {
      ws.off('sync:module:activated', handleModuleActivated);
      ws.off('sync:module:deactivated', handleModuleDeactivated);
      ws.off('sync:module:configured', handleModuleConfigured);
      ws.off('sync:module:catalog:updated', handleModuleCatalogUpdated);
    };
  }, [ws, handleModuleActivated, handleModuleDeactivated, handleModuleConfigured, handleModuleCatalogUpdated]);

  return {
    isConnected: ws.isConnected
  };
}
