"use client"

import * as React from "react"
import { useEffect, useState, useRef } from "react"
import { cn } from "@/lib/utils"
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { useGlobalWebSocket } from "@/components/providers/WebSocketProvider"
import { useAuthStore } from "@/lib/store/authStore"
import type { WebsitePresenceUser } from "@/lib/types"

// Re-export type for consumers
export type { WebsitePresenceUser }

interface PresenceAvatarsProps {
  /** Website ID to track presence for */
  websiteId: string
  /** Maximum number of avatars to display before showing "+N" */
  maxAvatars?: number
  /** Size of avatars */
  size?: "sm" | "md" | "lg"
  /** Additional class names */
  className?: string
  /** Show current user in the list */
  showCurrentUser?: boolean
}

// ============================================
// Helper functions
// ============================================

const getInitials = (name?: string, email?: string): string => {
  if (name) {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) || '?'
  }
  if (email) {
    return email.charAt(0).toUpperCase()
  }
  return '?'
}

const getAvatarUrl = (url?: string): string | undefined => {
  if (!url) return undefined
  const fileIdMatch = url.match(/\/files\/([a-f0-9-]+)/)
  if (fileIdMatch) {
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
    const baseUrl = typeof window !== 'undefined'
      ? (import.meta.env.PUBLIC_API_URL || 'http://localhost:3000/api')
      : 'http://localhost:3000/api'
    return token ? `${baseUrl}/files/${fileIdMatch[1]}?token=${token}` : url
  }
  return url
}

const sizeClasses = {
  sm: "h-6 w-6 text-[10px]",
  md: "h-8 w-8 text-xs",
  lg: "h-10 w-10 text-sm",
}

const statusColors = {
  online: "bg-green-500",
  away: "bg-yellow-500",
  offline: "bg-gray-400",
}

// ============================================
// Custom Hook for Presence Logic (Single Responsibility)
// ============================================

interface UseWebsitePresenceOptions {
  websiteId: string
  user: { id: string; email: string; name?: string; avatar?: string } | null
  enabled: boolean
}

function useWebsitePresence({ websiteId, user, enabled }: UseWebsitePresenceOptions) {
  const [onlineUsers, setOnlineUsers] = useState<WebsitePresenceUser[]>([])
  const ws = useGlobalWebSocket()
  
  // Track the session we've joined
  const sessionRef = useRef<string | null>(null)

  useEffect(() => {
    // Build a session key from all dependencies that should trigger a rejoin
    const isReady = enabled && ws.isConnected && ws.isWsAuthenticated && websiteId && user?.id
    const sessionKey = isReady ? `${websiteId}:${user.id}:${ws.isWsAuthenticated}` : null

    // Not ready - reset session and clear users
    if (!isReady || !sessionKey) {
      if (sessionRef.current) {
        sessionRef.current = null
        setOnlineUsers([])
      }
      return
    }

    // Already joined this session
    if (sessionRef.current === sessionKey) {
      return
    }

    // Event handlers (stable references via closure)
    const handleUsersUpdate = (data: any) => {
      if (data?.website_id !== websiteId) return
      if (data?.users && Array.isArray(data.users)) {
        setOnlineUsers(data.users)
      }
    }

    const handleUserJoined = (data: any) => {
      if (data?.website_id !== websiteId || !data?.user) return
      setOnlineUsers(prev => {
        if (prev.some(u => u.id === data.user.id)) return prev
        return [...prev, data.user]
      })
    }

    const handleUserLeft = (data: any) => {
      if (data?.website_id !== websiteId || !data?.user_id) return
      setOnlineUsers(prev => prev.filter(u => u.id !== data.user_id))
    }

    // Subscribe to events BEFORE joining
    ws.on('presence:website:users', handleUsersUpdate)
    ws.on('presence:website:user-joined', handleUserJoined)
    ws.on('presence:website:user-left', handleUserLeft)

    // Join the website
    ws.send('presence:join-website', {
      website_id: websiteId,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
      }
    })

    // Request current users list after a short delay
    const requestTimer = setTimeout(() => {
      ws.send('presence:get-website-users', { website_id: websiteId })
    }, 100)

    // Mark session as active
    sessionRef.current = sessionKey

    // Cleanup function
    return () => {
      clearTimeout(requestTimer)

      // Unsubscribe from events
      ws.off('presence:website:users', handleUsersUpdate)
      ws.off('presence:website:user-joined', handleUserJoined)
      ws.off('presence:website:user-left', handleUserLeft)

      // Leave the website if connected
      if (sessionRef.current && ws.isConnected) {
        ws.send('presence:leave-website', { website_id: websiteId })
      }

      // Clear session
      sessionRef.current = null
    }
  }, [enabled, ws.isConnected, ws.isWsAuthenticated, websiteId, user?.id, user?.email, user?.name, user?.avatar, ws])

  return onlineUsers
}

// ============================================
// Component
// ============================================

/**
 * Real-time presence avatars showing who is currently viewing/editing a website
 */
export function PresenceAvatars({
  websiteId,
  maxAvatars = 4,
  size = "sm",
  className,
  showCurrentUser = false,
}: PresenceAvatarsProps) {
  const { user, isAuthenticated } = useAuthStore()
  
  // Use custom hook for presence logic
  const onlineUsers = useWebsitePresence({
    websiteId,
    user: user ? { 
      id: user.id, 
      email: user.email, 
      name: (user as any).name, 
      avatar: (user as any).avatar 
    } : null,
    enabled: isAuthenticated,
  })

  // Filter out current user if needed
  const displayUsers = showCurrentUser 
    ? onlineUsers 
    : onlineUsers.filter(u => u.id !== user?.id)

  // If no other users online, don't render anything
  if (displayUsers.length === 0) {
    return null
  }

  const visibleUsers = displayUsers.slice(0, maxAvatars)
  const remainingCount = displayUsers.length - maxAvatars

  return (
    <div className={cn("flex items-center -space-x-2", className)}>
      {visibleUsers.map((presenceUser, index) => (
        <Tooltip key={presenceUser.id}>
          <TooltipTrigger asChild>
            <div 
              className="relative"
              style={{ zIndex: visibleUsers.length - index }}
            >
              <Avatar 
                className={cn(
                  sizeClasses[size],
                  "border-2 border-background ring-0 transition-transform hover:scale-110 hover:z-50"
                )}
              >
                <AvatarImage 
                  src={getAvatarUrl(presenceUser.avatar)} 
                  alt={presenceUser.name || presenceUser.email} 
                />
                <AvatarFallback className="bg-primary text-primary-foreground">
                  {getInitials(presenceUser.name, presenceUser.email)}
                </AvatarFallback>
              </Avatar>
              {/* Online indicator */}
              <span 
                className={cn(
                  "absolute bottom-0 right-0 block rounded-full ring-2 ring-background",
                  statusColors.online,
                  size === "sm" ? "h-1.5 w-1.5" : size === "md" ? "h-2 w-2" : "h-2.5 w-2.5"
                )}
              />
            </div>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs">
            <p className="font-medium">{presenceUser.name || presenceUser.email}</p>
            {presenceUser.name && (
              <p className="text-muted-foreground">{presenceUser.email}</p>
            )}
          </TooltipContent>
        </Tooltip>
      ))}
      
      {/* Show remaining count */}
      {remainingCount > 0 && (
        <Tooltip>
          <TooltipTrigger asChild>
            <div 
              className={cn(
                sizeClasses[size],
                "flex items-center justify-center rounded-full border-2 border-background bg-muted text-muted-foreground font-medium"
              )}
              style={{ zIndex: 0 }}
            >
              +{remainingCount}
            </div>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs">
            <p>{remainingCount} autre{remainingCount > 1 ? 's' : ''} en ligne</p>
          </TooltipContent>
        </Tooltip>
      )}
    </div>
  )
}

export default PresenceAvatars
