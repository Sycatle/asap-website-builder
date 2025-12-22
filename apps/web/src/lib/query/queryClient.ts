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

// Re-export queryKeys and staleTimes from dedicated file
export { queryKeys, staleTimes } from './queryKeys';
