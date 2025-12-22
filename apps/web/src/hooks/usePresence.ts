/**
 * usePresence Hook
 * 
 * Handles user presence tracking for website-based real-time collaboration.
 * Uses the website presence system to track who is viewing/editing a website.
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { useGlobalWebSocket } from '../components/providers/WebSocketProvider';
import { useAuthStore } from '../lib/store/authStore';

// ============================================
// Types
// ============================================

export interface WebsitePresenceUser {
  id: string;
  email: string;
  name?: string;
  avatar?: string;
  joined_at?: string;
}

interface UsePresenceOptions {
  /** Website ID to track presence for */
  websiteId?: string;
  /** Enable debug logging */
  debug?: boolean;
}

interface UsePresenceReturn {
  /** List of all users present on the website */
  onlineUsers: WebsitePresenceUser[];
  /** Whether presence tracking is active */
  isTracking: boolean;
  /** Whether WebSocket is connected */
  isConnected: boolean;
  /** Join a website presence room */
  joinWebsite: (websiteId: string) => void;
  /** Leave the current website presence room */
  leaveWebsite: () => void;
}

/**
 * Hook to track user presence on a website
 * 
 * Tracks who is currently viewing/editing a specific website.
 * Automatically joins/leaves presence room when websiteId changes.
 * 
 * @example
 * ```tsx
 * // Track presence on a specific website
 * const { onlineUsers, isTracking, isConnected } = usePresence({
 *   websiteId: websiteId,
 *   debug: true
 * });
 * 
 * // Show who's online
 * return (
 *   <div>
 *     {onlineUsers.map(user => (
 *       <span key={user.id}>{user.name || user.email}</span>
 *     ))}
 *   </div>
 * );
 * ```
 */
export function usePresence(options: UsePresenceOptions = {}): UsePresenceReturn {
  const { websiteId, debug = false } = options;
  
  const { user, isAuthenticated } = useAuthStore();
  const ws = useGlobalWebSocket();

  const [onlineUsers, setOnlineUsers] = useState<WebsitePresenceUser[]>([]);
  const [isTracking, setIsTracking] = useState(false);
  
  // Track current website ID to handle changes
  const currentWebsiteIdRef = useRef<string | null>(null);

  // Log helper
  const log = useCallback((...args: unknown[]) => {
    if (debug) {
      console.log('[Presence]', ...args);
    }
  }, [debug]);

  // Join a website presence room
  const joinWebsite = useCallback((targetWebsiteId: string) => {
    if (!ws.isConnected || !ws.isWsAuthenticated || !user) {
      log('Cannot join website - not ready', { 
        connected: ws.isConnected, 
        authenticated: ws.isWsAuthenticated, 
        hasUser: !!user 
      });
      return;
    }

    // Leave previous website if any
    if (currentWebsiteIdRef.current && currentWebsiteIdRef.current !== targetWebsiteId) {
      log('Leaving previous website:', currentWebsiteIdRef.current);
      ws.send('presence:leave-website', { website_id: currentWebsiteIdRef.current });
    }

    currentWebsiteIdRef.current = targetWebsiteId;
    setIsTracking(true);

    log('Joining website:', targetWebsiteId);
    ws.send('presence:join-website', {
      website_id: targetWebsiteId,
      user: {
        id: user.id,
        email: user.email,
        name: (user as any).name,
        avatar: (user as any).avatar,
      }
    });

    // Request current users list after a short delay to ensure handlers are set up
    setTimeout(() => {
      ws.send('presence:get-website-users', { website_id: targetWebsiteId });
    }, 100);
  }, [ws, user, log]);

  // Leave the current website presence room
  const leaveWebsite = useCallback(() => {
    if (!currentWebsiteIdRef.current) {
      return;
    }

    log('Leaving website:', currentWebsiteIdRef.current);
    
    if (ws.isConnected) {
      ws.send('presence:leave-website', { website_id: currentWebsiteIdRef.current });
    }

    currentWebsiteIdRef.current = null;
    setIsTracking(false);
    setOnlineUsers([]);
  }, [ws, log]);

  // Handle users list update
  const handleUsersUpdate = useCallback((data: any) => {
    if (!data || !currentWebsiteIdRef.current) return;
    if (data.website_id !== currentWebsiteIdRef.current) return;

    if (data.users && Array.isArray(data.users)) {
      log('Users list updated:', data.users.length);
      setOnlineUsers(data.users);
    }
  }, [log]);

  // Handle user joined
  const handleUserJoined = useCallback((data: any) => {
    if (!data || !currentWebsiteIdRef.current) return;
    if (data.website_id !== currentWebsiteIdRef.current) return;
    if (!data.user) return;

    log('User joined:', data.user.email);
    setOnlineUsers(prev => {
      // Don't add if already in list
      if (prev.some(u => u.id === data.user.id)) return prev;
      return [...prev, data.user];
    });
  }, [log]);

  // Handle user left
  const handleUserLeft = useCallback((data: any) => {
    if (!data || !currentWebsiteIdRef.current) return;
    if (data.website_id !== currentWebsiteIdRef.current) return;
    if (!data.user_id) return;

    log('User left:', data.user_id);
    setOnlineUsers(prev => prev.filter(u => u.id !== data.user_id));
  }, [log]);

  // Set up event listeners
  useEffect(() => {
    if (!ws.isConnected) return;

    log('Setting up presence event handlers');

    ws.on('presence:website:users', handleUsersUpdate);
    ws.on('presence:website:user-joined', handleUserJoined);
    ws.on('presence:website:user-left', handleUserLeft);

    return () => {
      log('Cleaning up presence event handlers');
      ws.off('presence:website:users', handleUsersUpdate);
      ws.off('presence:website:user-joined', handleUserJoined);
      ws.off('presence:website:user-left', handleUserLeft);
    };
  }, [ws.isConnected, ws.on, ws.off, handleUsersUpdate, handleUserJoined, handleUserLeft, log]);

  // Auto-join website when websiteId prop changes
  useEffect(() => {
    if (!websiteId || !ws.isConnected || !ws.isWsAuthenticated || !isAuthenticated) {
      return;
    }

    // Join the website
    joinWebsite(websiteId);

    // Cleanup: leave when websiteId changes or component unmounts
    return () => {
      leaveWebsite();
    };
  }, [websiteId, ws.isConnected, ws.isWsAuthenticated, isAuthenticated, joinWebsite, leaveWebsite]);

  return {
    onlineUsers,
    isTracking,
    isConnected: ws.isConnected,
    joinWebsite,
    leaveWebsite,
  };
}
