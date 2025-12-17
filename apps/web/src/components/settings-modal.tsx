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
  Key,
  Loader2,
  Check,
} from "lucide-react"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { filesAPI, websitesAPI, extensionsAPI, authAPI, accountsAPI, type QuotaUsage, type FileMetadata, type Website, type WebsiteExtension } from "@/lib/api"
import { formatBytes } from "@/lib/utils/formatters"
import { FilePickerDialog } from "@/components/file-picker-dialog"

interface UserData {
  id: string
  email: string
  name: string
  avatar?: string
}

interface SettingsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  user: UserData
  onUserUpdate?: (user: Partial<UserData>) => void
  defaultTab?: SettingsTab
}

type SettingsTab = 'account' | 'security' | 'billing' | 'cloud' | 'plan' | 'notifications' | 'appearance'

const settingsTabs = [
  { id: 'account' as const, label: 'Compte', icon: User },
  { id: 'security' as const, label: 'Sécurité', icon: Shield },
  { id: 'billing' as const, label: 'Facturation', icon: CreditCard },
  { id: 'cloud' as const, label: 'Stockage', icon: Cloud },
  { id: 'plan' as const, label: 'Abonnement', icon: Sparkles },
  { id: 'notifications' as const, label: 'Notifications', icon: Bell },
  { id: 'appearance' as const, label: 'Apparence', icon: Palette },
]

export function SettingsModal({ open, onOpenChange, user, onUserUpdate, defaultTab = 'account' }: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState<SettingsTab>(defaultTab)
  const [isSaving, setIsSaving] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [formData, setFormData] = useState({
    name: user.name,
    email: user.email,
  })
  
  // Real data from API
  const [quota, setQuota] = useState<QuotaUsage | null>(null)
  const [files, setFiles] = useState<FileMetadata[]>([])
  const [websites, setWebsites] = useState<Website[]>([])
  const [extensions, setExtensions] = useState<WebsiteExtension[]>([])

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
      // Load independent data in parallel
      const [quotaData, filesData, websitesData, accountData] = await Promise.all([
        filesAPI.getQuota().catch(() => null),
        filesAPI.list().catch(() => []),
        websitesAPI.list().catch(() => []),
        accountsAPI.getAccount(user.id).catch(() => null),
      ])
      
      // Update form data with account data if available
      if (accountData?.data) {
        setFormData(prev => ({
          ...prev,
          name: accountData.data.name || prev.name,
        }))
      }
      
      // Load extensions for the first website
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
      // First get current account data to merge
      const currentAccount = await accountsAPI.getAccount(user.id)
      const currentData = currentAccount.data || {}
      
      // Save to API with merged data
      await accountsAPI.updateAccountData(user.id, {
        data: { ...currentData, name: formData.name }
      })
      
      // Update parent state with the new name
      if (onUserUpdate) {
        onUserUpdate({ name: formData.name })
      }
    }

    toast.promise(savePromise(), {
      loading: 'Enregistrement...',
      success: 'Profil mis à jour',
      error: 'Erreur lors de la sauvegarde',
    })

    try {
      await savePromise()
      // Close modal on success
      onOpenChange(false)
    } catch (error) {
      console.error('Failed to save account data:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) || '?'
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[calc(100%-1rem)] sm:max-w-4xl h-[90vh] sm:h-[80vh] max-h-[700px] p-0 gap-0 flex flex-col [&>button]:z-10 overflow-hidden">
        <div className="flex flex-col sm:flex-row h-full min-h-0">
          {/* Mobile Tab Bar - Top on mobile */}
          <div className="sm:hidden border-b bg-muted/30 p-2 shrink-0 overflow-x-auto">
            <div className="flex gap-1 min-w-max">
              {settingsTabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
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

          {/* Desktop Sidebar - Hidden on mobile */}
          <div className="hidden sm:flex w-56 border-r bg-muted/30 p-4 flex-col shrink-0">
            <DialogHeader className="pb-4">
              <DialogTitle className="text-lg">Paramètres</DialogTitle>
            </DialogHeader>
            <nav className="flex-1 space-y-1 overflow-y-auto">
              {settingsTabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
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

          {/* Content */}
          <div className="flex-1 flex flex-col min-h-0 min-w-0">
            <div className="flex-1 overflow-y-auto p-4 sm:p-6">
              {activeTab === 'account' && (
                <AccountSettings
                  user={user}
                  formData={formData}
                  setFormData={setFormData}
                  getInitials={getInitials}
                  onAvatarUpdate={(avatarUrl) => onUserUpdate?.({ avatar: avatarUrl })}
                />
              )}
              {activeTab === 'security' && <SecuritySettings />}
              {activeTab === 'billing' && <BillingSettings />}
              {activeTab === 'cloud' && <CloudSettings quota={quota} files={files} isLoading={isLoading} />}
              {activeTab === 'plan' && <PlanSettings quota={quota} websites={websites} extensions={extensions} isLoading={isLoading} />}
              {activeTab === 'notifications' && <NotificationsSettings />}
              {activeTab === 'appearance' && <AppearanceSettings />}
            </div>

            {/* Footer with save button */}
            {activeTab === 'account' && (
              <div className="border-t p-3 sm:p-4 flex flex-col-reverse sm:flex-row sm:justify-end gap-2 bg-background">
                <Button variant="outline" onClick={() => onOpenChange(false)} className="w-full sm:w-auto">
                  Annuler
                </Button>
                <Button onClick={handleSave} disabled={isSaving} className="w-full sm:w-auto">
                  {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Enregistrer
                </Button>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// Account Settings Tab
function AccountSettings({
  user,
  formData,
  setFormData,
  getInitials,
  onAvatarUpdate,
}: {
  user: UserData
  formData: { name: string; email: string }
  setFormData: React.Dispatch<React.SetStateAction<{ name: string; email: string }>>
  getInitials: (name: string) => string
  onAvatarUpdate?: (avatarUrl: string) => void
}) {
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false)
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>(user.avatar)
  const [showFilePicker, setShowFilePicker] = useState(false)
  const [avatarError, setAvatarError] = useState<string | null>(null)
  const fileInputRef = React.useRef<HTMLInputElement>(null)
  
  // Helper to construct file URL with auth token
  const getFileUrl = (fileId: string) => {
    const token = localStorage.getItem('auth_token')
    return `${import.meta.env.PUBLIC_API_URL || 'http://localhost:3000/api'}/files/${fileId}?token=${token}`
  }
  
  // Load avatar from account data on mount
  useEffect(() => {
    const loadAvatar = async () => {
      try {
        const accountData = await accountsAPI.getAccount(user.id)
        if (accountData.data?.avatar) {
          // Extract file ID from stored URL and add token for display
          const storedUrl = accountData.data.avatar
          const fileIdMatch = storedUrl.match(/\/files\/([a-f0-9-]+)/)
          if (fileIdMatch) {
            setAvatarUrl(getFileUrl(fileIdMatch[1]))
          } else {
            setAvatarUrl(storedUrl)
          }
        }
      } catch (error) {
        console.error('Failed to load avatar:', error)
      }
    }
    loadAvatar()
  }, [user.id])

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Reset error
    setAvatarError(null)

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setAvatarError('Veuillez sélectionner une image')
      return
    }

    // Validate file size (1MB max)
    if (file.size > 1024 * 1024) {
      setAvatarError('L\'image doit faire moins de 1MB')
      return
    }

    setIsUploadingAvatar(true)

    const uploadPromise = async () => {
      // Upload the file
      const uploadedFile = await filesAPI.upload(file)
      
      // Update avatar in account data (store file ID, display with token)
      const avatarFileId = uploadedFile.id
      const displayUrl = getFileUrl(avatarFileId)
      setAvatarUrl(displayUrl)
      
      // Save file ID to account data (not the full URL with token)
      const avatarStorageUrl = `${import.meta.env.PUBLIC_API_URL || 'http://localhost:3000/api'}/files/${avatarFileId}`
      const currentAccount = await accountsAPI.getAccount(user.id)
      const currentData = currentAccount.data || {}
      await accountsAPI.updateAccountData(user.id, {
        data: { ...currentData, avatar: avatarStorageUrl }
      })
      
      // Notify parent of avatar change
      onAvatarUpdate?.(displayUrl)
    }

    toast.promise(uploadPromise(), {
      loading: 'Upload de l\'avatar...',
      success: 'Avatar mis à jour',
      error: 'Erreur lors du téléchargement de l\'avatar',
    })

    try {
      await uploadPromise()
    } catch (error) {
      console.error('Failed to upload avatar:', error)
      setAvatarError('Erreur lors du téléchargement de l\'avatar')
    } finally {
      setIsUploadingAvatar(false)
    }
  }

  const handleFileSelect = async (file: FileMetadata) => {
    setAvatarError(null)
    const displayUrl = getFileUrl(file.id)
    setAvatarUrl(displayUrl)
    
    // Save file URL to account data (without token for storage)
    const avatarStorageUrl = `${import.meta.env.PUBLIC_API_URL || 'http://localhost:3000/api'}/files/${file.id}`
    
    const updatePromise = async () => {
      const currentAccount = await accountsAPI.getAccount(user.id)
      const currentData = currentAccount.data || {}
      await accountsAPI.updateAccountData(user.id, {
        data: { ...currentData, avatar: avatarStorageUrl }
      })
      
      // Notify parent of avatar change
      onAvatarUpdate?.(displayUrl)
    }

    toast.promise(updatePromise(), {
      loading: 'Mise à jour de l\'avatar...',
      success: 'Avatar mis à jour',
      error: 'Erreur lors de la mise à jour de l\'avatar',
    })

    try {
      await updatePromise()
    } catch (error) {
      console.error('Failed to update avatar:', error)
      setAvatarError('Erreur lors de la mise à jour de l\'avatar')
    }
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h3 className="text-base sm:text-lg font-medium">Informations du compte</h3>
        <p className="text-xs sm:text-sm text-muted-foreground">
          Gérez vos informations personnelles.
        </p>
      </div>
      <Separator />

      {/* Avatar */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <Avatar className="h-16 w-16 sm:h-20 sm:w-20">
            <AvatarImage src={avatarUrl} alt={user.name} />
            <AvatarFallback className="text-xl sm:text-2xl bg-primary text-primary-foreground">
              {getInitials(formData.name || user.email)}
            </AvatarFallback>
          </Avatar>
          <div className="space-y-2 text-center sm:text-left">
            <div className="flex flex-col xs:flex-row gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingAvatar}
                className="text-xs sm:text-sm"
              >
                {isUploadingAvatar && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
                Uploader
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setShowFilePicker(true)}
                disabled={isUploadingAvatar}
                className="text-xs sm:text-sm"
              >
                Choisir du cloud
              </Button>
            </div>
            <p className="text-[10px] sm:text-xs text-muted-foreground">
              JPG, PNG ou GIF. 1MB max.
            </p>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleAvatarUpload}
            className="hidden"
          />
        </div>
        {avatarError && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
            {avatarError}
          </div>
        )}
      </div>

      {/* Form fields */}
      <div className="grid gap-3 sm:gap-4">
        <div className="grid gap-1.5 sm:gap-2">
          <Label htmlFor="name" className="text-sm">Nom d'affichage</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            placeholder="Votre nom"
            className="h-9 sm:h-10 text-sm"
          />
        </div>
        <div className="grid gap-1.5 sm:gap-2">
          <Label htmlFor="email" className="text-sm">Email</Label>
          <Input
            id="email"
            type="email"
            value={formData.email}
            disabled
            className="bg-muted h-9 sm:h-10 text-sm"
          />
          <p className="text-[10px] sm:text-xs text-muted-foreground">
            Contactez le support pour modifier votre email.
          </p>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="pt-4 sm:pt-6">
        <h4 className="text-xs sm:text-sm font-medium text-destructive mb-3 sm:mb-4">Zone de danger</h4>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" size="sm">
              Supprimer mon compte
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Êtes-vous absolument sûr ?</AlertDialogTitle>
              <AlertDialogDescription>
                Cette action est irréversible. Cela supprimera définitivement votre compte
                et toutes vos données (sites, fichiers, etc.).
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Annuler</AlertDialogCancel>
              <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Supprimer définitivement
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      {/* File Picker Dialog */}
      <FilePickerDialog
        open={showFilePicker}
        onOpenChange={setShowFilePicker}
        onSelect={handleFileSelect}
        accept="image/*"
        title="Choisir une image de profil"
        description="Sélectionnez une image depuis votre stockage cloud."
      />
    </div>
  )
}

// Security Settings Tab
function SecuritySettings() {
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })
  const [isChangingPassword, setIsChangingPassword] = useState(false)
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [passwordSuccess, setPasswordSuccess] = useState(false)

  const handlePasswordChange = async () => {
    // Reset states
    setPasswordError(null)
    setPasswordSuccess(false)

    // Validation
    if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
      setPasswordError('Tous les champs sont requis')
      return
    }

    if (passwordData.newPassword.length < 8) {
      setPasswordError('Le nouveau mot de passe doit contenir au moins 8 caractères')
      return
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordError('Les mots de passe ne correspondent pas')
      return
    }

    setIsChangingPassword(true)

    const changePasswordPromise = async () => {
      await authAPI.changePassword({
        current_password: passwordData.currentPassword,
        new_password: passwordData.newPassword,
      })
      
      setPasswordSuccess(true)
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      })
    }

    toast.promise(changePasswordPromise(), {
      loading: 'Modification du mot de passe...',
      success: 'Mot de passe modifié avec succès',
      error: (err) => {
        const errorMsg = err instanceof Error && err.message?.includes('incorrect') 
          ? 'Le mot de passe actuel est incorrect'
          : 'Erreur lors du changement de mot de passe'
        setPasswordError(errorMsg)
        return errorMsg
      },
    })

    try {
      await changePasswordPromise()
    } catch (error: unknown) {
      // Error already handled in toast.promise
      console.error('Failed to change password:', error)
    } finally {
      setIsChangingPassword(false)
    }
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h3 className="text-base sm:text-lg font-medium">Sécurité</h3>
        <p className="text-xs sm:text-sm text-muted-foreground">
          Gérez la sécurité de votre compte.
        </p>
      </div>
      <Separator />

      {/* Password */}
      <Card>
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="text-sm sm:text-base flex items-center gap-2">
            <Key className="h-4 w-4" />
            Mot de passe
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            Changez votre mot de passe régulièrement pour sécuriser votre compte.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 sm:space-y-4 p-4 pt-0 sm:p-6 sm:pt-0">
          {passwordSuccess && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-800 flex items-center gap-2">
              <Check className="h-4 w-4" />
              Mot de passe changé avec succès
            </div>
          )}
          {passwordError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
              {passwordError}
            </div>
          )}
          <div className="grid gap-1.5 sm:gap-2">
            <Label htmlFor="current-password" className="text-sm">Mot de passe actuel</Label>
            <Input
              id="current-password"
              type="password"
              placeholder="••••••••"
              value={passwordData.currentPassword}
              onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
              disabled={isChangingPassword}
              className="h-9 sm:h-10 text-sm"
            />
          </div>
          <div className="grid gap-1.5 sm:gap-2">
            <Label htmlFor="new-password" className="text-sm">Nouveau mot de passe</Label>
            <Input
              id="new-password"
              type="password"
              placeholder="••••••••"
              value={passwordData.newPassword}
              onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
              disabled={isChangingPassword}
              className="h-9 sm:h-10 text-sm"
            />
            <p className="text-[10px] sm:text-xs text-muted-foreground">
              Minimum 8 caractères
            </p>
          </div>
          <div className="grid gap-1.5 sm:gap-2">
            <Label htmlFor="confirm-password" className="text-sm">Confirmer le mot de passe</Label>
            <Input
              id="confirm-password"
              type="password"
              placeholder="••••••••"
              value={passwordData.confirmPassword}
              onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
              disabled={isChangingPassword}
              className="h-9 sm:h-10 text-sm"
            />
          </div>
          <Button onClick={handlePasswordChange} disabled={isChangingPassword} className="w-full sm:w-auto h-9 sm:h-10 text-sm">
            {isChangingPassword && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Mettre à jour
          </Button>
        </CardContent>
      </Card>

      {/* Two-Factor */}
      <Card>
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="text-sm sm:text-base flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Authentification à deux facteurs
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            Ajoutez une couche de sécurité supplémentaire à votre compte.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium">2FA par application</p>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Utilisez Google Authenticator ou similaire
              </p>
            </div>
            <Button variant="outline" size="sm" className="w-full sm:w-auto">Configurer</Button>
          </div>
        </CardContent>
      </Card>

      {/* Sessions */}
      <Card>
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="text-sm sm:text-base">Sessions actives</CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            Gérez vos sessions connectées.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-2">
              <div>
                <p className="text-sm font-medium">Chrome sur Linux</p>
                <p className="text-[10px] sm:text-xs text-muted-foreground">Actif maintenant • France</p>
              </div>
              <Badge variant="secondary" className="w-fit text-xs">Session actuelle</Badge>
            </div>
          </div>
          <Button variant="outline" size="sm" className="mt-4 w-full sm:w-auto text-xs sm:text-sm">
            Déconnecter toutes les autres sessions
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

// Billing Settings Tab
function BillingSettings() {
  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h3 className="text-base sm:text-lg font-medium">Facturation</h3>
        <p className="text-xs sm:text-sm text-muted-foreground">
          Gérez vos informations de paiement et historique.
        </p>
      </div>
      <Separator />

      {/* Payment Method */}
      <Card>
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="text-sm sm:text-base">Moyen de paiement</CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            Votre carte enregistrée pour les renouvellements.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 border rounded-lg">
            <div className="flex items-center gap-3">
              <div className="h-8 w-12 bg-gradient-to-r from-blue-600 to-blue-400 rounded flex items-center justify-center text-white text-xs font-bold shrink-0">
                VISA
              </div>
              <div>
                <p className="text-sm font-medium">•••• •••• •••• 4242</p>
                <p className="text-[10px] sm:text-xs text-muted-foreground">Expire 12/26</p>
              </div>
            </div>
            <Button variant="ghost" size="sm" className="w-full sm:w-auto">Modifier</Button>
          </div>
          <Button variant="outline" size="sm" className="mt-3 w-full sm:w-auto">
            Ajouter une carte
          </Button>
        </CardContent>
      </Card>

      {/* Billing Address */}
      <Card>
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="text-sm sm:text-base">Adresse de facturation</CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
          <p className="text-xs sm:text-sm text-muted-foreground mb-3">
            Aucune adresse enregistrée
          </p>
          <Button variant="outline" size="sm" className="w-full sm:w-auto">Ajouter une adresse</Button>
        </CardContent>
      </Card>

      {/* Invoice History */}
      <Card>
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="text-sm sm:text-base">Historique des factures</CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
          <div className="text-xs sm:text-sm text-muted-foreground text-center py-6 sm:py-8">
            Aucune facture pour le moment
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// Cloud Settings Tab
interface CloudSettingsProps {
  quota: QuotaUsage | null
  files: FileMetadata[]
  isLoading: boolean
}

function CloudSettings({ quota, files, isLoading }: CloudSettingsProps) {
  // Calculate storage breakdown by mime type
  const getStorageBreakdown = () => {
    const categories: Record<string, { size: number; color: string }> = {
      'Images': { size: 0, color: 'bg-blue-500' },
      'Documents': { size: 0, color: 'bg-green-500' },
      'Vidéos': { size: 0, color: 'bg-purple-500' },
      'Autres': { size: 0, color: 'bg-gray-500' },
    }
    
    files.forEach(file => {
      if (file.mime_type.startsWith('image/')) {
        categories['Images'].size += file.size_bytes
      } else if (file.mime_type.startsWith('video/')) {
        categories['Vidéos'].size += file.size_bytes
      } else if (
        file.mime_type.includes('pdf') ||
        file.mime_type.includes('document') ||
        file.mime_type.includes('text')
      ) {
        categories['Documents'].size += file.size_bytes
      } else {
        categories['Autres'].size += file.size_bytes
      }
    })
    
    return Object.entries(categories)
      .filter(([_, data]) => data.size > 0)
      .map(([label, data]) => ({
        label,
        size: formatBytes(data.size),
        color: data.color,
      }))
  }

  const breakdown = getStorageBreakdown()

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-6 w-40 mb-2" />
          <Skeleton className="h-4 w-60" />
        </div>
        <Separator />
        {/* Storage Card Skeleton */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-4" />
              <Skeleton className="h-5 w-40" />
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-20" />
              </div>
              <Skeleton className="h-2 w-full rounded-full" />
            </div>
            <div className="grid grid-cols-2 gap-4 pt-2">
              <div className="p-3 border rounded-lg space-y-1">
                <Skeleton className="h-8 w-12" />
                <Skeleton className="h-3 w-16" />
              </div>
              <div className="p-3 border rounded-lg space-y-1">
                <Skeleton className="h-8 w-16" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
          </CardContent>
        </Card>
        {/* Breakdown Skeleton */}
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-32" />
          </CardHeader>
          <CardContent className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-8 w-8 rounded" />
                <div className="flex-1 space-y-1">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-2 w-full rounded-full" />
                </div>
                <Skeleton className="h-4 w-12" />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h3 className="text-base sm:text-lg font-medium">Stockage Cloud</h3>
        <p className="text-xs sm:text-sm text-muted-foreground">
          Gérez votre espace de stockage.
        </p>
      </div>
      <Separator />

      {/* Storage Usage */}
      <Card>
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="text-sm sm:text-base flex items-center gap-2">
            <Cloud className="h-4 w-4" />
            Utilisation du stockage
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 sm:space-y-4 p-4 pt-0 sm:p-6 sm:pt-0">
          <div className="space-y-2">
            <div className="flex justify-between text-xs sm:text-sm">
              <span>{quota ? formatBytes(quota.total_size_used) : '0 B'} utilisés</span>
              <span>{quota ? formatBytes(quota.quota_limit) : '0 B'} total</span>
            </div>
            <Progress value={quota?.usage_percentage || 0} className="h-2" />
          </div>
          <div className="grid grid-cols-2 gap-3 sm:gap-4 pt-2">
            <div className="p-2.5 sm:p-3 border rounded-lg">
              <p className="text-xl sm:text-2xl font-bold">{files.length}</p>
              <p className="text-[10px] sm:text-xs text-muted-foreground">Fichiers</p>
            </div>
            <div className="p-2.5 sm:p-3 border rounded-lg">
              <p className="text-xl sm:text-2xl font-bold">{quota ? formatBytes(quota.remaining) : '0 B'}</p>
              <p className="text-[10px] sm:text-xs text-muted-foreground">Disponible</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Storage Breakdown */}
      {breakdown.length > 0 && (
        <Card>
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="text-sm sm:text-base">Répartition</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
            <div className="space-y-2.5 sm:space-y-3">
              {breakdown.map((item) => (
                <div key={item.label} className="flex items-center gap-2.5 sm:gap-3">
                  <div className={cn("h-2.5 w-2.5 sm:h-3 sm:w-3 rounded-full", item.color)} />
                  <span className="text-xs sm:text-sm flex-1">{item.label}</span>
                  <span className="text-xs sm:text-sm text-muted-foreground">{item.size}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Button variant="outline" className="w-full h-9 sm:h-10 text-sm" asChild>
        <a href="/app/cloud">Gérer mes fichiers</a>
      </Button>
    </div>
  )
}

// Plan Settings Tab
interface PlanSettingsProps {
  quota: QuotaUsage | null
  websites: Website[]
  extensions: WebsiteExtension[]
  isLoading: boolean
}

function PlanSettings({ quota, websites, extensions, isLoading }: PlanSettingsProps) {
  const enabledExtensions = extensions.filter(e => e.enabled).length
  
  // For now, assume free plan limits (can be enhanced with actual plan data from API)
  const plan = {
    name: 'Gratuit',
    price: '0',
    sitesLimit: 1,
    storageLimit: quota?.quota_limit || 1073741824, // 1GB default
    tokensLimit: 1000,
    tokensUsed: 0, // Would come from API
  }
  
  const sitesUsed = websites.length
  const sitesPercent = (sitesUsed / plan.sitesLimit) * 100
  const storagePercent = quota?.usage_percentage || 0

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-6 w-40 mb-2" />
          <Skeleton className="h-4 w-60" />
        </div>
        <Separator />
        {/* Current Plan Skeleton */}
        <Card className="border-primary">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-5 w-24" />
                  <Skeleton className="h-5 w-12 rounded-full" />
                </div>
                <Skeleton className="h-4 w-32" />
              </div>
              <Skeleton className="h-8 w-8" />
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex items-center gap-2">
                <Skeleton className="h-4 w-4 rounded" />
                <Skeleton className="h-4 w-40" />
              </div>
            ))}
          </CardContent>
        </Card>
        {/* Usage Skeleton */}
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-32" />
          </CardHeader>
          <CardContent className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="flex justify-between">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-16" />
                </div>
                <Skeleton className="h-2 w-full rounded-full" />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h3 className="text-base sm:text-lg font-medium">Abonnement</h3>
        <p className="text-xs sm:text-sm text-muted-foreground">
          Gérez votre plan et vos limites.
        </p>
      </div>
      <Separator />

      {/* Current Plan */}
      <Card className="border-primary">
        <CardHeader className="p-4 sm:p-6">
          <div className="flex items-start sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                Plan {plan.name}
                <Badge className="text-[10px] sm:text-xs">Actif</Badge>
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                {plan.price === '0' ? 'Gratuit pour toujours' : `${plan.price}€ / mois`}
              </CardDescription>
            </div>
            <Sparkles className="h-6 w-6 sm:h-8 sm:w-8 text-primary shrink-0" />
          </div>
        </CardHeader>
        <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
          <div className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm">
            <div className="flex items-center gap-2">
              <Check className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary shrink-0" />
              <span>{plan.sitesLimit} site publié</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary shrink-0" />
              <span>{formatBytes(plan.storageLimit)} de stockage</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary shrink-0" />
              <span>{plan.tokensLimit.toLocaleString()} tokens IA / mois</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary shrink-0" />
              <span>Sous-domaine asap.cool</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Usage */}
      <Card>
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="text-sm sm:text-base">Utilisation ce mois</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 sm:space-y-4 p-4 pt-0 sm:p-6 sm:pt-0">
          <div>
            <div className="flex justify-between text-xs sm:text-sm mb-1">
              <span>Sites</span>
              <span>{sitesUsed} / {plan.sitesLimit}</span>
            </div>
            <Progress value={Math.min(sitesPercent, 100)} className="h-2" />
          </div>
          <div>
            <div className="flex justify-between text-xs sm:text-sm mb-1">
              <span>Stockage</span>
              <span>{quota ? formatBytes(quota.total_size_used) : '0 B'} / {formatBytes(plan.storageLimit)}</span>
            </div>
            <Progress value={storagePercent} className="h-2" />
          </div>
          <div>
            <div className="flex justify-between text-xs sm:text-sm mb-1">
              <span>Extensions actives</span>
              <span>{enabledExtensions}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
        <Button className="flex-1 h-9 sm:h-10 text-sm">
          Passer au plan Pro
        </Button>
        <Button variant="outline" className="h-9 sm:h-10 text-sm" asChild>
          <a href="/#pricing">Voir les plans</a>
        </Button>
      </div>

      {/* Cancel - only show for paid plans */}
      {plan.price !== '0' && (
        <div className="pt-4">
          <Button variant="ghost" className="text-muted-foreground hover:text-destructive">
            Annuler l'abonnement
          </Button>
        </div>
      )}
    </div>
  )
}

// Notifications Settings Tab
function NotificationsSettings() {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Notifications</h3>
        <p className="text-sm text-muted-foreground">
          Configurez vos préférences de notification.
        </p>
      </div>
      <Separator />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Email</CardTitle>
          <CardDescription>
            Notifications envoyées par email.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {[
            { label: 'Mises à jour produit', description: 'Nouvelles fonctionnalités et améliorations', defaultChecked: true },
            { label: 'Rapports hebdomadaires', description: 'Résumé de vos statistiques chaque semaine', defaultChecked: true },
            { label: 'Alertes de sécurité', description: 'Connexions suspectes et changements de mot de passe', defaultChecked: true },
            { label: 'Conseils et astuces', description: 'Apprenez à tirer le meilleur d\'ASAP', defaultChecked: false },
            { label: 'Newsletter', description: 'Actualités et offres spéciales', defaultChecked: false },
          ].map((item) => (
            <div key={item.label} className="flex items-center justify-between">
              <div className="space-y-0.5">
                <p className="text-sm font-medium">{item.label}</p>
                <p className="text-xs text-muted-foreground">{item.description}</p>
              </div>
              <Switch defaultChecked={item.defaultChecked} />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Push</CardTitle>
          <CardDescription>
            Notifications dans le navigateur.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {[
            { label: 'Nouveaux visiteurs', description: 'Soyez notifié des pics de trafic', defaultChecked: false },
            { label: 'Statut du site', description: 'Alertes si votre site est hors ligne', defaultChecked: true },
          ].map((item) => (
            <div key={item.label} className="flex items-center justify-between">
              <div className="space-y-0.5">
                <p className="text-sm font-medium">{item.label}</p>
                <p className="text-xs text-muted-foreground">{item.description}</p>
              </div>
              <Switch defaultChecked={item.defaultChecked} />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}

// Appearance Settings Tab
function AppearanceSettings() {
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('system')

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Apparence</h3>
        <p className="text-sm text-muted-foreground">
          Personnalisez l'apparence de l'application.
        </p>
      </div>
      <Separator />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Thème</CardTitle>
          <CardDescription>
            Choisissez le thème de l'interface.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3">
            {[
              { id: 'light', label: 'Clair', icon: '☀️' },
              { id: 'dark', label: 'Sombre', icon: '🌙' },
              { id: 'system', label: 'Système', icon: '💻' },
            ].map((option) => (
              <button
                key={option.id}
                onClick={() => setTheme(option.id as typeof theme)}
                className={cn(
                  "flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-colors",
                  theme === option.id
                    ? "border-primary bg-primary/5"
                    : "border-transparent bg-muted/50 hover:bg-muted"
                )}
              >
                <span className="text-2xl">{option.icon}</span>
                <span className="text-sm font-medium">{option.label}</span>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Langue</CardTitle>
          <CardDescription>
            Choisissez la langue de l'interface.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🇫🇷</span>
              <span className="text-sm font-medium">Français</span>
            </div>
            <Badge variant="secondary">Actuel</Badge>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Densité</CardTitle>
          <CardDescription>
            Ajustez l'espacement de l'interface.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <span className="text-sm">Interface compacte</span>
            <Switch />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
