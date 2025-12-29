"use client"

import * as React from "react"
import { useTranslation } from 'react-i18next';
import {
  Check,
  Trash2,
  ExternalLink,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { formatRelativeTimeFr } from "@/lib/utils/formatters"
import type { Notification } from "@/lib/api/notifications"
import { 
  categoryIcons, 
  categoryLabels, 
  priorityLabels, 
  priorityColors,
  iconMap,
} from "./config"

// ============================================================================
// Types
// ============================================================================

export interface NotificationItemProps {
  notification: Notification
  onMarkAsRead: (id: string) => void
  onDelete: (id: string) => void
  onClick: (notification: Notification) => void
}

// ============================================================================
// Helpers
// ============================================================================

function getNotificationIcon(notification: Notification) {
  if (notification.icon && iconMap[notification.icon]) {
    return iconMap[notification.icon]
  }
  return categoryIcons[notification.category]
}

// ============================================================================
// Component
// ============================================================================

export function NotificationItem({ 
  notification, 
  onMarkAsRead, 
  onDelete, 
  onClick 
}: NotificationItemProps) {
  const { t } = useTranslation(['dashboard', 'common']);
  const Icon = getNotificationIcon(notification)
  
  const handleClick = () => {
    onClick(notification)
  }

  const handleMarkAsRead = (e: React.MouseEvent) => {
    e.stopPropagation()
    onMarkAsRead(notification.id)
  }

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    onDelete(notification.id)
  }

  return (
    <div
      className={cn(
        "flex gap-4 p-4 hover:bg-muted/50 cursor-pointer transition-colors rounded-lg group",
        !notification.read && "bg-primary/5 border-l-2 border-primary"
      )}
      onClick={handleClick}
    >
      {/* Icon */}
      <div className={cn(
        "flex-shrink-0 h-12 w-12 rounded-full flex items-center justify-center",
        !notification.read ? "bg-primary/10" : "bg-muted"
      )}>
        <Icon className={cn(
          "h-6 w-6",
          !notification.read ? "text-primary" : "text-muted-foreground"
        )} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className={cn(
              "text-sm font-medium",
              priorityColors[notification.priority],
              notification.read && "font-normal"
            )}>
              {notification.title}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {notification.message}
            </p>
          </div>
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {formatRelativeTimeFr(notification.created_at)}
          </span>
        </div>
        
        <div className="flex items-center gap-2 mt-3">
          <Badge variant="outline" className="text-xs">
            {categoryLabels[notification.category]}
          </Badge>
          {notification.priority !== 'normal' && (
            <Badge 
              variant={notification.priority === 'urgent' ? 'destructive' : 'secondary'}
              className="text-xs"
            >
              {priorityLabels[notification.priority]}
            </Badge>
          )}
          {notification.action_url && (
            <span className="text-xs text-primary flex items-center gap-1 ml-auto">
              {t('dashboard:notifications.view')} <ExternalLink className="h-3 w-3" />
            </span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex-shrink-0 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {!notification.read && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={handleMarkAsRead}
            title={t('dashboard:notifications.markAsRead')}
          >
            <Check className="h-4 w-4" />
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-destructive hover:text-destructive"
          onClick={handleDelete}
          title={t('common:actions.delete')}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
