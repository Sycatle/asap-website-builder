-- Migration: Allow nested folders up to 3 levels deep
-- Remove the constraint that forces website folders to be at root only

-- Drop the old restrictive constraint
ALTER TABLE file_folders DROP CONSTRAINT IF EXISTS website_folders_at_root;

-- Add a new constraint to limit folder depth to 3 levels
-- This is enforced via a trigger since CHECK constraints can't query the table

-- Create a function to check folder depth
CREATE OR REPLACE FUNCTION check_folder_depth()
RETURNS TRIGGER AS $$
DECLARE
    depth INTEGER := 1;
    current_parent UUID := NEW.parent_folder_id;
BEGIN
    -- Count depth by traversing parent chain
    WHILE current_parent IS NOT NULL AND depth <= 4 LOOP
        depth := depth + 1;
        SELECT parent_folder_id INTO current_parent 
        FROM file_folders 
        WHERE id = current_parent;
    END LOOP;
    
    -- Maximum depth is 3 (root = 1, subfolder = 2, sub-subfolder = 3)
    IF depth > 3 THEN
        RAISE EXCEPTION 'Maximum folder depth of 3 levels exceeded';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to enforce depth limit on insert/update
DROP TRIGGER IF EXISTS check_folder_depth_trigger ON file_folders;
CREATE TRIGGER check_folder_depth_trigger
    BEFORE INSERT OR UPDATE ON file_folders
    FOR EACH ROW
    WHEN (NEW.parent_folder_id IS NOT NULL)
    EXECUTE FUNCTION check_folder_depth();

-- Add constraint: if parent has website_id, child must have same website_id
CREATE OR REPLACE FUNCTION check_folder_website_inheritance()
RETURNS TRIGGER AS $$
DECLARE
    parent_website_id UUID;
BEGIN
    IF NEW.parent_folder_id IS NOT NULL THEN
        SELECT website_id INTO parent_website_id 
        FROM file_folders 
        WHERE id = NEW.parent_folder_id;
        
        -- If parent has website_id, child must inherit it
        IF parent_website_id IS NOT NULL AND NEW.website_id IS DISTINCT FROM parent_website_id THEN
            RAISE EXCEPTION 'Folder must belong to the same website as its parent';
        END IF;
        
        -- If parent has no website_id, child cannot have one either (personal folders)
        IF parent_website_id IS NULL AND NEW.website_id IS NOT NULL THEN
            RAISE EXCEPTION 'Cannot assign website to subfolder of personal folder';
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS check_folder_website_inheritance_trigger ON file_folders;
CREATE TRIGGER check_folder_website_inheritance_trigger
    BEFORE INSERT OR UPDATE ON file_folders
    FOR EACH ROW
    EXECUTE FUNCTION check_folder_website_inheritance();
