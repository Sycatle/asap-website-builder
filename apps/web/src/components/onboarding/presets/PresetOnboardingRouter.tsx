/**
 * V1 MVP: Preset Onboarding Router
 * 
 * Routes to the appropriate onboarding flow based on the selected preset.
 * For V1, only Dev Freelance Classic is available.
 */

import * as React from 'react';
import { FreelanceDevOnboarding } from './FreelanceDevOnboarding';
import { PRESET_IDS, type PresetId } from './index';

interface PresetOnboardingRouterProps {
  presetId?: PresetId;
  onComplete: (websiteId: string) => void;
}

export function PresetOnboardingRouter({ presetId, onComplete }: PresetOnboardingRouterProps) {
  // For V1, default to Dev Freelance Classic
  const effectivePresetId = presetId || PRESET_IDS.DEV_FREELANCE_CLASSIC;

  // Route to appropriate onboarding based on preset
  switch (effectivePresetId) {
    case PRESET_IDS.DEV_FREELANCE_CLASSIC:
    default:
      return <FreelanceDevOnboarding onComplete={onComplete} />;
  }
}
