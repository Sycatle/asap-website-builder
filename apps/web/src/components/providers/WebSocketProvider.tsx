"use client"

import * as React from "react"
import { createContext, useContext, useEffect, useRef, useState, useCallback, useMemo } from "react"
import { useAuthStore } from "@/lib/store/authStore"
import { usePWA } from "@/hooks/usePWA"
import { loggers } from "@/lib/logger"
import { getWsBaseUrl } from "@/lib/api/base-url"

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
  isWsAuthenticated: boolean
  reconnectAttempts: number
  send: (event: string, data: any) => void
  on: (event: string, handler: (data: any) => void) => (() => void)
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
 */
export function WebSocketProvider({ children }: WebSocketProviderProps) {
  const { isOnline } = usePWA()
  const { isAuthenticated } = useAuthStore()
  
  const [isConnected, setIsConnected] = useState(false)
  const [isWsAuthenticated, setIsWsAuthenticated] = useState(false)
  const [reconnectAttempts, setReconnectAttempts] = useState(0)
  
  const ws = useRef<WebSocket | null>(null)
  const eventHandlers = useRef<Map<string, Set<(data: any) => void>>>(new Map())
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const mountedRef = useRef(true)
  const reconnectAttemptsRef = useRef(0)
  const isConnectingRef = useRef(false)
  const socketIdRef = useRef(0)
  
  const wsUrl = getWsBaseUrl()
  
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

  // Handle incoming message
  const handleMessage = useCallback((event: MessageEvent) => {
    if (!mountedRef.current) return
    
    try {
      const message: WsMessage = JSON.parse(event.data)
      wsLogger.debug('WS message received:', message.type)
      
      // Track auth success
      if (message.type === 'auth-success') {
        wsLogger.info('WebSocket authenticated successfully')
        setIsWsAuthenticated(true)
      } else if (message.type === 'auth-failed') {
        wsLogger.warn('WebSocket authentication failed')
        setIsWsAuthenticated(false)
      }
      
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
      return
    }
    
    if (ws.current?.readyState === WebSocket.OPEN || 
        ws.current?.readyState === WebSocket.CONNECTING ||
        isConnectingRef.current) {
      return
    }
    
    isConnectingRef.current = true
    const currentSocketId = ++socketIdRef.current
    
    try {
      wsLogger.info('Connecting to WebSocket:', wsUrl)
      const socket = new WebSocket(wsUrl)
      
      socket.onopen = () => {
        // Check if this is still the current socket
        if (currentSocketId !== socketIdRef.current) {
          socket.close()
          return
        }
        
        if (!mountedRef.current) {
          socket.close()
          return
        }
        
        wsLogger.info('WebSocket connected')
        isConnectingRef.current = false
        setIsConnected(true)
        reconnectAttemptsRef.current = 0
        setReconnectAttempts(0)
        
        // Auto-authenticate
        const token = localStorage.getItem('auth_token')
        if (token && socket.readyState === WebSocket.OPEN) {
          const authMessage = JSON.stringify({ type: 'auth', data: { token } })
          socket.send(authMessage)
        }
      }
      
      socket.onmessage = (event) => {
        // Check if this is still the current socket
        if (currentSocketId !== socketIdRef.current) {
          return
        }
        
        handleMessage(event)
      }
      
      socket.onclose = () => {
        // Only update state if this is still the current socket
        if (currentSocketId !== socketIdRef.current) {
          return
        }
        
        wsLogger.info('WebSocket disconnected')
        isConnectingRef.current = false
        setIsConnected(false)
        setIsWsAuthenticated(false)
        
        if (!mountedRef.current) {
          return
        }
        
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
      
      socket.onerror = (error) => {
        wsLogger.error('WebSocket error:', error)
        isConnectingRef.current = false
      }
      
      // Store socket in ref after all handlers are attached
      ws.current = socket
      
    } catch (err) {
      wsLogger.error('Failed to create WebSocket:', err)
      isConnectingRef.current = false
    }
  }, [wsUrl, isOnline, isAuthenticated, handleMessage])

  // Disconnect
  const disconnect = useCallback(() => {
    if (reconnectTimer.current) {
      clearTimeout(reconnectTimer.current)
      reconnectTimer.current = null
    }
    
    if (ws.current) {
      ws.current.close()
      ws.current = null
    }
    
    isConnectingRef.current = false
    setIsConnected(false)
    setIsWsAuthenticated(false)
  }, [])

  // Subscribe to event - returns unsubscribe function to prevent memory leaks
  const on = useCallback((event: string, handler: (data: any) => void) => {
    if (!eventHandlers.current.has(event)) {
      eventHandlers.current.set(event, new Set())
    }
    eventHandlers.current.get(event)!.add(handler)
    
    // Return cleanup function that captures the exact reference
    return () => {
      const handlers = eventHandlers.current.get(event)
      if (handlers) {
        handlers.delete(handler)
        if (handlers.size === 0) {
          eventHandlers.current.delete(event)
        }
      }
    }
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
    if (ws.current?.readyState === WebSocket.OPEN) {
      return
    }
    
    if (isAuthenticated && isOnline) {
      connect()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, isOnline])

  // Handle disconnect when auth state changes to false
  useEffect(() => {
    if (!isAuthenticated && ws.current) {
      disconnect()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated])
  
  // Cleanup on actual unmount
  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      disconnect()
    }
  }, [])

  const value = useMemo<WebSocketContextValue>(() => ({
    isConnected,
    isWsAuthenticated,
    reconnectAttempts,
    send,
    on,
    off,
  }), [isConnected, isWsAuthenticated, reconnectAttempts, send, on, off])

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
