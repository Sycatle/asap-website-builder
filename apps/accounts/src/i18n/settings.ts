/**
 * i18n Settings for Accounts app
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

export const NAMESPACES = ['common', 'auth'] as const;
export type Namespace = (typeof NAMESPACES)[number];
export const DEFAULT_NAMESPACE: Namespace = 'common';

export function getSupportedLanguages(): LanguageCode[] {
  return Object.keys(SUPPORTED_LANGUAGES) as LanguageCode[];
}

export function isValidLanguage(code: string): code is LanguageCode {
  return code in SUPPORTED_LANGUAGES;
}
