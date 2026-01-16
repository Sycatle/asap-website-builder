"use client"

import React from 'react'
import { cn } from '@/lib/utils'
import { Separator } from "@/components/ui/separator"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"

// ============================================
// Section Header (for settings pages)
// ============================================

interface SectionHeaderProps {
  title: string
  description?: string
  badge?: string
  className?: string
}

/**
 * SectionHeader - Reusable header for settings sections
 * 
 * @example
 * <SectionHeader
 *   title="Account Settings"
 *   description="Manage your account information"
 * />
 */
export function SectionHeader({ title, description, badge, className }: SectionHeaderProps) {
  return (
    <div className={cn("space-y-1", className)}>
      <div className="flex items-center gap-2">
        <h3 className="text-base sm:text-lg font-medium">{title}</h3>
        {badge && <Badge variant="secondary">{badge}</Badge>}
      </div>
      {description && (
        <p className="text-xs sm:text-sm text-muted-foreground">{description}</p>
      )}
    </div>
  )
}

// ============================================
// Settings Section (with Separator)
// ============================================

interface SettingsSectionProps {
  title: string
  description?: string
  badge?: string
  children: React.ReactNode
  className?: string
  /** Show separator before section? Default: true */
  separator?: boolean
}

/**
 * SettingsSection - Wrapper for grouped settings
 * 
 * @example
 * <SettingsSection title="Notifications" description="Configure alerts">
 *   <ToggleRow label="Email" checked={true} />
 * </SettingsSection>
 */
export function SettingsSection({ 
  title, 
  description, 
  badge,
  children, 
  className,
  separator = true,
}: SettingsSectionProps) {
  return (
    <div className={cn("space-y-4 sm:space-y-6", className)}>
      {separator && <Separator />}
      <SectionHeader title={title} description={description} badge={badge} />
      {children}
    </div>
  )
}

// ============================================
// Settings Card (Card wrapper)
// ============================================

interface SettingsCardProps {
  title: string
  description?: string
  children: React.ReactNode
  className?: string
}

/**
 * SettingsCard - Card wrapper for settings group
 */
export function SettingsCard({ title, description, children, className }: SettingsCardProps) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent className="space-y-4">
        {children}
      </CardContent>
    </Card>
  )
}

// ============================================
// Toggle Row (Switch with label)
// ============================================

interface ToggleRowProps {
  label: string
  description?: string
  checked: boolean
  onChange?: (checked: boolean) => void
  disabled?: boolean
  className?: string
}

/**
 * ToggleRow - Horizontal switch with label and description
 * 
 * Replaces the repeated pattern:
 * ```tsx
 * <div className="flex items-center justify-between">
 *   <div className="space-y-0.5">
 *     <p className="text-sm font-medium">{label}</p>
 *     <p className="text-xs text-muted-foreground">{description}</p>
 *   </div>
 *   <Switch checked={checked} onCheckedChange={onChange} />
 * </div>
 * ```
 */
export function ToggleRow({ 
  label, 
  description, 
  checked, 
  onChange,
  disabled,
  className,
}: ToggleRowProps) {
  return (
    <div className={cn("flex items-center justify-between", className)}>
      <div className="space-y-0.5">
        <p className="text-sm font-medium">{label}</p>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
      </div>
      <Switch 
        checked={checked} 
        onCheckedChange={onChange}
        disabled={disabled}
      />
    </div>
  )
}

// ============================================
// Info Row (Label + Value display)
// ============================================

interface InfoRowProps {
  label: string
  value: React.ReactNode
  className?: string
}

/**
 * InfoRow - Display label: value pairs
 */
export function InfoRow({ label, value, className }: InfoRowProps) {
  return (
    <div className={cn("flex items-center justify-between py-2", className)}>
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  )
}

// ============================================
// Action Row (Label + Action button)
// ============================================

interface ActionRowProps {
  label: string
  description?: string
  action: React.ReactNode
  className?: string
}

/**
 * ActionRow - Row with label/description and action button
 */
export function ActionRow({ label, description, action, className }: ActionRowProps) {
  return (
    <div className={cn("flex items-center justify-between gap-4", className)}>
      <div className="space-y-0.5 flex-1">
        <p className="text-sm font-medium">{label}</p>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
      </div>
      {action}
    </div>
  )
}

// ============================================
// Option Grid (for theme/language selectors)
// ============================================

interface OptionItem<T> {
  id: T
  label: string
  icon?: React.ReactNode
  description?: string
}

interface OptionGridProps<T extends string> {
  options: OptionItem<T>[]
  value: T
  onChange: (value: T) => void
  columns?: 2 | 3 | 4
  disabled?: boolean
  className?: string
}

/**
 * OptionGrid - Grid of selectable options (like theme picker)
 */
export function OptionGrid<T extends string>({ 
  options, 
  value, 
  onChange,
  columns = 3,
  disabled,
  className,
}: OptionGridProps<T>) {
  const colClass = {
    2: 'grid-cols-2',
    3: 'grid-cols-3',
    4: 'grid-cols-4',
  }[columns]

  return (
    <div className={cn(`grid ${colClass} gap-3`, className)}>
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          onClick={() => onChange(option.id)}
          disabled={disabled}
          className={cn(
            "flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-colors",
            value === option.id
              ? "border-primary bg-primary/5"
              : "border-transparent bg-muted/50 hover:bg-muted",
            disabled && "opacity-50 cursor-not-allowed"
          )}
        >
          {option.icon && <span className="text-2xl">{option.icon}</span>}
          <span className="text-sm font-medium">{option.label}</span>
          {option.description && (
            <span className="text-xs text-muted-foreground">{option.description}</span>
          )}
        </button>
      ))}
    </div>
  )
}

// ============================================
// List Option (for language-like selectors)
// ============================================

interface ListOptionItem<T> {
  id: T
  label: string
  sublabel?: string
  icon?: React.ReactNode
}

interface ListOptionsProps<T extends string> {
  options: ListOptionItem<T>[]
  value: T
  onChange: (value: T) => void
  disabled?: boolean
  currentLabel?: string
  className?: string
}

/**
 * ListOptions - Vertical list of selectable options
 */
export function ListOptions<T extends string>({ 
  options, 
  value, 
  onChange,
  disabled,
  currentLabel = "Current",
  className,
}: ListOptionsProps<T>) {
  return (
    <div className={cn("grid gap-2", className)}>
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          onClick={() => onChange(option.id)}
          disabled={disabled}
          className={cn(
            "flex items-center justify-between p-3 border rounded-lg transition-colors",
            value === option.id
              ? "border-primary bg-primary/5"
              : "border-border hover:bg-muted/50",
            disabled && "opacity-50 cursor-not-allowed"
          )}
        >
          <div className="flex items-center gap-3">
            {option.icon && <span className="text-2xl">{option.icon}</span>}
            <span className="text-sm font-medium">{option.label}</span>
            {option.sublabel && (
              <span className="text-xs text-muted-foreground">({option.sublabel})</span>
            )}
          </div>
          {value === option.id && (
            <Badge variant="secondary">{currentLabel}</Badge>
          )}
        </button>
      ))}
    </div>
  )
}
