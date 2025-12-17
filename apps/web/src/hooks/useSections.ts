import { useEffect, useCallback, useRef, useState } from 'react';
import { sectionsAPI, type Section, type CreateSectionRequest, type UpdateSectionRequest } from '../lib/api';

// Re-export types and constants from @asap/shared
export type { SectionType } from '@asap/shared';
export {
  SECTION_TYPES,
  SECTION_LAYOUTS,
  getSectionLabel,
  getSectionDescription,
  getLayoutsForType,
  type SectionTypeDefinition,
  type LayoutDefinition,
} from '@asap/shared';

// For backward compatibility, also export as SectionTypeValue
export type { SectionType as SectionTypeValue } from '@asap/shared';

// ============================================
// useSections - Hook for managing website sections
// ============================================

interface UseSectionsOptions {
  autoFetch?: boolean;
}

interface UseSectionsReturn {
  sections: Section[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<Section[]>;
  createSection: (data: CreateSectionRequest) => Promise<Section>;
  updateSection: (sectionId: string, data: UpdateSectionRequest) => Promise<Section>;
  deleteSection: (sectionId: string) => Promise<void>;
  reorderSections: (sectionIds: string[]) => Promise<void>;
  isCreating: boolean;
  isUpdating: boolean;
  isDeleting: boolean;
  isReordering: boolean;
}

export function useSections(websiteId: string | null, options: UseSectionsOptions = {}): UseSectionsReturn {
  const { autoFetch = true } = options;
  
  const [sections, setSections] = useState<Section[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isReordering, setIsReordering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const hasFetched = useRef(false);

  const fetchSections = useCallback(async (): Promise<Section[]> => {
    if (!websiteId) return [];
    
    setIsLoading(true);
    setError(null);
    
    try {
      const data = await sectionsAPI.list(websiteId);
      setSections(data);
      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Échec du chargement des sections';
      setError(message);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [websiteId]);

  useEffect(() => {
    if (autoFetch && websiteId && !hasFetched.current) {
      hasFetched.current = true;
      fetchSections();
    }
  }, [autoFetch, websiteId, fetchSections]);

  // Reset when websiteId changes
  useEffect(() => {
    hasFetched.current = false;
    setSections([]);
    setError(null);
  }, [websiteId]);

  const createSection = useCallback(async (data: CreateSectionRequest): Promise<Section> => {
    if (!websiteId) throw new Error('No website selected');
    
    setIsCreating(true);
    setError(null);
    
    try {
      const newSection = await sectionsAPI.create(websiteId, data);
      setSections(prev => [...prev, newSection].sort((a, b) => a.order - b.order));
      return newSection;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create section';
      setError(message);
      throw err;
    } finally {
      setIsCreating(false);
    }
  }, [websiteId]);

  const updateSection = useCallback(async (sectionId: string, data: UpdateSectionRequest): Promise<Section> => {
    if (!websiteId) throw new Error('No website selected');
    
    setIsUpdating(true);
    setError(null);
    
    try {
      const updatedSection = await sectionsAPI.update(websiteId, sectionId, data);
      setSections(prev => prev.map(s => s.id === sectionId ? updatedSection : s));
      return updatedSection;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update section';
      setError(message);
      throw err;
    } finally {
      setIsUpdating(false);
    }
  }, [websiteId]);

  const deleteSection = useCallback(async (sectionId: string): Promise<void> => {
    if (!websiteId) throw new Error('No website selected');
    
    setIsDeleting(true);
    setError(null);
    
    try {
      await sectionsAPI.delete(websiteId, sectionId);
      setSections(prev => prev.filter(s => s.id !== sectionId));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete section';
      setError(message);
      throw err;
    } finally {
      setIsDeleting(false);
    }
  }, [websiteId]);

  const reorderSections = useCallback(async (sectionIds: string[]): Promise<void> => {
    if (!websiteId) throw new Error('No website selected');
    
    setIsReordering(true);
    setError(null);
    
    // Optimistically update UI
    setSections(prev => {
      const sectionMap = new Map(prev.map(s => [s.id, s]));
      return sectionIds
        .map((id, index) => {
          const section = sectionMap.get(id);
          return section ? { ...section, order: index } : null;
        })
        .filter((s): s is Section => s !== null);
    });
    
    try {
      await sectionsAPI.reorder(websiteId, { section_ids: sectionIds });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to reorder sections';
      setError(message);
      // Revert on error
      await fetchSections();
      throw err;
    } finally {
      setIsReordering(false);
    }
  }, [websiteId, fetchSections]);

  return {
    sections,
    isLoading,
    error,
    refetch: fetchSections,
    createSection,
    updateSection,
    deleteSection,
    reorderSections,
    isCreating,
    isUpdating,
    isDeleting,
    isReordering,
  };
}
