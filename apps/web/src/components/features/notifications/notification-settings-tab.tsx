"use client"

import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation(['dashboard']);
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          {t('dashboard:notifications.push.title')}
        </CardTitle>
        <CardDescription>
          {t('dashboard:notifications.push.description')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!pushSupported ? (
          <p className="text-sm text-muted-foreground">
            {t('dashboard:notifications.push.notSupported')}
          </p>
        ) : pushPermission === 'denied' ? (
          <p className="text-sm text-destructive">
            {t('dashboard:notifications.push.blocked')}
          </p>
        ) : (
          <Field orientation="horizontal">
            <div className="space-y-0.5">
              <FieldLabel>{t('dashboard:notifications.push.enable')}</FieldLabel>
              <FieldDescription>
                {pushSubscribed 
                  ? t('dashboard:notifications.push.enabledDescription')
                  : t('dashboard:notifications.push.disabledDescription')}
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
  const { t } = useTranslation(['dashboard']);
  const Icon = categoryIcons[category]

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm">{t(`dashboard:notifications.categories.${category}`)}</span>
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
  const { t } = useTranslation(['dashboard']);
  
  return (
    <FieldGroup className="gap-4">
      <FieldLabel className="text-base">{t('dashboard:notifications.quietHours.title')}</FieldLabel>
      <FieldDescription>
        {t('dashboard:notifications.quietHours.description')}
      </FieldDescription>
      <div className="flex items-center gap-4">
        <Field>
          <FieldLabel className="text-xs">{t('dashboard:notifications.quietHours.start')}</FieldLabel>
          <input
            type="time"
            value={startTime || ''}
            onChange={(e) => onStartChange(e.target.value || null)}
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
          />
        </Field>
        <Field>
          <FieldLabel className="text-xs">{t('dashboard:notifications.quietHours.end')}</FieldLabel>
          <input
            type="time"
            value={endTime || ''}
            onChange={(e) => onEndChange(e.target.value || null)}
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
          />
        </Field>
        {(startTime || endTime) && (
          <Button variant="ghost" size="sm" onClick={onClear}>
            {t('dashboard:notifications.quietHours.clear')}
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
  const { t } = useTranslation(['dashboard']);
  
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
          <CardTitle>{t('dashboard:notifications.preferences.title')}</CardTitle>
          <CardDescription>
            {t('dashboard:notifications.preferences.description')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {settingsLoading ? (
            <SettingsLoadingSkeleton />
          ) : settings ? (
            <>
              <FieldGroup className="gap-4">
                <FieldLabel className="text-base">{t('dashboard:notifications.preferences.categories')}</FieldLabel>
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
