import { createContext, useContext, type ReactNode } from 'react';
import type { DesignTokens } from '@asap/shared/types';
import type { CollectionItem, SiteData } from './types';

const TokensContext = createContext<DesignTokens | null>(null);
const DataContext = createContext<SiteData | null>(null);

/**
 * Mounts a per-tenant runtime: design tokens drive CSS custom properties,
 * `SiteData` is what generated sections read through hooks.
 *
 * The provider does NOT inject the CSS itself — the host (`apps/sites` or
 * `apps/web` preview) is responsible for emitting the token styles where it
 * needs them (per-page in SSR, per-iframe in preview). Use `buildTokenStyles`
 * from `@asap/shared`.
 */
export function SiteRuntimeProvider({
  tokens,
  data,
  children,
}: {
  tokens: DesignTokens;
  data: SiteData;
  children: ReactNode;
}) {
  return (
    <TokensContext.Provider value={tokens}>
      <DataContext.Provider value={data}>{children}</DataContext.Provider>
    </TokensContext.Provider>
  );
}

export function useTokens(): DesignTokens {
  const tokens = useContext(TokensContext);
  if (!tokens) {
    throw new Error('useTokens must be used inside <SiteRuntimeProvider>');
  }
  return tokens;
}

/**
 * Read a collection's items by slug. Returns an empty array if the collection
 * isn't part of the site's payload — generated code should degrade rather
 * than throw, since collections can be removed from the studio at any time.
 */
export function useCollection(slug: string): CollectionItem[] {
  const data = useContext(DataContext);
  if (!data) {
    throw new Error('useCollection must be used inside <SiteRuntimeProvider>');
  }
  return data.collections[slug]?.items ?? [];
}

/**
 * Read a per-site variable. `fallback` is used when the variable is unset.
 */
export function useVariable<T = unknown>(key: string, fallback?: T): T {
  const data = useContext(DataContext);
  if (!data) {
    throw new Error('useVariable must be used inside <SiteRuntimeProvider>');
  }
  const value = data.variables[key];
  return (value !== undefined ? value : fallback) as T;
}
