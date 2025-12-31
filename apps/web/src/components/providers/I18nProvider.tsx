"use client"

import type { ReactNode } from 'react';
// Import i18n configuration to initialize it
import '@/i18n';

interface I18nProviderProps {
  children: ReactNode;
}

/**
 * Provider component that initializes i18next
 * Must be placed high in the component tree
 * 
 * Note: i18next is initialized by importing the config module,
 * this component just ensures the import happens and provides
 * a consistent provider pattern.
 */
export function I18nProvider({ children }: I18nProviderProps) {
  return <>{children}</>;
}
