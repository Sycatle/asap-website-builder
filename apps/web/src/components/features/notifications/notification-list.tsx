"use client"

import { useTranslation } from 'react-i18next';
import { BellOff, Check } from "lucide-react"

import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
} from "@/components/ui/empty"
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

interface NotificationEmptyStateProps {
  variant: 'all' | 'unread'
}

function NotificationEmptyState({ variant }: NotificationEmptyStateProps) {
  const { t } = useTranslation(['dashboard']);
  
  if (variant === 'unread') {
    return (
      <Empty className="py-16 border-0">
        <EmptyHeader>
          <EmptyMedia className="text-green-500/50">
            <Check className="h-16 w-16" />
          </EmptyMedia>
          <EmptyTitle>{t('dashboard:notifications.allRead')}</EmptyTitle>
          <EmptyDescription>
            {t('dashboard:notifications.allReadDescription')}
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    )
  }

  return (
    <Empty className="py-16 border-0">
      <EmptyHeader>
        <EmptyMedia className="text-muted-foreground/30">
          <BellOff className="h-16 w-16" />
        </EmptyMedia>
        <EmptyTitle>{t('dashboard:notifications.empty')}</EmptyTitle>
        <EmptyDescription>
          {t('dashboard:notifications.emptyDescription')}
        </EmptyDescription>
      </EmptyHeader>
    </Empty>
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
  const { t } = useTranslation(['dashboard']);

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
          <NotificationEmptyState variant={emptyState} />
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
              {t('dashboard:notifications.loadMore')}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
