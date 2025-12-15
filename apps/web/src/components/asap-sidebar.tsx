import * as React from "react"
import {
  Home,
  FileText,
  Cloud,
  Puzzle,
  Github,
  BookOpen,
  Mail,
  BarChart3,
  Palette,
  Globe,
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
import type { WebsiteModule } from "@/lib/api"

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
  user?: {
    name: string
    email: string
    avatar?: string
  }
}

export function AsapSidebar({ modules = [], user }: AsapSidebarProps) {
  const navMain = [
    {
      title: "Dashboard",
      url: "/app/dashboard",
      icon: Home,
    },
    {
      title: "Mes sites",
      url: "/app/websites",
      icon: Globe,
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
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <a href="/app/dashboard">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold">
                  A
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">ASAP</span>
                  <span className="truncate text-xs text-muted-foreground">Dashboard</span>
                </div>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
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
