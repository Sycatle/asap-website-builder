"use client"

import * as React from "react"
import { useState, useEffect } from "react"
import {
  User,
  Shield,
  CreditCard,
  Cloud,
  Sparkles,
  Bell,
  Palette,
} from "lucide-react"
import { Spinner } from "@/components/ui/spinner"

import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "@/components/ui/responsive-dialog"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { filesAPI, websitesAPI, extensionsAPI, accountsAPI, type QuotaUsage, type FileMetadata, type Website, type WebsiteExtension } from "@/lib/api"

// Import extracted tab components
import {
  AccountSettings,
  SecuritySettings,
  BillingSettings,
  CloudSettings,
  PlanSettings,
  NotificationsSettings,
  AppearanceSettings,
  type UserData,
} from "./tabs"

// ============================================================================
// Types
// ============================================================================

export type SettingsTab = 'account' | 'security' | 'billing' | 'cloud' | 'plan' | 'notifications' | 'appearance'

export interface SettingsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  user: UserData
  onUserUpdate?: (user: Partial<UserData>) => void
  defaultTab?: SettingsTab
}

// ============================================================================
// Config
// ============================================================================

const SETTINGS_TABS = [
  { id: 'account' as const, label: 'Compte', icon: User },
  { id: 'security' as const, label: 'Sécurité', icon: Shield },
  { id: 'billing' as const, label: 'Facturation', icon: CreditCard },
  { id: 'cloud' as const, label: 'Stockage', icon: Cloud },
  { id: 'plan' as const, label: 'Abonnement', icon: Sparkles },
  { id: 'notifications' as const, label: 'Notifications', icon: Bell },
  { id: 'appearance' as const, label: 'Apparence', icon: Palette },
] as const

// ============================================================================
// Helpers
// ============================================================================

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || '?'
}

// ============================================================================
// Sub-components
// ============================================================================

interface TabNavigationProps {
  activeTab: SettingsTab
  onTabChange: (tab: SettingsTab) => void
  variant: 'mobile' | 'desktop'
}

function TabNavigation({ activeTab, onTabChange, variant }: TabNavigationProps) {
  if (variant === 'mobile') {
    return (
      <div className="sm:hidden border-b bg-muted/30 p-2 shrink-0 overflow-x-auto">
        <div className="flex gap-1 min-w-max">
          {SETTINGS_TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={cn(
                "flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors whitespace-nowrap",
                activeTab === tab.id
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <tab.icon className="h-3.5 w-3.5" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="hidden sm:flex w-56 border-r bg-muted/30 p-4 flex-col shrink-0">
      <ResponsiveDialogHeader className="pb-4">
        <ResponsiveDialogTitle className="text-lg">Paramètres</ResponsiveDialogTitle>
      </ResponsiveDialogHeader>
      <nav className="flex-1 space-y-1 overflow-y-auto">
        {SETTINGS_TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={cn(
              "w-full flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              activeTab === tab.id
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </nav>
    </div>
  )
}

// ============================================================================
// Main Component
// ============================================================================

export function SettingsModal({ 
  open, 
  onOpenChange, 
  user, 
  onUserUpdate, 
  defaultTab = 'account' 
}: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState<SettingsTab>(defaultTab)
  const [isSaving, setIsSaving] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [formData, setFormData] = useState({
    name: user.name,
    email: user.email,
  })
  
  // API data
  const [quota, setQuota] = useState<QuotaUsage | null>(null)
  const [files, setFiles] = useState<FileMetadata[]>([])
  const [websites, setWebsites] = useState<Website[]>([])
  const [extensions, setExtensions] = useState<WebsiteExtension[]>([])
  
  const websiteId = websites[0]?.id || null

  // Load data when modal opens
  useEffect(() => {
    if (open) {
      setActiveTab(defaultTab)
      loadData()
    }
  }, [open, defaultTab])

  const loadData = async () => {
    setIsLoading(true)
    try {
      const [quotaData, filesData, websitesData, accountData] = await Promise.all([
        filesAPI.getQuota().catch(() => null),
        filesAPI.list().catch(() => []),
        websitesAPI.list().catch(() => []),
        accountsAPI.getAccount(user.id).catch(() => null),
      ])
      
      if (accountData?.data) {
        setFormData(prev => ({
          ...prev,
          name: accountData.data.name || prev.name,
        }))
      }
      
      let extensionsData: WebsiteExtension[] = []
      if (websitesData.length > 0) {
        extensionsData = await extensionsAPI.listForWebsite(websitesData[0].id).catch(() => [])
      }
      
      setQuota(quotaData)
      setFiles(filesData)
      setWebsites(websitesData)
      setExtensions(extensionsData)
    } catch (error) {
      console.error('Failed to load settings data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSave = async () => {
    setIsSaving(true)

    const savePromise = async () => {
      const currentAccount = await accountsAPI.getAccount(user.id)
      const currentData = currentAccount.data || {}
      
      await accountsAPI.updateAccountData(user.id, {
        data: { ...currentData, name: formData.name }
      })
      
      onUserUpdate?.({ name: formData.name })
    }

    toast.promise(savePromise(), {
      loading: 'Enregistrement...',
      success: 'Profil mis à jour',
      error: 'Erreur lors de la sauvegarde',
    })

    try {
      await savePromise()
      onOpenChange(false)
    } catch (error) {
      console.error('Failed to save account data:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const renderTabContent = () => {
    switch (activeTab) {
      case 'account':
        return (
          <AccountSettings
            user={user}
            formData={formData}
            setFormData={setFormData}
            getInitials={getInitials}
            onAvatarUpdate={(avatarUrl) => onUserUpdate?.({ avatar: avatarUrl })}
          />
        )
      case 'security':
        return <SecuritySettings />
      case 'billing':
        return <BillingSettings />
      case 'cloud':
        return (
          <CloudSettings 
            quota={quota} 
            files={files} 
            isLoading={isLoading} 
            websiteId={websiteId} 
            onClose={() => onOpenChange(false)} 
          />
        )
      case 'plan':
        return (
          <PlanSettings 
            quota={quota} 
            websites={websites} 
            extensions={extensions} 
            isLoading={isLoading} 
          />
        )
      case 'notifications':
        return <NotificationsSettings />
      case 'appearance':
        return <AppearanceSettings />
      default:
        return null
    }
  }

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent className="max-w-[calc(100%-1rem)] sm:max-w-4xl h-[90vh] sm:h-[80vh] max-h-[700px] p-0 gap-0 flex flex-col [&>button]:z-10 overflow-hidden">
        <div className="flex flex-col sm:flex-row h-full min-h-0">
          {/* Mobile Tab Bar */}
          <TabNavigation 
            activeTab={activeTab} 
            onTabChange={setActiveTab} 
            variant="mobile" 
          />

          {/* Desktop Sidebar */}
          <TabNavigation 
            activeTab={activeTab} 
            onTabChange={setActiveTab} 
            variant="desktop" 
          />

          {/* Content */}
          <div className="flex-1 flex flex-col min-h-0 min-w-0">
            <div className="flex-1 overflow-y-auto p-4 sm:p-6">
              {renderTabContent()}
            </div>

            {/* Footer with save button - only for account tab */}
            {activeTab === 'account' && (
              <div className="border-t p-3 sm:p-4 flex flex-col-reverse sm:flex-row sm:justify-end gap-2 bg-background">
                <Button variant="outline" onClick={() => onOpenChange(false)} className="w-full sm:w-auto">
                  Annuler
                </Button>
                <Button onClick={handleSave} disabled={isSaving} className="w-full sm:w-auto">
                  {isSaving && <Spinner className="mr-2 h-4 w-4" />}
                  Enregistrer
                </Button>
              </div>
            )}
          </div>
        </div>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  )
}

// Re-export types for convenience
export type { UserData }
