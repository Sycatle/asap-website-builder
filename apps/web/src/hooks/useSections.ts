import { useEffect, useCallback, useRef, useState } from 'react';
import { sectionsAPI, type Section, type CreateSectionRequest, type UpdateSectionRequest, type ReorderSectionsRequest } from '../lib/api';

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
      const message = err instanceof Error ? err.message : 'Failed to fetch sections';
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

// ============================================
// Section Types and Constants
// ============================================

export const SECTION_TYPES = [
  { value: 'hero', label: 'Hero', description: "Section d'accueil principale" },
  { value: 'about', label: 'À propos', description: 'Présentation personnelle/entreprise' },
  { value: 'projects', label: 'Projets', description: 'Galerie de projets' },
  { value: 'skills', label: 'Compétences', description: 'Compétences techniques' },
  { value: 'experience', label: 'Expérience', description: 'Parcours professionnel' },
  { value: 'education', label: 'Formation', description: 'Parcours éducatif' },
  { value: 'contact', label: 'Contact', description: 'Formulaire de contact' },
  { value: 'blog', label: 'Blog', description: 'Articles de blog' },
  { value: 'gallery', label: 'Galerie', description: "Galerie d'images" },
  { value: 'testimonials', label: 'Témoignages', description: 'Témoignages clients' },
  { value: 'services', label: 'Services', description: 'Services proposés' },
  { value: 'pricing', label: 'Tarifs', description: 'Grille tarifaire' },
  { value: 'faq', label: 'FAQ', description: 'Questions fréquentes' },
  { value: 'custom', label: 'Personnalisé', description: 'Section personnalisée' },
] as const;

export const SECTION_LAYOUTS: Record<string, { value: string; label: string }[]> = {
  hero: [{ value: 'full', label: 'Plein écran' }],
  about: [
    { value: 'full', label: 'Plein écran' },
    { value: 'split', label: 'Divisé' },
  ],
  projects: [
    { value: 'grid', label: 'Grille' },
    { value: 'cards', label: 'Cartes' },
  ],
  skills: [
    { value: 'grid', label: 'Grille' },
    { value: 'list', label: 'Liste' },
  ],
  experience: [
    { value: 'timeline', label: 'Chronologie' },
    { value: 'list', label: 'Liste' },
  ],
  education: [
    { value: 'timeline', label: 'Chronologie' },
    { value: 'list', label: 'Liste' },
  ],
  contact: [
    { value: 'full', label: 'Plein écran' },
    { value: 'split', label: 'Divisé' },
  ],
  blog: [
    { value: 'list', label: 'Liste' },
    { value: 'grid', label: 'Grille' },
  ],
  gallery: [{ value: 'grid', label: 'Grille' }],
  testimonials: [{ value: 'cards', label: 'Cartes' }],
  services: [
    { value: 'cards', label: 'Cartes' },
    { value: 'grid', label: 'Grille' },
  ],
  pricing: [{ value: 'cards', label: 'Cartes' }],
  faq: [{ value: 'list', label: 'Liste' }],
  custom: [
    { value: 'full', label: 'Plein écran' },
    { value: 'split', label: 'Divisé' },
    { value: 'grid', label: 'Grille' },
    { value: 'cards', label: 'Cartes' },
    { value: 'list', label: 'Liste' },
  ],
};

export function getLayoutsForType(sectionType: string): { value: string; label: string }[] {
  return SECTION_LAYOUTS[sectionType] || SECTION_LAYOUTS.custom;
}
