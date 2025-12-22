"use client"

import * as React from "react"
import { useEffect, useState, useCallback, useRef } from "react"
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
import { useWebSocket } from "@/hooks/useWebSocket"
import { useAuthStore } from "@/lib/store/authStore"

// ============================================
// Types
// ============================================

export interface PresenceUser {
  id: string
  email: string
  name?: string
  avatar?: string
  website_id?: string
  joined_at?: string
}

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
  // If it's a file URL, add auth token
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
// Component
// ============================================

/**
 * Real-time presence avatars showing who is currently viewing/editing a website
 * 
 * @example
 * ```tsx
 * <PresenceAvatars 
 *   websiteId="123" 
 *   maxAvatars={3} 
 *   size="sm"
 * />
 * ```
 */
export function PresenceAvatars({
  websiteId,
  maxAvatars = 4,
  size = "sm",
  className,
  showCurrentUser = false,
}: PresenceAvatarsProps) {
  const [onlineUsers, setOnlineUsers] = useState<PresenceUser[]>([])
  const { user, isAuthenticated } = useAuthStore()
  const hasJoinedRef = useRef(false)
  
  // Get WebSocket URL from env
  const wsUrl = import.meta.env.PUBLIC_WS_URL || 'ws://localhost:3000/ws'
  
  const ws = useWebSocket({
    url: wsUrl,
    autoConnect: isAuthenticated,
  })

  // Join website room when connected
  useEffect(() => {
    if (!ws.isConnected || !isAuthenticated || !websiteId || hasJoinedRef.current) return

    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
    if (!token) return

    // Authenticate first
    ws.send('auth', { token })

    // Join website presence room
    setTimeout(() => {
      ws.send('presence:join-website', {
        website_id: websiteId,
        user: {
          id: user?.id,
          email: user?.email,
          name: (user as any)?.name,
          avatar: (user as any)?.avatar,
        }
      })
      hasJoinedRef.current = true
    }, 100)

    return () => {
      if (hasJoinedRef.current) {
        ws.send('presence:leave-website', { website_id: websiteId })
        hasJoinedRef.current = false
      }
    }
  }, [ws.isConnected, isAuthenticated, websiteId, user])

  // Handle presence events
  const handlePresenceUpdate = useCallback((data: any) => {
    if (data?.website_id !== websiteId) return
    
    if (data?.users && Array.isArray(data.users)) {
      setOnlineUsers(data.users)
    }
  }, [websiteId])

  const handleUserJoined = useCallback((data: any) => {
    if (data?.website_id !== websiteId || !data?.user) return
    
    setOnlineUsers(prev => {
      // Don't add if already exists
      if (prev.some(u => u.id === data.user.id)) return prev
      return [...prev, data.user]
    })
  }, [websiteId])

  const handleUserLeft = useCallback((data: any) => {
    if (data?.website_id !== websiteId || !data?.user_id) return
    
    setOnlineUsers(prev => prev.filter(u => u.id !== data.user_id))
  }, [websiteId])

  // Subscribe to presence events
  useEffect(() => {
    if (!ws.isConnected) return

    ws.on('presence:website:users', handlePresenceUpdate)
    ws.on('presence:website:user-joined', handleUserJoined)
    ws.on('presence:website:user-left', handleUserLeft)

    // Request current users
    ws.send('presence:get-website-users', { website_id: websiteId })

    return () => {
      ws.off('presence:website:users', handlePresenceUpdate)
      ws.off('presence:website:user-joined', handleUserJoined)
      ws.off('presence:website:user-left', handleUserLeft)
    }
  }, [ws.isConnected, ws.on, ws.off, ws.send, websiteId, handlePresenceUpdate, handleUserJoined, handleUserLeft])

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
