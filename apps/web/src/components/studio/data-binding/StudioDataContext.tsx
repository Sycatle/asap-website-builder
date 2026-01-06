/**
 * Studio Data Context
 * 
 * Provides collections and variables data to Studio components.
 * Centralizes data fetching and exposes hooks for property editors.
 */

'use client';

import * as React from 'react';
import { useCollections } from '@/hooks/useCollections';
import { useVariables } from '@/hooks/useVariables';
import type {
  CollectionSummary,
  WebsiteVariable,
  WebsiteCollection,
  CollectionSchema,
} from '@asap/shared';

// ============================================
// Types
// ============================================

export interface StudioDataContextValue {
  /** Website ID */
  websiteId: string | undefined;
  
  /** All available collections */
  collections: CollectionSummary[];
  /** Loading state for collections */
  isLoadingCollections: boolean;
  /** Error for collections */
  collectionsError: string | null;
  
  /** All available variables */
  variables: WebsiteVariable[];
  /** Variable values lookup */
  variableValues: Record<string, unknown>;
  /** Loading state for variables */
  isLoadingVariables: boolean;
  /** Error for variables */
  variablesError: string | null;
  
  /** Get variable value by key */
  getVariableValue: <T = unknown>(key: string, defaultValue?: T) => T;
  /** Interpolate variables in a template string */
  interpolate: (template: string) => string;
  
  /** Fetch a specific collection's data */
  fetchCollection: (slug: string) => Promise<WebsiteCollection | null>;
  /** Get collection schema */
  getCollectionSchema: (slug: string) => CollectionSchema | undefined;
  
  /** Sync a collection */
  syncCollection: (slug: string) => Promise<void>;
  /** Recompute variables */
  recomputeVariables: () => Promise<void>;
  
  /** Refetch all data */
  refetch: () => Promise<void>;
}

const StudioDataContext = React.createContext<StudioDataContextValue | null>(null);

// ============================================
// Provider
// ============================================

export interface StudioDataProviderProps {
  websiteId: string | undefined;
  children: React.ReactNode;
}

export function StudioDataProvider({ websiteId, children }: StudioDataProviderProps) {
  // Collection schemas cache
  const [schemaCache, setSchemaCache] = React.useState<Record<string, CollectionSchema>>({});
  
  // Collections hook
  const {
    collections,
    isLoading: isLoadingCollections,
    error: collectionsError,
    refetch: refetchCollections,
  } = useCollections(websiteId, { autoFetch: true });
  
  // Variables hook
  const {
    variables,
    values: variableValues,
    isLoading: isLoadingVariables,
    error: variablesError,
    getValue: getVariableValue,
    interpolate,
    recompute: recomputeVariables,
    refetch: refetchVariables,
  } = useVariables(websiteId, { autoFetch: true });

  // Fetch specific collection data
  const fetchCollection = React.useCallback(async (slug: string): Promise<WebsiteCollection | null> => {
    if (!websiteId) return null;
    
    try {
      const { collectionsAPI } = await import('@/lib/api/collections');
      const data = await collectionsAPI.get(websiteId, slug);
      
      // Cache schema if available (WebsiteCollection may have schema)
      const collectionWithSchema = data as WebsiteCollection & { schema?: CollectionSchema };
      if (collectionWithSchema.schema) {
        setSchemaCache(prev => ({ ...prev, [slug]: collectionWithSchema.schema! }));
      }
      
      return data;
    } catch (err) {
      console.error(`Failed to fetch collection ${slug}:`, err);
      return null;
    }
  }, [websiteId]);

  // Get cached schema
  const getCollectionSchema = React.useCallback((slug: string): CollectionSchema | undefined => {
    return schemaCache[slug];
  }, [schemaCache]);

  // Sync collection
  const syncCollection = React.useCallback(async (slug: string): Promise<void> => {
    if (!websiteId) return;
    
    const { collectionsAPI } = await import('@/lib/api/collections');
    await collectionsAPI.sync(websiteId, slug);
    await refetchCollections();
  }, [websiteId, refetchCollections]);

  // Refetch all
  const refetch = React.useCallback(async () => {
    await Promise.all([
      refetchCollections(),
      refetchVariables(),
    ]);
  }, [refetchCollections, refetchVariables]);

  const value: StudioDataContextValue = {
    websiteId,
    collections,
    isLoadingCollections,
    collectionsError,
    variables,
    variableValues,
    isLoadingVariables,
    variablesError,
    getVariableValue,
    interpolate,
    fetchCollection,
    getCollectionSchema,
    syncCollection,
    recomputeVariables,
    refetch,
  };

  return (
    <StudioDataContext.Provider value={value}>
      {children}
    </StudioDataContext.Provider>
  );
}

// ============================================
// Hook
// ============================================

export function useStudioData(): StudioDataContextValue {
  const context = React.useContext(StudioDataContext);
  
  if (!context) {
    throw new Error('useStudioData must be used within a StudioDataProvider');
  }
  
  return context;
}

// ============================================
// Convenience hooks
// ============================================

/**
 * Hook for using collections in property editors
 */
export function useStudioCollections() {
  const { 
    collections, 
    isLoadingCollections, 
    collectionsError,
    fetchCollection,
    getCollectionSchema,
    syncCollection,
  } = useStudioData();
  
  return {
    collections,
    isLoading: isLoadingCollections,
    error: collectionsError,
    fetchCollection,
    getCollectionSchema,
    syncCollection,
  };
}

/**
 * Hook for using variables in property editors
 */
export function useStudioVariables() {
  const {
    variables,
    variableValues,
    isLoadingVariables,
    variablesError,
    getVariableValue,
    interpolate,
    recomputeVariables,
  } = useStudioData();
  
  return {
    variables,
    values: variableValues,
    isLoading: isLoadingVariables,
    error: variablesError,
    getValue: getVariableValue,
    interpolate,
    recompute: recomputeVariables,
  };
}

export default StudioDataContext;
