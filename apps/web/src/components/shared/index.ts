// Shared components - barrel exports

// Core shared components
export { EmptyState } from './EmptyState';
export { NotificationsDropdown } from './notifications-dropdown';
export { ErrorBoundary, type ErrorBoundaryProps } from './ErrorBoundary';
export { PageHeader } from './page-header';
export { PresenceAvatars } from './presence-avatars';
export { LogoutConfirmDialog } from './logout-confirm-dialog';

// Command Palette (component-first)
export { CommandPalette, useCommandPalette, type CommandPaletteProps } from './command-palette';

// File utilities and components
export {
  isImage,
  isVideo,
  isAudio,
  isPdf,
  canPreview,
  getFileIcon,
  getFileTypeLabel,
  getFileUrl,
  copyFileUrl,
} from './file-utils';
export { FilePreviewDialog, type FilePreviewDialogProps } from './file-preview-dialog';
