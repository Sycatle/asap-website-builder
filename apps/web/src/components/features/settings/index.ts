// Settings feature components
export { default as SettingsPage } from './SettingsPage';
export { default as ThemePage } from './ThemePage';
export { default as AdministratorsPage } from './AdministratorsPage';

// Settings modal (refactored with component-first approach)
export { SettingsModal, type SettingsModalProps, type SettingsTab, type UserData } from './settings-modal';

// Individual tab components for granular imports
export * from './tabs';
