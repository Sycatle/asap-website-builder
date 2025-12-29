import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ReactNode } from 'react';

// Create a wrapper with QueryClient for testing hooks
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },
  });
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );
  };
}

// Mock the API module
vi.mock('@/lib/api', () => ({
  websitesAPI: {
    list: vi.fn(),
    get: vi.fn(),
    getData: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    publish: vi.fn(),
    updateData: vi.fn(),
  },
}));

describe('React Query Hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Query Client Configuration', () => {
    it('should create a query client with proper defaults', async () => {
      const { queryClient } = await import('@/lib/query/queryClient');
      
      expect(queryClient).toBeDefined();
      const defaults = queryClient.getDefaultOptions();
      expect(defaults.queries?.staleTime).toBeDefined();
    });

    it('should have proper query keys defined', async () => {
      const { queryKeys } = await import('@/lib/query/queryKeys');
      
      expect(queryKeys.websites.all).toEqual(['websites']);
      expect(queryKeys.websites.detail('123')).toEqual(['websites', 'detail', '123']);
      expect(queryKeys.extensions.catalog()).toEqual(['extensions', 'catalog']);
      expect(queryKeys.files.all).toEqual(['files']);
    });
  });

  describe('useWebsitesQuery', () => {
    it('should fetch websites list', async () => {
      const mockWebsites = [
        { id: '1', name: 'Site 1', account_id: 'acc-1', slug: 'site-1', title: 'Site 1', tagline: '', status: 'draft' as const, creation_mode: 'from_scratch' as const, metadata: {}, data: {} },
        { id: '2', name: 'Site 2', account_id: 'acc-2', slug: 'site-2', title: 'Site 2', tagline: '', status: 'published' as const, creation_mode: 'from_preset' as const, metadata: {}, data: {} },
      ];

      const { websitesAPI } = await import('@/lib/api');
      vi.mocked(websitesAPI.list).mockResolvedValue(mockWebsites);

      const { useWebsitesQuery } = await import('@/lib/query/websites');
      
      const { result } = renderHook(() => useWebsitesQuery(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockWebsites);
      expect(websitesAPI.list).toHaveBeenCalledTimes(1);
    });

    it('should handle error state', async () => {
      const { websitesAPI } = await import('@/lib/api');
      vi.mocked(websitesAPI.list).mockRejectedValue(new Error('Network error'));

      const { useWebsitesQuery } = await import('@/lib/query/websites');
      
      const { result } = renderHook(() => useWebsitesQuery(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toBeDefined();
    });
  });

  describe('useWebsiteQuery', () => {
    it('should fetch a single website by ID', async () => {
      const mockWebsite = { id: 'ws-123', name: 'My Website', account_id: 'acc-1', slug: 'my-website', title: 'My Website', tagline: '', status: 'draft' as const, creation_mode: 'from_scratch' as const, metadata: {}, data: {} };

      const { websitesAPI } = await import('@/lib/api');
      vi.mocked(websitesAPI.get).mockResolvedValue(mockWebsite);

      const { useWebsiteQuery } = await import('@/lib/query/websites');
      
      const { result } = renderHook(() => useWebsiteQuery('ws-123'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockWebsite);
      expect(websitesAPI.get).toHaveBeenCalledWith('ws-123');
    });

    it('should not fetch when websiteId is undefined', async () => {
      const { websitesAPI } = await import('@/lib/api');
      const { useWebsiteQuery } = await import('@/lib/query/websites');
      
      const { result } = renderHook(() => useWebsiteQuery(undefined), {
        wrapper: createWrapper(),
      });

      // Should stay in idle state
      expect(result.current.fetchStatus).toBe('idle');
      expect(websitesAPI.get).not.toHaveBeenCalled();
    });
  });
});
