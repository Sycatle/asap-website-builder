"use client"

import * as React from "react"
import { useState } from "react"
import {
  Bell,
  CheckCheck,
  Settings,
  Filter,
  RefreshCw,
  BellRing,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"
import { safeNavigate } from "@/lib/utils/security"
import { 
  notificationsAPI,
  type Notification, 
  type NotificationCategory,
} from "@/lib/api/notifications"
import { useNotificationsStore } from "@/lib/store/notificationsStore"
import { 
  useNotificationSettings, 
  usePushNotifications 
} from "@/hooks/useNotifications"

import { categoryLabels, type NotificationTabType } from "./config"
import { NotificationList } from "./notification-list"
import { NotificationSettingsTab } from "./notification-settings-tab"

// ============================================================================
// Types
// ============================================================================

export interface NotificationsPageProps {
  className?: string
}

// ============================================================================
// Sub-components
// ============================================================================

interface PageHeaderProps {
  unreadCount: number
  onMarkAllAsRead: () => void
  onRefresh: () => void
}

function PageHeader({ unreadCount, onMarkAllAsRead, onRefresh }: PageHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-2xl font-bold">Notifications</h1>
        <p className="text-muted-foreground">
          Gérez vos notifications et préférences
        </p>
      </div>
      <div className="flex items-center gap-2">
        {unreadCount > 0 && (
          <Button variant="outline" size="sm" onClick={onMarkAllAsRead}>
            <CheckCheck className="h-4 w-4 mr-2" />
            Tout marquer comme lu
          </Button>
        )}
        <Button variant="ghost" size="icon" onClick={onRefresh}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

interface TabHeaderProps {
  activeTab: NotificationTabType
  onTabChange: (tab: NotificationTabType) => void
  total: number
  unreadCount: number
  categoryFilter: NotificationCategory | 'all'
  onCategoryFilterChange: (value: NotificationCategory | 'all') => void
}

function TabHeader({
  activeTab,
  onTabChange,
  total,
  unreadCount,
  categoryFilter,
  onCategoryFilterChange,
}: TabHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <TabsList>
        <TabsTrigger value="all" className="gap-2">
          <Bell className="h-4 w-4" />
          Toutes
          {total > 0 && (
            <Badge variant="secondary" className="ml-1">{total}</Badge>
          )}
        </TabsTrigger>
        <TabsTrigger value="unread" className="gap-2">
          <BellRing className="h-4 w-4" />
          Non lues
          {unreadCount > 0 && (
            <Badge variant="destructive" className="ml-1">{unreadCount}</Badge>
          )}
        </TabsTrigger>
        <TabsTrigger value="settings" className="gap-2">
          <Settings className="h-4 w-4" />
          Paramètres
        </TabsTrigger>
      </TabsList>

      {activeTab !== 'settings' && (
        <Select value={categoryFilter} onValueChange={onCategoryFilterChange}>
          <SelectTrigger className="w-[180px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Catégorie" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes les catégories</SelectItem>
            {Object.entries(categoryLabels).map(([key, label]) => (
              <SelectItem key={key} value={key}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  )
}

// ============================================================================
// Main Component
// ============================================================================

export function NotificationsPage({ className }: NotificationsPageProps) {
  const [activeTab, setActiveTab] = useState<NotificationTabType>('all')
  const [categoryFilter, setCategoryFilter] = useState<NotificationCategory | 'all'>('all')
  
  // Pagination state
  const [displayedNotifications, setDisplayedNotifications] = useState<Notification[]>([])
  const [total, setTotal] = useState(0)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [offset, setOffset] = useState(0)
  const limit = 20
  
  // Store
  const { 
    unreadCount,
    isLoading,
    fetchNotifications,
    markMultipleAsRead,
    markAllAsRead: storeMarkAllAsRead,
    deleteNotification: storeDeleteNotification,
  } = useNotificationsStore()

  // Settings hooks
  const { settings, isLoading: settingsLoading, updateSettings } = useNotificationSettings()
  const {
    isSupported: pushSupported,
    permission: pushPermission,
    isSubscribed: pushSubscribed,
    isLoading: pushLoading,
    subscribe: subscribePush,
    unsubscribe: unsubscribePush,
  } = usePushNotifications()

  // Fetch with filters
  const fetchWithFilters = React.useCallback(async (resetOffset = false) => {
    const currentOffset = resetOffset ? 0 : offset
    try {
      if (resetOffset) setDisplayedNotifications([])
      setIsLoadingMore(true)
      
      const response = await notificationsAPI.list({
        limit,
        offset: currentOffset,
        category: categoryFilter === 'all' ? undefined : categoryFilter,
        read: activeTab === 'unread' ? false : undefined,
      })
      
      if (resetOffset) {
        setDisplayedNotifications(response.notifications)
        setOffset(limit)
      } else {
        setDisplayedNotifications(prev => [...prev, ...response.notifications])
        setOffset(prev => prev + limit)
      }
      setTotal(response.total)
    } catch (error) {
      console.error('Failed to fetch notifications:', error)
    } finally {
      setIsLoadingMore(false)
    }
  }, [categoryFilter, activeTab, offset])

  React.useEffect(() => {
    fetchWithFilters(true)
  }, [categoryFilter, activeTab])

  const refetch = async () => {
    await fetchWithFilters(true)
    await fetchNotifications({}, true)
  }

  const loadMore = async () => {
    if (!isLoadingMore && displayedNotifications.length < total) {
      await fetchWithFilters(false)
    }
  }

  // Actions
  const handleMarkAsRead = async (notificationId: string) => {
    await markMultipleAsRead([notificationId])
    setDisplayedNotifications(prev => 
      prev.map(n => n.id === notificationId 
        ? { ...n, read: true, read_at: new Date().toISOString() } 
        : n
      )
    )
  }

  const handleMarkAllAsRead = async () => {
    try {
      await storeMarkAllAsRead()
      setDisplayedNotifications(prev => 
        prev.map(n => ({ ...n, read: true, read_at: new Date().toISOString() }))
      )
      toast.success('Toutes les notifications marquées comme lues')
    } catch {
      toast.error('Erreur lors du marquage')
    }
  }

  const handleDelete = async (notificationId: string) => {
    try {
      await storeDeleteNotification(notificationId)
      setDisplayedNotifications(prev => prev.filter(n => n.id !== notificationId))
      setTotal(prev => prev - 1)
      toast.success('Notification supprimée')
    } catch {
      toast.error('Erreur lors de la suppression')
    }
  }

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.read) {
      await handleMarkAsRead(notification.id)
    }
    if (notification.action_url) {
      safeNavigate(notification.action_url)
    }
  }

  const handlePushToggle = async (enabled: boolean) => {
    if (enabled) {
      const success = await subscribePush()
      toast[success ? 'success' : 'error'](
        success ? 'Notifications push activées' : 'Impossible d\'activer les notifications push'
      )
    } else {
      const success = await unsubscribePush()
      toast[success ? 'success' : 'error'](
        success ? 'Notifications push désactivées' : 'Erreur lors de la désactivation'
      )
    }
  }

  const handleSettingsUpdate = async (key: string, value: any) => {
    if (!settings) return
    try {
      await updateSettings({ ...settings, [key]: value })
      toast.success('Paramètres mis à jour')
    } catch {
      toast.error('Erreur lors de la mise à jour')
    }
  }

  const hasMore = displayedNotifications.length < total
  const unreadNotifications = displayedNotifications.filter(n => !n.read)

  return (
    <div className="container max-w-4xl py-6 space-y-6">
      <PageHeader
        unreadCount={unreadCount}
        onMarkAllAsRead={handleMarkAllAsRead}
        onRefresh={refetch}
      />

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as NotificationTabType)}>
        <TabHeader
          activeTab={activeTab}
          onTabChange={setActiveTab}
          total={total}
          unreadCount={unreadCount}
          categoryFilter={categoryFilter}
          onCategoryFilterChange={setCategoryFilter}
        />

        <TabsContent value="all" className="mt-6">
          <NotificationList
            notifications={displayedNotifications}
            isLoading={isLoading}
            hasMore={hasMore}
            onLoadMore={loadMore}
            onMarkAsRead={handleMarkAsRead}
            onDelete={handleDelete}
            onClick={handleNotificationClick}
            emptyState="all"
          />
        </TabsContent>

        <TabsContent value="unread" className="mt-6">
          <NotificationList
            notifications={unreadNotifications}
            isLoading={isLoading}
            onMarkAsRead={handleMarkAsRead}
            onDelete={handleDelete}
            onClick={handleNotificationClick}
            emptyState="unread"
          />
        </TabsContent>

        <TabsContent value="settings" className="mt-6">
          <NotificationSettingsTab
            pushSupported={pushSupported}
            pushPermission={pushPermission}
            pushSubscribed={pushSubscribed}
            pushLoading={pushLoading}
            onPushToggle={handlePushToggle}
            settings={settings}
            settingsLoading={settingsLoading}
            onSettingsUpdate={handleSettingsUpdate}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default NotificationsPage
