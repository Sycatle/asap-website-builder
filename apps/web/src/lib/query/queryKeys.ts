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

  // File queries
  files: {
    all: ['files'] as const,
    list: () => ['files', 'list'] as const,
    quota: () => ['files', 'quota'] as const,
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
} as const;

// ============================================
// TYPE EXPORTS
// ============================================

export type QueryKeys = typeof queryKeys;
export type StaleTimes = typeof staleTimes;
