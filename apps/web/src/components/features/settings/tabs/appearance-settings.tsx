"use client"

import { useState, useEffect } from "react"
import { useTranslation } from "react-i18next"

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
import { useLanguage, SUPPORTED_LANGUAGES, type LanguageCode } from "@/i18n"

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
  { id: 'light', label: 'settings:appearance.theme.light', icon: '☀️' },
  { id: 'dark', label: 'settings:appearance.theme.dark', icon: '🌙' },
  { id: 'system', label: 'settings:appearance.theme.system', icon: '💻' },
]

// ============================================================================
// Helpers
// ============================================================================

function getStoredTheme(): ThemeOption {
  if (typeof localStorage !== 'undefined') {
    const stored = localStorage.getItem('theme')
    if (stored === 'dark' || stored === 'light') {
      return stored
    }
  }
  return 'system'
}

function applyTheme(theme: ThemeOption) {
  const isDark =
    theme === 'dark' ||
    (theme === 'system' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches)
  
  document.documentElement.classList[isDark ? 'add' : 'remove']('dark')
  
  if (typeof localStorage !== 'undefined') {
    if (theme === 'system') {
      localStorage.removeItem('theme')
    } else {
      localStorage.setItem('theme', theme)
    }
  }
}

// ============================================================================
// Sub-components
// ============================================================================

interface ThemeSelectorProps {
  value: ThemeOption
  onChange: (theme: ThemeOption) => void
}

function ThemeSelector({ value, onChange }: ThemeSelectorProps) {
  const { t } = useTranslation()
  
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
          <span className="text-sm font-medium">{t(option.label)}</span>
        </button>
      ))}
    </div>
  )
}

interface LanguageSelectorProps {
  value: LanguageCode
  onChange: (lang: LanguageCode) => void
  isChanging?: boolean
}

function LanguageSelector({ value, onChange, isChanging }: LanguageSelectorProps) {
  const { t } = useTranslation()
  const languages = Object.values(SUPPORTED_LANGUAGES)

  return (
    <div className="grid gap-2">
      {languages.map((lang) => (
        <button
          key={lang.code}
          onClick={() => onChange(lang.code as LanguageCode)}
          disabled={isChanging}
          className={cn(
            "flex items-center justify-between p-3 border rounded-lg transition-colors",
            value === lang.code
              ? "border-primary bg-primary/5"
              : "border-border hover:bg-muted/50",
            isChanging && "opacity-50 cursor-not-allowed"
          )}
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl">{lang.flag}</span>
            <span className="text-sm font-medium">{lang.nativeName}</span>
          </div>
          {value === lang.code && (
            <Badge variant="secondary">{t('settings:language.current')}</Badge>
          )}
        </button>
      ))}
    </div>
  )
}

// ============================================================================
// Main Component
// ============================================================================

export function AppearanceSettings() {
  const { t } = useTranslation()
  const { language, setLanguage, isChanging } = useLanguage()
  const [theme, setTheme] = useState<ThemeOption>('system')

  // Initialize theme from localStorage on mount
  useEffect(() => {
    setTheme(getStoredTheme())
  }, [])

  // Listen for system theme changes when in 'system' mode
  useEffect(() => {
    if (theme !== 'system') return

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handleChange = () => applyTheme('system')
    
    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [theme])

  const handleThemeChange = (newTheme: ThemeOption) => {
    setTheme(newTheme)
    applyTheme(newTheme)
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">{t('settings:appearance.title')}</h3>
        <p className="text-sm text-muted-foreground">
          {t('settings:appearance.subtitle')}
        </p>
      </div>
      <Separator />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('settings:appearance.theme.title')}</CardTitle>
          <CardDescription>
            {t('settings:appearance.theme.description')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ThemeSelector value={theme} onChange={handleThemeChange} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('settings:language.title')}</CardTitle>
          <CardDescription>
            {t('settings:language.subtitle')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <LanguageSelector 
            value={language} 
            onChange={setLanguage}
            isChanging={isChanging}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('settings:appearance.density.title')}</CardTitle>
          <CardDescription>
            {t('settings:appearance.density.description')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <span className="text-sm">{t('settings:appearance.density.compact')}</span>
            <Switch />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
