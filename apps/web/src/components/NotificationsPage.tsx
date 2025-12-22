"use client"

import * as React from "react"
import { useState } from "react"
import {
  Bell,
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
  Filter,
  RefreshCw,
  BellOff,
  BellRing,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import { formatRelativeTimeFr } from "@/lib/utils/formatters"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { safeNavigate } from "@/lib/utils/security"
import { 
  notificationsAPI,
  type Notification, 
  type NotificationCategory,
  type NotificationPriority,
} from "@/lib/api/notifications"
import { useNotificationsStore } from "@/lib/store/notificationsStore"
import { 
  useNotificationSettings, 
  usePushNotifications 
} from "@/hooks/useNotifications"
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

// Priority labels and colors
const priorityLabels: Record<NotificationPriority, string> = {
  low: 'Basse',
  normal: 'Normale',
  high: 'Haute',
  urgent: 'Urgente',
}

const priorityColors: Record<NotificationPriority, string> = {
  low: 'text-muted-foreground',
  normal: 'text-foreground',
  high: 'text-orange-500',
  urgent: 'text-red-500',
}

export default function NotificationsPage() {
  const [activeTab, setActiveTab] = useState<'all' | 'unread' | 'settings'>('all')
  const [categoryFilter, setCategoryFilter] = useState<NotificationCategory | 'all'>('all')
  
  // Local state for pagination
  const [displayedNotifications, setDisplayedNotifications] = useState<Notification[]>([])
  const [total, setTotal] = useState(0)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [offset, setOffset] = useState(0)
  const limit = 20
  
  // Get store state and actions
  const { 
    notifications: storeNotifications,
    unreadCount,
    isLoading,
    fetchNotifications,
    markAsRead: storeMarkAsRead,
    markMultipleAsRead,
    markAllAsRead: storeMarkAllAsRead,
    deleteNotification: storeDeleteNotification,
  } = useNotificationsStore()

  // Fetch notifications with filters on mount and when filters change
  const fetchWithFilters = React.useCallback(async (resetOffset = false) => {
    const currentOffset = resetOffset ? 0 : offset
    try {
      if (resetOffset) {
        setDisplayedNotifications([])
      }
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

  // Initial fetch and refetch when filters change
  React.useEffect(() => {
    fetchWithFilters(true)
  }, [categoryFilter, activeTab])

  // Refetch function
  const refetch = async () => {
    await fetchWithFilters(true)
    // Also refresh store for the header badge
    await fetchNotifications({}, true)
  }

  // Load more
  const loadMore = async () => {
    if (!isLoadingMore && displayedNotifications.length < total) {
      await fetchWithFilters(false)
    }
  }

  const hasMore = displayedNotifications.length < total

  // Wrapper for markAsRead to update both local state and store
  const markAsRead = async (notificationIds: string[]) => {
    await markMultipleAsRead(notificationIds)
    setDisplayedNotifications(prev => 
      prev.map(n => 
        notificationIds.includes(n.id) 
          ? { ...n, read: true, read_at: new Date().toISOString() } 
          : n
      )
    )
  }

  // Wrapper for markAllAsRead
  const markAllAsRead = async () => {
    await storeMarkAllAsRead()
    setDisplayedNotifications(prev => 
      prev.map(n => ({ ...n, read: true, read_at: new Date().toISOString() }))
    )
  }

  // Wrapper for deleteNotification
  const deleteNotification = async (notificationId: string) => {
    await storeDeleteNotification(notificationId)
    setDisplayedNotifications(prev => prev.filter(n => n.id !== notificationId))
    setTotal(prev => prev - 1)
  }

  // Use displayed notifications for rendering
  const notifications = displayedNotifications

  const { 
    settings, 
    isLoading: settingsLoading, 
    updateSettings 
  } = useNotificationSettings()

  const {
    isSupported: pushSupported,
    permission: pushPermission,
    isSubscribed: pushSubscribed,
    isLoading: pushLoading,
    subscribe: subscribePush,
    unsubscribe: unsubscribePush,
  } = usePushNotifications()

  // Handle notification click
  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.read) {
      try {
        await markAsRead([notification.id])
      } catch (error) {
        console.error('Failed to mark as read:', error)
      }
    }

    // Navigate to action URL with security validation
    if (notification.action_url) {
      safeNavigate(notification.action_url)
    }
  }

  // Handle mark all as read
  const handleMarkAllAsRead = async () => {
    try {
      await markAllAsRead()
      toast.success('Toutes les notifications marquées comme lues')
    } catch (error) {
      toast.error('Erreur lors du marquage')
    }
  }

  // Handle delete
  const handleDelete = async (notification: Notification, e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      await deleteNotification(notification.id)
      toast.success('Notification supprimée')
    } catch (error) {
      toast.error('Erreur lors de la suppression')
    }
  }

  // Handle push toggle
  const handlePushToggle = async (enabled: boolean) => {
    if (enabled) {
      const success = await subscribePush()
      if (success) {
        toast.success('Notifications push activées')
      } else {
        toast.error('Impossible d\'activer les notifications push')
      }
    } else {
      const success = await unsubscribePush()
      if (success) {
        toast.success('Notifications push désactivées')
      } else {
        toast.error('Erreur lors de la désactivation')
      }
    }
  }

  // Handle settings update
  const handleSettingsUpdate = async (key: string, value: any) => {
    if (!settings) return
    
    try {
      await updateSettings({ ...settings, [key]: value })
      toast.success('Paramètres mis à jour')
    } catch (error) {
      toast.error('Erreur lors de la mise à jour')
    }
  }

  // Get icon for notification
  const getNotificationIcon = (notification: Notification) => {
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

  // Render notification item
  const renderNotification = (notification: Notification) => {
    const Icon = getNotificationIcon(notification)
    
    return (
      <div
        key={notification.id}
        className={cn(
          "flex gap-4 p-4 hover:bg-muted/50 cursor-pointer transition-colors rounded-lg group",
          !notification.read && "bg-primary/5 border-l-2 border-primary"
        )}
        onClick={() => handleNotificationClick(notification)}
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
              className="h-8 w-8"
              onClick={(e) => {
                e.stopPropagation()
                markAsRead([notification.id])
              }}
              title="Marquer comme lu"
            >
              <Check className="h-4 w-4" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-destructive hover:text-destructive"
            onClick={(e) => handleDelete(notification, e)}
            title="Supprimer"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="container max-w-4xl py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Notifications</h1>
          <p className="text-muted-foreground">
            Gérez vos notifications et préférences
          </p>
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <Button variant="outline" size="sm" onClick={handleMarkAllAsRead}>
              <CheckCheck className="h-4 w-4 mr-2" />
              Tout marquer comme lu
            </Button>
          )}
          <Button variant="ghost" size="icon" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="all" className="gap-2">
              <Bell className="h-4 w-4" />
              Toutes
              {total > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {total}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="unread" className="gap-2">
              <BellRing className="h-4 w-4" />
              Non lues
              {unreadCount > 0 && (
                <Badge variant="destructive" className="ml-1">
                  {unreadCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="settings" className="gap-2">
              <Settings className="h-4 w-4" />
              Paramètres
            </TabsTrigger>
          </TabsList>

          {activeTab !== 'settings' && (
            <Select 
              value={categoryFilter} 
              onValueChange={(v) => setCategoryFilter(v as any)}
            >
              <SelectTrigger className="w-[180px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Catégorie" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes les catégories</SelectItem>
                {Object.entries(categoryLabels).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {/* All / Unread Tab Content */}
        <TabsContent value="all" className="mt-6">
          <Card>
            <CardContent className="p-0 divide-y">
              {isLoading ? (
                <div className="p-6 space-y-4">
                  {[...Array(5)].map((_, i) => (
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
              ) : notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <BellOff className="h-16 w-16 text-muted-foreground/30 mb-4" />
                  <p className="text-lg font-medium">Aucune notification</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Vous n'avez pas de notifications pour le moment
                  </p>
                </div>
              ) : (
                <>
                  {notifications.map(renderNotification)}
                  {hasMore && (
                    <div className="p-4 text-center">
                      <Button variant="outline" onClick={loadMore}>
                        Charger plus
                      </Button>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="unread" className="mt-6">
          <Card>
            <CardContent className="p-0 divide-y">
              {isLoading ? (
                <div className="p-6 space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="flex gap-4">
                      <Skeleton className="h-12 w-12 rounded-full" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-3 w-full" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : notifications.filter(n => !n.read).length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <Check className="h-16 w-16 text-green-500/50 mb-4" />
                  <p className="text-lg font-medium">Tout est lu !</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Vous avez lu toutes vos notifications
                  </p>
                </div>
              ) : (
                notifications.filter(n => !n.read).map(renderNotification)
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Settings Tab Content */}
        <TabsContent value="settings" className="mt-6 space-y-6">
          {/* Push Notifications Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Notifications Push
              </CardTitle>
              <CardDescription>
                Recevez des notifications sur votre appareil même quand l'app est fermée
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!pushSupported ? (
                <p className="text-sm text-muted-foreground">
                  Les notifications push ne sont pas supportées sur ce navigateur.
                </p>
              ) : pushPermission === 'denied' ? (
                <p className="text-sm text-destructive">
                  Les notifications sont bloquées. Veuillez les autoriser dans les paramètres de votre navigateur.
                </p>
              ) : (
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Activer les notifications push</Label>
                    <p className="text-sm text-muted-foreground">
                      {pushSubscribed 
                        ? 'Vous recevrez des notifications sur cet appareil'
                        : 'Activez pour recevoir des notifications'}
                    </p>
                  </div>
                  <Switch
                    checked={pushSubscribed}
                    onCheckedChange={handlePushToggle}
                    disabled={pushLoading}
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Notification Preferences Card */}
          <Card>
            <CardHeader>
              <CardTitle>Préférences de notification</CardTitle>
              <CardDescription>
                Choisissez quels types de notifications vous souhaitez recevoir
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {settingsLoading ? (
                <div className="space-y-4">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-6 w-10" />
                    </div>
                  ))}
                </div>
              ) : settings ? (
                <>
                  <div className="space-y-4">
                    <Label className="text-base">Catégories activées</Label>
                    {Object.entries(categoryLabels).map(([key, label]) => {
                      const category = key as NotificationCategory
                      const Icon = categoryIcons[category]
                      const isEnabled = settings.enabled_categories.includes(category)
                      
                      return (
                        <div key={key} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Icon className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">{label}</span>
                          </div>
                          <Switch
                            checked={isEnabled}
                            onCheckedChange={(checked) => {
                              const newCategories = checked
                                ? [...settings.enabled_categories, category]
                                : settings.enabled_categories.filter(c => c !== category)
                              handleSettingsUpdate('enabled_categories', newCategories)
                            }}
                          />
                        </div>
                      )
                    })}
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <Label className="text-base">Heures calmes</Label>
                    <p className="text-sm text-muted-foreground">
                      Désactivez les notifications pendant certaines heures
                    </p>
                    <div className="flex items-center gap-4">
                      <div className="space-y-1">
                        <Label className="text-xs">Début</Label>
                        <input
                          type="time"
                          value={settings.quiet_hours_start || ''}
                          onChange={(e) => handleSettingsUpdate('quiet_hours_start', e.target.value || null)}
                          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Fin</Label>
                        <input
                          type="time"
                          value={settings.quiet_hours_end || ''}
                          onChange={(e) => handleSettingsUpdate('quiet_hours_end', e.target.value || null)}
                          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                        />
                      </div>
                      {(settings.quiet_hours_start || settings.quiet_hours_end) && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            handleSettingsUpdate('quiet_hours_start', null)
                            handleSettingsUpdate('quiet_hours_end', null)
                          }}
                        >
                          Effacer
                        </Button>
                      )}
                    </div>
                  </div>
                </>
              ) : null}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
