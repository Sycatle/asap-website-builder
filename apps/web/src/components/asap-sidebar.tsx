import * as React from "react"
import {
  Home,
  ImageIcon,
  Puzzle,
  Link,
  BookOpen,
  Mail,
  BarChart3,
  Palette,
  Pencil,
  Settings,
  FileText,
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
import { SiteSwitcher } from "@/components/SiteSwitcher"
import { PagesList } from "@/components/PagesList"
import type { WebsiteExtension, Website, Page } from "@/lib/api"

// Icon mapping for extension categories (same as ExtensionsManager)
const categoryIcons: Record<string, React.ElementType> = {
  'integration': Link,
  'content': BookOpen,
  'engagement': Mail,
  'analytics': BarChart3,
  'appearance': Palette,
}

interface AsapSidebarProps {
  extensions?: WebsiteExtension[]
  websites?: Website[]
  currentWebsite?: Website | null
  onWebsiteChange?: (website: Website) => void
  isLoadingWebsites?: boolean
  currentPageId?: string
  onPageSelect?: (page: Page) => void
}

export function AsapSidebar({ 
  extensions = [], 
  websites = [],
  currentWebsite = null,
  onWebsiteChange,
  isLoadingWebsites = false,
  currentPageId,
  onPageSelect
}: AsapSidebarProps) {
  // Filter enabled extensions
  const enabledExtensions = extensions.filter(e => e.enabled)

  // Get icon for an extension based on its category
  const getExtensionIcon = (category: string): React.ElementType => {
    return categoryIcons[category] || Puzzle
  }

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SiteSwitcher
          websites={websites}
          currentWebsite={currentWebsite}
          onWebsiteChange={onWebsiteChange}
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
                  <a href="/app/dashboard">
                    <Home />
                    <span>Accueil</span>
                  </a>
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
                    <a href="/app/studio">
                      <Pencil />
                      <span>Studio</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild tooltip="Pages">
                    <a href="/app/pages">
                      <FileText />
                      <span>Pages</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild tooltip="Médias">
                    <a href="/app/cloud">
                      <ImageIcon />
                      <span>Médias</span>
                    </a>
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
                    <a href="/app/settings">
                      <Settings />
                      <span>Paramètres</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="Extensions">
                  <a href="/app/extensions">
                    <Puzzle />
                    <span>Extensions</span>
                  </a>
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
                          <a href={`/app/extensions/${extension.extension_slug}`}>
                            <IconComponent />
                            <span>{extension.extension_name}</span>
                          </a>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    )
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </>
        )}

        {/* Pages List - Collapsible when website selected */}
        {currentWebsite && (
          <PagesList
            websiteId={currentWebsite.id}
            websiteSlug={currentWebsite.slug}
            currentPageId={currentPageId}
            onPageSelect={onPageSelect}
          />
        )}
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  )
}
