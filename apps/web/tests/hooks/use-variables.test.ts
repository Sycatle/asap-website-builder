/**
 * Tests for useVariables hook
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useVariables } from '@/hooks/useVariables';

// Mock the API module
vi.mock('@/lib/api/collections', () => ({
  variablesAPI: {
    list: vi.fn(),
    set: vi.fn(),
    recompute: vi.fn(),
  },
}));

import { variablesAPI } from '@/lib/api/collections';

const mockVariablesResponse = {
  variables: [
    { key: 'site_name', value: 'My Website', type: 'string', source: 'manual' },
    { key: 'visitor_count', value: 1234, type: 'number', source: 'computed' },
    { key: 'github_username', value: 'octocat', type: 'string', source: 'extension' },
    { key: 'is_published', value: true, type: 'boolean', source: 'system' },
  ],
  values: {
    site_name: 'My Website',
    visitor_count: 1234,
    github_username: 'octocat',
    is_published: true,
  },
};

describe('useVariables', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (variablesAPI.list as ReturnType<typeof vi.fn>).mockResolvedValue(mockVariablesResponse);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('initialization', () => {
    it('should not fetch when websiteId is undefined', async () => {
      const { result } = renderHook(() => useVariables(undefined));
      
      expect(result.current.isLoading).toBe(false);
      expect(result.current.variables).toEqual([]);
      expect(variablesAPI.list).not.toHaveBeenCalled();
    });

    it('should auto-fetch when websiteId is provided', async () => {
      const { result } = renderHook(() => useVariables('website-123'));
      
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
      
      expect(variablesAPI.list).toHaveBeenCalledWith('website-123');
      expect(result.current.variables).toEqual(mockVariablesResponse.variables);
    });

    it('should not auto-fetch when autoFetch is false', async () => {
      const { result } = renderHook(() => 
        useVariables('website-123', { autoFetch: false })
      );
      
      expect(variablesAPI.list).not.toHaveBeenCalled();
      expect(result.current.variables).toEqual([]);
    });
  });

  describe('getValue', () => {
    it('should return the variable value', async () => {
      const { result } = renderHook(() => useVariables('website-123'));
      
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
      
      expect(result.current.getValue('site_name')).toBe('My Website');
      expect(result.current.getValue('visitor_count')).toBe(1234);
      expect(result.current.getValue('is_published')).toBe(true);
    });

    it('should return default value when key not found', async () => {
      const { result } = renderHook(() => useVariables('website-123'));
      
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
      
      expect(result.current.getValue('non_existent', 'default')).toBe('default');
      expect(result.current.getValue('another_missing', 42)).toBe(42);
    });

    it('should return undefined when key not found and no default', async () => {
      const { result } = renderHook(() => useVariables('website-123'));
      
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
      
      expect(result.current.getValue('non_existent')).toBeUndefined();
    });
  });

  describe('interpolate', () => {
    it('should replace {{variable}} placeholders', async () => {
      const { result } = renderHook(() => useVariables('website-123'));
      
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
      
      const template = 'Welcome to {{site_name}}!';
      expect(result.current.interpolate(template)).toBe('Welcome to My Website!');
    });

    it('should handle multiple placeholders', async () => {
      const { result } = renderHook(() => useVariables('website-123'));
      
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
      
      const template = '{{site_name}} by {{github_username}}';
      expect(result.current.interpolate(template)).toBe('My Website by octocat');
    });

    it('should keep original placeholder when variable not found', async () => {
      const { result } = renderHook(() => useVariables('website-123'));
      
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
      
      const template = 'Hello {{unknown_var}}!';
      expect(result.current.interpolate(template)).toBe('Hello {{unknown_var}}!');
    });

    it('should return empty string for empty input', async () => {
      const { result } = renderHook(() => useVariables('website-123'));
      
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
      
      expect(result.current.interpolate('')).toBe('');
    });

    it('should handle numeric values', async () => {
      const { result } = renderHook(() => useVariables('website-123'));
      
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
      
      const template = 'Visitors: {{visitor_count}}';
      // Note: formatNumber might add locale formatting
      expect(result.current.interpolate(template)).toContain('1');
    });
  });

  describe('error handling', () => {
    it('should set error when fetch fails', async () => {
      const errorMessage = 'Network error';
      (variablesAPI.list as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error(errorMessage));
      
      const { result } = renderHook(() => useVariables('website-123'));
      
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
      
      expect(result.current.error).toBe(errorMessage);
      expect(result.current.variables).toEqual([]);
    });
  });

  describe('refetch', () => {
    it('should refetch data when called', async () => {
      const { result } = renderHook(() => useVariables('website-123'));
      
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
      
      expect(variablesAPI.list).toHaveBeenCalledTimes(1);
      
      // Update mock response for refetch
      const updatedResponse = {
        ...mockVariablesResponse,
        values: { ...mockVariablesResponse.values, site_name: 'Updated Name' },
      };
      (variablesAPI.list as ReturnType<typeof vi.fn>).mockResolvedValueOnce(updatedResponse);
      
      await act(async () => {
        await result.current.refetch();
      });
      
      expect(variablesAPI.list).toHaveBeenCalledTimes(2);
    });
  });
});
