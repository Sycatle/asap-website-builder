// Extension feature components
export { default as ExtensionPage } from './extension-page';
export { default as DynamicSidebar } from './dynamic-sidebar';
export { default as WebsiteExtensionsPage } from './website-extensions-page';
export { default as ExtensionMarketplace } from './extension-marketplace';
export { ExtensionActionsSection } from './extension-actions-section';

// Extension manager registry
export {
  registerExtensionManager,
  getExtensionManager,
  hasExtensionManager,
  getAllExtensionManagers,
  type ExtensionManagerProps,
  type ExtensionManagerConfig,
} from './extension-manager-registry';

// Extension managers are now loaded from their dedicated packages:
// - @asap/extension-github-sync
// - @asap/extension-analytics (future)
// etc.

// Store components
export * from './store';