"use client"

import { useState } from "react"
import { ChevronsUpDown, Plus, CheckCircle2, Clock } from "lucide-react"
import type { Website } from "@/lib/api"
import { CreateWebsiteModal } from "./CreateWebsiteModal"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"

interface SiteSwitcherProps {
  websites: Website[]
  currentWebsite: Website | null
  onWebsiteChange?: (website: Website) => void
  isLoading?: boolean
}

export function SiteSwitcher({ 
  websites, 
  currentWebsite, 
  onWebsiteChange,
  isLoading = false 
}: SiteSwitcherProps) {
  const { isMobile } = useSidebar()
  const [showCreateModal, setShowCreateModal] = useState(false)

  const handleWebsiteSelect = (website: Website) => {
    if (onWebsiteChange) {
      onWebsiteChange(website)
    }
  }

  const handleCreateSuccess = (_websiteId: string) => {
    // The cache will be invalidated by the CreateWebsiteModal
    // The new website will appear in the list after refetch
  }

  // Get first letter of title for avatar
  const getInitial = (title: string) => {
    return title?.charAt(0)?.toUpperCase() || "S"
  }

  if (isLoading) {
    return (
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton size="lg" disabled>
            <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary/50 animate-pulse" />
            <div className="grid flex-1 text-left text-sm leading-tight gap-1">
              <span className="h-4 w-20 bg-muted animate-pulse rounded" />
              <span className="h-3 w-24 bg-muted animate-pulse rounded" />
            </div>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    )
  }

  return (
    <>
      <SidebarMenu>
        <SidebarMenuItem>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <SidebarMenuButton
                size="lg"
                className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
              >
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground font-bold">
                  {currentWebsite ? getInitial(currentWebsite.title) : "A"}
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">
                    {currentWebsite?.title || "ASAP"}
                  </span>
                  <span className="truncate text-xs text-muted-foreground">
                    {currentWebsite ? `${currentWebsite.slug}.asap.cool` : "Sélectionner un site"}
                  </span>
                </div>
                <ChevronsUpDown className="ml-auto size-4" />
              </SidebarMenuButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
              align="start"
              side={isMobile ? "bottom" : "right"}
              sideOffset={4}
            >
              <DropdownMenuLabel className="text-xs text-muted-foreground">
                Mes sites
              </DropdownMenuLabel>
              {websites.length === 0 ? (
                <div className="px-2 py-3 text-center text-sm text-muted-foreground">
                  Aucun site créé
                </div>
              ) : (
                websites.map((website) => (
                  <DropdownMenuItem
                    key={website.id}
                    onClick={() => handleWebsiteSelect(website)}
                    className="gap-2 p-2 cursor-pointer"
                  >
                    <div className="flex size-6 items-center justify-center rounded-sm border bg-background font-medium text-xs">
                      {getInitial(website.title)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="truncate block">{website.title}</span>
                      <span className="text-xs text-muted-foreground truncate block">
                        {website.slug}.asap.cool
                      </span>
                    </div>
                    {website.status === 'published' ? (
                      <CheckCircle2 className="size-4 text-green-500 shrink-0" />
                    ) : (
                      <Clock className="size-4 text-muted-foreground shrink-0" />
                    )}
                    {currentWebsite?.id === website.id && (
                      <div className="size-2 rounded-full bg-primary shrink-0" />
                    )}
                  </DropdownMenuItem>
                ))
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                className="gap-2 p-2 cursor-pointer"
                onClick={() => setShowCreateModal(true)}
              >
                <div className="flex size-6 items-center justify-center rounded-md border bg-background">
                  <Plus className="size-4" />
                </div>
                <div className="font-medium text-muted-foreground">
                  Créer un nouveau site
                </div>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarMenuItem>
      </SidebarMenu>

      <CreateWebsiteModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={handleCreateSuccess}
      />
    </>
  )
}
