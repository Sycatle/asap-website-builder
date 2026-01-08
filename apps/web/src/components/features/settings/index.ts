// Settings feature components
export { default as SettingsPage } from './settings-page';
export { default as ThemePage } from './theme-page';
export { default as AdministratorsPage } from './administrators-page';

// Settings modal (refactored with component-first approach)
export { SettingsModal, type SettingsModalProps, type SettingsTab, type UserData } from './settings-modal';

// Individual tab components for granular imports
export * from './tabs';
