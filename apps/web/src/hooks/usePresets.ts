import { useEffect, useCallback, useRef, useState } from 'react';
import { presetsAPI, type Preset, type CreateWebsiteFromPresetRequest, type CreateWebsiteFromPresetResponse } from '../lib/api';

// ============================================
// usePresets - Hook for presets list
// ============================================

interface UsePresetsOptions {
  autoFetch?: boolean;
}

interface UsePresetsReturn {
  presets: Preset[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<Preset[]>;
}

export function usePresets(options: UsePresetsOptions = {}): UsePresetsReturn {
  const { autoFetch = true } = options;
  
  const [presets, setPresets] = useState<Preset[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const hasFetched = useRef(false);

  const fetchPresets = useCallback(async (): Promise<Preset[]> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const data = await presetsAPI.list();
      setPresets(data);
      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch presets';
      setError(message);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (autoFetch && !hasFetched.current) {
      hasFetched.current = true;
      fetchPresets();
    }
  }, [autoFetch, fetchPresets]);

  return {
    presets,
    isLoading,
    error,
    refetch: fetchPresets,
  };
}

// ============================================
// useCreateWebsiteFromPreset - Hook for creating website from preset
// ============================================

interface UseCreateWebsiteFromPresetReturn {
  createWebsite: (data: CreateWebsiteFromPresetRequest) => Promise<CreateWebsiteFromPresetResponse>;
  isCreating: boolean;
  error: string | null;
}

export function useCreateWebsiteFromPreset(): UseCreateWebsiteFromPresetReturn {
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createWebsite = useCallback(async (data: CreateWebsiteFromPresetRequest): Promise<CreateWebsiteFromPresetResponse> => {
    setIsCreating(true);
    setError(null);
    
    try {
      const response = await presetsAPI.createWebsiteFromPreset(data);
      return response;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create website';
      setError(message);
      throw err;
    } finally {
      setIsCreating(false);
    }
  }, []);

  return {
    createWebsite,
    isCreating,
    error,
  };
}
