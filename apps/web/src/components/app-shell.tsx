import * as React from "react"
import { useEffect, useState, useCallback } from "react"
import { AsapSidebar } from "@/components/asap-sidebar"
import { SidebarProvider, SidebarInset, SidebarTrigger, useSidebar } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { Toaster } from "@/components/ui/sonner"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { type WebsiteModule, type Website } from "@/lib/api"
import { useWebsites, useWebsiteModules } from "@/hooks/useCache"
import { HeaderUser } from "@/components/header-user"
import { useKeyboardShortcuts, getModifierKey } from "@/hooks/useKeyboardShortcuts"
import { useNotificationWebSocket } from "@/hooks/useNotificationWebSocket"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Keyboard } from "lucide-react"

interface AppShellProps {
  children: React.ReactNode
  title?: string
  breadcrumbs?: { label: string; href?: string }[]
}

// Keyboard shortcuts help dialog content
const shortcuts = [
  { category: "Navigation", items: [
    { keys: ["g", "d"], description: "Aller au Dashboard" },
    { keys: ["g", "m"], description: "Aller aux Modules" },
    { keys: ["g", "c"], description: "Aller au Cloud" },
  ]},
  { category: "Actions", items: [
    { keys: [getModifierKey(), "s"], description: "Sauvegarder" },
    { keys: ["Esc"], description: "Annuler / Fermer" },
    { keys: [getModifierKey(), "Shift", "r"], description: "Rafraîchir les données" },
  ]},
  { category: "Interface", items: [
    { keys: ["["], description: "Ouvrir/Fermer la sidebar" },
    { keys: ["?"], description: "Afficher l'aide des raccourcis" },
  ]},
]

export function AppShell({ children, title, breadcrumbs = [] }: AppShellProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(true)
  const [showShortcutsHelp, setShowShortcutsHelp] = useState(false)

  // Use cache hooks for websites and modules - this ensures sidebar updates when modules change
  const { websites, isLoading: websitesLoading } = useWebsites()
  
  // Current website is the first one (or can be stored in localStorage for persistence)
  const [currentWebsiteIndex, setCurrentWebsiteIndex] = useState(0)
  const currentWebsite = websites.length > 0 ? websites[currentWebsiteIndex] || websites[0] : null
  const currentWebsiteId = currentWebsite?.id ?? null
  
  const { modules: allModules } = useWebsiteModules(currentWebsiteId)
  
  // Filter to get only enabled modules for sidebar
  const modules = React.useMemo(() => 
    allModules.filter(m => m.enabled), 
    [allModules]
  )

  // Handle website change from the switcher
  const handleWebsiteChange = useCallback((website: Website) => {
    const index = websites.findIndex(w => w.id === website.id)
    if (index !== -1) {
      setCurrentWebsiteIndex(index)
    }
  }, [websites])

  useEffect(() => {
    // Check authentication
    const token = localStorage.getItem('auth_token')
    if (!token) {
      window.location.href = '/login'
      setIsAuthenticated(false)
      return
    }
  }, [])

  if (!isAuthenticated) {
    return null
  }

  return (
    <SidebarProvider>
      <AppShellContent 
        modules={modules}
        websites={websites}
        currentWebsite={currentWebsite}
        onWebsiteChange={handleWebsiteChange}
        isLoadingWebsites={websitesLoading}
        title={title} 
        breadcrumbs={breadcrumbs}
        showShortcutsHelp={showShortcutsHelp}
        setShowShortcutsHelp={setShowShortcutsHelp}
      >
        {children}
      </AppShellContent>
    </SidebarProvider>
  )
}

// Inner component that can access sidebar context
interface AppShellContentProps {
  children: React.ReactNode
  modules: WebsiteModule[]
  websites: Website[]
  currentWebsite: Website | null
  onWebsiteChange: (website: Website) => void
  isLoadingWebsites: boolean
  title?: string
  breadcrumbs: { label: string; href?: string }[]
  showShortcutsHelp: boolean
  setShowShortcutsHelp: (show: boolean) => void
}

function AppShellContent({ 
  children, 
  modules,
  websites,
  currentWebsite,
  onWebsiteChange,
  isLoadingWebsites,
  title, 
  breadcrumbs,
  showShortcutsHelp,
  setShowShortcutsHelp 
}: AppShellContentProps) {
  const { toggleSidebar } = useSidebar()
  const [pendingGoTo, setPendingGoTo] = useState(false)

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

  // Global keyboard shortcuts
  useKeyboardShortcuts([
    // Toggle sidebar
    {
      key: '[',
      action: () => {
        toggleSidebar()
        toast.info('Sidebar toggled', { duration: 1500 })
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
        setPendingGoTo(true)
        toast.info('Go to... (d: Dashboard, m: Modules, c: Cloud)', { duration: 2000 })
        // Auto-reset after 2 seconds
        setTimeout(() => setPendingGoTo(false), 2000)
      }
    },
    // Navigation shortcuts (when g was pressed)
    {
      key: 'd',
      action: () => {
        if (pendingGoTo) {
          window.location.href = '/app/dashboard'
          setPendingGoTo(false)
        }
      }
    },
    {
      key: 'm',
      action: () => {
        if (pendingGoTo) {
          window.location.href = '/app/modules'
          setPendingGoTo(false)
        }
      }
    },
    {
      key: 'c',
      action: () => {
        if (pendingGoTo) {
          window.location.href = '/app/cloud'
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

  return (
    <>
      <AsapSidebar 
        modules={modules}
        websites={websites}
        currentWebsite={currentWebsite}
        onWebsiteChange={onWebsiteChange}
        isLoadingWebsites={isLoadingWebsites}
      />
      <SidebarInset>
        <header className="sticky top-0 z-40 flex h-14 sm:h-16 shrink-0 items-center gap-2 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-3 sm:px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-1 sm:mr-2 h-4" />
          <Breadcrumb className="flex-1 min-w-0">
            <BreadcrumbList>
              <BreadcrumbItem className="hidden sm:block">
                <BreadcrumbLink href="/app/dashboard">
                  ASAP
                </BreadcrumbLink>
              </BreadcrumbItem>
              {breadcrumbs.map((crumb, index) => (
                <React.Fragment key={index}>
                  <BreadcrumbSeparator className="hidden sm:block" />
                  <BreadcrumbItem className="max-w-[120px] sm:max-w-none">
                    {crumb.href ? (
                      <BreadcrumbLink href={crumb.href} className="truncate">
                        {crumb.label}
                      </BreadcrumbLink>
                    ) : (
                      <BreadcrumbPage className="truncate">{crumb.label}</BreadcrumbPage>
                    )}
                  </BreadcrumbItem>
                </React.Fragment>
              ))}
              {title && breadcrumbs.length === 0 && (
                <>
                  <BreadcrumbSeparator className="hidden sm:block" />
                  <BreadcrumbItem className="max-w-[120px] sm:max-w-none">
                    <BreadcrumbPage className="truncate">{title}</BreadcrumbPage>
                  </BreadcrumbItem>
                </>
              )}
            </BreadcrumbList>
          </Breadcrumb>
          
          {/* Keyboard shortcuts help button - hidden on mobile */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="hidden sm:flex h-8 w-8 text-muted-foreground hover:text-foreground"
                onClick={() => setShowShortcutsHelp(true)}
              >
                <Keyboard className="h-4 w-4" />
                <span className="sr-only">Raccourcis clavier</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p>Raccourcis clavier <kbd className="ml-1 px-1 py-0.5 text-xs bg-muted rounded">?</kbd></p>
            </TooltipContent>
          </Tooltip>
          
          <HeaderUser />
        </header>
        <main className="flex-1 overflow-auto p-3 sm:p-4 md:p-6">
          {children}
        </main>
      </SidebarInset>
      <Toaster />
      
      {/* Keyboard Shortcuts Help Dialog */}
      <Dialog open={showShortcutsHelp} onOpenChange={setShowShortcutsHelp}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span>⌨️</span> Raccourcis clavier
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {shortcuts.map((category) => (
              <div key={category.category}>
                <h4 className="text-sm font-medium text-muted-foreground mb-2">
                  {category.category}
                </h4>
                <div className="space-y-2">
                  {category.items.map((shortcut, idx) => (
                    <div 
                      key={idx}
                      className="flex items-center justify-between text-sm"
                    >
                      <span>{shortcut.description}</span>
                      <div className="flex items-center gap-1">
                        {shortcut.keys.map((key, keyIdx) => (
                          <React.Fragment key={keyIdx}>
                            {keyIdx > 0 && <span className="text-muted-foreground">+</span>}
                            <kbd className="px-2 py-1 text-xs font-semibold bg-muted border rounded">
                              {key}
                            </kbd>
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
            Appuyez sur <kbd className="px-1.5 py-0.5 text-xs bg-muted border rounded">Esc</kbd> pour fermer
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
