-- Fix extension source_ref for existing variables
-- Variables with source='extension' should have source_ref set to the extension slug
-- We can infer the extension from the key prefix (e.g., github_* -> github-sync)

-- Update GitHub Sync variables that are missing source_ref
UPDATE website_variables
SET source_ref = 'github-sync'
WHERE source = 'extension'
  AND source_ref IS NULL
  AND key LIKE 'github_%';

-- For any remaining extension variables without source_ref, 
-- set a generic name based on the key prefix
UPDATE website_variables
SET source_ref = SPLIT_PART(key, '_', 1) || '-sync'
WHERE source = 'extension'
  AND source_ref IS NULL
  AND key LIKE '%_%';

-- For variables without underscore in key, just mark as 'unknown-extension'
UPDATE website_variables
SET source_ref = 'unknown-extension'
WHERE source = 'extension'
  AND source_ref IS NULL;
