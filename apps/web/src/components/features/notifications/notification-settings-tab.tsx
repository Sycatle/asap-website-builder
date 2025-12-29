"use client"

import { Bell } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Field, FieldDescription, FieldLabel, FieldGroup } from "@/components/ui/field"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import type { NotificationCategory, NotificationSettings } from "@/lib/api/notifications"
import { categoryIcons, categoryLabels } from "./config"

// ============================================================================
// Types
// ============================================================================

export interface NotificationSettingsTabProps {
  // Push notifications
  pushSupported: boolean
  pushPermission: NotificationPermission | 'default'
  pushSubscribed: boolean
  pushLoading: boolean
  onPushToggle: (enabled: boolean) => void
  // Settings
  settings: NotificationSettings | null
  settingsLoading: boolean
  onSettingsUpdate: (key: string, value: any) => void
}

// ============================================================================
// Sub-components
// ============================================================================

interface PushNotificationsCardProps {
  pushSupported: boolean
  pushPermission: NotificationPermission | 'default'
  pushSubscribed: boolean
  pushLoading: boolean
  onToggle: (enabled: boolean) => void
}

function PushNotificationsCard({
  pushSupported,
  pushPermission,
  pushSubscribed,
  pushLoading,
  onToggle,
}: PushNotificationsCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Notifications Push
        </CardTitle>
        <CardDescription>
          Recevez des notifications sur votre appareil même quand l'app est fermée
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!pushSupported ? (
          <p className="text-sm text-muted-foreground">
            Les notifications push ne sont pas supportées sur ce navigateur.
          </p>
        ) : pushPermission === 'denied' ? (
          <p className="text-sm text-destructive">
            Les notifications sont bloquées. Veuillez les autoriser dans les paramètres de votre navigateur.
          </p>
        ) : (
          <Field orientation="horizontal">
            <div className="space-y-0.5">
              <FieldLabel>Activer les notifications push</FieldLabel>
              <FieldDescription>
                {pushSubscribed 
                  ? 'Vous recevrez des notifications sur cet appareil'
                  : 'Activez pour recevoir des notifications'}
              </FieldDescription>
            </div>
            <Switch
              checked={pushSubscribed}
              onCheckedChange={onToggle}
              disabled={pushLoading}
            />
          </Field>
        )}
      </CardContent>
    </Card>
  )
}

interface CategoryToggleProps {
  category: NotificationCategory
  isEnabled: boolean
  onToggle: (checked: boolean) => void
}

function CategoryToggle({ category, isEnabled, onToggle }: CategoryToggleProps) {
  const Icon = categoryIcons[category]
  const label = categoryLabels[category]

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm">{label}</span>
      </div>
      <Switch checked={isEnabled} onCheckedChange={onToggle} />
    </div>
  )
}

interface QuietHoursProps {
  startTime: string | null
  endTime: string | null
  onStartChange: (value: string | null) => void
  onEndChange: (value: string | null) => void
  onClear: () => void
}

function QuietHours({ startTime, endTime, onStartChange, onEndChange, onClear }: QuietHoursProps) {
  return (
    <FieldGroup className="gap-4">
      <FieldLabel className="text-base">Heures calmes</FieldLabel>
      <FieldDescription>
        Désactivez les notifications pendant certaines heures
      </FieldDescription>
      <div className="flex items-center gap-4">
        <Field>
          <FieldLabel className="text-xs">Début</FieldLabel>
          <input
            type="time"
            value={startTime || ''}
            onChange={(e) => onStartChange(e.target.value || null)}
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
          />
        </Field>
        <Field>
          <FieldLabel className="text-xs">Fin</FieldLabel>
          <input
            type="time"
            value={endTime || ''}
            onChange={(e) => onEndChange(e.target.value || null)}
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
          />
        </Field>
        {(startTime || endTime) && (
          <Button variant="ghost" size="sm" onClick={onClear}>
            Effacer
          </Button>
        )}
      </div>
    </FieldGroup>
  )
}

function SettingsLoadingSkeleton() {
  return (
    <div className="space-y-4">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex items-center justify-between">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-6 w-10" />
        </div>
      ))}
    </div>
  )
}

// ============================================================================
// Main Component
// ============================================================================

export function NotificationSettingsTab({
  pushSupported,
  pushPermission,
  pushSubscribed,
  pushLoading,
  onPushToggle,
  settings,
  settingsLoading,
  onSettingsUpdate,
}: NotificationSettingsTabProps) {
  const handleCategoryToggle = (category: NotificationCategory, checked: boolean) => {
    if (!settings) return
    const newCategories = checked
      ? [...settings.enabled_categories, category]
      : settings.enabled_categories.filter(c => c !== category)
    onSettingsUpdate('enabled_categories', newCategories)
  }

  const handleClearQuietHours = () => {
    onSettingsUpdate('quiet_hours_start', null)
    onSettingsUpdate('quiet_hours_end', null)
  }

  return (
    <div className="space-y-6">
      <PushNotificationsCard
        pushSupported={pushSupported}
        pushPermission={pushPermission}
        pushSubscribed={pushSubscribed}
        pushLoading={pushLoading}
        onToggle={onPushToggle}
      />

      <Card>
        <CardHeader>
          <CardTitle>Préférences de notification</CardTitle>
          <CardDescription>
            Choisissez quels types de notifications vous souhaitez recevoir
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {settingsLoading ? (
            <SettingsLoadingSkeleton />
          ) : settings ? (
            <>
              <FieldGroup className="gap-4">
                <FieldLabel className="text-base">Catégories activées</FieldLabel>
                {(Object.keys(categoryLabels) as NotificationCategory[]).map((category) => (
                  <CategoryToggle
                    key={category}
                    category={category}
                    isEnabled={settings.enabled_categories.includes(category)}
                    onToggle={(checked) => handleCategoryToggle(category, checked)}
                  />
                ))}
              </FieldGroup>

              <Separator />

              <QuietHours
                startTime={settings.quiet_hours_start ?? null}
                endTime={settings.quiet_hours_end ?? null}
                onStartChange={(value) => onSettingsUpdate('quiet_hours_start', value)}
                onEndChange={(value) => onSettingsUpdate('quiet_hours_end', value)}
                onClear={handleClearQuietHours}
              />
            </>
          ) : null}
        </CardContent>
      </Card>
    </div>
  )
}
