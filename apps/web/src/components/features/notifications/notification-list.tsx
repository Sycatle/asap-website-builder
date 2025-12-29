"use client"

import { BellOff, Check } from "lucide-react"

import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import type { Notification } from "@/lib/api/notifications"
import { NotificationItem } from "./notification-item"

// ============================================================================
// Types
// ============================================================================

export interface NotificationListProps {
  notifications: Notification[]
  isLoading: boolean
  hasMore?: boolean
  onLoadMore?: () => void
  onMarkAsRead: (id: string) => void
  onDelete: (id: string) => void
  onClick: (notification: Notification) => void
  emptyState?: 'all' | 'unread'
}

// ============================================================================
// Sub-components
// ============================================================================

function LoadingSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="p-6 space-y-4">
      {[...Array(count)].map((_, i) => (
        <div key={i} className="flex gap-4">
          <Skeleton className="h-12 w-12 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  )
}

interface EmptyStateProps {
  variant: 'all' | 'unread'
}

function EmptyState({ variant }: EmptyStateProps) {
  if (variant === 'unread') {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Check className="h-16 w-16 text-green-500/50 mb-4" />
        <p className="text-lg font-medium">Tout est lu !</p>
        <p className="text-sm text-muted-foreground mt-1">
          Vous avez lu toutes vos notifications
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <BellOff className="h-16 w-16 text-muted-foreground/30 mb-4" />
      <p className="text-lg font-medium">Aucune notification</p>
      <p className="text-sm text-muted-foreground mt-1">
        Vous n'avez pas de notifications pour le moment
      </p>
    </div>
  )
}

// ============================================================================
// Main Component
// ============================================================================

export function NotificationList({ 
  notifications, 
  isLoading, 
  hasMore,
  onLoadMore,
  onMarkAsRead, 
  onDelete, 
  onClick,
  emptyState = 'all',
}: NotificationListProps) {
  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-0">
          <LoadingSkeleton count={emptyState === 'unread' ? 3 : 5} />
        </CardContent>
      </Card>
    )
  }

  if (notifications.length === 0) {
    return (
      <Card>
        <CardContent className="p-0">
          <EmptyState variant={emptyState} />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardContent className="p-0 divide-y">
        {notifications.map((notification) => (
          <NotificationItem
            key={notification.id}
            notification={notification}
            onMarkAsRead={onMarkAsRead}
            onDelete={onDelete}
            onClick={onClick}
          />
        ))}
        {hasMore && onLoadMore && (
          <div className="p-4 text-center">
            <Button variant="outline" onClick={onLoadMore}>
              Charger plus
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
