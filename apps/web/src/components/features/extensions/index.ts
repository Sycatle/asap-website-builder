// Extension feature components
export { default as ExtensionPage } from './ExtensionPage';
export { default as DynamicSidebar } from './DynamicSidebar';
export { default as WebsiteExtensionsPage } from './WebsiteExtensionsPage';
export { default as ExtensionMarketplace } from './ExtensionMarketplace';
export { ExtensionActionsSection } from './ExtensionActionsSection';

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