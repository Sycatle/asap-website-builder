/**
 * Extension Store API Client
 * 
 * Client for the Extension Store v2 API.
 * Handles both public (browsing) and authenticated (installation) endpoints.
 */

import { apiClient } from './client';

// ============================================================================
// Types
// ============================================================================

/** Extension summary for list view */
export interface ExtensionStoreSummary {
  slug: string;
  name: string;
  description: string;
  icon?: string;
  category: string;
  tags: string[];
  min_plan: string;
  author_name?: string;
  author_verified: boolean;
  version: string;
  featured: boolean;
  beta: boolean;
  deprecated: boolean;
  install_count: number;
  rating?: number;
  rating_count: number;
  installed?: boolean;
}

/** Extension detail response */
export interface ExtensionStoreDetail {
  slug: string;
  name: string;
  version: string;
  description: string;
  long_description?: string;
  icon?: string;
  banner?: string;
  category: string;
  tags: string[];
  min_plan: string;
  author?: {
    name: string;
    verified: boolean;
  };
  featured: boolean;
  beta: boolean;
  deprecated: boolean;
  install_count: number;
  rating?: number;
  rating_count: number;
  manifest: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  installed?: boolean;
}

/** Store list response */
export interface ExtensionListResponse {
  extensions: ExtensionStoreSummary[];
  total: number;
  page: number;
  per_page: number;
  has_more: boolean;
}

/** Category with count */
export interface StoreCategory {
  slug: string;
  name: string;
  count: number;
}

/** Installed extension summary */
export interface InstalledExtensionSummary {
  slug: string;
  name: string;
  version: string;
  icon?: string;
  category: string;
  enabled: boolean;
  installed_at: string;
  websites_count: number;
}

/** Installed extension detail */
export interface InstalledExtensionDetail {
  slug: string;
  name: string;
  version: string;
  settings: Record<string, unknown>;
  granted_permissions: string[];
  enabled: boolean;
  installed_at: string;
}

/** Website extension */
export interface WebsiteExtensionV2 {
  id: string;
  extension_slug: string;
  extension_name: string;
  settings: Record<string, unknown>;
  enabled: boolean;
  activated_at: string;
}

/** Store list query parameters */
export interface StoreListParams {
  category?: string;
  plan?: string;
  search?: string;
  tags?: string;
  sort?: 'popular' | 'newest' | 'rating' | 'name';
  featured?: boolean;
  include_beta?: boolean;
  page?: number;
  per_page?: number;
}

/** Install request */
export interface InstallExtensionRequest {
  granted_permissions: string[];
}

/** Activate request */
export interface ActivateExtensionV2Request {
  settings?: Record<string, unknown>;
}

/** Update settings request */
export interface UpdateSettingsRequest {
  settings: Record<string, unknown>;
}

/** Toggle request */
export interface ToggleExtensionRequest {
  enabled: boolean;
}

// ============================================================================
// Store API (Public)
// ============================================================================

export const storeAPI = {
  /**
   * List extensions from the store
   */
  async list(params: StoreListParams = {}): Promise<ExtensionListResponse> {
    const searchParams = new URLSearchParams();
    
    if (params.category) searchParams.set('category', params.category);
    if (params.plan) searchParams.set('plan', params.plan);
    if (params.search) searchParams.set('search', params.search);
    if (params.tags) searchParams.set('tags', params.tags);
    if (params.sort) searchParams.set('sort', params.sort);
    if (params.featured) searchParams.set('featured', 'true');
    if (params.include_beta) searchParams.set('include_beta', 'true');
    if (params.page) searchParams.set('page', params.page.toString());
    if (params.per_page) searchParams.set('per_page', params.per_page.toString());
    
    const query = searchParams.toString();
    const url = query ? `/store/extensions?${query}` : '/store/extensions';
    
    return apiClient.get<ExtensionListResponse>(url);
  },

  /**
   * Get featured extensions
   */
  async featured(): Promise<{ extensions: ExtensionStoreSummary[] }> {
    return apiClient.get('/store/extensions/featured');
  },

  /**
   * Get extension details
   */
  async get(slug: string): Promise<ExtensionStoreDetail> {
    return apiClient.get<ExtensionStoreDetail>(`/store/extensions/${slug}`);
  },

  /**
   * Get extension manifest only
   */
  async manifest(slug: string): Promise<Record<string, unknown>> {
    return apiClient.get<Record<string, unknown>>(`/store/extensions/${slug}/manifest`);
  },

  /**
   * Get all categories with counts
   */
  async categories(): Promise<{ categories: StoreCategory[] }> {
    return apiClient.get('/store/categories');
  },
};

// ============================================================================
// Account Extensions API (Authenticated)
// ============================================================================

export const accountExtensionsAPI = {
  /**
   * List installed extensions for account
   */
  async list(): Promise<{ extensions: InstalledExtensionSummary[] }> {
    return apiClient.get('/account/extensions');
  },

  /**
   * Get installed extension details
   */
  async get(slug: string): Promise<InstalledExtensionDetail> {
    return apiClient.get<InstalledExtensionDetail>(`/account/extensions/${slug}`);
  },

  /**
   * Install an extension
   */
  async install(slug: string, permissions: string[] = []): Promise<InstalledExtensionDetail> {
    return apiClient.post<InstalledExtensionDetail>(`/account/extensions/${slug}/install`, {
      granted_permissions: permissions,
    });
  },

  /**
   * Uninstall an extension
   */
  async uninstall(slug: string): Promise<{ success: boolean; message: string }> {
    return apiClient.delete<{ success: boolean; message: string }>(`/account/extensions/${slug}`);
  },

  /**
   * Update extension settings
   */
  async updateSettings(slug: string, settings: Record<string, unknown>): Promise<{
    slug: string;
    settings: Record<string, unknown>;
    updated_at: string;
  }> {
    return apiClient.patch(`/account/extensions/${slug}/settings`, { settings });
  },

  /**
   * Toggle extension enabled state
   */
  async toggle(slug: string, enabled: boolean): Promise<{
    slug: string;
    enabled: boolean;
    updated_at: string;
  }> {
    return apiClient.patch(`/account/extensions/${slug}/toggle`, { enabled });
  },
};

// ============================================================================
// Website Extensions v2 API (Authenticated)
// ============================================================================

export const websiteExtensionsV2API = {
  /**
   * List activated extensions for a website
   */
  async list(websiteId: string): Promise<{ extensions: WebsiteExtensionV2[] }> {
    return apiClient.get(`/websites/${websiteId}/extensions/v2`);
  },

  /**
   * Activate an extension on a website
   */
  async activate(websiteId: string, slug: string, settings?: Record<string, unknown>): Promise<WebsiteExtensionV2> {
    return apiClient.post<WebsiteExtensionV2>(`/websites/${websiteId}/extensions/v2/${slug}/activate`, {
      settings,
    });
  },

  /**
   * Deactivate an extension from a website
   */
  async deactivate(websiteId: string, slug: string): Promise<{ success: boolean; message: string }> {
    return apiClient.delete<{ success: boolean; message: string }>(`/websites/${websiteId}/extensions/v2/${slug}`);
  },

  /**
   * Update extension settings for a website
   */
  async updateSettings(websiteId: string, slug: string, settings: Record<string, unknown>): Promise<{
    extension_slug: string;
    settings: Record<string, unknown>;
    updated_at: string;
  }> {
    return apiClient.patch(`/websites/${websiteId}/extensions/v2/${slug}/settings`, { settings });
  },

  /**
   * Toggle extension enabled state for a website
   */
  async toggle(websiteId: string, slug: string, enabled: boolean): Promise<{
    extension_slug: string;
    enabled: boolean;
    updated_at: string;
  }> {
    return apiClient.patch(`/websites/${websiteId}/extensions/v2/${slug}/toggle`, { enabled });
  },
};

// ============================================================================
// Extension Actions API (Authenticated)
// ============================================================================

/** Action execution result */
export interface ActionResult {
  success: boolean;
  message?: string;
  data?: unknown;
  status?: 'pending' | 'completed' | 'failed';
  refresh?: boolean;
}

export const extensionActionsAPI = {
  /**
   * Execute an extension action
   */
  async execute(
    websiteId: string,
    extensionSlug: string,
    actionKey: string,
    payload: Record<string, unknown> = {}
  ): Promise<ActionResult> {
    return apiClient.post<ActionResult>(
      `/websites/${websiteId}/extensions/${extensionSlug}/actions/${actionKey}`,
      payload
    );
  },
};

// ============================================================================
// Combined Export
// ============================================================================

export const extensionStoreAPI = {
  store: storeAPI,
  account: accountExtensionsAPI,
  website: websiteExtensionsV2API,
  actions: extensionActionsAPI,
};

export default extensionStoreAPI;
