-- Update RLS policies to allow editing of system POIs (those with null created_by)
-- This allows authenticated users to edit POIs that were imported or created by the system

-- Drop existing policies first
DROP POLICY IF EXISTS "Allow users to update their own sites" ON sites;
DROP POLICY IF EXISTS "Allow users to read their own sites" ON sites;

-- Create new policies that include system POIs (null created_by)
CREATE POLICY "Allow users to read their own sites and system POIs" 
ON sites 
FOR SELECT 
USING (
  created_by = auth.uid() 
  OR created_by = '00000000-0000-0000-0000-000000000000'::uuid
  OR created_by IS NULL
);

CREATE POLICY "Allow users to update their own sites and system POIs" 
ON sites 
FOR UPDATE 
USING (
  created_by = auth.uid() 
  OR created_by = '00000000-0000-0000-0000-000000000000'::uuid
  OR created_by IS NULL
);

-- Update the system POIs to set created_by to the current user when they edit them
-- This ensures ownership after first edit
CREATE OR REPLACE FUNCTION public.update_site_ownership()
RETURNS TRIGGER AS $$
BEGIN
  -- If the site has no owner or is system-owned, assign it to the current user
  IF OLD.created_by = '00000000-0000-0000-0000-000000000000'::uuid 
     OR OLD.created_by IS NULL THEN
    NEW.created_by = auth.uid();
  END IF;
  
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically assign ownership on update
DROP TRIGGER IF EXISTS update_site_ownership_trigger ON sites;
CREATE TRIGGER update_site_ownership_trigger
  BEFORE UPDATE ON sites
  FOR EACH ROW
  EXECUTE FUNCTION update_site_ownership();