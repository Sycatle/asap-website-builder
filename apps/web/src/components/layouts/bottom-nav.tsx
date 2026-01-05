import * as React from "react"
import { useTranslation } from "react-i18next"
import { useState, useEffect } from "react"
import { Home, Search, Bell } from "lucide-react"
import { cn } from "@/lib/utils"
import { Link } from "@/components/app-router"
import { useWebsiteContext } from "@/contexts/WebsiteContext"
import { useCommandPalette } from "@/components/shared/command-palette"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useUserData } from "@/lib/store/authStore"
import { getSettingsUrl } from "@/lib/utils/auth-redirect"

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
    <div 
      className={cn(
        "flex flex-col items-center justify-center gap-1 py-2 px-4 min-w-[72px] rounded-xl transition-all duration-200",
        active 
          ? "bg-primary/10 text-primary" 
          : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
      )}
    >
      <Icon 
        className={cn(
          "h-5 w-5 transition-all duration-200",
          active && "stroke-[2.5]"
        )} 
      />
      <span 
        className={cn(
          "text-[11px] font-medium transition-colors duration-200",
          active && "font-semibold"
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
  
  // User data from auth store
  const userData = useUserData()
  
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

  // Build URL helper - uses currentWebsiteId or falls back to last visited website
  const buildUrl = (path: string) => {
    // Try current website first
    if (currentWebsiteId) {
      return `/${currentWebsiteId}${path}`
    }
    // Fallback to last visited website stored in localStorage
    const lastWebsiteId = typeof window !== 'undefined' 
      ? localStorage.getItem('last_website_id') 
      : null
    if (lastWebsiteId) {
      return `/${lastWebsiteId}${path}`
    }
    // No website available, go to selector
    return '/'
  }
  
  // Check if a path is active
  const isActive = (path: string) => {
    const fullPath = buildUrl(path)
    if (path === '') {
      return currentPath === fullPath || currentPath === `${fullPath}/`
    }
    return currentPath.startsWith(fullPath)
  }
  
  // Check if a global path is active (not tied to a website)
  const isGlobalActive = (path: string) => {
    return currentPath === path || currentPath.startsWith(`${path}/`)
  }

  // Redirect to accounts app settings
  const openSettings = () => {
    window.location.href = getSettingsUrl('profile')
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
          "bg-background/80 backdrop-blur-xl border-t border-border/50",
          "safe-area-inset-bottom",
          className
        )}
        role="navigation"
        aria-label={t('navigation.bottomNav')}
      >
        <div className="flex items-center justify-around h-[72px] px-2 max-w-md mx-auto">
          {/* Home */}
          <Link
            href={buildUrl('')}
            className="flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-xl active:scale-95 transition-transform"
            aria-label={t('navigation.home')}
            aria-current={isActive('') ? 'page' : undefined}
          >
            <NavItemContent icon={Home} label={t('navigation.home')} active={isActive('')} />
          </Link>

          {/* Search - Opens Command Palette */}
          <button
            onClick={() => setCommandOpen(true)}
            className="flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-xl active:scale-95 transition-transform"
            aria-label={t('navigation.search')}
          >
            <NavItemContent icon={Search} label={t('navigation.search')} />
          </button>

          {/* Notifications - Direct link to notifications page */}
          <Link
            href="/notifications"
            className="flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-xl active:scale-95 transition-transform"
            aria-label={t('navigation.notifications')}
            aria-current={isGlobalActive('/notifications') ? 'page' : undefined}
          >
            <NavItemContent icon={Bell} label={t('navigation.notifications')} active={isGlobalActive('/notifications')} />
          </Link>

          {/* Profile - Opens accounts settings */}
          <button
            onClick={openSettings}
            className="flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-xl active:scale-95 transition-transform"
            aria-label={t('navigation.profile')}
          >
            <div 
              className={cn(
                "flex flex-col items-center justify-center gap-1 py-2 px-4 min-w-[72px] rounded-xl transition-all duration-200",
                "text-muted-foreground hover:text-foreground hover:bg-accent/50"
              )}
            >
              <Avatar className="h-5 w-5 ring-2 ring-muted-foreground/30">
                <AvatarImage src={userData?.avatar} alt={userData?.name || ''} />
                <AvatarFallback className="bg-primary text-primary-foreground text-[9px] font-semibold">
                  {getInitials(userData?.name || userData?.email || '')}
                </AvatarFallback>
              </Avatar>
              <span className="text-[11px] font-medium">
                {t('navigation.profile')}
              </span>
            </div>
          </button>
        </div>
      </nav>
    </>
  )
}
