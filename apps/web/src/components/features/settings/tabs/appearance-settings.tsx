"use client"

import { useState, useEffect } from "react"
import { useTranslation } from "react-i18next"

import { Separator } from "@/components/ui/separator"
import { 
  SectionHeader,
  SettingsCard,
  ToggleRow,
  OptionGrid,
  ListOptions,
} from "@/components/shared"
import { useLanguage, SUPPORTED_LANGUAGES, type LanguageCode } from "@/i18n"

// ============================================================================
// Types & Config
// ============================================================================

type ThemeOption = 'light' | 'dark' | 'system'

const THEME_OPTIONS = [
  { id: 'light' as const, label: 'settings:appearance.theme.light', icon: '☀️' },
  { id: 'dark' as const, label: 'settings:appearance.theme.dark', icon: '🌙' },
  { id: 'system' as const, label: 'settings:appearance.theme.system', icon: '💻' },
]

// ============================================================================
// Helpers
// ============================================================================

function getStoredTheme(): ThemeOption {
  if (typeof localStorage !== 'undefined') {
    const stored = localStorage.getItem('theme')
    if (stored === 'dark' || stored === 'light') return stored
  }
  return 'system'
}

function applyTheme(theme: ThemeOption) {
  const isDark =
    theme === 'dark' ||
    (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
  
  document.documentElement.classList[isDark ? 'add' : 'remove']('dark')
  
  if (typeof localStorage !== 'undefined') {
    theme === 'system' ? localStorage.removeItem('theme') : localStorage.setItem('theme', theme)
  }
}

// ============================================================================
// Main Component
// ============================================================================

export function AppearanceSettings() {
  const { t } = useTranslation()
  const { language, setLanguage, isChanging } = useLanguage()
  const [theme, setTheme] = useState<ThemeOption>('system')

  useEffect(() => {
    setTheme(getStoredTheme())
  }, [])

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

  // Transform languages for ListOptions
  const languageOptions = Object.values(SUPPORTED_LANGUAGES).map(lang => ({
    id: lang.code as LanguageCode,
    label: lang.nativeName,
    icon: lang.flag,
  }))

  // Transform themes for OptionGrid with translated labels
  const themeOptionsTranslated = THEME_OPTIONS.map(opt => ({
    ...opt,
    label: t(opt.label),
  }))

  return (
    <div className="space-y-6">
      <SectionHeader
        title={t('settings:appearance.title')}
        description={t('settings:appearance.subtitle')}
      />
      <Separator />

      <SettingsCard
        title={t('settings:appearance.theme.title')}
        description={t('settings:appearance.theme.description')}
      >
        <OptionGrid
          options={themeOptionsTranslated}
          value={theme}
          onChange={handleThemeChange}
        />
      </SettingsCard>

      <SettingsCard
        title={t('settings:language.title')}
        description={t('settings:language.subtitle')}
      >
        <ListOptions
          options={languageOptions}
          value={language}
          onChange={setLanguage}
          disabled={isChanging}
          currentLabel={t('settings:language.current')}
        />
      </SettingsCard>

      <SettingsCard
        title={t('settings:appearance.density.title')}
        description={t('settings:appearance.density.description')}
      >
        <ToggleRow
          label={t('settings:appearance.density.compact')}
          checked={false}
        />
      </SettingsCard>
    </div>
  )
}
