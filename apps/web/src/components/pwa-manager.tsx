"use client"

import * as React from "react"
import { useState, useEffect, useCallback } from "react"
import { useTranslation } from 'react-i18next'
import {
  Download,
  RefreshCw,
  Wifi,
  WifiOff,
  Smartphone,
  Monitor,
  X,
  Share,
  Plus,
  ChevronUp,
  Zap,
  Cloud,
  CloudOff,
  Bell,
  Check,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"
import { usePWA } from "@/hooks/usePWA"
import { toast } from "sonner"

// ============================================================================
// NETWORK STATUS INDICATOR
// ============================================================================

export function NetworkStatusIndicator() {
  const { t } = useTranslation(['common'])
  const { isOnline } = usePWA()
  const [showOffline, setShowOffline] = useState(false)
  const [wasOffline, setWasOffline] = useState(false)

  useEffect(() => {
    if (!isOnline) {
      setShowOffline(true)
      setWasOffline(true)
    } else if (wasOffline) {
      // Show "back online" toast
      toast.success(t('pwa.connectionRestored'), {
        description: t('pwa.backOnline'),
        duration: 3000,
      })
      setShowOffline(false)
      setWasOffline(false)
    }
  }, [isOnline, wasOffline, t])

  if (isOnline && !showOffline) return null

  return (
    <div
      className={cn(
        "fixed bottom-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full shadow-lg transition-all duration-300",
        isOnline 
          ? "bg-green-500 text-white" 
          : "bg-destructive text-destructive-foreground"
      )}
    >
      <div className="flex items-center gap-2 text-sm font-medium">
        {isOnline ? (
          <>
            <Wifi className="h-4 w-4" />
            <span>{t('pwa.connectionRestored')}</span>
          </>
        ) : (
          <>
            <WifiOff className="h-4 w-4 animate-pulse" />
            <span>{t('pwa.offline')}</span>
          </>
        )}
      </div>
    </div>
  )
}

// ============================================================================
// PWA INSTALL BANNER
// ============================================================================

interface PWAInstallBannerProps {
  className?: string
}

export function PWAInstallBanner({ className }: PWAInstallBannerProps) {
  const { t } = useTranslation(['common'])
  const { isInstallable, isInstalled, install, isIOS, showIOSInstallInstructions } = usePWA()
  const [dismissed, setDismissed] = useState(false)
  const [showIOSGuide, setShowIOSGuide] = useState(false)

  useEffect(() => {
    // Check if banner was dismissed before
    const wasDismissed = localStorage.getItem('pwa-banner-dismissed')
    if (wasDismissed) {
      const dismissedAt = new Date(wasDismissed).getTime()
      const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
      // Show again after a week
      if (dismissedAt > weekAgo) {
        setDismissed(true)
      }
    }
  }, [])

  const handleDismiss = () => {
    setDismissed(true)
    localStorage.setItem('pwa-banner-dismissed', new Date().toISOString())
  }

  const handleInstall = async () => {
    const success = await install()
    if (success) {
      toast.success(t('pwa.appInstalled'), {
        description: t('pwa.appInstalledDesc'),
      })
    }
  }

  // Don't show if installed, dismissed, or not installable (except iOS)
  if (isInstalled || dismissed) return null
  if (!isInstallable && !showIOSInstallInstructions) return null

  return (
    <>
      <div
        className={cn(
          "fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-40",
          "bg-card border rounded-lg shadow-lg p-4",
          "animate-slide-up",
          className
        )}
      >
        <button
          onClick={handleDismiss}
          className="absolute top-2 right-2 p-1 rounded-full hover:bg-muted"
        >
          <X className="h-4 w-4 text-muted-foreground" />
        </button>

        <div className="flex items-start gap-3">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Smartphone className="h-6 w-6 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm">{t('pwa.installAsap')}</h3>
            <p className="text-xs text-muted-foreground mt-1">
              {t('pwa.installDesc')}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 mt-4">
          {showIOSInstallInstructions ? (
            <Button
              onClick={() => setShowIOSGuide(true)}
              className="flex-1"
              size="sm"
            >
              <Share className="h-4 w-4 mr-2" />
              {t('pwa.howToInstall')}
            </Button>
          ) : (
            <Button onClick={handleInstall} className="flex-1" size="sm">
              <Download className="h-4 w-4 mr-2" />
              {t('pwa.install')}
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={handleDismiss}>
            {t('pwa.later')}
          </Button>
        </div>

        <div className="flex items-center gap-2 mt-3 text-[10px] text-muted-foreground">
          <Zap className="h-3 w-3" />
          <span>{t('pwa.features')}</span>
        </div>
      </div>

      {/* iOS Installation Guide */}
      <AlertDialog open={showIOSGuide} onOpenChange={setShowIOSGuide}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('pwa.installOnIos')}</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-4">
                <p>{t('pwa.iosInstructions')}</p>
                <ol className="list-decimal list-inside space-y-2 text-sm">
                  <li className="flex items-start gap-2">
                    <span className="bg-muted rounded-full w-5 h-5 flex items-center justify-center text-xs flex-shrink-0 mt-0.5">1</span>
                    <span><Share className="h-4 w-4 inline" /> {t('pwa.iosStep1')}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="bg-muted rounded-full w-5 h-5 flex items-center justify-center text-xs flex-shrink-0 mt-0.5">2</span>
                    <span><Plus className="h-4 w-4 inline" /> {t('pwa.iosStep2')}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="bg-muted rounded-full w-5 h-5 flex items-center justify-center text-xs flex-shrink-0 mt-0.5">3</span>
                    <span>{t('pwa.iosStep3')}</span>
                  </li>
                </ol>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction>{t('pwa.understood')}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

// ============================================================================
// PWA UPDATE PROMPT
// ============================================================================

export function PWAUpdatePrompt() {
  const { t } = useTranslation(['common'])
  const { isUpdateAvailable, update } = usePWA()
  const [showPrompt, setShowPrompt] = useState(false)

  useEffect(() => {
    if (isUpdateAvailable) {
      setShowPrompt(true)
    }
  }, [isUpdateAvailable])

  const handleUpdate = () => {
    update()
    setShowPrompt(false)
    toast.info(t('pwa.updating'), {
      description: t('pwa.appWillReload'),
    })
    // Reload after a short delay
    setTimeout(() => {
      window.location.reload()
    }, 1000)
  }

  if (!showPrompt) return null

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-primary text-primary-foreground px-4 py-2 rounded-lg shadow-lg flex items-center gap-3 animate-slide-down">
      <RefreshCw className="h-4 w-4 animate-spin" />
      <span className="text-sm font-medium">{t('pwa.updateAvailable')}</span>
      <Button
        size="sm"
        variant="secondary"
        onClick={handleUpdate}
        className="h-7 text-xs"
      >
        {t('pwa.update')}
      </Button>
      <button
        onClick={() => setShowPrompt(false)}
        className="p-1 hover:bg-card/20 rounded"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  )
}

// ============================================================================
// PWA STATUS PANEL (For settings/debug)
// ============================================================================

interface PWAStatusPanelProps {
  className?: string
}

export function PWAStatusPanel({ className }: PWAStatusPanelProps) {
  const { t } = useTranslation(['common'])
  const pwa = usePWA()
  const [cacheStats, setCacheStats] = useState<any>(null)
  const [isClearing, setIsClearing] = useState(false)

  useEffect(() => {
    // Get cache stats from service worker
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      const channel = new MessageChannel()
      channel.port1.onmessage = (event) => {
        setCacheStats(event.data)
      }
      navigator.serviceWorker.controller.postMessage(
        { action: 'getCacheStats' },
        [channel.port2]
      )
    }
  }, [])

  const handleClearCache = async () => {
    setIsClearing(true)
    try {
      await pwa.clearCache()
      toast.success(t('pwa.cacheCleared'), {
        description: t('pwa.cacheClearedDesc'),
      })
      setCacheStats(null)
    } catch (error) {
      toast.error(t('errors.update'), {
        description: t('pwa.cacheError'),
      })
    } finally {
      setIsClearing(false)
    }
  }

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">{t('pwa.pwaStatus')}</h3>
        <Badge variant={pwa.isInstalled ? "default" : "secondary"}>
          {pwa.isInstalled ? t('pwa.installed') : t('pwa.notInstalled')}
        </Badge>
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="flex items-center gap-2">
          {pwa.isOnline ? (
            <Wifi className="h-4 w-4 text-green-500" />
          ) : (
            <WifiOff className="h-4 w-4 text-red-500" />
          )}
          <span>{pwa.isOnline ? t('pwa.online') : t('pwa.offline')}</span>
        </div>

        <div className="flex items-center gap-2">
          {pwa.displayMode === "standalone" ? (
            <Smartphone className="h-4 w-4 text-primary" />
          ) : (
            <Monitor className="h-4 w-4 text-muted-foreground" />
          )}
          <span className="capitalize">{pwa.displayMode}</span>
        </div>

        <div className="flex items-center gap-2">
          <Cloud className="h-4 w-4 text-muted-foreground" />
          <span>{t('pwa.cachedItems', { count: cacheStats?.totalItems || 0 })}</span>
        </div>

        <div className="flex items-center gap-2">
          <Bell className="h-4 w-4 text-muted-foreground" />
          <span>{pwa.isChrome || pwa.isFirefox ? t('pwa.pushSupported') : t('pwa.pushLimited')}</span>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">{t('pwa.platform')}</span>
          <span>
            {pwa.isIOS && "iOS"}
            {pwa.isAndroid && "Android"}
            {!pwa.isIOS && !pwa.isAndroid && "Desktop"}
          </span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">{t('pwa.browser')}</span>
          <span>
            {pwa.isChrome && "Chrome"}
            {pwa.isSafari && "Safari"}
            {pwa.isFirefox && "Firefox"}
            {pwa.isEdge && "Edge"}
            {pwa.isSamsungInternet && "Samsung Internet"}
          </span>
        </div>
      </div>

      {cacheStats && (
        <div className="space-y-2 pt-2 border-t">
          <span className="text-xs text-muted-foreground">
            {t('pwa.swVersion')}: {cacheStats.version}
          </span>
        </div>
      )}

      <div className="flex gap-2 pt-2">
        {pwa.isInstallable && (
          <Button
            onClick={pwa.install}
            size="sm"
            className="flex-1"
          >
            <Download className="h-4 w-4 mr-2" />
            {t('pwa.install')}
          </Button>
        )}
        <Button
          variant="outline"
          size="sm"
          onClick={handleClearCache}
          disabled={isClearing}
          className="flex-1"
        >
          {isClearing ? (
            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <CloudOff className="h-4 w-4 mr-2" />
          )}
          {t('pwa.clearCache')}
        </Button>
      </div>
    </div>
  )
}

// ============================================================================
// OFFLINE ACTIONS QUEUE STATUS
// ============================================================================

export function OfflineQueueStatus() {
  const { t } = useTranslation(['common'])
  const { isOnline } = usePWA()
  const [queueSize, setQueueSize] = useState(0)
  const [syncing, setSyncing] = useState(false)

  useEffect(() => {
    // Listen for sync messages from service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data?.type === 'SYNC_COMPLETE') {
          setQueueSize(event.data.remaining)
          setSyncing(false)
          if (event.data.synced > 0) {
            toast.success(t('pwa.actionsSynced', { count: event.data.synced }))
          }
        }
      })
    }

    // Check queue on mount
    checkQueue()
  }, [])

  useEffect(() => {
    if (isOnline && queueSize > 0) {
      setSyncing(true)
    }
  }, [isOnline, queueSize])

  const checkQueue = async () => {
    if ('caches' in window) {
      try {
        const cache = await caches.open('asap-offline-v3')
        const response = await cache.match('/__offline_queue__')
        if (response) {
          const queue = await response.json()
          setQueueSize(queue.length)
        }
      } catch (e) {
        // Ignore errors
      }
    }
  }

  if (queueSize === 0 && !syncing) return null

  return (
    <div className="fixed bottom-16 left-4 z-40 bg-card border rounded-lg shadow-lg px-3 py-2 text-sm">
      <div className="flex items-center gap-2">
        {syncing ? (
          <>
            <RefreshCw className="h-4 w-4 animate-spin text-primary" />
            <span>{t('pwa.syncing')}</span>
          </>
        ) : (
          <>
            <CloudOff className="h-4 w-4 text-amber-500" />
            <span>{t('pwa.pendingActions', { count: queueSize })}</span>
          </>
        )}
      </div>
    </div>
  )
}

// ============================================================================
// COMBINED PWA PROVIDER
// ============================================================================

interface PWAProviderProps {
  children: React.ReactNode
  showInstallBanner?: boolean
  showNetworkStatus?: boolean
  showUpdatePrompt?: boolean
  showOfflineQueue?: boolean
}

export function PWAProvider({
  children,
  showInstallBanner = true,
  showNetworkStatus = true,
  showUpdatePrompt = true,
  showOfflineQueue = true,
}: PWAProviderProps) {
  return (
    <>
      {children}
      {showNetworkStatus && <NetworkStatusIndicator />}
      {showInstallBanner && <PWAInstallBanner />}
      {showUpdatePrompt && <PWAUpdatePrompt />}
      {showOfflineQueue && <OfflineQueueStatus />}
    </>
  )
}

export default PWAProvider
