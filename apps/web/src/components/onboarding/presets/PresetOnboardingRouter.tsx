/**
 * V1 MVP: Preset Onboarding Router
 * 
 * Routes to the appropriate onboarding flow based on the selected preset.
 * - Portfolio/freelance presets → FreelanceDevOnboarding
 * - Marketing/business/generic presets → GenericSiteOnboarding
 */

import * as React from 'react';
import { FreelanceDevOnboarding } from './FreelanceDevOnboarding';
import { GenericSiteOnboarding } from './GenericSiteOnboarding';
import { PRESET_IDS } from './index';

interface PresetOnboardingRouterProps {
  presetId?: string;
  onComplete: (websiteId: string) => void;
}

export function PresetOnboardingRouter({ presetId, onComplete }: PresetOnboardingRouterProps) {
  // Default to generic if no preset
  if (!presetId) {
    return <GenericSiteOnboarding presetId={PRESET_IDS.DEV_FREELANCE_CLASSIC} onComplete={onComplete} />;
  }

  // Route to appropriate onboarding based on preset
  switch (presetId) {
    // Portfolio/Freelance presets use dedicated onboarding
    case PRESET_IDS.DEV_FREELANCE_CLASSIC:
      return <FreelanceDevOnboarding onComplete={onComplete} />;
    
    // All other presets use generic site onboarding
    case PRESET_IDS.LANDING_SAAS:
    default:
      return <GenericSiteOnboarding presetId={presetId} onComplete={onComplete} />;
  }
}
