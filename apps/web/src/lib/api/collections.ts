/**
 * Collections & Variables API Client
 * 
 * API endpoints for managing website collections and variables.
 */

import { apiClient } from './client';
import type {
  WebsiteCollection,
  CollectionItem,
  WebsiteVariable,
  VariablesListResponse,
  CollectionSummary,
  FilterClause,
  SortClause,
} from '@asap/shared';

// ============================================
// Types
// ============================================

export interface CollectionQueryParams {
  filter?: FilterClause[];
  sort?: SortClause;
  limit?: number;
  offset?: number;
}

export interface CollectionsListResponse {
  collections: CollectionSummary[];
  total: number;
}

export interface SyncCollectionResponse {
  status: 'started' | 'completed' | 'error';
  message?: string;
  items_count?: number;
}

export interface RecomputeVariablesResponse {
  updated: number;
  variables: string[];
}

// ============================================
// Collections API
// ============================================

export const collectionsAPI = {
  /**
   * List all collections for a website
   */
  list: async (websiteId: string): Promise<CollectionsListResponse> => {
    const response = await apiClient.get<CollectionsListResponse>(
      `/websites/${websiteId}/collections`
    );
    return response;
  },

  /**
   * Get a specific collection with items
   */
  get: async (
    websiteId: string,
    slug: string,
    params?: CollectionQueryParams
  ): Promise<WebsiteCollection> => {
    const searchParams = new URLSearchParams();
    
    if (params?.filter) {
      searchParams.set('filter', JSON.stringify(params.filter));
    }
    if (params?.sort) {
      searchParams.set('sort', JSON.stringify(params.sort));
    }
    if (params?.limit !== undefined) {
      searchParams.set('limit', params.limit.toString());
    }
    if (params?.offset !== undefined) {
      searchParams.set('offset', params.offset.toString());
    }
    
    const query = searchParams.toString();
    const url = `/websites/${websiteId}/collections/${slug}${query ? `?${query}` : ''}`;
    
    return apiClient.get<WebsiteCollection>(url);
  },

  /**
   * Update a collection (for manual collections)
   */
  update: async (
    websiteId: string,
    slug: string,
    items: CollectionItem[]
  ): Promise<WebsiteCollection> => {
    return apiClient.put<WebsiteCollection>(
      `/websites/${websiteId}/collections/${slug}`,
      { items }
    );
  },

  /**
   * Delete a collection
   */
  delete: async (websiteId: string, slug: string): Promise<void> => {
    await apiClient.delete(`/websites/${websiteId}/collections/${slug}`);
  },

  /**
   * Trigger sync for a collection
   */
  sync: async (websiteId: string, slug: string): Promise<SyncCollectionResponse> => {
    return apiClient.post<SyncCollectionResponse>(
      `/websites/${websiteId}/collections/${slug}/sync`
    );
  },

  /**
   * Add item to collection (for manual collections)
   */
  addItem: async (
    websiteId: string,
    slug: string,
    item: Omit<CollectionItem, 'id' | '_created_at' | '_updated_at'>
  ): Promise<CollectionItem> => {
    return apiClient.post<CollectionItem>(
      `/websites/${websiteId}/collections/${slug}/items`,
      item
    );
  },

  /**
   * Update item in collection
   */
  updateItem: async (
    websiteId: string,
    slug: string,
    itemId: string,
    data: Record<string, unknown>
  ): Promise<CollectionItem> => {
    return apiClient.put<CollectionItem>(
      `/websites/${websiteId}/collections/${slug}/items/${itemId}`,
      { data }
    );
  },

  /**
   * Delete item from collection
   */
  deleteItem: async (
    websiteId: string,
    slug: string,
    itemId: string
  ): Promise<void> => {
    await apiClient.delete(
      `/websites/${websiteId}/collections/${slug}/items/${itemId}`
    );
  },
};

// ============================================
// Variables API
// ============================================

export const variablesAPI = {
  /**
   * List all variables for a website
   */
  list: async (websiteId: string): Promise<VariablesListResponse> => {
    return apiClient.get<VariablesListResponse>(
      `/websites/${websiteId}/variables`
    );
  },

  /**
   * Get a specific variable
   */
  get: async (websiteId: string, key: string): Promise<WebsiteVariable> => {
    return apiClient.get<WebsiteVariable>(
      `/websites/${websiteId}/variables/${key}`
    );
  },

  /**
   * Set a variable value (for manual variables)
   */
  set: async (
    websiteId: string,
    key: string,
    value: unknown
  ): Promise<WebsiteVariable> => {
    return apiClient.put<WebsiteVariable>(
      `/websites/${websiteId}/variables/${key}`,
      { value }
    );
  },

  /**
   * Delete a variable
   */
  delete: async (websiteId: string, key: string): Promise<void> => {
    await apiClient.delete(`/websites/${websiteId}/variables/${key}`);
  },

  /**
   * Recompute all computed variables
   */
  recompute: async (websiteId: string): Promise<RecomputeVariablesResponse> => {
    return apiClient.post<RecomputeVariablesResponse>(
      `/websites/${websiteId}/variables/recompute`
    );
  },
};

// ============================================
// Utility Functions
// ============================================

/**
 * Build filter clauses from simple key-value pairs
 */
export function buildFilters(
  filters: Record<string, unknown>
): FilterClause[] {
  return Object.entries(filters).map(([field, value]) => ({
    field,
    operator: 'eq' as const,
    value,
  }));
}

/**
 * Build sort clause
 */
export function buildSort(field: string, order: 'asc' | 'desc' = 'desc'): SortClause {
  return { field, order };
}
