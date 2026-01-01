import * as React from "react"
import { useTranslation } from "react-i18next"
import { useState, useEffect } from "react"
import { Home, Search, Bell } from "lucide-react"
import { cn } from "@/lib/utils"
import { Link } from "@/components/app-router"
import { useWebsiteContext } from "@/contexts/WebsiteContext"
import { useCommandPalette } from "@/components/shared/command-palette"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { SettingsModal } from "@/components/features/settings"
import { NotificationsDropdown } from "@/components/shared"
import { 
  useAuthStore, 
  useUserData,
} from "@/lib/store/authStore"

interface BottomNavProps {
  className?: string
}

// Nav item content component - defined outside to avoid re-creation during render
interface NavItemContentProps {
  icon: React.ElementType
  label: string
  active?: boolean
}

function NavItemContent({ icon: Icon, label, active }: NavItemContentProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-0.5 py-2 px-3 min-w-[64px]">
      <Icon 
        className={cn(
          "h-6 w-6 transition-all duration-200",
          active ? "text-primary stroke-[2.5]" : "text-muted-foreground"
        )} 
      />
      <span 
        className={cn(
          "text-[10px] font-medium transition-colors duration-200",
          active ? "text-primary" : "text-muted-foreground"
        )}
      >
        {label}
      </span>
    </div>
  )
}

export function BottomNav({ className }: BottomNavProps) {
  const { t } = useTranslation('common')
  const { currentWebsiteId } = useWebsiteContext()
  const { setOpen: setCommandOpen } = useCommandPalette()
  const [currentPath, setCurrentPath] = useState(() => 
    typeof window !== 'undefined' ? window.location.pathname : ''
  )
  
  // Settings modal state
  const [settingsOpen, setSettingsOpen] = useState(false)
  
  // User data from auth store
  const userData = useUserData()
  const { updateUserData } = useAuthStore()
  
  // Track current path for active state
  useEffect(() => {
    const updatePath = () => setCurrentPath(window.location.pathname)
    
    window.addEventListener('popstate', updatePath)
    window.addEventListener('pushstate', updatePath)
    
    return () => {
      window.removeEventListener('popstate', updatePath)
      window.removeEventListener('pushstate', updatePath)
    }
  }, [])

  // Build URL helper
  const buildUrl = (path: string) => {
    if (!currentWebsiteId) return '/'
    return `/${currentWebsiteId}${path}`
  }
  
  // Check if a path is active
  const isActive = (path: string) => {
    const fullPath = buildUrl(path)
    if (path === '') {
      return currentPath === fullPath || currentPath === `${fullPath}/`
    }
    return currentPath.startsWith(fullPath)
  }

  const handleUserUpdate = (updatedData: Parameters<typeof updateUserData>[0]) => {
    updateUserData(updatedData)
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) || '?'
  }

  return (
    <>
      <nav 
        className={cn(
          "fixed bottom-0 left-0 right-0 z-50 md:hidden",
          "bg-background/95 backdrop-blur-md border-t",
          "safe-area-inset-bottom",
          className
        )}
        role="navigation"
        aria-label={t('navigation.bottomNav')}
      >
        <div className="flex items-center justify-around h-16 px-2">
          {/* Home */}
          <Link
            href={buildUrl('')}
            className="flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-lg"
            aria-label={t('navigation.home')}
            aria-current={isActive('') ? 'page' : undefined}
          >
            <NavItemContent icon={Home} label={t('navigation.home')} active={isActive('')} />
          </Link>

          {/* Search - Opens Command Palette */}
          <button
            onClick={() => setCommandOpen(true)}
            className="flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-lg"
            aria-label={t('navigation.search')}
          >
            <NavItemContent icon={Search} label={t('navigation.search')} />
          </button>

          {/* Notifications - Uses same component as header */}
          <NotificationsDropdown 
            trigger={
              <button
                className="flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-lg"
                aria-label={t('navigation.notifications')}
              >
                <NavItemContent icon={Bell} label={t('navigation.notifications')} />
              </button>
            }
          />

          {/* Profile - Opens Settings Modal directly */}
          <button
            onClick={() => setSettingsOpen(true)}
            className="flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-lg"
            aria-label={t('navigation.profile')}
          >
            <div className="flex flex-col items-center justify-center gap-0.5 py-2 px-3 min-w-[64px]">
              <Avatar className="h-6 w-6">
                <AvatarImage src={userData?.avatar} alt={userData?.name || ''} />
                <AvatarFallback className="bg-primary text-primary-foreground text-[10px]">
                  {getInitials(userData?.name || userData?.email || '')}
                </AvatarFallback>
              </Avatar>
              <span className="text-[10px] font-medium text-muted-foreground">
                {t('navigation.profile')}
              </span>
            </div>
          </button>
        </div>
      </nav>

      {/* Settings Modal */}
      <SettingsModal
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        user={userData || { id: "", email: "", name: "" }}
        onUserUpdate={handleUserUpdate}
        defaultTab="account"
      />
    </>
  )
}
