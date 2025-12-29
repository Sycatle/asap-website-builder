import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import {
  DEFAULT_LANGUAGE,
  FALLBACK_LANGUAGE,
  DEFAULT_NAMESPACE,
  NAMESPACES,
  LANGUAGE_STORAGE_KEY,
  getSupportedLanguages,
} from './settings';

// Import all translation files
import frCommon from './locales/fr/common.json';
import frDashboard from './locales/fr/dashboard.json';
import frSettings from './locales/fr/settings.json';
import frEditor from './locales/fr/editor.json';
import frErrors from './locales/fr/errors.json';
import frNotifications from './locales/fr/notifications.json';

import enCommon from './locales/en/common.json';
import enDashboard from './locales/en/dashboard.json';
import enSettings from './locales/en/settings.json';
import enEditor from './locales/en/editor.json';
import enErrors from './locales/en/errors.json';
import enNotifications from './locales/en/notifications.json';

// Bundle all translations
const resources = {
  fr: {
    common: frCommon,
    dashboard: frDashboard,
    settings: frSettings,
    editor: frEditor,
    errors: frErrors,
    notifications: frNotifications,
  },
  en: {
    common: enCommon,
    dashboard: enDashboard,
    settings: enSettings,
    editor: enEditor,
    errors: enErrors,
    notifications: enNotifications,
  },
};

// Initialize i18next
i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: FALLBACK_LANGUAGE,
    defaultNS: DEFAULT_NAMESPACE,
    ns: NAMESPACES as unknown as string[],
    supportedLngs: getSupportedLanguages(),

    detection: {
      // Order of language detection
      order: ['localStorage', 'navigator', 'htmlTag'],
      // Cache user language selection
      caches: ['localStorage'],
      // LocalStorage key
      lookupLocalStorage: LANGUAGE_STORAGE_KEY,
    },

    interpolation: {
      // React already escapes values
      escapeValue: false,
    },

    react: {
      // Use Suspense for loading translations
      useSuspense: false,
    },

    // Debug mode in development
    debug: import.meta.env.DEV,
  });

export default i18n;

// Re-export commonly used functions
export { useTranslation } from 'react-i18next';
export { Trans } from 'react-i18next';

// Export settings
export * from './settings';

// Export hooks
export { useLanguage, getStoredLanguage } from './hooks/useLanguage';
