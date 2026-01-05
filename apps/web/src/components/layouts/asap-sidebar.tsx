import * as React from "react"
import { useTranslation } from "react-i18next"
import { useState, useEffect } from "react"
import { cn } from "@/lib/utils"

import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarGroup,
  SidebarGroupContent,
  SidebarRail,
  SidebarSeparator,
} from "@/components/ui/sidebar"
import { SiteSwitcher } from "@/components/features/websites/SiteSwitcher"
import { useWebsiteContext } from "@/contexts/WebsiteContext"
import { Link } from "@/components/app-router"
import { PageIcon } from "@/lib/navigation-config"
import { ExtensionIcon } from "@/lib/extension-icons"
import type { WebsiteExtension, Website } from "@/lib/api"

interface AsapSidebarProps {
  extensions?: WebsiteExtension[]
  websites?: Website[]
  currentWebsite?: Website | null
  isLoadingWebsites?: boolean
}

export function AsapSidebar({ 
  extensions = [], 
  websites = [],
  currentWebsite = null,
  isLoadingWebsites = false,
}: AsapSidebarProps) {
  const { t } = useTranslation(['common', 'editor'])
  const [currentPath, setCurrentPath] = useState(() => 
    typeof window !== 'undefined' ? window.location.pathname : ''
  )
  
  // Get current website ID from context
  const { currentWebsiteId } = useWebsiteContext()
  
  // Track current path for active state
  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname)
    }
    
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])
  
  // Filter enabled extensions
  const enabledExtensions = extensions.filter(e => e.enabled)

  // Build URL helper
  const buildUrl = (path: string) => {
    if (!currentWebsiteId) return '/'
    return `/${currentWebsiteId}${path}`
  }
  
  // Check if a path is active
  const isActive = (path: string) => {
    const fullPath = buildUrl(path)
    // For home, exact match only
    if (path === '') {
      return currentPath === fullPath || currentPath === `${fullPath}/`
    }
    // For other pages, check if current path starts with the nav path
    return currentPath.startsWith(fullPath)
  }

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SiteSwitcher
          websites={websites}
          currentWebsite={currentWebsite}
          isLoading={isLoadingWebsites}
        />
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {/* Home - Dashboard */}
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip={t('common:navigation.home')} isActive={isActive('')}>
                  <Link href={buildUrl('')}>
                    <PageIcon page="home" size="sm" isActive={isActive('')} />
                    <span className={cn(isActive('') && "text-primary font-semibold")}>{t('common:navigation.home')}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>

              {currentWebsite && (
                <>
                  {/* Creation */}
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild tooltip="Studio" isActive={isActive('/studio')}>
                      <Link href={buildUrl('/studio')}>
                        <PageIcon page="studio" size="sm" isActive={isActive('/studio')} />
                        <span className={cn(isActive('/studio') && "text-primary font-semibold")}>Studio</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild tooltip={t('common:navigation.pages')} isActive={isActive('/pages')}>
                      <Link href={buildUrl('/pages')}>
                        <PageIcon page="pages" size="sm" isActive={isActive('/pages')} />
                        <span className={cn(isActive('/pages') && "text-primary font-semibold")}>{t('common:navigation.pages')}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild tooltip={t('common:navigation.media')} isActive={isActive('/cloud')}>
                      <Link href={buildUrl('/cloud')}>
                        <PageIcon page="cloud" size="sm" isActive={isActive('/cloud')} />
                        <span className={cn(isActive('/cloud') && "text-primary font-semibold")}>{t('common:navigation.media')}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild tooltip={t('common:navigation.theme')} isActive={isActive('/theme')}>
                      <Link href={buildUrl('/theme')}>
                        <PageIcon page="theme" size="sm" isActive={isActive('/theme')} />
                        <span className={cn(isActive('/theme') && "text-primary font-semibold")}>{t('common:navigation.theme')}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>

                  {/* Analytics */}
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild tooltip="Analytics" isActive={isActive('/analytics')}>
                      <Link href={buildUrl('/analytics')}>
                        <PageIcon page="analytics" size="sm" isActive={isActive('/analytics')} />
                        <span className={cn(isActive('/analytics') && "text-primary font-semibold")}>Analytics</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild tooltip="SEO" isActive={isActive('/seo')}>
                      <Link href={buildUrl('/seo')}>
                        <PageIcon page="seo" size="sm" isActive={isActive('/seo')} />
                        <span className={cn(isActive('/seo') && "text-primary font-semibold")}>SEO</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>

                  {/* Configuration */}
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild tooltip={t('common:navigation.settings')} isActive={isActive('/settings')}>
                      <Link href={buildUrl('/settings')}>
                        <PageIcon page="settings" size="sm" isActive={isActive('/settings')} />
                        <span className={cn(isActive('/settings') && "text-primary font-semibold")}>{t('common:navigation.settings')}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild tooltip={t('common:navigation.administrators')} isActive={isActive('/administrators')}>
                      <Link href={buildUrl('/administrators')}>
                        <PageIcon page="administrators" size="sm" isActive={isActive('/administrators')} />
                        <span className={cn(isActive('/administrators') && "text-primary font-semibold")}>{t('common:navigation.administrators')}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </>
              )}

              {/* Extensions - Always visible */}
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip={t('common:navigation.extensions')} isActive={isActive('/extensions')}>
                  <Link href={buildUrl('/extensions')}>
                    <PageIcon page="extensions" size="sm" isActive={isActive('/extensions')} />
                    <span className={cn(isActive('/extensions') && "text-primary font-semibold")}>{t('common:navigation.extensions')}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Active Extensions */}
        {enabledExtensions.length > 0 && (
          <>
            <SidebarSeparator />
            <SidebarGroup>
              <SidebarGroupContent>
                <SidebarMenu>
                  {enabledExtensions.map((extension) => {
                    const extPath = `/extensions/${extension.extension_slug}`
                    return (
                      <SidebarMenuItem key={extension.id}>
                        <SidebarMenuButton asChild tooltip={extension.extension_name} isActive={isActive(extPath)}>
                          <Link href={buildUrl(extPath)}>
                            <ExtensionIcon icon={extension.icon} slug={extension.extension_slug} size="sm" isActive={isActive(extPath)} />
                            <span className={cn(isActive(extPath) && "text-primary font-semibold")}>{extension.extension_name}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    )
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </>
        )}
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  )
}
