"use client"

import { 
  SectionHeader,
  SettingsCard,
  ToggleRow,
} from "@/components/shared"
import { Separator } from "@/components/ui/separator"

// ============================================================================
// Config
// ============================================================================

interface NotificationOption {
  label: string
  description: string
  defaultChecked: boolean
}

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
// Main Component
// ============================================================================

export function NotificationsSettings() {
  return (
    <div className="space-y-6">
      <SectionHeader
        title="Notifications"
        description="Configurez vos préférences de notification."
      />
      <Separator />

      <SettingsCard title="Email" description="Notifications envoyées par email.">
        {EMAIL_NOTIFICATIONS.map((opt) => (
          <ToggleRow
            key={opt.label}
            label={opt.label}
            description={opt.description}
            checked={opt.defaultChecked}
          />
        ))}
      </SettingsCard>

      <SettingsCard title="Push" description="Notifications dans le navigateur.">
        {PUSH_NOTIFICATIONS.map((opt) => (
          <ToggleRow
            key={opt.label}
            label={opt.label}
            description={opt.description}
            checked={opt.defaultChecked}
          />
        ))}
      </SettingsCard>
    </div>
  )
}
