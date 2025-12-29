"use client"

import { useState } from "react"

import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { cn } from "@/lib/utils"

// ============================================================================
// Types
// ============================================================================

type ThemeOption = 'light' | 'dark' | 'system'

interface ThemeChoice {
  id: ThemeOption
  label: string
  icon: string
}

// ============================================================================
// Config
// ============================================================================

const THEME_OPTIONS: ThemeChoice[] = [
  { id: 'light', label: 'Clair', icon: '☀️' },
  { id: 'dark', label: 'Sombre', icon: '🌙' },
  { id: 'system', label: 'Système', icon: '💻' },
]

// ============================================================================
// Sub-components
// ============================================================================

interface ThemeSelectorProps {
  value: ThemeOption
  onChange: (theme: ThemeOption) => void
}

function ThemeSelector({ value, onChange }: ThemeSelectorProps) {
  return (
    <div className="grid grid-cols-3 gap-3">
      {THEME_OPTIONS.map((option) => (
        <button
          key={option.id}
          onClick={() => onChange(option.id)}
          className={cn(
            "flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-colors",
            value === option.id
              ? "border-primary bg-primary/5"
              : "border-transparent bg-muted/50 hover:bg-muted"
          )}
        >
          <span className="text-2xl">{option.icon}</span>
          <span className="text-sm font-medium">{option.label}</span>
        </button>
      ))}
    </div>
  )
}

function LanguageSelector() {
  return (
    <div className="flex items-center justify-between p-3 border rounded-lg">
      <div className="flex items-center gap-3">
        <span className="text-2xl">🇫🇷</span>
        <span className="text-sm font-medium">Français</span>
      </div>
      <Badge variant="secondary">Actuel</Badge>
    </div>
  )
}

// ============================================================================
// Main Component
// ============================================================================

export function AppearanceSettings() {
  const [theme, setTheme] = useState<ThemeOption>('system')

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
          <ThemeSelector value={theme} onChange={setTheme} />
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
          <LanguageSelector />
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
