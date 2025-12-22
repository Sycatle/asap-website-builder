"use client"

import * as React from "react"
import { useState, useEffect, useCallback } from "react"
import {
  Bell,
  BellRing,
  Check,
  CheckCheck,
  Trash2,
  Settings,
  Globe,
  CreditCard,
  Shield,
  BarChart3,
  Puzzle,
  User,
  Sparkles,
  ExternalLink,
  Volume2,
  VolumeX,
  Smartphone,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { formatRelativeTimeFr } from "@/lib/utils/formatters"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { safeNavigate } from "@/lib/utils/security"
import { 
  type Notification, 
  type NotificationCategory,
  type NotificationPriority,
  subscribeToPushNotifications,
  checkPushPermission,
  requestPushPermission,
} from "@/lib/api/notifications"
import {
  useNotificationsStore,
  useNotifications,
  useUnreadCount,
  useNotificationsLoading,
  useHasNewNotifications,
  useNotificationSettings,
} from "@/lib/store/notificationsStore"
import { toast } from "sonner"

// Icon mapping for notification categories
const categoryIcons: Record<NotificationCategory, React.ElementType> = {
  system: Sparkles,
  account: User,
  website: Globe,
  extension: Puzzle,
  billing: CreditCard,
  analytics: BarChart3,
  security: Shield,
}

// Category labels
const categoryLabels: Record<NotificationCategory, string> = {
  system: 'Système',
  account: 'Compte',
  website: 'Site web',
  extension: 'Extension',
  billing: 'Facturation',
  analytics: 'Analytics',
  security: 'Sécurité',
}

// Priority colors
const priorityColors: Record<NotificationPriority, string> = {
  low: 'text-muted-foreground',
  normal: 'text-foreground',
  high: 'text-orange-500',
  urgent: 'text-red-500',
}

interface NotificationsDropdownProps {
  className?: string
}

export function NotificationsDropdown({ className }: NotificationsDropdownProps) {
  const [open, setOpen] = useState(false)
  const [pushEnabled, setPushEnabled] = useState(false)

  // Use the notifications store for optimized state management
  const notifications = useNotifications()
  const unreadCount = useUnreadCount()
  const isLoading = useNotificationsLoading()
  const hasNewNotifications = useHasNewNotifications()
  const { soundEnabled, vibrationEnabled } = useNotificationSettings()
  
  const {
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearNewNotificationsIndicator,
    toggleSound,
    toggleVibration,
  } = useNotificationsStore()

  // Initial fetch on mount (WebSocket handles real-time updates)
  useEffect(() => {
    const token = localStorage.getItem('auth_token')
    if (!token) return
    
    // Initial fetch only - WebSocket handles updates
    fetchNotifications()
  }, [fetchNotifications])

  // Refetch when dropdown opens
  useEffect(() => {
    if (open) {
      fetchNotifications(undefined, true)
      clearNewNotificationsIndicator()
    }
  }, [open, fetchNotifications, clearNewNotificationsIndicator])

  // Check push notification status
  useEffect(() => {
    checkPushPermission().then(permission => {
      setPushEnabled(permission === 'granted')
    })
  }, [])

  // Mark single notification as read
  const handleMarkAsRead = async (notification: Notification, e: React.MouseEvent) => {
    e.stopPropagation()
    if (notification.read) return

    try {
      await markAsRead(notification.id)
    } catch (error) {
      console.error('Failed to mark notification as read:', error)
    }
  }

  // Mark all as read
  const handleMarkAllAsRead = async () => {
    try {
      await markAllAsRead()
      toast.success('Toutes les notifications marquées comme lues')
    } catch (error) {
      console.error('Failed to mark all as read:', error)
      toast.error('Erreur lors du marquage des notifications')
    }
  }

  // Delete notification
  const handleDelete = async (notification: Notification, e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      await deleteNotification(notification.id)
    } catch (error) {
      console.error('Failed to delete notification:', error)
      toast.error('Erreur lors de la suppression')
    }
  }

  // Handle notification click (navigate to action URL)
  const handleNotificationClick = async (notification: Notification) => {
    // Mark as read if unread
    if (!notification.read) {
      try {
        await markAsRead(notification.id)
      } catch (error) {
        console.error('Failed to mark notification as read:', error)
      }
    }

    // Navigate to action URL if present (with security validation)
    if (notification.action_url) {
      safeNavigate(notification.action_url)
      setOpen(false)
    }
  }

  // Enable push notifications
  const handleEnablePush = async () => {
    const granted = await requestPushPermission()
    if (granted) {
      const subscription = await subscribeToPushNotifications()
      if (subscription) {
        setPushEnabled(true)
        toast.success('Notifications push activées')
      } else {
        toast.error('Impossible d\'activer les notifications push')
      }
    } else {
      toast.error('Permission refusée pour les notifications')
    }
  }

  // Get icon for notification
  const getNotificationIcon = (notification: Notification) => {
    // First check if notification has a custom icon
    if (notification.icon) {
      const iconMap: Record<string, React.ElementType> = {
        sparkles: Sparkles,
        globe: Globe,
        'credit-card': CreditCard,
        shield: Shield,
        puzzle: Puzzle,
        user: User,
        'bar-chart': BarChart3,
        settings: Settings,
      }
      return iconMap[notification.icon] || categoryIcons[notification.category]
    }
    return categoryIcons[notification.category]
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "relative h-9 w-9 transition-all",
            hasNewNotifications && "animate-pulse",
            className
          )}
          aria-label="Notifications"
        >
          {hasNewNotifications || unreadCount > 0 ? (
            <BellRing className={cn(
              "h-5 w-5",
              hasNewNotifications && "text-primary animate-bounce"
            )} />
          ) : (
            <Bell className="h-5 w-5" />
          )}
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className={cn(
                "absolute -top-1 -right-1 h-5 min-w-[20px] px-1.5 text-xs font-bold",
                hasNewNotifications && "animate-pulse"
              )}
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-[400px] p-0" 
        align="end"
        sideOffset={8}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <h4 className="font-semibold text-sm">Notifications</h4>
            {unreadCount > 0 && (
              <Badge variant="secondary" className="text-xs">
                {unreadCount} non lues
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1">
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-2 text-xs"
                onClick={handleMarkAllAsRead}
              >
                <CheckCheck className="h-4 w-4 mr-1" />
                Tout lire
              </Button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <Settings className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Paramètres</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {!pushEnabled && (
                  <DropdownMenuItem onClick={handleEnablePush}>
                    <Bell className="mr-2 h-4 w-4" />
                    Activer les notifications push
                  </DropdownMenuItem>
                )}
                <div className="px-2 py-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="sound-toggle" className="text-sm flex items-center gap-2 cursor-pointer">
                      {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                      Son
                    </Label>
                    <Switch
                      id="sound-toggle"
                      checked={soundEnabled}
                      onCheckedChange={toggleSound}
                    />
                  </div>
                </div>
                <div className="px-2 py-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="vibration-toggle" className="text-sm flex items-center gap-2 cursor-pointer">
                      <Smartphone className="h-4 w-4" />
                      Vibration
                    </Label>
                    <Switch
                      id="vibration-toggle"
                      checked={vibrationEnabled}
                      onCheckedChange={toggleVibration}
                    />
                  </div>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => window.location.href = '/app/notifications'}>
                  <Settings className="mr-2 h-4 w-4" />
                  Tous les paramètres
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Notifications list */}
        <ScrollArea className="h-[420px]">
          {isLoading ? (
            <div className="p-4 space-y-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="flex gap-3">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-center">
              <Bell className="h-12 w-12 text-muted-foreground/50 mb-3" />
              <p className="text-sm text-muted-foreground">Aucune notification</p>
              <p className="text-xs text-muted-foreground/70 mt-1">
                Vous recevrez des notifications ici
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notification) => {
                const Icon = getNotificationIcon(notification)
                return (
                  <div
                    key={notification.id}
                    className={cn(
                      "flex gap-3 p-4 hover:bg-muted/50 cursor-pointer transition-colors group",
                      !notification.read && "bg-primary/5"
                    )}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    {/* Icon */}
                    <div className={cn(
                      "flex-shrink-0 h-10 w-10 rounded-full flex items-center justify-center",
                      !notification.read ? "bg-primary/10" : "bg-muted"
                    )}>
                      <Icon className={cn(
                        "h-5 w-5",
                        !notification.read ? "text-primary" : "text-muted-foreground"
                      )} />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className={cn(
                          "text-sm font-medium truncate",
                          priorityColors[notification.priority],
                          notification.read && "font-normal"
                        )}>
                          {notification.title}
                        </p>
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {formatRelativeTimeFr(notification.created_at)}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                        {notification.message}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                          {categoryLabels[notification.category]}
                        </Badge>
                        {notification.action_url && (
                          <span className="text-xs text-primary flex items-center gap-0.5">
                            Voir <ExternalLink className="h-3 w-3" />
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
                          className="h-7 w-7"
                          onClick={(e) => handleMarkAsRead(notification, e)}
                          title="Marquer comme lu"
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={(e) => handleDelete(notification, e)}
                        title="Supprimer"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </ScrollArea>

        {/* Footer */}
        {notifications.length > 0 && (
          <div className="p-3 border-t">
            <Button
              variant="ghost"
              className="w-full text-xs"
              onClick={() => {
                window.location.href = '/app/notifications'
                setOpen(false)
              }}
            >
              Voir toutes les notifications
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}
