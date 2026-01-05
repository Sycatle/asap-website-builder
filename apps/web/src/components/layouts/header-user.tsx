"use client"

import * as React from "react"
import { useState, useEffect } from "react"
import { useTranslation } from "react-i18next"
import {
  LogOut,
  Settings,
  CreditCard,
  ExternalLink,
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
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { NotificationsDropdown, LogoutConfirmDialog } from "@/components/shared"
import { 
  useAuthStore, 
  useUserData, 
  useAuthLoading,
  type UserData 
} from "@/lib/store/authStore"
import { getSettingsUrl } from "@/lib/utils/auth-redirect"

interface HeaderUserProps {
  user?: Partial<UserData>
}

export function HeaderUser({ user: initialUser }: HeaderUserProps) {
  const { t } = useTranslation('common')
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false)
  
  // Use the centralized auth store
  const userData = useUserData()
  const isLoading = useAuthLoading()
  const { fetchFullUserData, updateUserData } = useAuthStore()

  // Fetch user data on mount
  useEffect(() => {
    fetchFullUserData()
  }, [fetchFullUserData])

  const handleLogout = () => {
    setLogoutDialogOpen(true)
  }

  // Redirect to accounts app settings
  const openSettings = (section?: string) => {
    window.location.href = getSettingsUrl(section)
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) || '?'
  }

  // Use initial user or store user data
  const user = userData || {
    id: "",
    email: initialUser?.email || "",
    name: initialUser?.name || "",
    avatar: initialUser?.avatar,
  }

  if (isLoading && !userData) {
    return (
      <div className="flex items-center gap-2">
        <Skeleton className="h-9 w-9 rounded-md" />
        <Skeleton className="h-8 w-8 rounded-full" />
      </div>
    )
  }

  return (
    <>
      <div className="flex items-center gap-2">
        {/* Notifications Dropdown */}
        <NotificationsDropdown />
        
        {/* User Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-8 w-8 rounded-full">
              <Avatar className="h-8 w-8">
                <AvatarImage src={user.avatar} alt={user.name} />
                <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                  {getInitials(user.name || user.email)}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56" align="end" forceMount>
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium leading-none">{user.name || user.email.split('@')[0]}</p>
              <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => openSettings('profile')}>
            <Settings className="mr-2 h-4 w-4" />
            {t('navigation.settings')}
            <ExternalLink className="ml-auto h-3 w-3 text-muted-foreground" />
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => openSettings('billing')}>
            <CreditCard className="mr-2 h-4 w-4" />
            {t('navigation.billing')}
            <ExternalLink className="ml-auto h-3 w-3 text-muted-foreground" />
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
            <LogOut className="mr-2 h-4 w-4" />
            {t('navigation.logout')}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      </div>

      {/* Logout Confirmation Dialog */}
      <LogoutConfirmDialog
        open={logoutDialogOpen}
        onOpenChange={setLogoutDialogOpen}
      />
    </>
  )
}
