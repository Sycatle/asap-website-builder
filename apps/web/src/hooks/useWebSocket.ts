import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { usePWA } from './usePWA';

interface WebSocketHookOptions {
  url: string;
  autoConnect?: boolean;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  onOpen?: () => void;
  onClose?: () => void;
  onError?: (error: Event) => void;
}

interface WebSocketHookReturn {
  isConnected: boolean;
  send: (event: string, data: any) => void;
  on: (event: string, handler: Function) => void;
  off: (event: string, handler: Function) => void;
  connect: () => void;
  disconnect: () => void;
  reconnectAttempts: number;
}

interface WsMessage {
  type: string;
  data: any;
}

/**
 * WebSocket hook for real-time communication
 * 
 * Features:
 * - Auto-reconnection with exponential backoff
 * - Event-based message handling
 * - Integration with PWA offline detection
 * - Authentication support
 * - Ping/pong heartbeat
 * 
 * @example
 * ```tsx
 * const ws = useWebSocket({
 *   url: 'ws://localhost:3000/ws',
 *   autoConnect: true
 * });
 * 
 * useEffect(() => {
 *   ws.on('notification', (data) => {
 *     toast(data.message);
 *   });
 * }, [ws]);
 * ```
 */
export function useWebSocket(options: WebSocketHookOptions): WebSocketHookReturn {
  const { isOnline } = usePWA();
  const [isConnected, setIsConnected] = useState(false);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  
  const ws = useRef<WebSocket | null>(null);
  const eventHandlers = useRef<Map<string, Set<Function>>>(new Map());
  const reconnectTimer = useRef<NodeJS.Timeout>();
  const pingTimer = useRef<NodeJS.Timeout>();
  const mountedRef = useRef(true);

  const {
    url,
    autoConnect = true,
    reconnectInterval = 1000,
    maxReconnectAttempts = 10,
    onOpen,
    onClose,
    onError
  } = options;

  // Start heartbeat ping
  const startHeartbeat = useCallback(() => {
    if (pingTimer.current) {
      clearInterval(pingTimer.current);
    }

    pingTimer.current = setInterval(() => {
      if (ws.current?.readyState === WebSocket.OPEN) {
        send('ping', {});
      }
    }, 30000); // Ping every 30 seconds
  }, []);

  // Stop heartbeat
  const stopHeartbeat = useCallback(() => {
    if (pingTimer.current) {
      clearInterval(pingTimer.current);
      pingTimer.current = undefined;
    }
  }, []);

  // Connect to WebSocket
  const connect = useCallback(() => {
    if (!isOnline) {
      console.log('[WS] Cannot connect while offline');
      return;
    }

    if (ws.current?.readyState === WebSocket.OPEN) {
      console.log('[WS] Already connected');
      return;
    }

    try {
      console.log('[WS] Connecting to', url);
      ws.current = new WebSocket(url);

      ws.current.onopen = () => {
        if (!mountedRef.current) return;
        
        console.log('[WS] Connected');
        setIsConnected(true);
        setReconnectAttempts(0);
        
        // Authenticate with stored token
        const token = localStorage.getItem('auth-token');
        if (token) {
          send('auth', { token });
        }

        startHeartbeat();
        onOpen?.();
      };

      ws.current.onmessage = (event) => {
        if (!mountedRef.current) return;

        try {
          const message: WsMessage = JSON.parse(event.data);
          console.log('[WS] Message received:', message.type);
          
          const handlers = eventHandlers.current.get(message.type);
          if (handlers) {
            handlers.forEach(handler => {
              try {
                handler(message.data);
              } catch (error) {
                console.error('[WS] Handler error:', error);
              }
            });
          }
        } catch (error) {
          console.error('[WS] Failed to parse message:', error);
        }
      };

      ws.current.onerror = (error) => {
        if (!mountedRef.current) return;
        
        console.error('[WS] Error:', error);
        onError?.(error);
      };

      ws.current.onclose = () => {
        if (!mountedRef.current) return;
        
        console.log('[WS] Disconnected');
        setIsConnected(false);
        stopHeartbeat();
        onClose?.();
        
        // Auto-reconnect with exponential backoff
        if (reconnectAttempts < maxReconnectAttempts && isOnline) {
          const delay = Math.min(
            reconnectInterval * Math.pow(2, reconnectAttempts),
            30000 // Max 30 seconds
          );
          
          console.log(`[WS] Reconnecting in ${delay}ms... (attempt ${reconnectAttempts + 1}/${maxReconnectAttempts})`);
          
          reconnectTimer.current = setTimeout(() => {
            if (mountedRef.current) {
              setReconnectAttempts(prev => prev + 1);
              connect();
            }
          }, delay);
        } else if (reconnectAttempts >= maxReconnectAttempts) {
          console.error('[WS] Max reconnect attempts reached');
        }
      };
    } catch (error) {
      console.error('[WS] Connection failed:', error);
    }
  }, [url, isOnline, reconnectAttempts, maxReconnectAttempts, reconnectInterval, onOpen, onClose, onError, startHeartbeat, stopHeartbeat]);

  // Disconnect from WebSocket
  const disconnect = useCallback(() => {
    console.log('[WS] Disconnecting...');
    
    if (reconnectTimer.current) {
      clearTimeout(reconnectTimer.current);
      reconnectTimer.current = undefined;
    }
    
    stopHeartbeat();
    
    if (ws.current) {
      ws.current.close();
      ws.current = null;
    }
    
    setIsConnected(false);
    setReconnectAttempts(0);
  }, [stopHeartbeat]);

  // Send message
  const send = useCallback((event: string, data: any) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      const message: WsMessage = { type: event, data };
      ws.current.send(JSON.stringify(message));
      console.log('[WS] Sent:', event);
    } else {
      console.warn('[WS] Cannot send message - not connected');
    }
  }, []);

  // Register event handler
  const on = useCallback((event: string, handler: Function) => {
    if (!eventHandlers.current.has(event)) {
      eventHandlers.current.set(event, new Set());
    }
    eventHandlers.current.get(event)!.add(handler);
    console.log('[WS] Handler registered for:', event);
  }, []);

  // Unregister event handler
  const off = useCallback((event: string, handler: Function) => {
    const handlers = eventHandlers.current.get(event);
    if (handlers) {
      handlers.delete(handler);
      console.log('[WS] Handler unregistered for:', event);
    }
  }, []);

  // Auto-connect on mount
  useEffect(() => {
    mountedRef.current = true;
    
    if (autoConnect) {
      connect();
    }
    
    return () => {
      mountedRef.current = false;
      disconnect();
    };
  }, [autoConnect, connect, disconnect]);

  // Reconnect when coming back online
  useEffect(() => {
    if (isOnline && !isConnected && reconnectAttempts > 0) {
      console.log('[WS] Coming back online, attempting to reconnect...');
      setReconnectAttempts(0);
      connect();
    }
  }, [isOnline, isConnected, reconnectAttempts, connect]);

  return {
    isConnected,
    send,
    on,
    off,
    connect,
    disconnect,
    reconnectAttempts
  };
}
