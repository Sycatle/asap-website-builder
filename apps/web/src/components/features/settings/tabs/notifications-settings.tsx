"use client"

import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

// ============================================================================
// Types
// ============================================================================

interface NotificationOption {
  label: string
  description: string
  defaultChecked: boolean
}

// ============================================================================
// Config
// ============================================================================

const EMAIL_NOTIFICATIONS: NotificationOption[] = [
  { label: 'Mises à jour produit', description: 'Nouvelles fonctionnalités et améliorations', defaultChecked: true },
  { label: 'Rapports hebdomadaires', description: 'Résumé de vos statistiques chaque semaine', defaultChecked: true },
  { label: 'Alertes de sécurité', description: 'Connexions suspectes et changements de mot de passe', defaultChecked: true },
  { label: 'Conseils et astuces', description: 'Apprenez à tirer le meilleur d\'ASAP', defaultChecked: false },
  { label: 'Newsletter', description: 'Actualités et offres spéciales', defaultChecked: false },
]

const PUSH_NOTIFICATIONS: NotificationOption[] = [
  { label: 'Nouveaux visiteurs', description: 'Soyez notifié des pics de trafic', defaultChecked: false },
  { label: 'Statut du site', description: 'Alertes si votre site est hors ligne', defaultChecked: true },
]

// ============================================================================
// Sub-components
// ============================================================================

interface NotificationToggleProps {
  option: NotificationOption
}

function NotificationToggle({ option }: NotificationToggleProps) {
  return (
    <div className="flex items-center justify-between">
      <div className="space-y-0.5">
        <p className="text-sm font-medium">{option.label}</p>
        <p className="text-xs text-muted-foreground">{option.description}</p>
      </div>
      <Switch defaultChecked={option.defaultChecked} />
    </div>
  )
}

interface NotificationGroupProps {
  title: string
  description: string
  options: NotificationOption[]
}

function NotificationGroup({ title, description, options }: NotificationGroupProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {options.map((option) => (
          <NotificationToggle key={option.label} option={option} />
        ))}
      </CardContent>
    </Card>
  )
}

// ============================================================================
// Main Component
// ============================================================================

export function NotificationsSettings() {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Notifications</h3>
        <p className="text-sm text-muted-foreground">
          Configurez vos préférences de notification.
        </p>
      </div>
      <Separator />

      <NotificationGroup
        title="Email"
        description="Notifications envoyées par email."
        options={EMAIL_NOTIFICATIONS}
      />

      <NotificationGroup
        title="Push"
        description="Notifications dans le navigateur."
        options={PUSH_NOTIFICATIONS}
      />
    </div>
  )
}
