import * as React from "react"
import {
  Home,
  Cloud,
  Puzzle,
  Github,
  BookOpen,
  Mail,
  BarChart3,
  Palette,
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
} from "@/components/ui/sidebar"
import { SiteSwitcher } from "@/components/SiteSwitcher"
import { PagesList } from "@/components/PagesList"
import type { WebsiteModule, Website, Page } from "@/lib/api"

// Icon mapping for modules
const moduleIcons: Record<string, React.ElementType> = {
  'github': Github,
  'github-sync': Github,
  'blog': BookOpen,
  'blog-engine': BookOpen,
  'contact': Mail,
  'contact-form': Mail,
  'analytics': BarChart3,
  'analytics-tracker': BarChart3,
  'theme': Palette,
  'theme-engine': Palette,
}

interface AsapSidebarProps {
  modules?: WebsiteModule[]
  websites?: Website[]
  currentWebsite?: Website | null
  onWebsiteChange?: (website: Website) => void
  isLoadingWebsites?: boolean
  currentPageId?: string
  onPageSelect?: (page: Page) => void
}

export function AsapSidebar({ 
  modules = [], 
  websites = [],
  currentWebsite = null,
  onWebsiteChange,
  isLoadingWebsites = false,
  currentPageId,
  onPageSelect
}: AsapSidebarProps) {
  const navMain = [
    {
      title: "Dashboard",
      url: "/app/dashboard",
      icon: Home,
    },
    {
      title: "Modules",
      url: "/app/modules",
      icon: Puzzle,
    },
    {
      title: "Cloud",
      url: "/app/cloud",
      icon: Cloud,
    },
  ]

  // Filter enabled modules
  const enabledModules = modules.filter(m => m.enabled)

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
        {/* Main Navigation */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navMain.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild tooltip={item.title}>
                    <a href={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Pages - Only show when a website is selected */}
        {currentWebsite && (
          <PagesList
            websiteId={currentWebsite.id}
            websiteSlug={currentWebsite.slug}
            currentPageId={currentPageId}
            onPageSelect={onPageSelect}
          />
        )}

        {/* Dynamic Modules */}
        {enabledModules.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel>Modules</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {enabledModules.map((module) => {
                  const IconComponent = moduleIcons[module.module_slug] || Puzzle
                  return (
                    <SidebarMenuItem key={module.id}>
                      <SidebarMenuButton asChild tooltip={module.module_name}>
                        <a href={`/app/modules/${module.module_slug}`}>
                          <IconComponent />
                          <span>{module.module_name}</span>
                        </a>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  )
}
