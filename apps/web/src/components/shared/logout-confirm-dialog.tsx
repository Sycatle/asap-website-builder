"use client"

import * as React from "react"
import { useTranslation } from 'react-i18next'
import { LogOut, Monitor } from "lucide-react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { useAuthStore } from "@/lib/store/authStore"

interface LogoutConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function LogoutConfirmDialog({ open, onOpenChange }: LogoutConfirmDialogProps) {
  const { t } = useTranslation()
  const { logout } = useAuthStore()
  const [isLoggingOut, setIsLoggingOut] = React.useState(false)

  const handleLogout = async (fromAllDevices: boolean = false) => {
    setIsLoggingOut(true)
    try {
      await logout(fromAllDevices)
    } finally {
      setIsLoggingOut(false)
      onOpenChange(false)
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <LogOut className="h-5 w-5" />
            {t('auth:logout.title')}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {t('auth:logout.description')}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col gap-2 sm:gap-3">
          <div className="flex flex-col-reverse sm:flex-row gap-2 w-full">
            <AlertDialogCancel disabled={isLoggingOut} className="sm:flex-1">
              {t('common:actions.cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => handleLogout(false)}
              disabled={isLoggingOut}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 sm:flex-1"
            >
              {isLoggingOut ? t('auth:logout.loggingOut') : t('common:navigation.logout')}
            </AlertDialogAction>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleLogout(true)}
            disabled={isLoggingOut}
            className="gap-2 text-muted-foreground hover:text-foreground w-full"
          >
            <Monitor className="h-4 w-4" />
            {t('auth:logout.allDevices')}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
