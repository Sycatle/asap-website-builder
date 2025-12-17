import { useEffect, useCallback, useRef, useState } from 'react';
import { elementsAPI, type WebsiteElement, type CreateElementRequest, type UpdateElementRequest } from '../lib/api';

// Re-export types and constants from @asap/shared
export type { ElementType } from '@asap/shared';
export {
  ELEMENT_TYPES,
  ELEMENT_LAYOUTS,
  getElementLabel,
  getElementDescription,
  getLayoutsForType,
  type ElementTypeDefinition,
  type LayoutDefinition,
} from '@asap/shared';

// ============================================
// useElements - Hook for managing website elements
// ============================================

interface UseElementsOptions {
  autoFetch?: boolean;
}

interface UseElementsReturn {
  elements: WebsiteElement[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<WebsiteElement[]>;
  createElement: (data: CreateElementRequest) => Promise<WebsiteElement>;
  updateElement: (elementId: string, data: UpdateElementRequest) => Promise<WebsiteElement>;
  deleteElement: (elementId: string) => Promise<void>;
  reorderElements: (elementIds: string[]) => Promise<void>;
  isCreating: boolean;
  isUpdating: boolean;
  isDeleting: boolean;
  isReordering: boolean;
}

export function useElements(websiteId: string | null, options: UseElementsOptions = {}): UseElementsReturn {
  const { autoFetch = true } = options;
  
  const [elements, setElements] = useState<WebsiteElement[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isReordering, setIsReordering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const hasFetched = useRef(false);

  const fetchElements = useCallback(async (): Promise<WebsiteElement[]> => {
    if (!websiteId) return [];
    
    setIsLoading(true);
    setError(null);
    
    try {
      const data = await elementsAPI.list(websiteId);
      setElements(data);
      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Échec du chargement des éléments';
      setError(message);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [websiteId]);

  useEffect(() => {
    if (autoFetch && websiteId && !hasFetched.current) {
      hasFetched.current = true;
      fetchElements();
    }
  }, [autoFetch, websiteId, fetchElements]);

  // Reset when websiteId changes
  useEffect(() => {
    hasFetched.current = false;
    setElements([]);
    setError(null);
  }, [websiteId]);

  const createElement = useCallback(async (data: CreateElementRequest): Promise<WebsiteElement> => {
    if (!websiteId) throw new Error('No website selected');
    
    setIsCreating(true);
    setError(null);
    
    try {
      const newElement = await elementsAPI.create(websiteId, data);
      setElements(prev => [...prev, newElement].sort((a, b) => a.order - b.order));
      return newElement;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create element';
      setError(message);
      throw err;
    } finally {
      setIsCreating(false);
    }
  }, [websiteId]);

  const updateElement = useCallback(async (elementId: string, data: UpdateElementRequest): Promise<WebsiteElement> => {
    if (!websiteId) throw new Error('No website selected');
    
    setIsUpdating(true);
    setError(null);
    
    try {
      const updatedElement = await elementsAPI.update(websiteId, elementId, data);
      setElements(prev => prev.map(e => e.id === elementId ? updatedElement : e));
      return updatedElement;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update element';
      setError(message);
      throw err;
    } finally {
      setIsUpdating(false);
    }
  }, [websiteId]);

  const deleteElement = useCallback(async (elementId: string): Promise<void> => {
    if (!websiteId) throw new Error('No website selected');
    
    setIsDeleting(true);
    setError(null);
    
    try {
      await elementsAPI.delete(websiteId, elementId);
      setElements(prev => prev.filter(e => e.id !== elementId));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete element';
      setError(message);
      throw err;
    } finally {
      setIsDeleting(false);
    }
  }, [websiteId]);

  const reorderElements = useCallback(async (elementIds: string[]): Promise<void> => {
    if (!websiteId) throw new Error('No website selected');
    
    setIsReordering(true);
    setError(null);
    
    // Optimistically update UI
    setElements(prev => {
      const elementMap = new Map(prev.map(e => [e.id, e]));
      return elementIds
        .map((id, index) => {
          const element = elementMap.get(id);
          return element ? { ...element, order: index } : null;
        })
        .filter((e): e is WebsiteElement => e !== null);
    });
    
    try {
      await elementsAPI.reorder(websiteId, { element_ids: elementIds });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to reorder elements';
      setError(message);
      // Revert on error
      await fetchElements();
      throw err;
    } finally {
      setIsReordering(false);
    }
  }, [websiteId, fetchElements]);

  return {
    elements,
    isLoading,
    error,
    refetch: fetchElements,
    createElement,
    updateElement,
    deleteElement,
    reorderElements,
    isCreating,
    isUpdating,
    isDeleting,
    isReordering,
  };
}
