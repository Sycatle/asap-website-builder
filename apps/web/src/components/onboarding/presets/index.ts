/**
 * V1 MVP: Preset-specific Onboarding System
 * 
 * Each preset has its own onboarding flow.
 * The onboarding is REQUIRED for all site creation.
 */

export { FreelanceDevOnboarding } from './FreelanceDevOnboarding';
export { GenericSiteOnboarding } from './GenericSiteOnboarding';
export { PresetOnboardingRouter } from './PresetOnboardingRouter';

// Preset IDs
export const PRESET_IDS = {
  DEV_FREELANCE_CLASSIC: 'a0000001-0001-4001-8001-000000000001',
  LANDING_SAAS: 'b2c3d4e5-f6a7-8901-bcde-f23456789012',
} as const;

// Preset categories that use generic onboarding
export const GENERIC_ONBOARDING_CATEGORIES = ['marketing', 'business', 'blog', 'ecommerce', 'general'] as const;

// Map preset ID to onboarding component
export const PRESET_ONBOARDING_MAP = {
  [PRESET_IDS.DEV_FREELANCE_CLASSIC]: 'FreelanceDevOnboarding',
  [PRESET_IDS.LANDING_SAAS]: 'GenericSiteOnboarding',
} as const;

export type PresetId = typeof PRESET_IDS[keyof typeof PRESET_IDS];
