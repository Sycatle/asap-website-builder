/**
 * Extension Store Components
 * 
 * UI components for browsing, installing, and managing extensions.
 */

// Store browsing
export { ExtensionCard, type ExtensionCardProps } from './ExtensionCard';
export { ExtensionGrid, ExtensionGridSkeleton } from './ExtensionGrid';
export { ExtensionFilters } from './ExtensionFilters';
export { CategoryNav, CategoryNavHorizontal } from './CategoryNav';

// Extension detail
export { ExtensionDetail, ExtensionDetailSkeleton } from './ExtensionDetail';
export { PermissionsList, PermissionsReviewDialog } from './PermissionsReview';
export { InstallButton, InstallButtonCompact } from './InstallButton';

// Installed management
export { InstalledExtensionsList } from './InstalledExtensionsList';
export { InstalledExtensionCard, InstalledExtensionsGrid } from './InstalledExtensionCard';

// Main page
export { ExtensionStorePage } from './ExtensionStorePage';
