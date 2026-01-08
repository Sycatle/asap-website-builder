/**
 * Tests for useCollections hook
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useCollections } from '@/hooks/useCollections';

// Mock the API module
vi.mock('@/lib/api/collections', () => ({
  collectionsAPI: {
    list: vi.fn(),
    get: vi.fn(),
    sync: vi.fn(),
  },
}));

import { collectionsAPI } from '@/lib/api/collections';

const mockCollectionsList = {
  collections: [
    { 
      slug: 'github_repos', 
      name: 'GitHub Repositories', 
      total_count: 15,
      source_extension: 'github-sync',
      sync_status: 'synced',
    },
    { 
      slug: 'blog_posts', 
      name: 'Blog Posts', 
      total_count: 8,
      source_extension: null,
      sync_status: 'idle',
    },
  ],
};

const mockCollectionDetail = {
  slug: 'github_repos',
  name: 'GitHub Repositories',
  total_count: 15,
  source_extension: 'github-sync',
  sync_status: 'synced' as const,
  items: [
    { id: '1', data: { name: 'repo-1', stars: 100 } },
    { id: '2', data: { name: 'repo-2', stars: 50 } },
  ],
};

describe('useCollections', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (collectionsAPI.list as ReturnType<typeof vi.fn>).mockResolvedValue(mockCollectionsList);
    (collectionsAPI.get as ReturnType<typeof vi.fn>).mockResolvedValue(mockCollectionDetail);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('initialization', () => {
    it('should not fetch when websiteId is undefined', async () => {
      const { result } = renderHook(() => useCollections(undefined));
      
      expect(result.current.isLoading).toBe(false);
      expect(result.current.collections).toEqual([]);
      expect(collectionsAPI.list).not.toHaveBeenCalled();
    });

    it('should auto-fetch collection list when websiteId provided', async () => {
      const { result } = renderHook(() => useCollections('website-123'));
      
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
      
      expect(collectionsAPI.list).toHaveBeenCalledWith('website-123');
      expect(result.current.collections).toEqual(mockCollectionsList.collections);
    });

    it('should fetch single collection when slug provided', async () => {
      const { result } = renderHook(() => 
        useCollections('website-123', { slug: 'github_repos' })
      );
      
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
      
      expect(collectionsAPI.get).toHaveBeenCalledWith(
        'website-123', 
        'github_repos',
        expect.any(Object)
      );
      expect(result.current.collection).toEqual(mockCollectionDetail);
    });

    it('should not auto-fetch when autoFetch is false', async () => {
      const { result } = renderHook(() => 
        useCollections('website-123', { autoFetch: false })
      );
      
      expect(collectionsAPI.list).not.toHaveBeenCalled();
      expect(result.current.collections).toEqual([]);
    });
  });

  describe('items accessor', () => {
    it('should return items from collection', async () => {
      const { result } = renderHook(() => 
        useCollections('website-123', { slug: 'github_repos' })
      );
      
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
      
      expect(result.current.items).toEqual(mockCollectionDetail.items);
    });

    it('should return empty array when no collection', async () => {
      const { result } = renderHook(() => useCollections('website-123'));
      
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
      
      expect(result.current.items).toEqual([]);
    });
  });

  describe('sync', () => {
    it('should trigger sync and refetch on success', async () => {
      (collectionsAPI.sync as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        status: 'completed',
        message: 'Sync completed',
      });
      
      const { result } = renderHook(() => 
        useCollections('website-123', { slug: 'github_repos' })
      );
      
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
      
      await act(async () => {
        await result.current.sync();
      });
      
      expect(collectionsAPI.sync).toHaveBeenCalledWith('website-123', 'github_repos');
      // Should have refetched after sync (initial + after sync)
      expect(collectionsAPI.get).toHaveBeenCalled();
      expect((collectionsAPI.get as ReturnType<typeof vi.fn>).mock.calls.length).toBeGreaterThanOrEqual(2);
    });

    it('should set error on sync failure', async () => {
      (collectionsAPI.sync as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        status: 'error',
        message: 'Sync failed: API limit reached',
      });
      
      const { result } = renderHook(() => 
        useCollections('website-123', { slug: 'github_repos' })
      );
      
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
      
      await act(async () => {
        await result.current.sync();
      });
      
      expect(result.current.syncStatus).toBe('error');
      expect(result.current.error).toBe('Sync failed: API limit reached');
    });

    it('should not sync when no slug provided', async () => {
      const { result } = renderHook(() => useCollections('website-123'));
      
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
      
      await act(async () => {
        await result.current.sync();
      });
      
      expect(collectionsAPI.sync).not.toHaveBeenCalled();
    });
  });

  describe('query params', () => {
    it('should pass query params to API', async () => {
      const { result } = renderHook(() => 
        useCollections('website-123', { 
          slug: 'github_repos',
          limit: 10,
          offset: 5,
        })
      );
      
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
      
      expect(collectionsAPI.get).toHaveBeenCalledWith(
        'website-123', 
        'github_repos',
        expect.objectContaining({
          limit: 10,
          offset: 5,
        })
      );
    });

    it('should allow updating query params', async () => {
      const { result } = renderHook(() => 
        useCollections('website-123', { slug: 'github_repos' })
      );
      
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
      
      act(() => {
        result.current.setQueryParams({ limit: 20 });
      });
      
      // Should trigger a refetch with new params
      await waitFor(() => {
        expect((collectionsAPI.get as ReturnType<typeof vi.fn>).mock.calls.length).toBeGreaterThanOrEqual(2);
      });
    });
  });

  describe('error handling', () => {
    it('should set error when list fetch fails', async () => {
      const errorMessage = 'Network error';
      (collectionsAPI.list as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error(errorMessage));
      
      const { result } = renderHook(() => useCollections('website-123'));
      
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
      
      expect(result.current.error).toBe(errorMessage);
      expect(result.current.collections).toEqual([]);
    });

    it('should set error when get fetch fails', async () => {
      const errorMessage = 'Collection not found';
      (collectionsAPI.get as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error(errorMessage));
      
      const { result } = renderHook(() => 
        useCollections('website-123', { slug: 'unknown' })
      );
      
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
      
      expect(result.current.error).toBe(errorMessage);
      // Note: collection might retain previous value or be null depending on implementation
    });
  });

  describe('refetch', () => {
    it('should refetch data when called', async () => {
      const { result } = renderHook(() => useCollections('website-123'));
      
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
      
      expect(collectionsAPI.list).toHaveBeenCalledTimes(1);
      
      await act(async () => {
        await result.current.refetch();
      });
      
      expect(collectionsAPI.list).toHaveBeenCalledTimes(2);
    });
  });
});
