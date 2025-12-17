-- Add 'onboarding' as a valid creation_mode for websites
-- This is used when websites are created during the onboarding flow

ALTER TABLE websites DROP CONSTRAINT IF EXISTS websites_creation_mode_check;
ALTER TABLE websites ADD CONSTRAINT websites_creation_mode_check 
    CHECK (creation_mode IN ('from_scratch', 'from_preset', 'onboarding'));
