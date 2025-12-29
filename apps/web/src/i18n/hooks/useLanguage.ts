import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  type LanguageCode,
  SUPPORTED_LANGUAGES,
  LANGUAGE_STORAGE_KEY,
  isValidLanguage,
  getSupportedLanguages,
  getLanguageInfo,
} from '../settings';

interface UseLanguageReturn {
  /** Current language code */
  language: LanguageCode;
  /** Change the current language */
  setLanguage: (code: LanguageCode) => void;
  /** List of all supported languages */
  languages: typeof SUPPORTED_LANGUAGES;
  /** Get info about a specific language */
  getLanguageInfo: typeof getLanguageInfo;
  /** Check if a language code is valid */
  isValidLanguage: typeof isValidLanguage;
  /** Whether the language is being changed */
  isChanging: boolean;
}

/**
 * Hook for managing language/locale settings
 * Provides language switching with persistence
 */
export function useLanguage(): UseLanguageReturn {
  const { i18n } = useTranslation();
  const [isChanging, setIsChanging] = useState(false);

  // Get current language, fallback to 'fr' if not valid
  const language = isValidLanguage(i18n.language)
    ? i18n.language
    : (i18n.language.split('-')[0] as LanguageCode) || 'fr';

  const setLanguage = useCallback(
    async (code: LanguageCode) => {
      if (!isValidLanguage(code) || code === language) {
        return;
      }

      setIsChanging(true);

      try {
        await i18n.changeLanguage(code);
        // Also update localStorage directly (i18next does this, but we ensure it)
        localStorage.setItem(LANGUAGE_STORAGE_KEY, code);
        // Update HTML lang attribute
        document.documentElement.lang = code;
      } catch (error) {
        console.error('Failed to change language:', error);
      } finally {
        setIsChanging(false);
      }
    },
    [i18n, language]
  );

  // Sync HTML lang attribute on mount and language change
  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  return {
    language,
    setLanguage,
    languages: SUPPORTED_LANGUAGES,
    getLanguageInfo,
    isValidLanguage,
    isChanging,
  };
}

/**
 * Get the stored language preference (can be used outside React)
 */
export function getStoredLanguage(): LanguageCode {
  if (typeof window === 'undefined') {
    return 'fr';
  }

  const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY);
  if (stored && isValidLanguage(stored)) {
    return stored;
  }

  // Try to detect from browser
  const browserLang = navigator.language.split('-')[0];
  if (isValidLanguage(browserLang)) {
    return browserLang;
  }

  return 'fr';
}

export { getSupportedLanguages, getLanguageInfo, isValidLanguage };
