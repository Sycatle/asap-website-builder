"use client"

import * as React from "react"
import { useState, useEffect, useCallback } from "react"
import {
  Shield,
  Key,
  Check,
  Eye,
  EyeOff,
  Monitor,
  Smartphone,
  Tablet,
  X,
} from "lucide-react"
import { Spinner } from "@/components/ui/spinner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { getPasswordStrength } from "@/lib/utils/password"
import { authAPI } from "@/lib/api"
import type { SessionInfo } from "@/lib/types"
import { formatRelativeTimeFr } from "@/lib/utils/formatters"

// ============================================================================
// Helpers
// ============================================================================

const parseUserAgent = (userAgent: string | null): { device: string; browser: string; os: string } => {
  if (!userAgent) return { device: 'Appareil inconnu', browser: '', os: '' }
  
  let browser = 'Navigateur inconnu'
  let os = ''
  let device = 'desktop'
  
  if (userAgent.includes('Firefox')) browser = 'Firefox'
  else if (userAgent.includes('Edg')) browser = 'Edge'
  else if (userAgent.includes('Chrome')) browser = 'Chrome'
  else if (userAgent.includes('Safari')) browser = 'Safari'
  else if (userAgent.includes('Opera')) browser = 'Opera'
  
  if (userAgent.includes('Windows')) os = 'Windows'
  else if (userAgent.includes('Mac OS')) os = 'macOS'
  else if (userAgent.includes('Linux')) os = 'Linux'
  else if (userAgent.includes('Android')) { os = 'Android'; device = 'mobile' }
  else if (userAgent.includes('iPhone') || userAgent.includes('iPad')) { 
    os = userAgent.includes('iPad') ? 'iPadOS' : 'iOS'
    device = userAgent.includes('iPad') ? 'tablet' : 'mobile'
  }
  
  return { 
    device, 
    browser, 
    os: os ? `${browser} sur ${os}` : browser 
  }
}

const getDeviceIcon = (deviceType: string) => {
  switch (deviceType) {
    case 'mobile': return <Smartphone className="h-4 w-4" />
    case 'tablet': return <Tablet className="h-4 w-4" />
    default: return <Monitor className="h-4 w-4" />
  }
}

// ============================================================================
// Sub-components
// ============================================================================

interface PasswordInputProps {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  showStrength?: boolean
}

function PasswordInput({ id, label, value, onChange, disabled, showStrength }: PasswordInputProps) {
  const [showPassword, setShowPassword] = useState(false)
  const passwordStrength = showStrength ? getPasswordStrength(value) : null

  return (
    <Field>
      <FieldLabel htmlFor={id} className="text-sm">{label}</FieldLabel>
      <div className="relative">
        <Input
          id={id}
          type={showPassword ? "text" : "password"}
          placeholder="••••••••"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className="h-9 sm:h-10 text-sm pr-10"
        />
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          tabIndex={-1}
        >
          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
      {showStrength && value.length > 0 && passwordStrength && (
        <div className="space-y-1">
          <div className="flex gap-1">
            {[0, 1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className={cn(
                  "h-1 flex-1 rounded-full transition-colors",
                  i <= passwordStrength.score ? passwordStrength.color : "bg-muted"
                )}
              />
            ))}
          </div>
          <FieldDescription className="text-[10px] sm:text-xs">
            Force: {passwordStrength.label}
          </FieldDescription>
        </div>
      )}
      {showStrength && (
        <FieldDescription className="text-[10px] sm:text-xs">
          Min. 8 caractères, majuscule, minuscule et chiffre
        </FieldDescription>
      )}
    </Field>
  )
}

interface SessionItemProps {
  session: SessionInfo
  isRevoking: boolean
  onRevoke: () => void
}

function SessionItem({ session, isRevoking, onRevoke }: SessionItemProps) {
  const { device, os } = parseUserAgent(session.user_agent)
  
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-2 border-b last:border-0">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 text-muted-foreground">
          {getDeviceIcon(device)}
        </div>
        <div>
          <p className="text-sm font-medium">{os}</p>
          <p className="text-[10px] sm:text-xs text-muted-foreground">
            {formatRelativeTimeFr(session.created_at)}
            {session.ip_address && ` • ${session.ip_address}`}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 ml-7 sm:ml-0">
        {session.is_current ? (
          <Badge variant="secondary" className="text-xs">Session actuelle</Badge>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={onRevoke}
            disabled={isRevoking}
          >
            {isRevoking ? (
              <Spinner className="h-3 w-3" />
            ) : (
              <>
                <X className="h-3 w-3 mr-1" />
                Révoquer
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  )
}

// ============================================================================
// Main Component
// ============================================================================

export function SecuritySettings() {
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })
  const [isChangingPassword, setIsChangingPassword] = useState(false)
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [passwordSuccess, setPasswordSuccess] = useState(false)
  
  const [sessions, setSessions] = useState<SessionInfo[]>([])
  const [isLoadingSessions, setIsLoadingSessions] = useState(true)
  const [isRevokingSession, setIsRevokingSession] = useState<string | null>(null)

  const fetchSessions = useCallback(async () => {
    setIsLoadingSessions(true)
    try {
      const response = await authAPI.listSessions()
      setSessions(response.sessions)
    } catch (error) {
      console.error('Failed to fetch sessions:', error)
      toast.error('Impossible de charger les sessions')
    } finally {
      setIsLoadingSessions(false)
    }
  }, [])

  useEffect(() => {
    fetchSessions()
  }, [fetchSessions])

  const handleRevokeSession = async (sessionId: string) => {
    setIsRevokingSession(sessionId)
    try {
      await authAPI.revokeSession(sessionId)
      toast.success('Session révoquée')
      fetchSessions()
    } catch (error) {
      console.error('Failed to revoke session:', error)
      toast.error('Impossible de révoquer la session')
    } finally {
      setIsRevokingSession(null)
    }
  }

  const handleRevokeAllOtherSessions = async () => {
    const otherSessions = sessions.filter(s => !s.is_current)
    for (const session of otherSessions) {
      await handleRevokeSession(session.id)
    }
  }

  const handlePasswordChange = async () => {
    setPasswordError(null)
    setPasswordSuccess(false)

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

      {/* Password Card */}
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
          
          <PasswordInput
            id="current-password"
            label="Mot de passe actuel"
            value={passwordData.currentPassword}
            onChange={(value) => setPasswordData(prev => ({ ...prev, currentPassword: value }))}
            disabled={isChangingPassword}
          />
          
          <PasswordInput
            id="new-password"
            label="Nouveau mot de passe"
            value={passwordData.newPassword}
            onChange={(value) => setPasswordData(prev => ({ ...prev, newPassword: value }))}
            disabled={isChangingPassword}
            showStrength
          />
          
          <PasswordInput
            id="confirm-password"
            label="Confirmer le mot de passe"
            value={passwordData.confirmPassword}
            onChange={(value) => setPasswordData(prev => ({ ...prev, confirmPassword: value }))}
            disabled={isChangingPassword}
          />
          
          <Button onClick={handlePasswordChange} disabled={isChangingPassword} className="w-full sm:w-auto h-9 sm:h-10 text-sm">
            {isChangingPassword && <Spinner className="mr-2 h-4 w-4" />}
            Mettre à jour
          </Button>
        </CardContent>
      </Card>

      {/* Two-Factor Card */}
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

      {/* Sessions Card */}
      <Card>
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="text-sm sm:text-base">Sessions actives</CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            Gérez vos sessions connectées.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
          {isLoadingSessions ? (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <div key={i} className="flex items-center justify-between gap-2 py-2">
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                  <Skeleton className="h-6 w-20" />
                </div>
              ))}
            </div>
          ) : sessions.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucune session active</p>
          ) : (
            <div className="space-y-3">
              {sessions.map((session) => (
                <SessionItem
                  key={session.id}
                  session={session}
                  isRevoking={isRevokingSession === session.id}
                  onRevoke={() => handleRevokeSession(session.id)}
                />
              ))}
            </div>
          )}
          {sessions.filter(s => !s.is_current).length > 0 && (
            <Button 
              variant="outline" 
              size="sm" 
              className="mt-4 w-full sm:w-auto text-xs sm:text-sm"
              onClick={handleRevokeAllOtherSessions}
            >
              Déconnecter toutes les autres sessions
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
