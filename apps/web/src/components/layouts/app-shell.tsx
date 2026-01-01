import * as React from "react"
import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import { AsapSidebar } from "@/components/layouts/asap-sidebar"
import { SidebarProvider, SidebarInset, SidebarTrigger, useSidebar } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { Input } from "@/components/ui/input"
import { Kbd } from "@/components/ui/kbd"
import { WebsiteProvider, useWebsiteContext } from "@/contexts/WebsiteContext"
import { HeaderUser } from "@/components/layouts/header-user"
import { useKeyboardShortcuts, getModifierKey } from "@/hooks/useKeyboardShortcuts"
import { useNotificationWebSocket } from "@/hooks/useNotificationWebSocket"
import { useSyncWebSocket } from "@/hooks/useSyncWebSocket"
import { navigate, Link } from "@/components/app-router"
import { toast } from "sonner"
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "@/components/ui/responsive-dialog"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Keyboard, Search } from "lucide-react"
import { cn } from "@/lib/utils"
import { SkipLink } from "@/components/ui/accessibility"
import { PresenceAvatars } from "@/components/shared/presence-avatars"
import { CommandPalette, useCommandPalette } from "@/components/shared/command-palette"

interface AppShellProps {
  children: React.ReactNode
  title?: string
  breadcrumbs?: { label: string; href?: string }[]
  isStudioPage?: boolean
  websiteId: string | null
  showSidebar?: boolean
  currentPage?: string
}

// Keyboard shortcuts categories (keys only, descriptions added dynamically with i18n)
const shortcutKeys = {
  navigation: [
    { keys: ["g", "d"], descKey: "goToDashboard" },
    { keys: ["g", "e"], descKey: "goToExtensions" },
    { keys: ["g", "c"], descKey: "goToCloud" },
  ],
  actions: [
    { keys: [getModifierKey(), "s"], descKey: "save" },
    { keys: ["Esc"], descKey: "cancelClose" },
    { keys: [getModifierKey(), "Shift", "r"], descKey: "refreshData" },
  ],
  interface: [
    { keys: [getModifierKey(), "k"], descKey: "openCommandPalette" },
    { keys: ["["], descKey: "toggleSidebar" },
    { keys: ["?"], descKey: "showShortcutsHelp" },
  ],
}

export function AppShell({ 
  children, 
  title, 
  breadcrumbs = [], 
  isStudioPage = false,
  websiteId,
  showSidebar = true,
  currentPage,
}: AppShellProps) {
  const [showShortcutsHelp, setShowShortcutsHelp] = useState(false)

  // Auth is checked in AppRouter, no need to check here

  return (
    <WebsiteProvider websiteId={websiteId}>
      <SidebarProvider defaultOpen={!isStudioPage && showSidebar}>
        <AppShellContent 
          title={title} 
          breadcrumbs={breadcrumbs}
          showShortcutsHelp={showShortcutsHelp}
          setShowShortcutsHelp={setShowShortcutsHelp}
          isStudioPage={isStudioPage}
          showSidebar={showSidebar}
          websiteId={websiteId}
          currentPage={currentPage}
        >
          {children}
        </AppShellContent>
      </SidebarProvider>
    </WebsiteProvider>
  )
}

// Inner component that can access sidebar context
interface AppShellContentProps {
  children: React.ReactNode
  title?: string
  breadcrumbs: { label: string; href?: string }[]
  showShortcutsHelp: boolean
  setShowShortcutsHelp: (show: boolean) => void
  isStudioPage?: boolean
  showSidebar?: boolean
  websiteId: string | null
  currentPage?: string
}

function AppShellContent({ 
  children, 
  title, 
  breadcrumbs,
  showShortcutsHelp,
  setShowShortcutsHelp,
  isStudioPage = false,
  showSidebar = true,
  websiteId,
  currentPage,
}: AppShellContentProps) {
  const { t } = useTranslation('common')
  const { toggleSidebar, setOpen, open } = useSidebar()
  const [pendingGoTo, setPendingGoTo] = useState(false)
  const previousSidebarStateRef = React.useRef<boolean | null>(null)
  
  // Build shortcuts with translated descriptions
  const shortcuts = [
    { category: t('shortcuts.navigation'), items: shortcutKeys.navigation.map(s => ({
      keys: s.keys,
      description: t(`shortcuts.${s.descKey}`)
    }))},
    { category: t('shortcuts.actions'), items: shortcutKeys.actions.map(s => ({
      keys: s.keys,
      description: t(`shortcuts.${s.descKey}`)
    }))},
    { category: t('shortcuts.interface'), items: shortcutKeys.interface.map(s => ({
      keys: s.keys,
      description: t(`shortcuts.${s.descKey}`)
    }))},
  ]
  
  // Command palette state
  const { open: commandOpen, setOpen: setCommandOpen } = useCommandPalette()
  
  // Get data from context
  const { 
    enabledExtensions,
    websites,
    currentWebsite,
    currentWebsiteId,
    isLoadingWebsites,
  } = useWebsiteContext()

  // Auto-collapse sidebar when entering studio page, restore when leaving
  useEffect(() => {
    if (isStudioPage) {
      // Save current state before collapsing
      previousSidebarStateRef.current = open
      setOpen(false)
    } else if (previousSidebarStateRef.current !== null) {
      // Restore previous state when leaving studio
      setOpen(previousSidebarStateRef.current)
      previousSidebarStateRef.current = null
    }
  }, [isStudioPage]) // Don't include open/setOpen to avoid loops

  // Real-time notifications via WebSocket
  useNotificationWebSocket({
    handlers: {
      onNewNotification: (notification) => {
        // Show toast for new notifications
        toast.info(notification.title, {
          description: notification.message,
          action: notification.action_url ? {
            label: "Voir",
            onClick: () => window.location.href = notification.action_url!,
          } : undefined,
        })
      }
    }
  })

  // Real-time data sync via WebSocket - auto-updates React Query cache
  useSyncWebSocket({
    websiteId: currentWebsiteId || undefined,
  })

  // Global keyboard shortcuts
  useKeyboardShortcuts([
    // Toggle sidebar
    {
      key: '[',
      action: () => {
        if (showSidebar) {
          toggleSidebar()
          toast.info('Sidebar toggled', { duration: 1500 })
        }
      }
    },
    // Show keyboard shortcuts help
    {
      key: '?',
      shift: true,
      action: () => setShowShortcutsHelp(true)
    },
    // "Go to" prefix - g key sets pending state
    {
      key: 'g',
      action: () => {
        if (currentWebsiteId) {
          setPendingGoTo(true)
          toast.info('Go to... (d: Dashboard, e: Extensions, c: Cloud)', { duration: 2000 })
          // Auto-reset after 2 seconds
          setTimeout(() => setPendingGoTo(false), 2000)
        }
      }
    },
    // Navigation shortcuts (when g was pressed)
    {
      key: 'd',
      action: () => {
        if (pendingGoTo && currentWebsiteId) {
          navigate(`/${currentWebsiteId}`)
          setPendingGoTo(false)
        }
      }
    },
    {
      key: 'e',
      action: () => {
        if (pendingGoTo && currentWebsiteId) {
          navigate(`/${currentWebsiteId}/extensions`)
          setPendingGoTo(false)
        }
      }
    },
    {
      key: 'c',
      action: () => {
        if (pendingGoTo && currentWebsiteId) {
          navigate(`/${currentWebsiteId}/cloud`)
          setPendingGoTo(false)
        }
      }
    },
    // Close help dialog with Escape
    {
      key: 'Escape',
      action: () => {
        if (showShortcutsHelp) {
          setShowShortcutsHelp(false)
        }
      }
    },
  ])

  // Build base URL for current website
  const baseUrl = currentWebsiteId ? `/${currentWebsiteId}` : '/'

  return (
    <>
      {showSidebar && (
        <AsapSidebar 
          extensions={enabledExtensions}
          websites={websites}
          currentWebsite={currentWebsite}
          isLoadingWebsites={isLoadingWebsites}
        />
      )}
      <SidebarInset className={isStudioPage ? "overflow-hidden" : undefined}>
        <SkipLink targetId="main-content" />
        <header className="sticky top-0 z-40 flex h-14 sm:h-16 shrink-0 items-center gap-2 sm:gap-3 border-b bg-background px-3 sm:px-4" role="banner">
          {/* Left section: Sidebar trigger */}
          {showSidebar && (
            <>
              <SidebarTrigger className="-ml-1" />
              <Separator orientation="vertical" className="h-4" />
            </>
          )}
          
          {/* Center section: Search trigger - opens command palette */}
          <div className="flex-1 flex items-center min-w-0">
            <button 
              onClick={() => setCommandOpen(true)}
              className="relative w-full max-w-md group"
            >
              <div className="flex items-center gap-2 w-full bg-muted/50 hover:bg-muted/70 rounded-md px-3 h-9 text-sm text-muted-foreground transition-colors cursor-pointer">
                <Search className="h-4 w-4 shrink-0" />
                <span className="flex-1 text-left truncate">{t('navigation.searchPlaceholder')}</span>
                <Kbd className="hidden sm:inline-flex">
                  <span className="text-xs">⌘</span>K
                </Kbd>
              </div>
            </button>
          </div>
          
          {/* Right section: Actions - always right-aligned */}
          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            {/* Keyboard shortcuts - desktop only */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="hidden sm:flex h-8 w-8 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowShortcutsHelp(true)}
                >
                  <Keyboard className="h-4 w-4" />
                  <span className="sr-only">{t('navigation.keyboardShortcuts')}</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p>{t('navigation.keyboardShortcuts')} <Kbd className="ml-1">?</Kbd></p>
              </TooltipContent>
            </Tooltip>
            
            {/* Real-time presence avatars */}
            {currentWebsiteId && (
              <PresenceAvatars 
                websiteId={currentWebsiteId} 
                currentPage={currentPage}
                maxAvatars={2}
                size="sm"
                className="hidden xs:flex"
              />
            )}
            
            {/* User menu - always visible */}
            <HeaderUser />
          </div>
        </header>
        <main
          id="main-content"
          role="main"
          tabIndex={-1}
          className={cn(
            "flex-1 focus:outline-none",
            isStudioPage ? "p-0 overflow-hidden" : "px-3 sm:px-4 md:px-6 pt-2 sm:pt-3 md:pt-4 pb-3 sm:pb-4 md:pb-6 overflow-auto"
          )}
        >
          {children}
        </main>
      </SidebarInset>
      
      {/* Command Palette */}
      <CommandPalette open={commandOpen} onOpenChange={setCommandOpen} />
      
      {/* Keyboard Shortcuts Help Dialog */}
      <ResponsiveDialog open={showShortcutsHelp} onOpenChange={setShowShortcutsHelp}>
        <ResponsiveDialogContent className="sm:max-w-md">
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle className="flex items-center gap-2">
              <Keyboard className="h-5 w-5" />
              {t('navigation.keyboardShortcuts')}
            </ResponsiveDialogTitle>
          </ResponsiveDialogHeader>
          <div className="space-y-4 py-2">
            {shortcuts.map((section) => (
              <div key={section.category}>
                <h4 className="text-sm font-medium text-muted-foreground mb-2">{section.category}</h4>
                <div className="space-y-2">
                  {section.items.map((item) => (
                    <div key={item.description} className="flex items-center justify-between">
                      <span className="text-sm">{item.description}</span>
                      <div className="flex gap-1">
                        {item.keys.map((key, i) => (
                          <React.Fragment key={i}>
                            <Kbd>{key}</Kbd>
                            {i < item.keys.length - 1 && <span className="text-muted-foreground">+</span>}
                          </React.Fragment>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="text-xs text-muted-foreground text-center pt-2 border-t">
            {t('shortcuts.pressEscToClose', { defaultValue: 'Press' })} <Kbd>Esc</Kbd> {t('actions.close').toLowerCase()}
          </div>
        </ResponsiveDialogContent>
      </ResponsiveDialog>
    </>
  )
}
