"use client"

import * as React from "react"
import { useState, useEffect } from "react"
import { useTranslation } from "react-i18next"
import {
  Bell,
  BellRing,
  LogOut,
  Settings,
  CreditCard,
  ExternalLink,
  ChevronUp,
} from "lucide-react"

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  SidebarFooter,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { LogoutConfirmDialog } from "@/components/shared"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { ScrollArea } from "@/components/ui/scroll-area"
import { 
  useAuthStore, 
  useUserData, 
  useAuthLoading,
  type UserData 
} from "@/lib/store/authStore"
import {
  useNotificationsStore,
  useNotifications,
  useUnreadCount,
  useNotificationsLoading,
  useHasNewNotifications,
} from "@/lib/store/notificationsStore"
import { cn } from "@/lib/utils"
import { formatRelativeTimeFr } from "@/lib/utils/formatters"
import { safeNavigate } from "@/lib/utils/security"
import { getSettingsUrl } from "@/lib/utils/auth-redirect"
import type { Notification } from "@/lib/api/notifications"

// Icon mapping for notification categories
const categoryIcons: Record<string, React.ElementType> = {
  system: Bell,
  account: Settings,
  website: Bell,
  extension: Bell,
  billing: CreditCard,
  analytics: Bell,
  security: Bell,
}

interface SidebarFooterNavProps {
  user?: Partial<UserData>
}

export function SidebarFooterNav({ user: initialUser }: SidebarFooterNavProps) {
  const { t } = useTranslation('common')
  const { state: sidebarState } = useSidebar()
  const isCollapsed = sidebarState === "collapsed"
  
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)

  // Auth store
  const userData = useUserData()
  const isAuthLoading = useAuthLoading()
  const { fetchFullUserData } = useAuthStore()

  // Notifications store
  const notifications = useNotifications()
  const unreadCount = useUnreadCount()
  const isNotificationsLoading = useNotificationsLoading()
  const hasNewNotifications = useHasNewNotifications()
  const {
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    clearNewNotificationsIndicator,
  } = useNotificationsStore()

  // Fetch user data on mount
  useEffect(() => {
    fetchFullUserData()
  }, [fetchFullUserData])

  // Initial fetch for notifications
  useEffect(() => {
    const token = localStorage.getItem('auth_token')
    if (!token) return
    fetchNotifications()
  }, [fetchNotifications])

  // Refetch when notifications popover opens
  useEffect(() => {
    if (notificationsOpen) {
      fetchNotifications(undefined, true)
      clearNewNotificationsIndicator()
    }
  }, [notificationsOpen, fetchNotifications, clearNewNotificationsIndicator])

  const handleLogout = () => {
    setLogoutDialogOpen(true)
  }

  const openSettings = (section?: string) => {
    window.location.href = getSettingsUrl(section)
  }

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.read) {
      await markAsRead(notification.id)
    }
    if (notification.action_url) {
      safeNavigate(notification.action_url)
    }
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) || '?'
  }

  // Use initial user or store user data
  const user = userData || {
    id: "",
    email: initialUser?.email || "",
    name: initialUser?.name || "",
    avatar: initialUser?.avatar,
  }

  if (isAuthLoading && !userData) {
    return (
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <Skeleton className="h-10 w-full" />
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    )
  }

  return (
    <>
      <SidebarFooter>
        <SidebarMenu>
          {/* Notifications */}
          <SidebarMenuItem>
            <Popover open={notificationsOpen} onOpenChange={setNotificationsOpen}>
              <PopoverTrigger asChild>
                <SidebarMenuButton 
                  tooltip={t('navigation.notifications')}
                  className="relative"
                >
                  {hasNewNotifications || unreadCount > 0 ? (
                    <BellRing className="h-4 w-4" />
                  ) : (
                    <Bell className="h-4 w-4" />
                  )}
                  <span>{t('navigation.notifications')}</span>
                  {unreadCount > 0 && (
                    <Badge 
                      variant="destructive" 
                      className={cn(
                        "ml-auto h-5 min-w-[1.25rem] px-1 text-xs",
                        isCollapsed && "absolute -top-1 -right-1 h-4 min-w-[1rem] text-[10px]"
                      )}
                    >
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </Badge>
                  )}
                </SidebarMenuButton>
              </PopoverTrigger>
              <PopoverContent 
                className="w-80 p-0" 
                side={isCollapsed ? "right" : "top"}
                align="start"
              >
                <div className="flex items-center justify-between p-3 border-b">
                  <span className="font-semibold text-sm">{t('navigation.notifications')}</span>
                  {unreadCount > 0 && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-7 text-xs"
                      onClick={() => markAllAsRead()}
                    >
                      {t('actions.markAllRead', { defaultValue: 'Mark all read' })}
                    </Button>
                  )}
                </div>
                <ScrollArea className="h-[300px]">
                  {isNotificationsLoading && notifications.length === 0 ? (
                    <div className="p-4 space-y-3">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="flex gap-3">
                          <Skeleton className="h-8 w-8 rounded-full" />
                          <div className="flex-1 space-y-2">
                            <Skeleton className="h-4 w-3/4" />
                            <Skeleton className="h-3 w-1/2" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : notifications.length === 0 ? (
                    <div className="p-4 text-center text-muted-foreground text-sm">
                      {t('dashboard:notifications.empty', { defaultValue: 'No notifications' })}
                    </div>
                  ) : (
                    <div className="divide-y">
                      {notifications.slice(0, 10).map((notification) => {
                        const Icon = categoryIcons[notification.category] || Bell
                        return (
                          <button
                            key={notification.id}
                            onClick={() => handleNotificationClick(notification)}
                            className={cn(
                              "w-full p-3 text-left hover:bg-muted/50 transition-colors flex gap-3",
                              !notification.read && "bg-muted/30"
                            )}
                          >
                            <div className={cn(
                              "h-8 w-8 rounded-full flex items-center justify-center shrink-0",
                              !notification.read ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                            )}>
                              <Icon className="h-4 w-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className={cn(
                                "text-sm truncate",
                                !notification.read && "font-medium"
                              )}>
                                {notification.title}
                              </p>
                              <p className="text-xs text-muted-foreground truncate">
                                {notification.message}
                              </p>
                              <p className="text-xs text-muted-foreground mt-1">
                                {formatRelativeTimeFr(notification.created_at)}
                              </p>
                            </div>
                            {!notification.read && (
                              <div className="h-2 w-2 rounded-full bg-primary shrink-0 mt-2" />
                            )}
                          </button>
                        )
                      })}
                    </div>
                  )}
                </ScrollArea>
                {notifications.length > 0 && (
                  <div className="p-2 border-t">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="w-full text-xs"
                      onClick={() => {
                        setNotificationsOpen(false)
                        window.location.href = '/notifications'
                      }}
                    >
                      {t('actions.viewAll', { defaultValue: 'View all' })}
                    </Button>
                  </div>
                )}
              </PopoverContent>
            </Popover>
          </SidebarMenuItem>

          {/* User Menu */}
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                  tooltip={user.name || user.email}
                >
                  <Avatar className="h-8 w-8 rounded-lg">
                    <AvatarImage src={user.avatar} alt={user.name} />
                    <AvatarFallback className="rounded-lg bg-primary text-primary-foreground text-xs">
                      {getInitials(user.name || user.email)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-medium">
                      {user.name || user.email.split('@')[0]}
                    </span>
                    <span className="truncate text-xs text-muted-foreground">
                      {user.email}
                    </span>
                  </div>
                  <ChevronUp className="ml-auto h-4 w-4" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-56"
                side={isCollapsed ? "right" : "top"}
                align="start"
                sideOffset={4}
              >
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">
                      {user.name || user.email.split('@')[0]}
                    </p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {user.email}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => openSettings('profile')}>
                  <Settings className="mr-2 h-4 w-4" />
                  {t('navigation.settings')}
                  <ExternalLink className="ml-auto h-3 w-3 text-muted-foreground" />
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => openSettings('billing')}>
                  <CreditCard className="mr-2 h-4 w-4" />
                  {t('navigation.billing')}
                  <ExternalLink className="ml-auto h-3 w-3 text-muted-foreground" />
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={handleLogout} 
                  className="text-destructive focus:text-destructive"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  {t('navigation.logout')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      {/* Logout Confirmation Dialog */}
      <LogoutConfirmDialog
        open={logoutDialogOpen}
        onOpenChange={setLogoutDialogOpen}
      />
    </>
  )
}
