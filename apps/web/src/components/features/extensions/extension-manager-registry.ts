/**
 * Extension Manager Registry
 * 
 * Provides a modular way to register extension-specific management UIs.
 * Each extension can register its own manager component that will be
 * displayed in the "Gestion" tab when the extension is active.
 * 
 * Extensions are loaded from their dedicated frontend packages in the
 * extensions/*/frontend directories.
 */

import React from 'react';

// ============================================================================
// Types
// ============================================================================

export interface ExtensionManagerProps {
  websiteId: string;
  settings: Record<string, unknown>;
  onSettingsChange: (settings: Record<string, unknown>) => void;
  onSave?: () => Promise<void>;
  isSaving?: boolean;
  isDirty?: boolean;
}

export interface ExtensionManagerConfig {
  /** Unique extension slug */
  slug: string;
  /** Display name for the manager tab */
  tabLabel?: string;
  /** Manager component (lazy-loaded) */
  component: React.LazyExoticComponent<React.ComponentType<ExtensionManagerProps>>;
  /** Icon component for the tab */
  icon?: React.ComponentType<{ className?: string }>;
}

// ============================================================================
// Registry
// ============================================================================

const extensionManagers = new Map<string, ExtensionManagerConfig>();

/**
 * Register an extension manager component
 */
export function registerExtensionManager(config: ExtensionManagerConfig): void {
  extensionManagers.set(config.slug, config);
}

/**
 * Get manager config for an extension
 */
export function getExtensionManager(slug: string): ExtensionManagerConfig | undefined {
  return extensionManagers.get(slug);
}

/**
 * Check if an extension has a custom manager
 */
export function hasExtensionManager(slug: string): boolean {
  return extensionManagers.has(slug);
}

/**
 * Get all registered extension managers
 */
export function getAllExtensionManagers(): ExtensionManagerConfig[] {
  return Array.from(extensionManagers.values());
}

// ============================================================================
// Extension Managers Registration
// Extensions are loaded from their dedicated packages
// ============================================================================

import { Github } from 'lucide-react';

// GitHub Sync Extension - loaded from @asap/extension-github-sync
registerExtensionManager({
  slug: 'github-sync',
  tabLabel: 'GitHub',
  component: React.lazy(() => import('@asap/extension-github-sync/manager')),
  icon: Github,
});

// Future extensions will be registered here:
// import { BarChart } from 'lucide-react';
// registerExtensionManager({
//   slug: 'analytics',
//   tabLabel: 'Analytics',
//   component: React.lazy(() => import('@asap/extension-analytics/manager')),
//   icon: BarChart,
// });
