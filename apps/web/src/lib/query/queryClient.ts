import { QueryClient } from '@tanstack/react-query';

// ============================================
// QUERY CLIENT CONFIGURATION
// ============================================

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Stale time - how long data is considered fresh
      staleTime: 2 * 60 * 1000, // 2 minutes
      
      // Cache time - how long inactive data stays in cache
      gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
      
      // Retry configuration
      retry: 1,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
      
      // Refetch configuration
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
      refetchOnMount: true,
      
      // Network mode
      networkMode: 'offlineFirst',
    },
    mutations: {
      // Retry mutations once on failure
      retry: 1,
      
      // Network mode
      networkMode: 'offlineFirst',
    },
  },
});

// ============================================
// QUERY KEYS
// ============================================

export const queryKeys = {
  // User
  user: ['user'] as const,
  
  // Websites
  websites: ['websites'] as const,
  website: (id: string) => ['websites', id] as const,
  websiteData: (id: string) => ['websites', id, 'data'] as const,
  
  // Extensions
  extensionCatalog: ['extensions', 'catalog'] as const,
  websiteExtensions: (websiteId: string) => ['extensions', 'website', websiteId] as const,
  extensionData: (websiteId: string, slug: string) => ['extensions', 'data', websiteId, slug] as const,
  
  // Quota
  quota: ['quota'] as const,
  
  // Files
  files: ['files'] as const,
  
  // Pages
  pages: (websiteId: string) => ['pages', websiteId] as const,
  page: (websiteId: string, pageId: string) => ['pages', websiteId, pageId] as const,
  
  // Elements
  elements: (websiteId: string, pageId: string) => ['elements', websiteId, pageId] as const,
  
  // Notifications
  notifications: ['notifications'] as const,
  notificationsUnreadCount: ['notifications', 'unread-count'] as const,
} as const;

// ============================================
// STALE TIMES (per query type)
// ============================================

export const staleTimes = {
  user: 5 * 60 * 1000,           // 5 minutes
  websites: 2 * 60 * 1000,       // 2 minutes
  extensions: 5 * 60 * 1000,     // 5 minutes
  extensionData: 1 * 60 * 1000,  // 1 minute
  quota: 30 * 1000,              // 30 seconds
  files: 1 * 60 * 1000,          // 1 minute
  pages: 2 * 60 * 1000,          // 2 minutes
  elements: 30 * 1000,           // 30 seconds (frequently edited)
  notifications: 1 * 60 * 1000,  // 1 minute
} as const;
