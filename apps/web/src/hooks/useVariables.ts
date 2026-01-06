/**
 * useVariables - Hook for fetching and managing website variables
 * 
 * Provides variable data with interpolation support for template strings.
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { variablesAPI } from '@/lib/api/collections';
import type { WebsiteVariable, VariableType } from '@asap/shared';

// ============================================
// Types
// ============================================

export interface UseVariablesOptions {
  /** Auto-fetch on mount */
  autoFetch?: boolean;
}

export interface UseVariablesReturn {
  /** All variables */
  variables: WebsiteVariable[];
  /** Quick lookup map: key → value */
  values: Record<string, unknown>;
  /** Loading state */
  isLoading: boolean;
  /** Error message */
  error: string | null;
  /** Get a variable value by key */
  getValue: <T = unknown>(key: string, defaultValue?: T) => T;
  /** Interpolate variables in a template string */
  interpolate: (template: string) => string;
  /** Set a manual variable value */
  setValue: (key: string, value: unknown) => Promise<void>;
  /** Refetch variables */
  refetch: () => Promise<void>;
  /** Recompute all computed variables */
  recompute: () => Promise<void>;
  /** Check if any variables are stale */
  hasStaleVariables: boolean;
}

// ============================================
// Hook Implementation
// ============================================

export function useVariables(
  websiteId: string | undefined,
  options: UseVariablesOptions = {}
): UseVariablesReturn {
  const { autoFetch = true } = options;

  // State
  const [variables, setVariables] = useState<WebsiteVariable[]>([]);
  const [values, setValues] = useState<Record<string, unknown>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasFetched = useRef(false);

  // Fetch variables
  const fetchData = useCallback(async () => {
    if (!websiteId) return;

    try {
      setIsLoading(true);
      setError(null);

      const response = await variablesAPI.list(websiteId);
      setVariables(response.variables);
      setValues(response.values);
    } catch (err) {
      console.error('Failed to fetch variables:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch variables');
    } finally {
      setIsLoading(false);
    }
  }, [websiteId]);

  // Get a variable value
  const getValue = useCallback(<T = unknown>(key: string, defaultValue?: T): T => {
    const value = values[key];
    return (value !== undefined ? value : defaultValue) as T;
  }, [values]);

  // Interpolate variables in a template string
  // Supports: {{variable_key}} syntax
  const interpolate = useCallback((template: string): string => {
    if (!template) return template;

    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      const value = values[key];
      if (value === undefined) return match; // Keep original if not found
      
      // Format value based on type
      if (typeof value === 'number') {
        return formatNumber(value);
      }
      return String(value);
    });
  }, [values]);

  // Set a variable value
  const setValue = useCallback(async (key: string, value: unknown) => {
    if (!websiteId) return;

    try {
      setError(null);
      const updated = await variablesAPI.set(websiteId, key, value);
      
      // Update local state
      setVariables(prev => 
        prev.map(v => v.key === key ? updated : v)
      );
      setValues(prev => ({ ...prev, [key]: updated.value }));
    } catch (err) {
      console.error('Failed to set variable:', err);
      setError(err instanceof Error ? err.message : 'Failed to set variable');
      throw err;
    }
  }, [websiteId]);

  // Recompute all computed variables
  const recompute = useCallback(async () => {
    if (!websiteId) return;

    try {
      setIsLoading(true);
      setError(null);

      await variablesAPI.recompute(websiteId);
      // Refetch to get updated values
      await fetchData();
    } catch (err) {
      console.error('Failed to recompute variables:', err);
      setError(err instanceof Error ? err.message : 'Failed to recompute variables');
    } finally {
      setIsLoading(false);
    }
  }, [websiteId, fetchData]);

  // Auto-fetch on mount
  useEffect(() => {
    if (autoFetch && websiteId && !hasFetched.current) {
      hasFetched.current = true;
      fetchData();
    }
  }, [autoFetch, websiteId, fetchData]);

  // Check for stale variables
  const hasStaleVariables = useMemo(() => 
    variables.some(v => v.stale),
    [variables]
  );

  return {
    variables,
    values,
    isLoading,
    error,
    getValue,
    interpolate,
    setValue,
    refetch: fetchData,
    recompute,
    hasStaleVariables,
  };
}

// ============================================
// Utility Functions
// ============================================

/**
 * Format a number for display (with locale separators)
 */
function formatNumber(value: number): string {
  return new Intl.NumberFormat('fr-FR').format(value);
}

/**
 * Parse a variable type value
 */
export function parseVariableValue(
  value: string,
  type: VariableType
): unknown {
  switch (type) {
    case 'number':
      return parseFloat(value);
    case 'boolean':
      return value === 'true';
    case 'date':
    case 'datetime':
      return new Date(value).toISOString();
    case 'json':
      return JSON.parse(value);
    default:
      return value;
  }
}

/**
 * Format a variable value for display
 */
export function formatVariableValue(
  value: unknown,
  type: VariableType
): string {
  if (value === null || value === undefined) return '';
  
  switch (type) {
    case 'number':
      return formatNumber(value as number);
    case 'boolean':
      return value ? 'Oui' : 'Non';
    case 'date':
      return new Date(value as string).toLocaleDateString('fr-FR');
    case 'datetime':
      return new Date(value as string).toLocaleString('fr-FR');
    case 'json':
      return JSON.stringify(value, null, 2);
    default:
      return String(value);
  }
}
