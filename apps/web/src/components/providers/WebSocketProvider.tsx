"use client"

import * as React from "react"
import { createContext, useContext, useEffect, useRef, useState, useCallback, useMemo } from "react"
import { useAuthStore } from "@/lib/store/authStore"
import { usePWA } from "@/hooks/usePWA"
import { loggers } from "@/lib/logger"

const wsLogger = loggers.ws

// ============================================
// Types
// ============================================

interface WsMessage {
  type: string
  data: any
}

interface WebSocketContextValue {
  isConnected: boolean
  reconnectAttempts: number
  send: (event: string, data: any) => void
  on: (event: string, handler: (data: any) => void) => void
  off: (event: string, handler: (data: any) => void) => void
}

// ============================================
// Context
// ============================================

const WebSocketContext = createContext<WebSocketContextValue | null>(null)

// ============================================
// Provider
// ============================================

interface WebSocketProviderProps {
  children: React.ReactNode
}

/**
 * Global WebSocket provider that maintains a single connection for the app
 * 
 * Features:
 * - Single shared WebSocket connection
 * - Auto-reconnection with exponential backoff
 * - Auto-authentication when connected
 * - Event-based message handling
 * - Ping/pong heartbeat
 */
export function WebSocketProvider({ children }: WebSocketProviderProps) {
  const { isOnline } = usePWA()
  const { isAuthenticated } = useAuthStore()
  
  const [isConnected, setIsConnected] = useState(false)
  const [reconnectAttempts, setReconnectAttempts] = useState(0)
  
  const ws = useRef<WebSocket | null>(null)
  const eventHandlers = useRef<Map<string, Set<(data: any) => void>>>(new Map())
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pingTimer = useRef<ReturnType<typeof setInterval> | null>(null)
  const mountedRef = useRef(true)
  const reconnectAttemptsRef = useRef(0)
  const isConnectingRef = useRef(false)
  
  const wsUrl = typeof window !== 'undefined' 
    ? (import.meta.env.PUBLIC_WS_URL || 'ws://localhost:3000/ws')
    : 'ws://localhost:3000/ws'
  
  const maxReconnectAttempts = 10
  const reconnectInterval = 1000

  // Send message
  const send = useCallback((event: string, data: any) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      const message: WsMessage = { type: event, data }
      ws.current.send(JSON.stringify(message))
    } else {
      wsLogger.warn('Cannot send message, WebSocket not connected:', event)
    }
  }, [])

  // Start heartbeat
  const startHeartbeat = useCallback(() => {
    if (pingTimer.current) {
      clearInterval(pingTimer.current)
    }
    pingTimer.current = setInterval(() => {
      if (ws.current?.readyState === WebSocket.OPEN) {
        send('ping', {})
      }
    }, 30000)
  }, [send])

  // Stop heartbeat
  const stopHeartbeat = useCallback(() => {
    if (pingTimer.current) {
      clearInterval(pingTimer.current)
      pingTimer.current = null
    }
  }, [])

  // Handle incoming message
  const handleMessage = useCallback((event: MessageEvent) => {
    if (!mountedRef.current) return
    
    try {
      const message: WsMessage = JSON.parse(event.data)
      wsLogger.debug('WS message received:', message.type)
      
      // Get handlers for this event type
      const handlers = eventHandlers.current.get(message.type)
      if (handlers) {
        handlers.forEach(handler => {
          try {
            handler(message.data)
          } catch (err) {
            wsLogger.error('Error in event handler:', err)
          }
        })
      }
    } catch (err) {
      wsLogger.error('Failed to parse WebSocket message:', err)
    }
  }, [])

  // Connect
  const connect = useCallback(() => {
    if (!isOnline) {
      wsLogger.debug('Cannot connect while offline')
      return
    }
    
    if (ws.current?.readyState === WebSocket.OPEN || 
        ws.current?.readyState === WebSocket.CONNECTING ||
        isConnectingRef.current) {
      return
    }
    
    isConnectingRef.current = true
    
    try {
      wsLogger.info('Connecting to WebSocket:', wsUrl)
      ws.current = new WebSocket(wsUrl)
      
      ws.current.onopen = () => {
        if (!mountedRef.current) return
        
        wsLogger.info('WebSocket connected')
        isConnectingRef.current = false
        setIsConnected(true)
        reconnectAttemptsRef.current = 0
        setReconnectAttempts(0)
        
        // Auto-authenticate
        const token = localStorage.getItem('auth_token')
        if (token) {
          send('auth', { token })
        }
        
        startHeartbeat()
      }
      
      ws.current.onmessage = handleMessage
      
      ws.current.onclose = () => {
        if (!mountedRef.current) return
        
        wsLogger.info('WebSocket disconnected')
        isConnectingRef.current = false
        setIsConnected(false)
        stopHeartbeat()
        
        // Schedule reconnect
        if (isAuthenticated && reconnectAttemptsRef.current < maxReconnectAttempts) {
          const delay = Math.min(
            reconnectInterval * Math.pow(2, reconnectAttemptsRef.current),
            30000
          )
          wsLogger.debug(`Reconnecting in ${delay}ms...`)
          
          reconnectTimer.current = setTimeout(() => {
            reconnectAttemptsRef.current++
            setReconnectAttempts(reconnectAttemptsRef.current)
            connect()
          }, delay)
        }
      }
      
      ws.current.onerror = (error) => {
        wsLogger.error('WebSocket error:', error)
        isConnectingRef.current = false
      }
      
    } catch (err) {
      wsLogger.error('Failed to create WebSocket:', err)
      isConnectingRef.current = false
    }
  }, [wsUrl, isOnline, isAuthenticated, send, startHeartbeat, stopHeartbeat, handleMessage])

  // Disconnect
  const disconnect = useCallback(() => {
    if (reconnectTimer.current) {
      clearTimeout(reconnectTimer.current)
      reconnectTimer.current = null
    }
    stopHeartbeat()
    
    if (ws.current) {
      ws.current.close()
      ws.current = null
    }
  }, [stopHeartbeat])

  // Subscribe to event
  const on = useCallback((event: string, handler: (data: any) => void) => {
    if (!eventHandlers.current.has(event)) {
      eventHandlers.current.set(event, new Set())
    }
    eventHandlers.current.get(event)!.add(handler)
  }, [])

  // Unsubscribe from event
  const off = useCallback((event: string, handler: (data: any) => void) => {
    const handlers = eventHandlers.current.get(event)
    if (handlers) {
      handlers.delete(handler)
      if (handlers.size === 0) {
        eventHandlers.current.delete(event)
      }
    }
  }, [])

  // Connect when authenticated
  useEffect(() => {
    mountedRef.current = true
    
    if (isAuthenticated && isOnline) {
      connect()
    } else {
      disconnect()
    }
    
    return () => {
      mountedRef.current = false
      disconnect()
    }
  }, [isAuthenticated, isOnline, connect, disconnect])

  // Re-authenticate when token changes
  useEffect(() => {
    if (isConnected && isAuthenticated) {
      const token = localStorage.getItem('auth_token')
      if (token) {
        send('auth', { token })
      }
    }
  }, [isConnected, isAuthenticated, send])

  const value = useMemo<WebSocketContextValue>(() => ({
    isConnected,
    reconnectAttempts,
    send,
    on,
    off,
  }), [isConnected, reconnectAttempts, send, on, off])

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  )
}

// ============================================
// Hook
// ============================================

/**
 * Hook to access the global WebSocket connection
 */
export function useGlobalWebSocket() {
  const context = useContext(WebSocketContext)
  if (!context) {
    throw new Error('useGlobalWebSocket must be used within a WebSocketProvider')
  }
  return context
}

export default WebSocketProvider
