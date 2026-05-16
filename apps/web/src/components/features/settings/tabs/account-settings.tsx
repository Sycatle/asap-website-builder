"use client"

import * as React from "react"
import { useState, useEffect } from "react"
import { Spinner } from "@/components/ui/spinner"
import { getApiBaseUrl } from "@/lib/api/base-url"

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"
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
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Separator } from "@/components/ui/separator"
import { toast } from "sonner"
import { filesAPI, accountsAPI, type FileMetadata } from "@/lib/api"
import { FilePickerDialog } from "@/components/features/cloud/file-picker-dialog"

// ============================================================================
// Types
// ============================================================================

export interface UserData {
  id: string
  email: string
  name: string
  avatar?: string
}

export interface AccountSettingsProps {
  user: UserData
  formData: { name: string; email: string }
  setFormData: React.Dispatch<React.SetStateAction<{ name: string; email: string }>>
  getInitials: (name: string) => string
  onAvatarUpdate?: (avatarUrl: string) => void
}

// ============================================================================
// Helpers
// ============================================================================

const getFileUrl = (fileId: string) => {
  const token = localStorage.getItem('auth_token')
  return `${getApiBaseUrl()}/files/${fileId}?token=${token}`
}

// ============================================================================
// Component
// ============================================================================

export function AccountSettings({
  user,
  formData,
  setFormData,
  getInitials,
  onAvatarUpdate,
}: AccountSettingsProps) {
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false)
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>(user.avatar)
  const [showFilePicker, setShowFilePicker] = useState(false)
  const [avatarError, setAvatarError] = useState<string | null>(null)
  const fileInputRef = React.useRef<HTMLInputElement>(null)
  
  // Load avatar from account data on mount
  useEffect(() => {
    const loadAvatar = async () => {
      try {
        const accountData = await accountsAPI.getAccount(user.id)
        if (accountData.data?.avatar) {
          const storedUrl = accountData.data.avatar
          const fileIdMatch = storedUrl.match(/\/files\/([a-f0-9-]+)/)
          if (fileIdMatch) {
            setAvatarUrl(getFileUrl(fileIdMatch[1]))
          } else {
            setAvatarUrl(storedUrl)
          }
        }
      } catch (error) {
        // Silently fail
      }
    }
    loadAvatar()
  }, [user.id])

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setAvatarError(null)

    if (!file.type.startsWith('image/')) {
      setAvatarError('Veuillez sélectionner une image')
      return
    }

    if (file.size > 1024 * 1024) {
      setAvatarError('L\'image doit faire moins de 1MB')
      return
    }

    setIsUploadingAvatar(true)

    const uploadPromise = async () => {
      // Rename file to avatar.{extension} for consistent naming
      const extension = file.name.split('.').pop() || 'png'
      const avatarFile = new File([file], `avatar.${extension}`, { type: file.type })
      
      // Upload to personal cloud (no website_id) with public visibility
      const uploadedFile = await filesAPI.upload(avatarFile, {
        visibility: 'public', // Avatar must be publicly accessible
        description: 'User avatar',
        // No website_id = personal cloud
      })
      const avatarFileId = uploadedFile.id
      const displayUrl = getFileUrl(avatarFileId)
      setAvatarUrl(displayUrl)
      
      const avatarStorageUrl = `${getApiBaseUrl()}/files/${avatarFileId}`
      const currentAccount = await accountsAPI.getAccount(user.id)
      const currentData = currentAccount.data || {}
      await accountsAPI.updateAccountData(user.id, {
        data: { ...currentData, avatar: avatarStorageUrl }
      })
      
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
      setAvatarError('Erreur lors du téléchargement de l\'avatar')
    } finally {
      setIsUploadingAvatar(false)
    }
  }

  const handleFileSelect = async (file: FileMetadata) => {
    setAvatarError(null)
    const displayUrl = getFileUrl(file.id)
    setAvatarUrl(displayUrl)
    
    const avatarStorageUrl = `${getApiBaseUrl()}/files/${file.id}`
    
    const updatePromise = async () => {
      const currentAccount = await accountsAPI.getAccount(user.id)
      const currentData = currentAccount.data || {}
      await accountsAPI.updateAccountData(user.id, {
        data: { ...currentData, avatar: avatarStorageUrl }
      })
      
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
                {isUploadingAvatar && <Spinner className="mr-2 h-3 w-3" />}
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
      <FieldGroup className="gap-3 sm:gap-4">
        <Field>
          <FieldLabel htmlFor="name" className="text-sm">Nom d'affichage</FieldLabel>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            placeholder="Votre nom"
            className="h-9 sm:h-10 text-sm"
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="email" className="text-sm">Email</FieldLabel>
          <Input
            id="email"
            type="email"
            value={formData.email}
            disabled
            className="bg-muted h-9 sm:h-10 text-sm"
          />
          <FieldDescription className="text-[10px] sm:text-xs">
            Contactez le support pour modifier votre email.
          </FieldDescription>
        </Field>
      </FieldGroup>

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
