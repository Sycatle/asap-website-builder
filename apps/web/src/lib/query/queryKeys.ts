/**
 * Query Keys Factory
 * 
 * Centralized query keys with type-safe factory pattern.
 * Provides hierarchical key structure for efficient cache invalidation.
 */

// ============================================
// QUERY KEY FACTORIES
// ============================================

export const queryKeys = {
  // User queries
  user: {
    all: ['user'] as const,
    me: () => ['user', 'me'] as const,
    profile: () => ['user', 'profile'] as const,
  },

  // Website queries
  websites: {
    all: ['websites'] as const,
    lists: () => ['websites', 'list'] as const,
    list: (filters?: { status?: string }) => 
      filters 
        ? ['websites', 'list', filters] as const 
        : ['websites', 'list'] as const,
    details: () => ['websites', 'detail'] as const,
    detail: (id: string) => ['websites', 'detail', id] as const,
    data: (id: string) => ['websites', 'detail', id, 'data'] as const,
  },

  // Page queries
  pages: {
    all: ['pages'] as const,
    lists: () => ['pages', 'list'] as const,
    list: (websiteId: string) => ['pages', 'list', websiteId] as const,
    details: () => ['pages', 'detail'] as const,
    detail: (websiteId: string, pageId: string) => 
      ['pages', 'detail', websiteId, pageId] as const,
  },

  // Element queries
  elements: {
    all: ['elements'] as const,
    lists: () => ['elements', 'list'] as const,
    list: (websiteId: string) => ['elements', 'list', websiteId] as const,
    details: () => ['elements', 'detail'] as const,
    detail: (websiteId: string, elementId: string) => 
      ['elements', 'detail', websiteId, elementId] as const,
  },

  // Extension queries
  extensions: {
    all: ['extensions'] as const,
    catalog: () => ['extensions', 'catalog'] as const,
    lists: () => ['extensions', 'website'] as const,
    list: (websiteId: string) => ['extensions', 'website', websiteId] as const,
    data: (websiteId: string, slug: string) => 
      ['extensions', 'data', websiteId, slug] as const,
  },

  // Extension Store queries (v2)
  store: {
    all: ['store'] as const,
    extensions: (params?: Record<string, unknown>) => 
      params 
        ? ['store', 'extensions', params] as const 
        : ['store', 'extensions'] as const,
    featured: () => ['store', 'extensions', 'featured'] as const,
    detail: (slug: string) => ['store', 'extensions', slug] as const,
    manifest: (slug: string) => ['store', 'extensions', slug, 'manifest'] as const,
    categories: () => ['store', 'categories'] as const,
    // Account-level installed
    installed: () => ['store', 'installed'] as const,
    installedDetail: (slug: string) => ['store', 'installed', slug] as const,
    // Website-level activated
    websiteExtensions: (websiteId: string) => ['store', 'website', websiteId] as const,
  },

  // File queries
  files: {
    all: ['files'] as const,
    list: (params?: { website_id?: string; folder_id?: string }) => 
      params 
        ? ['files', 'list', params] as const 
        : ['files', 'list'] as const,
    quota: () => ['files', 'quota'] as const,
    folders: (params?: { parent_id?: string; website_id?: string }) =>
      params
        ? ['files', 'folders', params] as const
        : ['files', 'folders'] as const,
  },

  // Notification queries
  notifications: {
    all: ['notifications'] as const,
    list: (filters?: { category?: string; read?: boolean }) =>
      filters
        ? ['notifications', 'list', filters] as const
        : ['notifications', 'list'] as const,
    unreadCount: () => ['notifications', 'unread-count'] as const,
  },

  // Administrator queries
  administrators: {
    all: ['administrators'] as const,
    list: (websiteId: string) => ['administrators', 'list', websiteId] as const,
  },
} as const;

// ============================================
// STALE TIMES (per query type)
// ============================================

export const staleTimes = {
  user: 5 * 60 * 1000,           // 5 minutes
  websites: 2 * 60 * 1000,       // 2 minutes
  pages: 2 * 60 * 1000,          // 2 minutes
  elements: 30 * 1000,           // 30 seconds (frequently edited)
  extensions: 5 * 60 * 1000,     // 5 minutes
  extensionData: 1 * 60 * 1000,  // 1 minute
  files: 1 * 60 * 1000,          // 1 minute
  quota: 30 * 1000,              // 30 seconds
  notifications: 1 * 60 * 1000,  // 1 minute
  store: 5 * 60 * 1000,          // 5 minutes (store catalog)
  storeDetail: 10 * 60 * 1000,   // 10 minutes (extension detail)
  installed: 2 * 60 * 1000,      // 2 minutes (installed extensions)
} as const;

// ============================================
// TYPE EXPORTS
// ============================================

export type QueryKeys = typeof queryKeys;
export type StaleTimes = typeof staleTimes;
