-- Promote variant_key / variant_params from `settings` JSONB into native columns.
--
-- These were temporarily persisted under `settings.variant_key` /
-- `settings.variant_params` so the studio variant picker could ship without
-- a migration. The renderer's `withVariantFields()` helper lifted them at
-- render time. Now we have native columns; the hoist stays as a safety net
-- for elements written before this migration.

ALTER TABLE website_elements
    ADD COLUMN IF NOT EXISTS variant_key   TEXT,
    ADD COLUMN IF NOT EXISTS variant_params JSONB;

-- Backfill existing rows that already carry the variant info in settings.
UPDATE website_elements
SET
    variant_key = settings ->> 'variant_key',
    variant_params = settings -> 'variant_params'
WHERE
    variant_key IS NULL
    AND settings ? 'variant_key';

-- Strip the embedded keys from settings now that they live in their own
-- columns; renderers fall back to settings only when the columns are NULL,
-- and there is no remaining use of the embedded keys downstream.
UPDATE website_elements
SET settings = (settings - 'variant_key' - 'variant_params')
WHERE settings ? 'variant_key' OR settings ? 'variant_params';

-- A partial index helps queries that filter elements by variant
-- (e.g. usage analytics, AI catalog matching).
CREATE INDEX IF NOT EXISTS idx_website_elements_variant_key
    ON website_elements (variant_key)
    WHERE variant_key IS NOT NULL;
