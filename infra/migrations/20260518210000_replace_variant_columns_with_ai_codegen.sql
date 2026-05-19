-- Replace the variant-system columns with AI-codegen columns.
--
-- The variant_key / variant_params columns and their backing renderer
-- catalog were removed in favor of AI-generated section code that is
-- validated, compiled, and persisted alongside its data bindings.
--
-- New columns:
--   source_code    TEXT   — the JSX/TSX produced by the AI before compile
--   compiled_js    TEXT   — esbuild output ready for dynamic import at render
--   data_bindings  JSONB  — collections / variables the section consumes
--                           (used to pre-fetch in apps/sites and detect deps)
--   knobs_schema   JSONB  — props extracted from the AST that the studio
--                           surfaces as direct edit controls (no LLM round-trip)
--
-- This migration drops data — the variant columns held layout choices and
-- params that have no equivalent in the new model. Existing sections will
-- need to be regenerated via the AI codegen endpoint.

DROP INDEX IF EXISTS idx_website_elements_variant_key;

ALTER TABLE website_elements
    DROP COLUMN IF EXISTS variant_key,
    DROP COLUMN IF EXISTS variant_params;

ALTER TABLE website_elements
    ADD COLUMN IF NOT EXISTS source_code   TEXT,
    ADD COLUMN IF NOT EXISTS compiled_js   TEXT,
    ADD COLUMN IF NOT EXISTS data_bindings JSONB NOT NULL DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS knobs_schema  JSONB NOT NULL DEFAULT '{}'::jsonb;

-- A partial index for the apps/sites SSR path that needs to skip sections
-- without compiled output. Defer per-page indexing until we know the read
-- pattern of the new render endpoint.
CREATE INDEX IF NOT EXISTS idx_website_elements_compiled
    ON website_elements (website_id)
    WHERE compiled_js IS NOT NULL;
