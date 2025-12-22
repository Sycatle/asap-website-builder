import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { authAPI } from '../api';
import { queryKeys, staleTimes } from './queryKeys';
import type { MeResponse } from '../types';

// ============================================
// USER/AUTH QUERIES
// ============================================

/**
 * Hook to fetch current user info
 */
export function useUserQuery(
  options?: Omit<UseQueryOptions<MeResponse, Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: queryKeys.user.me(),
    queryFn: () => authAPI.me(),
    staleTime: staleTimes.user,
    // Don't retry on 401 errors (not authenticated)
    retry: (failureCount, error) => {
      if (error instanceof Error && error.message.includes('401')) {
        return false;
      }
      return failureCount < 1;
    },
    ...options,
  });
}
