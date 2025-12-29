"use client"

import { useState, useCallback } from 'react';
import { useToast } from "@/hooks/use-toast";
import { 
  usePagesQuery, 
  useCreatePageMutation, 
  useUpdatePageMutation, 
  useDeletePageMutation,
  useReorderPagesMutation 
} from "@/lib/query";
import { slugify } from "@/lib/utils/formatters";
import type { Page, UpdatePageRequest } from "@/lib/types";
import type { PageFormData, PageStats, DragState, DialogState } from "./types";

// ============================================================================
// Initial Values
// ============================================================================

const initialFormData: PageFormData = {
  slug: '',
  title: '',
  description: '',
  is_homepage: false,
  visible: true,
};

// ============================================================================
// usePagesPageData Hook
// ============================================================================

export function usePagesPageData(websiteId: string | null) {
  const { data: pages = [], isLoading } = usePagesQuery(websiteId);

  // Calculate statistics
  const stats: PageStats = {
    total: pages.length,
    published: pages.filter(p => p.visible).length,
    draft: pages.filter(p => !p.visible).length,
    homepage: pages.filter(p => p.is_homepage).length,
  };

  return { pages, isLoading, stats };
}

// ============================================================================
// usePageForm Hook
// ============================================================================

export function usePageForm() {
  const [formData, setFormData] = useState<PageFormData>(initialFormData);

  const resetForm = useCallback(() => {
    setFormData(initialFormData);
  }, []);

  const updateFormData = useCallback((updates: Partial<PageFormData>) => {
    setFormData(prev => ({ ...prev, ...updates }));
  }, []);

  const setFormFromPage = useCallback((page: Page) => {
    setFormData({
      slug: page.slug,
      title: page.title,
      description: page.description,
      is_homepage: page.is_homepage,
      visible: page.visible,
    });
  }, []);

  return { formData, setFormData, resetForm, updateFormData, setFormFromPage };
}

// ============================================================================
// usePageDialogs Hook
// ============================================================================

export function usePageDialogs() {
  const [dialogState, setDialogState] = useState<DialogState>({
    createDialogOpen: false,
    editDialogOpen: false,
    deleteDialogOpen: false,
  });
  const [selectedPage, setSelectedPage] = useState<Page | null>(null);

  const openCreateDialog = useCallback(() => {
    setDialogState(prev => ({ ...prev, createDialogOpen: true }));
  }, []);

  const closeCreateDialog = useCallback(() => {
    setDialogState(prev => ({ ...prev, createDialogOpen: false }));
  }, []);

  const openEditDialog = useCallback((page: Page) => {
    setSelectedPage(page);
    setDialogState(prev => ({ ...prev, editDialogOpen: true }));
  }, []);

  const closeEditDialog = useCallback(() => {
    setDialogState(prev => ({ ...prev, editDialogOpen: false }));
    setSelectedPage(null);
  }, []);

  const openDeleteDialog = useCallback((page: Page) => {
    setSelectedPage(page);
    setDialogState(prev => ({ ...prev, deleteDialogOpen: true }));
  }, []);

  const closeDeleteDialog = useCallback(() => {
    setDialogState(prev => ({ ...prev, deleteDialogOpen: false }));
    setSelectedPage(null);
  }, []);

  return {
    ...dialogState,
    selectedPage,
    openCreateDialog,
    closeCreateDialog,
    openEditDialog,
    closeEditDialog,
    openDeleteDialog,
    closeDeleteDialog,
    setSelectedPage,
  };
}

// ============================================================================
// usePageMutations Hook
// ============================================================================

export function usePageMutations(websiteId: string | null) {
  const { toast } = useToast();
  const createPageMutation = useCreatePageMutation();
  const updatePageMutation = useUpdatePageMutation();
  const deletePageMutation = useDeletePageMutation();
  const reorderPagesMutation = useReorderPagesMutation();

  const handleCreate = useCallback(async (
    formData: PageFormData,
    onSuccess: () => void
  ) => {
    if (!formData.title.trim()) {
      toast({
        title: "Erreur",
        description: "Le titre est requis",
        variant: "destructive",
      });
      return;
    }

    try {
      if (!websiteId) return;
      const slug = formData.slug.trim() || slugify(formData.title);
      await createPageMutation.mutateAsync({
        websiteId,
        data: {
          ...formData,
          slug,
        },
      });
      
      toast({
        title: "Page créée",
        description: `La page "${formData.title}" a été créée avec succès`,
      });
      
      onSuccess();
    } catch (error) {
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Impossible de créer la page",
        variant: "destructive",
      });
    }
  }, [websiteId, createPageMutation, toast]);

  const handleEdit = useCallback(async (
    pageId: string,
    formData: PageFormData,
    onSuccess: () => void
  ) => {
    if (!formData.title.trim()) return;

    try {
      if (!websiteId) return;
      const updateData: UpdatePageRequest = {
        title: formData.title,
        slug: formData.slug,
        description: formData.description,
        is_homepage: formData.is_homepage,
        visible: formData.visible,
      };

      await updatePageMutation.mutateAsync({ 
        websiteId, 
        pageId, 
        data: updateData 
      });
      
      toast({
        title: "Page modifiée",
        description: `La page "${formData.title}" a été mise à jour`,
      });
      
      onSuccess();
    } catch (error) {
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Impossible de modifier la page",
        variant: "destructive",
      });
    }
  }, [websiteId, updatePageMutation, toast]);

  const handleDelete = useCallback(async (page: Page, onSuccess: () => void) => {
    if (!websiteId) return;

    try {
      await deletePageMutation.mutateAsync({ 
        websiteId, 
        pageId: page.id 
      });
      
      toast({
        title: "Page supprimée",
        description: `La page "${page.title}" a été supprimée`,
      });
      
      onSuccess();
    } catch (error) {
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Impossible de supprimer la page",
        variant: "destructive",
      });
    }
  }, [websiteId, deletePageMutation, toast]);

  const handleToggleVisibility = useCallback(async (page: Page) => {
    if (!websiteId) return;
    const newVisibility = !page.visible;
    try {
      await updatePageMutation.mutateAsync({ 
        websiteId, 
        pageId: page.id, 
        data: { visible: newVisibility } 
      });
      toast({
        title: newVisibility ? "Page visible" : "Page masquée",
        description: `La page "${page.title}" est maintenant ${newVisibility ? 'visible' : 'masquée'}`,
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de modifier la visibilité",
        variant: "destructive",
      });
    }
  }, [websiteId, updatePageMutation, toast]);

  const handleDuplicate = useCallback(async (page: Page) => {
    if (!websiteId) return;
    const timestamp = Date.now();
    try {
      await createPageMutation.mutateAsync({
        websiteId,
        data: {
          slug: `${page.slug}-copie-${timestamp}`,
          title: `${page.title} (copie)`,
          description: page.description,
          visible: false,
        },
      });
      toast({
        title: "Page dupliquée",
        description: `La page "${page.title}" a été dupliquée`,
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de dupliquer la page",
        variant: "destructive",
      });
    }
  }, [websiteId, createPageMutation, toast]);

  const handleReorder = useCallback(async (pageIds: string[]) => {
    if (!websiteId) return;
    try {
      await reorderPagesMutation.mutateAsync({ websiteId, pageIds });
      toast({
        title: "Ordre mis à jour",
        description: "L'ordre des pages a été modifié",
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de réorganiser les pages",
        variant: "destructive",
      });
    }
  }, [websiteId, reorderPagesMutation, toast]);

  return {
    handleCreate,
    handleEdit,
    handleDelete,
    handleToggleVisibility,
    handleDuplicate,
    handleReorder,
  };
}

// ============================================================================
// useDragAndDrop Hook
// ============================================================================

export function useDragAndDrop(
  pages: Page[],
  onReorder: (pageIds: string[]) => Promise<void>
) {
  const [dragState, setDragState] = useState<DragState>({
    draggedPageId: null,
    dragOverPageId: null,
  });

  const handleDragStart = useCallback((e: React.DragEvent, pageId: string) => {
    setDragState(prev => ({ ...prev, draggedPageId: pageId }));
    e.dataTransfer.effectAllowed = 'move';
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, pageId: string) => {
    e.preventDefault();
    setDragState(prev => {
      if (pageId !== prev.draggedPageId) {
        return { ...prev, dragOverPageId: pageId };
      }
      return prev;
    });
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragState(prev => ({ ...prev, dragOverPageId: null }));
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent, targetPageId: string) => {
    e.preventDefault();
    
    const { draggedPageId } = dragState;
    setDragState({ draggedPageId: null, dragOverPageId: null });

    if (!draggedPageId || draggedPageId === targetPageId) {
      return;
    }

    const draggedIndex = pages.findIndex(p => p.id === draggedPageId);
    const targetIndex = pages.findIndex(p => p.id === targetPageId);

    if (draggedIndex === -1 || targetIndex === -1) {
      return;
    }

    const newOrder = [...pages];
    const [draggedPage] = newOrder.splice(draggedIndex, 1);
    newOrder.splice(targetIndex, 0, draggedPage);

    const pageIds = newOrder.map(p => p.id);
    await onReorder(pageIds);
  }, [dragState, pages, onReorder]);

  const handleDragEnd = useCallback(() => {
    setDragState({ draggedPageId: null, dragOverPageId: null });
  }, []);

  return {
    ...dragState,
    handleDragStart,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleDragEnd,
  };
}

// ============================================================================
// useSearchFilter Hook
// ============================================================================

export function useSearchFilter(pages: Page[]) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredPages = pages.filter(page => 
    page.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    page.slug.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (page.description?.toLowerCase() || '').includes(searchQuery.toLowerCase())
  );

  return { searchQuery, setSearchQuery, filteredPages };
}
