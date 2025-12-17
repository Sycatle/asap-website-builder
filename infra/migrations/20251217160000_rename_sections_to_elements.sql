-- ============================================================================
-- Rename Sections to Elements Migration
-- Description: Rename website_sections to website_elements across the schema
-- This migration renames:
--   - Table: website_sections → website_elements
--   - Table: page_sections → page_elements  
--   - Column: section_id → element_id
--   - Column: section_type → element_type
--   - All related indexes, constraints, and policies
-- ============================================================================

-- STEP 1: Drop existing foreign key constraints
ALTER TABLE page_sections DROP CONSTRAINT IF EXISTS page_sections_section_id_fkey;

-- STEP 2: Drop existing indexes on website_sections
DROP INDEX IF EXISTS idx_website_sections_website_id;
DROP INDEX IF EXISTS idx_website_sections_order;

-- STEP 3: Drop existing indexes on page_sections
DROP INDEX IF EXISTS idx_page_sections_page_id;
DROP INDEX IF EXISTS idx_page_sections_section_id;

-- STEP 4: Rename the website_sections table to website_elements
ALTER TABLE website_sections RENAME TO website_elements;

-- STEP 5: Rename section_type column to element_type in website_elements
ALTER TABLE website_elements RENAME COLUMN section_type TO element_type;

-- STEP 6: Rename the page_sections table to page_elements
ALTER TABLE page_sections RENAME TO page_elements;

-- STEP 7: Rename section_id column to element_id in page_elements
ALTER TABLE page_elements RENAME COLUMN section_id TO element_id;

-- STEP 8: Recreate foreign key constraint with new column name
ALTER TABLE page_elements ADD CONSTRAINT page_elements_element_id_fkey
    FOREIGN KEY (element_id) REFERENCES website_elements(id) ON DELETE CASCADE;

-- STEP 9: Recreate indexes on website_elements
CREATE INDEX idx_website_elements_website_id ON website_elements(website_id);
CREATE INDEX idx_website_elements_order ON website_elements(website_id, "order");

-- STEP 10: Recreate indexes on page_elements
CREATE INDEX idx_page_elements_page_id ON page_elements(page_id);
CREATE INDEX idx_page_elements_element_id ON page_elements(element_id);

-- STEP 11: Update comments for documentation
COMMENT ON TABLE website_elements IS 'Content elements/blocks within a website (Hero, About, Projects, etc.)';
COMMENT ON COLUMN website_elements.element_type IS 'Type of element: hero, about, projects, skills, etc.';
COMMENT ON TABLE page_elements IS 'Junction table linking pages to elements with custom ordering';

-- STEP 12: Update event types in events table (change existing event data)
UPDATE events SET event_type = 'ELEMENT_CREATED' WHERE event_type = 'SECTION_CREATED';
UPDATE events SET event_type = 'ELEMENT_UPDATED' WHERE event_type = 'SECTION_UPDATED';
UPDATE events SET event_type = 'ELEMENT_DELETED' WHERE event_type = 'SECTION_DELETED';
UPDATE events SET event_type = 'ELEMENT_REORDERED' WHERE event_type = 'SECTION_REORDERED';

-- STEP 13: Update event payload keys (replace section_id with element_id, section_type with element_type)
UPDATE events SET payload = 
    CASE 
        WHEN payload ? 'section_id' THEN 
            (payload - 'section_id') || jsonb_build_object('element_id', payload->'section_id')
        ELSE payload 
    END
WHERE payload ? 'section_id';

UPDATE events SET payload = 
    CASE 
        WHEN payload ? 'section_type' THEN 
            (payload - 'section_type') || jsonb_build_object('element_type', payload->'section_type')
        ELSE payload 
    END
WHERE payload ? 'section_type';

UPDATE events SET payload = 
    CASE 
        WHEN payload ? 'section_ids' THEN 
            (payload - 'section_ids') || jsonb_build_object('element_ids', payload->'section_ids')
        ELSE payload 
    END
WHERE payload ? 'section_ids';

