-- Add per-variable visibility flag so the public site data envelope
-- (`GET /api/public/websites/:slug/data`) can omit private values.
-- Variables are public by default to preserve the v0 contract for the
-- existing rows in dev; production has zero published sites yet, so the
-- default is safe.

ALTER TABLE website_variables
  ADD COLUMN IF NOT EXISTS is_public BOOLEAN NOT NULL DEFAULT true;
