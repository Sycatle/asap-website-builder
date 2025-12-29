/**
 * i18n Settings
 * Centralized configuration for supported languages
 */

export const SUPPORTED_LANGUAGES = {
  fr: {
    code: 'fr',
    name: 'Français',
    nativeName: 'Français',
    flag: '🇫🇷',
  },
  en: {
    code: 'en',
    name: 'English',
    nativeName: 'English',
    flag: '🇬🇧',
  },
} as const;

export type LanguageCode = keyof typeof SUPPORTED_LANGUAGES;

export const DEFAULT_LANGUAGE: LanguageCode = 'fr';

export const FALLBACK_LANGUAGE: LanguageCode = 'en';

export const LANGUAGE_STORAGE_KEY = 'asap-language';

/**
 * Namespaces for translation files
 * Each namespace corresponds to a JSON file in locales/{lang}/
 */
export const NAMESPACES = [
  'common',
  'dashboard',
  'settings',
  'editor',
  'errors',
  'notifications',
] as const;

export type Namespace = (typeof NAMESPACES)[number];

export const DEFAULT_NAMESPACE: Namespace = 'common';

/**
 * Get all supported language codes
 */
export function getSupportedLanguages(): LanguageCode[] {
  return Object.keys(SUPPORTED_LANGUAGES) as LanguageCode[];
}

/**
 * Check if a language code is supported
 */
export function isValidLanguage(code: string): code is LanguageCode {
  return code in SUPPORTED_LANGUAGES;
}

/**
 * Get language info by code
 */
export function getLanguageInfo(code: LanguageCode) {
  return SUPPORTED_LANGUAGES[code];
}
