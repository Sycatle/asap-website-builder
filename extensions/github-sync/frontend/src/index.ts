/**
 * GitHub Sync Extension - Frontend Package
 * 
 * This package exports all frontend components for the github-sync extension.
 * It follows the ASAP extension architecture pattern.
 */

// Extension manifest info
export const EXTENSION_SLUG = 'github-sync';
export const EXTENSION_NAME = 'GitHub Sync';

// Manager component (lazy-loadable)
export { GitHubSyncManager, default } from './manager';

// Types
export type { GitHubSyncManagerProps } from './manager';
export type {
  GitHubProfile,
  GitHubRepo,
  GitHubGist,
  GitHubOrg,
  GitHubStarred,
  LanguageStats,
  ContributionDay,
  SyncStatus,
} from './types';
