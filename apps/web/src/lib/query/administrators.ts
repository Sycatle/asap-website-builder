import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { apiClient } from '../api';
import { queryKeys, staleTimes } from './queryKeys';

// ============================================
// ADMINISTRATOR TYPES
// ============================================

export interface Administrator {
  id: string;
  email: string;
  name?: string;
  avatar?: string;
  role: string;
  permissions: Record<string, any>;
  status: string;
  invited_at: string;
  accepted_at?: string;
  last_access_at?: string;
}

export interface AdministratorsResponse {
  administrators: Administrator[];
  total: number;
}

// ============================================
// ADMINISTRATORS QUERIES
// ============================================

/**
 * Hook to fetch administrators for a website
 */
export function useAdministratorsQuery(
  websiteId: string | null | undefined,
  options?: Omit<UseQueryOptions<Administrator[], Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: queryKeys.administrators.list(websiteId || ''),
    queryFn: async () => {
      if (!websiteId) return [];
      const response = await apiClient.get<AdministratorsResponse>(
        `/websites/${websiteId}/administrators`
      );
      return response.administrators;
    },
    enabled: !!websiteId,
    staleTime: staleTimes.extensions, // Use similar stale time as extensions
    ...options,
  });
}
