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

import frCommon from './locales/fr/common.json';
import enCommon from './locales/en/common.json';

const resources = {
  fr: {
    common: frCommon,
  },
  en: {
    common: enCommon,
  },
};

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
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage'],
      lookupLocalStorage: LANGUAGE_STORAGE_KEY,
    },

    interpolation: {
      escapeValue: false,
    },

    react: {
      useSuspense: false,
    },

    debug: import.meta.env.DEV,
  });

export default i18n;

export { useTranslation } from 'react-i18next';
export { Trans } from 'react-i18next';
export * from './settings';
