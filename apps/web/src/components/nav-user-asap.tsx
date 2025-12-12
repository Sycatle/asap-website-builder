"use client"

import * as React from "react"
import { useState, useEffect } from "react"
import {
  ChevronsUpDown,
  LogOut,
  Settings,
  CreditCard,
} from "lucide-react"

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"
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
import { SettingsModal } from "@/components/settings-modal"
import { authAPI, websitesAPI, type Website } from "@/lib/api"

interface UserData {
  id: string
  email: string
  name: string
  avatar?: string
  tenantId?: string
}

interface NavUserAsapProps {
  user?: Partial<UserData>
}

export function NavUserAsap({ user: initialUser }: NavUserAsapProps) {
  const { isMobile } = useSidebar()
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [settingsTab, setSettingsTab] = useState<'account' | 'billing'>('account')
  const [isLoading, setIsLoading] = useState(true)
  const [user, setUser] = useState<UserData>({
    id: "",
    email: initialUser?.email || "",
    name: initialUser?.name || "",
    avatar: initialUser?.avatar,
  })
  const [website, setWebsite] = useState<Website | null>(null)

  // Load user and website data from API
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true)
      try {
        // Fetch user info
        const meData = await authAPI.me()
        const userData: UserData = {
          id: meData.id,
          email: meData.email,
          name: meData.email.split('@')[0], // Default name from email
          tenantId: meData.tenant_id,
        }
        setUser(userData)

        // Fetch website info for the site URL
        try {
          const websites = await websitesAPI.list()
          if (websites.length > 0) {
            setWebsite(websites[0])
          }
        } catch (err) {
          console.error('Failed to load website:', err)
        }
      } catch (err) {
        console.error('Failed to load user data:', err)
      } finally {
        setIsLoading(false)
      }
    }
    loadData()
  }, [])

  const handleLogout = () => {
    localStorage.removeItem('auth_token')
    window.location.href = '/login'
  }

  const handleUserUpdate = (updatedData: Partial<UserData>) => {
    setUser(prev => ({ ...prev, ...updatedData }))
  }

  const openSettings = (tab: 'account' | 'billing' = 'account') => {
    setSettingsTab(tab)
    setSettingsOpen(true)
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) || '?'
  }

  if (isLoading) {
    return (
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton size="lg" className="animate-pulse">
            <div className="h-8 w-8 rounded-lg bg-muted" />
            <div className="grid flex-1 gap-1">
              <div className="h-4 w-24 rounded bg-muted" />
              <div className="h-3 w-32 rounded bg-muted" />
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
                <Avatar className="h-8 w-8 rounded-lg">
                  <AvatarImage src={user.avatar} alt={user.name} />
                  <AvatarFallback className="rounded-lg bg-primary text-primary-foreground text-xs">
                    {getInitials(user.name || user.email)}
                  </AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">{website?.title || user.name || 'Mon site'}</span>
                  <span className="truncate text-xs text-muted-foreground">{user.email}</span>
                </div>
                <ChevronsUpDown className="ml-auto size-4" />
              </SidebarMenuButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
              side={isMobile ? "bottom" : "right"}
              align="end"
              sideOffset={4}
            >
              <DropdownMenuLabel className="p-0 font-normal">
                <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                  <Avatar className="h-8 w-8 rounded-lg">
                    <AvatarImage src={user.avatar} alt={user.name} />
                    <AvatarFallback className="rounded-lg bg-primary text-primary-foreground text-xs">
                      {getInitials(user.name || user.email)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">{user.name || user.email.split('@')[0]}</span>
                    <span className="truncate text-xs text-muted-foreground">{user.email}</span>
                  </div>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => openSettings('account')}>
                <Settings className="mr-2 h-4 w-4" />
                Paramètres
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => openSettings('billing')}>
                <CreditCard className="mr-2 h-4 w-4" />
                Facturation
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
                <LogOut className="mr-2 h-4 w-4" />
                Déconnexion
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarMenuItem>
      </SidebarMenu>

      {/* Settings Modal */}
      <SettingsModal
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        user={user}
        onUserUpdate={handleUserUpdate}
        defaultTab={settingsTab}
      />
    </>
  )
}
