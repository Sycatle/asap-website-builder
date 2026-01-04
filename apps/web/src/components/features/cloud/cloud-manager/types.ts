"use client"

import type { LucideIcon } from "lucide-react";
import type { FileMetadata, FileFolder, FileVisibility } from "@/lib/types";

// ============================================================================
// View Types
// ============================================================================

export type ViewMode = 'grid' | 'list';

// ============================================================================
// Upload Progress
// ============================================================================

export interface UploadProgress {
  total: number;
  completed: number;
  current: string;
}

// ============================================================================
// Delete Confirmation State
// ============================================================================

export interface DeleteConfirmState {
  file: FileMetadata;
}

// ============================================================================
// Component Props Types
// ============================================================================

export interface QuotaCardProps {
  quota: {
    total_size_used: number;
    quota_limit: number;
    usage_percentage: number;
    remaining: number;
  };
}

export interface FileCardProps {
  file: FileMetadata;
  index: number;
  isSelected: boolean;
  isFocused: boolean;
  onPreview: () => void;
  onDelete: () => void;
  onCopyLink: () => void;
  onToggleSelection: () => void;
  onMoveToFolder?: (folderId: string | null) => void;
  onChangeVisibility?: (visibility: FileVisibility) => void;
  onRename?: (newName: string) => void;
  folders?: FileFolder[];
  getItemProps: (file: FileMetadata, index: number) => {
    tabIndex: number;
    'data-focused': boolean;
    'data-selected': boolean;
    onFocus: () => void;
    onClick: (e: React.MouseEvent) => void;
    onKeyDown: (e: React.KeyboardEvent) => void;
  };
  getFileUrl: (fileId: string) => string;
  copiedId: string | null;
}

export interface FileListItemProps extends Omit<FileCardProps, 'isFocused'> {
  isFocused: boolean;
}

export interface FilePreviewDialogProps {
  file: FileMetadata | null;
  isOpen: boolean;
  onClose: () => void;
  onDelete: () => void;
  onCopyLink: () => void;
  getFileUrl: (fileId: string) => string;
  copiedId: string | null;
}

export interface DeleteConfirmDialogProps {
  deleteConfirm: DeleteConfirmState | null;
  isDeleting: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export interface BulkDeleteDialogProps {
  isOpen: boolean;
  selectedCount: number;
  isDeleting: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export interface SelectionBarProps {
  selectedCount: number;
  onSelectAll: () => void;
  onDownloadSelected: () => void;
  onDeleteSelected: () => void;
  onClearSelection: () => void;
}

export interface EmptyStateProps {
  onUploadClick: () => void;
}

// Re-export types for convenience
export type { FileMetadata, FileFolder, FileVisibility };
