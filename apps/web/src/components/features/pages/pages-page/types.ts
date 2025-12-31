"use client"

import type { Page, CreatePageRequest } from "@/lib/types";

// ============================================================================
// Constants
// ============================================================================

export const PUBLIC_DOMAIN = 'asap.cool';

// ============================================================================
// Stats Types
// ============================================================================

export interface PageStats {
  total: number;
  published: number;
  draft: number;
  homepage: number;
}

// ============================================================================
// Form Data
// ============================================================================

export interface PageFormData extends CreatePageRequest {
  // CreatePageRequest already includes:
  // slug, title, description, is_homepage, visible
}

// ============================================================================
// Drag State
// ============================================================================

export interface DragState {
  draggedPageId: string | null;
  dragOverPageId: string | null;
}

// ============================================================================
// Dialog State
// ============================================================================

export interface DialogState {
  createDialogOpen: boolean;
  editDialogOpen: boolean;
  deleteDialogOpen: boolean;
}

// ============================================================================
// Component Props
// ============================================================================

export interface StatsCardsProps {
  stats: PageStats;
}

export interface PageListItemProps {
  page: Page;
  websiteSlug: string | undefined;
  draggedPageId: string | null;
  dragOverPageId: string | null;
  onDragStart: (e: React.DragEvent, pageId: string) => void;
  onDragOver: (e: React.DragEvent, pageId: string) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent, pageId: string) => void;
  onDragEnd: () => void;
  onEdit: (page: Page) => void;
  onDuplicate: (page: Page) => void;
  onToggleVisibility: (page: Page) => void;
  onDelete: (page: Page) => void;
}

export interface PageListProps {
  pages: Page[];
  searchQuery: string;
  websiteSlug: string | undefined;
  draggedPageId: string | null;
  dragOverPageId: string | null;
  onDragStart: (e: React.DragEvent, pageId: string) => void;
  onDragOver: (e: React.DragEvent, pageId: string) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent, pageId: string) => void;
  onDragEnd: () => void;
  onEdit: (page: Page) => void;
  onDuplicate: (page: Page) => void;
  onToggleVisibility: (page: Page) => void;
  onDelete: (page: Page) => void;
  onCreateNew: () => void;
}

export interface CreatePageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  formData: PageFormData;
  onFormDataChange: (data: PageFormData) => void;
  onSubmit: () => void;
}

export interface EditPageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  formData: PageFormData;
  onFormDataChange: (data: PageFormData) => void;
  onSubmit: () => void;
}

export interface DeletePageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedPage: Page | null;
  onConfirm: () => void;
}

// Re-export for convenience
export type { Page, CreatePageRequest, UpdatePageRequest } from "@/lib/types";
