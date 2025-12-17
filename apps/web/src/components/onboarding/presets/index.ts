/**
 * V1 MVP: Preset-specific Onboarding System
 * 
 * Each preset has its own onboarding flow.
 * The onboarding is REQUIRED for all site creation.
 */

export { FreelanceDevOnboarding } from './FreelanceDevOnboarding';
export { PresetOnboardingRouter } from './PresetOnboardingRouter';

// Preset IDs
export const PRESET_IDS = {
  DEV_FREELANCE_CLASSIC: 'a0000001-0001-4001-8001-000000000001',
} as const;

// Map preset ID to onboarding component
export const PRESET_ONBOARDING_MAP = {
  [PRESET_IDS.DEV_FREELANCE_CLASSIC]: 'FreelanceDevOnboarding',
} as const;

export type PresetId = typeof PRESET_IDS[keyof typeof PRESET_IDS];
