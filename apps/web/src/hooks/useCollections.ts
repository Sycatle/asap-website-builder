/**
 * useCollections - Hook for fetching and managing collections
 * 
 * Provides collection data with filtering, sorting, and sync capabilities.
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { 
  collectionsAPI, 
  type CollectionQueryParams 
} from '@/lib/api/collections';
import type {
  WebsiteCollection,
  CollectionItem,
  CollectionSummary,
  FilterClause,
  SortClause,
  SyncStatus,
} from '@asap/shared';

// ============================================
// Types
// ============================================

export interface UseCollectionsOptions {
  /** Auto-fetch on mount */
  autoFetch?: boolean;
  /** Collection slug to fetch (for single collection) */
  slug?: string;
  /** Filter clauses */
  filter?: FilterClause[];
  /** Sort clause */
  sort?: SortClause;
  /** Maximum items to fetch */
  limit?: number;
  /** Offset for pagination */
  offset?: number;
}

export interface UseCollectionsReturn {
  /** List of collections (when fetching list) */
  collections: CollectionSummary[];
  /** Single collection data (when fetching by slug) */
  collection: WebsiteCollection | null;
  /** Collection items (convenience accessor) */
  items: CollectionItem[];
  /** Total items count */
  total: number;
  /** Loading state */
  isLoading: boolean;
  /** Error message */
  error: string | null;
  /** Sync status */
  syncStatus: SyncStatus;
  /** Refetch data */
  refetch: () => Promise<void>;
  /** Trigger sync for collection */
  sync: () => Promise<void>;
  /** Update query params */
  setQueryParams: (params: Partial<CollectionQueryParams>) => void;
}

// ============================================
// Hook Implementation
// ============================================

export function useCollections(
  websiteId: string | undefined,
  options: UseCollectionsOptions = {}
): UseCollectionsReturn {
  const { 
    autoFetch = true, 
    slug,
    filter: initialFilter,
    sort: initialSort,
    limit: initialLimit,
    offset: initialOffset,
  } = options;

  // State
  const [collections, setCollections] = useState<CollectionSummary[]>([]);
  const [collection, setCollection] = useState<WebsiteCollection | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  
  // Query params state
  const [queryParams, setQueryParamsState] = useState<CollectionQueryParams>({
    filter: initialFilter,
    sort: initialSort,
    limit: initialLimit,
    offset: initialOffset,
  });
  
  const hasFetched = useRef(false);

  // Fetch collection(s)
  const fetchData = useCallback(async () => {
    if (!websiteId) return;

    try {
      setIsLoading(true);
      setError(null);

      if (slug) {
        // Fetch single collection
        const data = await collectionsAPI.get(websiteId, slug, queryParams);
        setCollection(data);
        setSyncStatus(data.sync_status);
      } else {
        // Fetch collection list
        const response = await collectionsAPI.list(websiteId);
        setCollections(response.collections);
      }
    } catch (err) {
      console.error('Failed to fetch collections:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch collections');
    } finally {
      setIsLoading(false);
    }
  }, [websiteId, slug, queryParams]);

  // Sync collection
  const sync = useCallback(async () => {
    if (!websiteId || !slug) return;

    try {
      setSyncStatus('syncing');
      setError(null);
      
      const response = await collectionsAPI.sync(websiteId, slug);
      
      if (response.status === 'completed') {
        // Refetch to get updated data
        await fetchData();
      } else if (response.status === 'error') {
        setError(response.message || 'Sync failed');
        setSyncStatus('error');
      }
    } catch (err) {
      console.error('Failed to sync collection:', err);
      setError(err instanceof Error ? err.message : 'Failed to sync collection');
      setSyncStatus('error');
    }
  }, [websiteId, slug, fetchData]);

  // Update query params
  const setQueryParams = useCallback((params: Partial<CollectionQueryParams>) => {
    setQueryParamsState(prev => ({ ...prev, ...params }));
  }, []);

  // Auto-fetch on mount
  useEffect(() => {
    if (autoFetch && websiteId && !hasFetched.current) {
      hasFetched.current = true;
      fetchData();
    }
  }, [autoFetch, websiteId, fetchData]);

  // Refetch when query params change
  useEffect(() => {
    if (hasFetched.current && slug) {
      fetchData();
    }
  }, [queryParams, fetchData, slug]);

  // Memoized items accessor
  const items = useMemo(() => collection?.items ?? [], [collection]);
  const total = useMemo(() => collection?.total_count ?? 0, [collection]);

  return {
    collections,
    collection,
    items,
    total,
    isLoading,
    error,
    syncStatus,
    refetch: fetchData,
    sync,
    setQueryParams,
  };
}

// ============================================
// useCollection - Simplified hook for single collection
// ============================================

export function useCollection(
  websiteId: string | undefined,
  slug: string,
  options?: Omit<UseCollectionsOptions, 'slug'>
) {
  return useCollections(websiteId, { ...options, slug });
}
