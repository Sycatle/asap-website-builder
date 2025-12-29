"use client"

import * as React from "react"
import { useEffect, useState, useRef, useCallback } from "react"
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
import { navigate } from "@/components/app-router"
import type { WebsitePresenceUser } from "@/lib/types"

// Re-export type for consumers
export type { WebsitePresenceUser }

interface PresenceAvatarsProps {
  /** Website ID to track presence for */
  websiteId: string
  /** Current page the user is on */
  currentPage?: string
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
  offline: "bg-muted-foreground",
}

// ============================================
// Custom Hook for Presence Logic (Single Responsibility)
// ============================================

interface UseWebsitePresenceOptions {
  websiteId: string
  user: { id: string; email: string; name?: string; avatar?: string } | null
  enabled: boolean
  currentPage?: string
}

interface UseWebsitePresenceReturn {
  onlineUsers: WebsitePresenceUser[]
  updateCurrentPage: (page: string) => void
}

function useWebsitePresence({ websiteId, user, enabled, currentPage }: UseWebsitePresenceOptions): UseWebsitePresenceReturn {
  const [onlineUsers, setOnlineUsers] = useState<WebsitePresenceUser[]>([])
  const ws = useGlobalWebSocket()
  
  // Track the session we've joined
  const sessionRef = useRef<string | null>(null)
  // Track the last sent page to avoid duplicate sends
  const lastSentPageRef = useRef<string | undefined>(undefined)

  // Function to update current page
  const updateCurrentPage = useCallback((page: string) => {
    if (!ws.isConnected || !ws.isWsAuthenticated || !user?.id) return
    if (lastSentPageRef.current === page) return
    
    lastSentPageRef.current = page
    ws.send('presence:update-page', { current_page: page })
  }, [ws, user?.id])

  // Send page update when currentPage changes
  useEffect(() => {
    if (currentPage && sessionRef.current) {
      updateCurrentPage(currentPage)
    }
  }, [currentPage, updateCurrentPage])

  useEffect(() => {
    // Build a session key from all dependencies that should trigger a rejoin
    const isReady = enabled && ws.isConnected && ws.isWsAuthenticated && websiteId && user?.id
    const sessionKey = isReady ? `${websiteId}:${user.id}:${ws.isWsAuthenticated}` : null

    // Not ready - reset session and clear users
    if (!isReady || !sessionKey) {
      if (sessionRef.current) {
        sessionRef.current = null
        lastSentPageRef.current = undefined
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

    const handleUserPageUpdated = (data: any) => {
      if (data?.website_id !== websiteId || !data?.user_id) return
      setOnlineUsers(prev => prev.map(u => 
        u.id === data.user_id 
          ? { ...u, current_page: data.current_page }
          : u
      ))
    }

    // Subscribe to events BEFORE joining
    ws.on('presence:website:users', handleUsersUpdate)
    ws.on('presence:website:user-joined', handleUserJoined)
    ws.on('presence:website:user-left', handleUserLeft)
    ws.on('presence:website:user-page-updated', handleUserPageUpdated)

    // Join the website with current page
    ws.send('presence:join-website', {
      website_id: websiteId,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
        current_page: currentPage,
      }
    })

    // Track the current page we sent
    lastSentPageRef.current = currentPage

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
      ws.off('presence:website:user-page-updated', handleUserPageUpdated)

      // Leave the website if connected
      if (sessionRef.current && ws.isConnected) {
        ws.send('presence:leave-website', { website_id: websiteId })
      }

      // Clear session
      sessionRef.current = null
      lastSentPageRef.current = undefined
    }
  }, [enabled, ws.isConnected, ws.isWsAuthenticated, websiteId, user?.id, user?.email, user?.name, user?.avatar, currentPage, ws])

  return { onlineUsers, updateCurrentPage }
}

// ============================================
// Helper: Get page display name
// ============================================

const PAGE_LABELS: Record<string, string> = {
  'dashboard': 'Accueil',
  'extensions': 'Extensions',
  'extension': 'Extension',
  'cloud': 'Médias',
  'settings': 'Paramètres',
  'studio': 'Studio',
  'pages': 'Pages',
  'administrators': 'Administrateurs',
  'theme': 'Thème',
  'analytics': 'Analytics',
  'seo': 'SEO',
}

function getPageLabel(page?: string): string {
  if (!page) return 'Navigation...'
  return PAGE_LABELS[page] || page
}

// ============================================
// Component
// ============================================

/**
 * Real-time presence avatars showing who is currently viewing/editing a website
 */
export function PresenceAvatars({
  websiteId,
  currentPage,
  maxAvatars = 4,
  size = "sm",
  className,
  showCurrentUser = false,
}: PresenceAvatarsProps) {
  const { user, isAuthenticated } = useAuthStore()
  
  // Use custom hook for presence logic
  const { onlineUsers } = useWebsitePresence({
    websiteId,
    user: user ? { 
      id: user.id, 
      email: user.email, 
      name: (user as any).name, 
      avatar: (user as any).avatar 
    } : null,
    enabled: isAuthenticated,
    currentPage,
  })

  // Navigate to user's current page
  const handleNavigateToUser = (presenceUser: WebsitePresenceUser) => {
    if (presenceUser.current_page && websiteId) {
      const targetPath = presenceUser.current_page === 'dashboard' 
        ? `/app/${websiteId}` 
        : `/app/${websiteId}/${presenceUser.current_page}`
      navigate(targetPath)
    }
  }

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
      {visibleUsers.map((presenceUser, index) => {
        const hasPage = !!presenceUser.current_page
        const pageLabel = getPageLabel(presenceUser.current_page)
        
        return (
          <Tooltip key={presenceUser.id}>
            <TooltipTrigger asChild>
              <button 
                type="button"
                className={cn(
                  "relative focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-full",
                  hasPage && "cursor-pointer"
                )}
                style={{ zIndex: visibleUsers.length - index }}
                onClick={() => hasPage && handleNavigateToUser(presenceUser)}
                disabled={!hasPage}
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
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">
              <p className="font-medium">{presenceUser.name || presenceUser.email}</p>
              {presenceUser.name && (
                <p className="text-muted-foreground">{presenceUser.email}</p>
              )}
              <p className="text-muted-foreground mt-1">
                📍 {pageLabel}
                {hasPage && <span className="ml-1 text-primary">(cliquer pour rejoindre)</span>}
              </p>
            </TooltipContent>
          </Tooltip>
        )
      })}
      
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
