/**
 * usePresence Hook
 * 
 * Handles user presence tracking and real-time collaboration indicators
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { useWebSocket } from './useWebSocket';
import { useAuthStore } from '../lib/store/authStore';
import { 
  type PresenceUser,
  type UserOnlineEvent,
  type UserOfflineEvent,
  type UserEditingEvent,
  type UserStoppedEditingEvent,
  type UsersListEvent,
  parseSyncEvent
} from '../lib/websocket/syncEvents';

interface UsePresenceOptions {
  /** Type of resource being edited (e.g., 'website', 'module') */
  resourceType?: string;
  /** ID of the resource being edited */
  resourceId?: string;
  /** Enable debug logging */
  debug?: boolean;
}

interface UsePresenceReturn {
  /** List of all online users */
  onlineUsers: PresenceUser[];
  /** Users currently editing the same resource */
  editingUsers: PresenceUser[];
  /** Indicate this user is editing the resource */
  startEditing: () => void;
  /** Indicate this user stopped editing */
  stopEditing: () => void;
  /** Whether presence tracking is active */
  isTracking: boolean;
}

/**
 * Hook to track user presence and collaborative editing
 * 
 * Tracks who is online and who is editing the same resource.
 * Automatically sends presence updates when user starts/stops editing.
 * 
 * @example
 * ```tsx
 * // Track presence on a specific resource
 * const {
 *   onlineUsers,
 *   editingUsers,
 *   startEditing,
 *   stopEditing
 * } = usePresence({
 *   resourceType: 'website',
 *   resourceId: websiteId
 * });
 * 
 * // Show who's editing
 * useEffect(() => {
 *   if (editingUsers.length > 0) {
 *     console.log('Users editing:', editingUsers.map(u => u.username));
 *   }
 * }, [editingUsers]);
 * 
 * // Start editing when user focuses
 * useEffect(() => {
 *   const handleFocus = () => startEditing();
 *   const handleBlur = () => stopEditing();
 *   
 *   window.addEventListener('focus', handleFocus);
 *   window.addEventListener('blur', handleBlur);
 *   
 *   return () => {
 *     window.removeEventListener('focus', handleFocus);
 *     window.removeEventListener('blur', handleBlur);
 *     stopEditing();
 *   };
 * }, [startEditing, stopEditing]);
 * ```
 */
export function usePresence(options: UsePresenceOptions = {}): UsePresenceReturn {
  const { resourceType, resourceId, debug = false } = options;
  
  const { user, isAuthenticated } = useAuthStore();
  const ws = useWebSocket({
    url: import.meta.env.PUBLIC_WS_URL || 'ws://localhost:3000/ws',
    autoConnect: true
  });

  const [onlineUsers, setOnlineUsers] = useState<PresenceUser[]>([]);
  const [editingUsers, setEditingUsers] = useState<PresenceUser[]>([]);
  const [isTracking, setIsTracking] = useState(false);
  
  const isEditingRef = useRef(false);
  const heartbeatTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Start editing - send presence update
  const startEditing = useCallback(() => {
    if (!ws.isConnected || !isAuthenticated || !resourceType || !resourceId) {
      if (debug) console.log('[Presence] Cannot start editing - not ready');
      return;
    }

    if (isEditingRef.current) {
      if (debug) console.log('[Presence] Already editing');
      return;
    }

    isEditingRef.current = true;
    setIsTracking(true);

    ws.send('presence:start-editing', {
      resource_type: resourceType,
      resource_id: resourceId,
      user_id: user?.id,
      username: user?.email
    });

    if (debug) console.log('[Presence] Started editing', { resourceType, resourceId });

    // Send heartbeat every 30 seconds to keep presence active
    heartbeatTimerRef.current = setInterval(() => {
      if (isEditingRef.current) {
        ws.send('presence:heartbeat', {
          resource_type: resourceType,
          resource_id: resourceId
        });
      }
    }, 30000);
  }, [ws, isAuthenticated, resourceType, resourceId, user, debug]);

  // Stop editing - clear presence
  const stopEditing = useCallback(() => {
    if (!isEditingRef.current) {
      if (debug) console.log('[Presence] Not editing');
      return;
    }

    isEditingRef.current = false;
    setIsTracking(false);

    if (heartbeatTimerRef.current) {
      clearInterval(heartbeatTimerRef.current);
      heartbeatTimerRef.current = null;
    }

    if (ws.isConnected && resourceType && resourceId) {
      ws.send('presence:stop-editing', {
        resource_type: resourceType,
        resource_id: resourceId
      });

      if (debug) console.log('[Presence] Stopped editing');
    }
  }, [ws, resourceType, resourceId, debug]);

  // Handle online users list
  const handleUsersList = useCallback((data: any) => {
    const event = parseSyncEvent(data);
    if (!event || event.type !== 'presence:users:list') return;

    setOnlineUsers(event.data.online_users);
    if (debug) console.log('[Presence] Users list:', event.data.online_users.length);
  }, [debug]);

  // Handle user online
  const handleUserOnline = useCallback((data: any) => {
    const event = parseSyncEvent(data);
    if (!event || event.type !== 'presence:user:online') return;

    const newUser = event.data.user;
    
    setOnlineUsers(prev => {
      // Don't add if already in list
      if (prev.some(u => u.id === newUser.id)) return prev;
      return [...prev, newUser];
    });

    if (debug) console.log('[Presence] User online:', newUser.username);
  }, [debug]);

  // Handle user offline
  const handleUserOffline = useCallback((data: any) => {
    const event = parseSyncEvent(data);
    if (!event || event.type !== 'presence:user:offline') return;

    const { user_id } = event.data;
    
    setOnlineUsers(prev => prev.filter(u => u.id !== user_id));
    setEditingUsers(prev => prev.filter(u => u.id !== user_id));

    if (debug) console.log('[Presence] User offline:', user_id);
  }, [debug]);

  // Handle user started editing
  const handleUserEditing = useCallback((data: any) => {
    const event = parseSyncEvent(data);
    if (!event || event.type !== 'presence:user:editing') return;

    const { user: editingUser, resource_type, resource_id: editing_resource_id } = event.data;

    // Only track users editing the same resource
    if (resource_type !== resourceType || editing_resource_id !== resourceId) {
      return;
    }

    // Don't add ourselves
    if (editingUser.id === user?.id) {
      return;
    }

    setEditingUsers(prev => {
      // Don't add if already in list
      if (prev.some(u => u.id === editingUser.id)) return prev;
      return [...prev, editingUser];
    });

    if (debug) console.log('[Presence] User editing:', editingUser.username);
  }, [resourceType, resourceId, user, debug]);

  // Handle user stopped editing
  const handleUserStoppedEditing = useCallback((data: any) => {
    const event = parseSyncEvent(data);
    if (!event || event.type !== 'presence:user:stopped-editing') return;

    const { user_id, resource_type, resource_id: editing_resource_id } = event.data;

    if (resource_type !== resourceType || editing_resource_id !== resourceId) {
      return;
    }

    setEditingUsers(prev => prev.filter(u => u.id !== user_id));

    if (debug) console.log('[Presence] User stopped editing:', user_id);
  }, [resourceType, resourceId, debug]);

  // Register event handlers
  useEffect(() => {
    if (!ws.isConnected) return;

    ws.on('presence:users:list', handleUsersList);
    ws.on('presence:user:online', handleUserOnline);
    ws.on('presence:user:offline', handleUserOffline);
    ws.on('presence:user:editing', handleUserEditing);
    ws.on('presence:user:stopped-editing', handleUserStoppedEditing);

    // Request initial users list
    ws.send('presence:request-users', {});

    return () => {
      ws.off('presence:users:list', handleUsersList);
      ws.off('presence:user:online', handleUserOnline);
      ws.off('presence:user:offline', handleUserOffline);
      ws.off('presence:user:editing', handleUserEditing);
      ws.off('presence:user:stopped-editing', handleUserStoppedEditing);
    };
  }, [ws, handleUsersList, handleUserOnline, handleUserOffline, handleUserEditing, handleUserStoppedEditing]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopEditing();
    };
  }, [stopEditing]);

  return {
    onlineUsers,
    editingUsers,
    startEditing,
    stopEditing,
    isTracking
  };
}
