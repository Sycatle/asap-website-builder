"use client"

import { useState, useCallback } from "react"
import { ChevronsUpDown, Plus, CheckCircle2, Clock, Loader2, Globe } from "lucide-react"
import type { Website } from "@/lib/api"
import { CreateWebsiteModal } from "./CreateWebsiteModal"
import { useCacheActions } from "@/hooks/useCache"
import { getWebsiteDisplayUrl } from "@/lib/utils/formatters"

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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"

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
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const { invalidate } = useCacheActions()

  const handleWebsiteSelect = useCallback((website: Website) => {
    if (onWebsiteChange && website.id !== currentWebsite?.id) {
      onWebsiteChange(website)
    }
    setIsDropdownOpen(false)
  }, [onWebsiteChange, currentWebsite?.id])

  const handleCreateSuccess = useCallback((_websiteId: string) => {
    // Refresh websites list after creation
    invalidate('websites')
    setIsDropdownOpen(false)
  }, [invalidate])

  // Get first letter of title for avatar
  const getInitial = (title: string) => {
    return title?.charAt(0)?.toUpperCase() || "S"
  }

  // Get status display
  const getStatusInfo = (status: string) => {
    if (status === 'published') {
      return { icon: CheckCircle2, label: 'En ligne', className: 'text-green-500' }
    }
    return { icon: Clock, label: 'Brouillon', className: 'text-muted-foreground' }
  }

  if (isLoading) {
    return (
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton size="lg" disabled className="cursor-wait">
            <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary/30">
              <Loader2 className="size-4 animate-spin text-sidebar-primary-foreground/50" />
            </div>
            <div className="grid flex-1 text-left text-sm leading-tight gap-1.5">
              <span className="h-4 w-20 bg-muted/60 animate-pulse rounded" />
              <span className="h-3 w-28 bg-muted/40 animate-pulse rounded" />
            </div>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    )
  }

  // No website state - prompt to create
  if (!currentWebsite && websites.length === 0) {
    return (
      <>
        <SidebarMenu>
          <SidebarMenuItem>
            <Tooltip>
              <TooltipTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  onClick={() => setShowCreateModal(true)}
                  className="border-2 border-dashed border-sidebar-border hover:border-primary/50 hover:bg-sidebar-accent/50 transition-colors"
                >
                  <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary/10 text-sidebar-primary">
                    <Globe className="size-4" />
                  </div>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold text-muted-foreground">
                      Créer un site
                    </span>
                    <span className="truncate text-xs text-muted-foreground/70">
                      Commencer avec un template
                    </span>
                  </div>
                  <Plus className="ml-auto size-4 text-muted-foreground" />
                </SidebarMenuButton>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p>Créer votre premier site</p>
              </TooltipContent>
            </Tooltip>
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

  return (
    <>
      <SidebarMenu>
        <SidebarMenuItem>
          <DropdownMenu open={isDropdownOpen} onOpenChange={setIsDropdownOpen}>
            <DropdownMenuTrigger asChild>
              <SidebarMenuButton
                size="lg"
                className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground transition-colors"
                aria-label={`Site actuel: ${currentWebsite?.title || 'Sélectionner un site'}`}
              >
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground font-bold shadow-sm">
                  {currentWebsite ? getInitial(currentWebsite.title) : "A"}
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">
                    {currentWebsite?.title || "ASAP"}
                  </span>
                  <span className="truncate text-xs text-muted-foreground">
                    {currentWebsite ? getWebsiteDisplayUrl(currentWebsite.slug) : "Sélectionner un site"}
                  </span>
                </div>
                <ChevronsUpDown className="ml-auto size-4 text-muted-foreground" />
              </SidebarMenuButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className="w-[--radix-dropdown-menu-trigger-width] min-w-64 rounded-lg shadow-lg"
              align="start"
              side={isMobile ? "bottom" : "right"}
              sideOffset={4}
            >
              <DropdownMenuLabel className="text-xs text-muted-foreground font-medium px-2">
                Mes sites ({websites.length})
              </DropdownMenuLabel>
              {websites.length === 0 ? (
                <div className="px-3 py-4 text-center">
                  <Globe className="size-8 mx-auto mb-2 text-muted-foreground/50" />
                  <p className="text-sm text-muted-foreground">Aucun site créé</p>
                  <p className="text-xs text-muted-foreground/70 mt-1">
                    Créez votre premier site ci-dessous
                  </p>
                </div>
              ) : (
                <div className="max-h-[280px] overflow-y-auto">
                  {websites.map((website) => {
                    const statusInfo = getStatusInfo(website.status)
                    const StatusIcon = statusInfo.icon
                    const isSelected = currentWebsite?.id === website.id
                    
                    return (
                      <DropdownMenuItem
                        key={website.id}
                        onClick={() => handleWebsiteSelect(website)}
                        className={`gap-2 p-2 cursor-pointer mx-1 rounded-md transition-colors ${
                          isSelected ? 'bg-accent' : ''
                        }`}
                      >
                        <div className={`flex size-7 items-center justify-center rounded-md border font-medium text-xs transition-colors ${
                          isSelected ? 'bg-primary text-primary-foreground border-primary' : 'bg-background'
                        }`}>
                          {getInitial(website.title)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="truncate block font-medium">{website.title}</span>
                          <span className="text-xs text-muted-foreground truncate block">
                            {getWebsiteDisplayUrl(website.slug)}
                          </span>
                        </div>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <StatusIcon className={`size-4 shrink-0 ${statusInfo.className}`} />
                          </TooltipTrigger>
                          <TooltipContent side="right" className="text-xs">
                            {statusInfo.label}
                          </TooltipContent>
                        </Tooltip>
                      </DropdownMenuItem>
                    )
                  })}
                </div>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                className="gap-2 p-2 cursor-pointer mx-1 rounded-md text-primary hover:text-primary focus:text-primary"
                onClick={() => setShowCreateModal(true)}
              >
                <div className="flex size-7 items-center justify-center rounded-md border border-dashed bg-background">
                  <Plus className="size-4" />
                </div>
                <span className="font-medium">Créer un nouveau site</span>
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
