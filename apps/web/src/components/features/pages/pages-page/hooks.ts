"use client"

import { useState, useCallback } from 'react';
import { toast } from "sonner";
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
  const createPageMutation = useCreatePageMutation();
  const updatePageMutation = useUpdatePageMutation();
  const deletePageMutation = useDeletePageMutation();
  const reorderPagesMutation = useReorderPagesMutation();

  const handleCreate = useCallback(async (
    formData: PageFormData,
    onSuccess: () => void
  ) => {
    if (!formData.title.trim()) {
      toast.error("Le titre est requis");
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
      
      toast.success(`Page "${formData.title}" créée avec succès`);
      
      onSuccess();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Impossible de créer la page");
    }
  }, [websiteId, createPageMutation]);

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
      
      toast.success(`Page "${formData.title}" mise à jour`);
      
      onSuccess();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Impossible de modifier la page");
    }
  }, [websiteId, updatePageMutation]);

  const handleDelete = useCallback(async (page: Page, onSuccess: () => void) => {
    if (!websiteId) return;

    try {
      await deletePageMutation.mutateAsync({ 
        websiteId, 
        pageId: page.id 
      });
      
      toast.success(`Page "${page.title}" supprimée`);
      
      onSuccess();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Impossible de supprimer la page");
    }
  }, [websiteId, deletePageMutation]);

  const handleToggleVisibility = useCallback(async (page: Page) => {
    if (!websiteId) return;
    const newVisibility = !page.visible;
    try {
      await updatePageMutation.mutateAsync({ 
        websiteId, 
        pageId: page.id, 
        data: { visible: newVisibility } 
      });
      toast.success(`Page "${page.title}" ${newVisibility ? 'visible' : 'masquée'}`);
    } catch (error) {
      toast.error("Impossible de modifier la visibilité");
    }
  }, [websiteId, updatePageMutation]);

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
      toast.success(`Page "${page.title}" dupliquée`);
    } catch (error) {
      toast.error("Impossible de dupliquer la page");
    }
  }, [websiteId, createPageMutation]);

  const handleReorder = useCallback(async (pageIds: string[]) => {
    if (!websiteId) return;
    try {
      await reorderPagesMutation.mutateAsync({ websiteId, pageIds });
      toast.success("Ordre des pages mis à jour");
    } catch (error) {
      toast.error("Impossible de réorganiser les pages");
    }
  }, [websiteId, reorderPagesMutation]);

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
