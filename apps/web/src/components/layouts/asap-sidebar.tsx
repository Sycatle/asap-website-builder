import * as React from "react"
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
                <SidebarMenuButton asChild tooltip="Accueil">
                  <Link href={buildUrl('')}>
                    <Home />
                    <span>Accueil</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Création - Only when website selected */}
        {currentWebsite && (
          <SidebarGroup>
            <SidebarGroupLabel>Création</SidebarGroupLabel>
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
                  <SidebarMenuButton asChild tooltip="Pages">
                    <Link href={buildUrl('/pages')}>
                      <FileText />
                      <span>Pages</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild tooltip="Médias">
                    <Link href={buildUrl('/cloud')}>
                      <ImageIcon />
                      <span>Médias</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Configuration */}
        <SidebarGroup>
          <SidebarGroupLabel>Configuration</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {currentWebsite && (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild tooltip="Paramètres">
                    <Link href={buildUrl('/settings')}>
                      <Settings />
                      <span>Paramètres</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
              {currentWebsite && (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild tooltip="Administrateurs">
                    <Link href={buildUrl('/administrators')}>
                      <Users />
                      <span>Administrateurs</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
              {currentWebsite && (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild tooltip="Thème">
                    <Link href={buildUrl('/theme')}>
                      <Palette />
                      <span>Thème</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="Extensions">
                  <Link href={buildUrl('/extensions')}>
                    <Puzzle />
                    <span>Extensions</span>
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
