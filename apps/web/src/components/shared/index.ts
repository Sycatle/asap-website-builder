// Shared components - barrel exports

// Core shared components
export { 
  EmptyState,
  // Re-export primitives for advanced usage
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
} from './EmptyState';
export { NotificationsDropdown } from './notifications-dropdown';
export { ErrorBoundary, type ErrorBoundaryProps } from './ErrorBoundary';
export { PageHeader } from './page-header';
export { PresenceAvatars } from './presence-avatars';

// UI Components
export { 
  ChangeIndicator, 
  getPercentageChange,
  type ChangeIndicatorProps,
} from './change-indicator';
export { 
  StatusBadge, 
  StatusDot,
  type StatusBadgeProps,
  type PublishStatus,
  type ConnectionStatus,
  type WebVitalStatus,
  type GenericStatus,
} from './status-badge';
export { 
  StatCard, 
  StatCardGrid,
  LiveStatCard,
  type StatCardProps,
} from './stat-card';

// Dialogs
export { 
  ConfirmDialog, 
  DeleteConfirmDialog,
  type ConfirmDialogProps,
  type ConfirmDialogVariant,
} from './confirm-dialog';
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

