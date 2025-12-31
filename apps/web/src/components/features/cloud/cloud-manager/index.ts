// CloudManager module exports
export { CloudManager, CloudManager as default } from "./cloud-manager";

// Types
export type {
  ViewMode,
  UploadProgress,
  DeleteConfirmState,
  QuotaCardProps,
  FileCardProps,
  FileListItemProps,
  FilePreviewDialogProps,
  DeleteConfirmDialogProps,
  BulkDeleteDialogProps,
  SelectionBarProps,
  EmptyStateProps,
  FileMetadata,
} from "./types";

// Utils - re-export from shared
export {
  isImage,
  isVideo,
  isAudio,
  isPdf,
  getFileIcon,
  getFileTypeLabel,
  getFileUrl,
  copyFileUrl,
} from "@/components/shared/file-utils";

// Components
export { QuotaCard } from "./components/quota-card";
export { FileCard } from "./components/file-card";
export { FileListItem } from "./components/file-list-item";
export { FilePreviewDialog } from "./components/file-preview-dialog";
export { DeleteConfirmDialog, BulkDeleteDialog } from "./components/delete-dialogs";
export { SelectionBar } from "./components/selection-bar";
export { EmptyState } from "./components/empty-state";
export { CloudManagerSkeleton } from "./components/cloud-manager-skeleton";
