-- ============================================================================
-- Website Pages Migration
-- Description: Add pages support for websites (/, /contact, /about, etc.)
-- ============================================================================

-- Website pages table
CREATE TABLE website_pages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    website_id UUID NOT NULL REFERENCES websites(id) ON DELETE CASCADE,
    slug TEXT NOT NULL,  -- '', 'contact', 'about', etc.
    title TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    is_homepage BOOLEAN NOT NULL DEFAULT false,
    "order" INT NOT NULL DEFAULT 0,
    visible BOOLEAN NOT NULL DEFAULT true,
    metadata JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(website_id, slug)
);

-- Page sections junction table (many-to-many between pages and sections)
CREATE TABLE page_sections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    page_id UUID NOT NULL REFERENCES website_pages(id) ON DELETE CASCADE,
    section_id UUID NOT NULL REFERENCES website_sections(id) ON DELETE CASCADE,
    "order" INT NOT NULL DEFAULT 0,
    visible BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(page_id, section_id)
);

-- Indexes for performance
CREATE INDEX idx_website_pages_website_id ON website_pages(website_id);
CREATE INDEX idx_website_pages_slug ON website_pages(website_id, slug);
CREATE INDEX idx_website_pages_homepage ON website_pages(website_id, is_homepage) WHERE is_homepage = true;
CREATE INDEX idx_page_sections_page_id ON page_sections(page_id);
CREATE INDEX idx_page_sections_section_id ON page_sections(section_id);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_website_pages_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_website_pages_updated_at
BEFORE UPDATE ON website_pages
FOR EACH ROW
EXECUTE FUNCTION update_website_pages_timestamp();

-- Enable RLS
ALTER TABLE website_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE page_sections ENABLE ROW LEVEL SECURITY;

-- Comments for documentation
COMMENT ON TABLE website_pages IS 'Pages that belong to a website (homepage, contact, about, etc.)';
COMMENT ON COLUMN website_pages.slug IS 'URL path for the page (empty string for homepage)';
COMMENT ON COLUMN website_pages.is_homepage IS 'Whether this page is the main landing page';
COMMENT ON TABLE page_sections IS 'Junction table linking pages to sections with custom ordering';
