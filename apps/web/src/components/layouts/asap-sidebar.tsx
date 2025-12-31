import * as React from "react"
import { useTranslation } from "react-i18next"
import {
  Home,
  ImageIcon,
  Puzzle,
  Link as LinkIcon,
  BookOpen,
  Mail,
  BarChart3,
  Palette,
  Pencil,
  Settings,
  FileText,
  Users,
  Search,
} from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarRail,
  SidebarSeparator,
} from "@/components/ui/sidebar"
import { SiteSwitcher } from "@/components/features/websites/SiteSwitcher"
import { useWebsiteContext } from "@/contexts/WebsiteContext"
import { Link } from "@/components/app-router"
import type { WebsiteExtension, Website } from "@/lib/api"

// Icon mapping for extension categories (same as ExtensionsManager)
const categoryIcons: Record<string, React.ElementType> = {
  'integration': LinkIcon,
  'content': BookOpen,
  'engagement': Mail,
  'analytics': BarChart3,
  'appearance': Palette,
}

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
  
  // Get current website ID from context
  const { currentWebsiteId } = useWebsiteContext()
  
  // Filter enabled extensions
  const enabledExtensions = extensions.filter(e => e.enabled)

  // Get icon for an extension based on its category
  const getExtensionIcon = (category: string): React.ElementType => {
    return categoryIcons[category] || Puzzle
  }

  // Build URL helper
  const buildUrl = (path: string) => {
    if (!currentWebsiteId) return '/app'
    return `/app/${currentWebsiteId}${path}`
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
        {/* Accueil */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip={t('common:navigation.home')}>
                  <Link href={buildUrl('')}>
                    <Home />
                    <span>{t('common:navigation.home')}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Création - Only when website selected */}
        {currentWebsite && (
          <SidebarGroup>
            <SidebarGroupLabel>{t('common:navigation.creation')}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild tooltip="Studio">
                    <Link href={buildUrl('/studio')}>
                      <Pencil />
                      <span>Studio</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild tooltip={t('common:navigation.pages')}>
                    <Link href={buildUrl('/pages')}>
                      <FileText />
                      <span>{t('common:navigation.pages')}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild tooltip={t('common:navigation.media')}>
                    <Link href={buildUrl('/cloud')}>
                      <ImageIcon />
                      <span>{t('common:navigation.media')}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Analytics */}
        {currentWebsite && (
          <SidebarGroup>
            <SidebarGroupLabel>{t('common:navigation.analytics')}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild tooltip="Analytics">
                    <Link href={buildUrl('/analytics')}>
                      <BarChart3 />
                      <span>Analytics</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild tooltip="SEO">
                    <Link href={buildUrl('/seo')}>
                      <Search />
                      <span>SEO</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Configuration */}
        <SidebarGroup>
          <SidebarGroupLabel>{t('common:navigation.configuration')}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {currentWebsite && (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild tooltip={t('common:navigation.settings')}>
                    <Link href={buildUrl('/settings')}>
                      <Settings />
                      <span>{t('common:navigation.settings')}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
              {currentWebsite && (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild tooltip={t('common:navigation.administrators')}>
                    <Link href={buildUrl('/administrators')}>
                      <Users />
                      <span>{t('common:navigation.administrators')}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
              {currentWebsite && (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild tooltip={t('common:navigation.theme')}>
                    <Link href={buildUrl('/theme')}>
                      <Palette />
                      <span>{t('common:navigation.theme')}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip={t('common:navigation.extensions')}>
                  <Link href={buildUrl('/extensions')}>
                    <Puzzle />
                    <span>{t('common:navigation.extensions')}</span>
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
                    const IconComponent = getExtensionIcon(extension.category)
                    return (
                      <SidebarMenuItem key={extension.id}>
                        <SidebarMenuButton asChild tooltip={extension.extension_name}>
                          <Link href={buildUrl(`/extensions/${extension.extension_slug}`)}>
                            <IconComponent />
                            <span>{extension.extension_name}</span>
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
