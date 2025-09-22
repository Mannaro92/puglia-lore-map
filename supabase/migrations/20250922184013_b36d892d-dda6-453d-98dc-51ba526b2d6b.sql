-- Create function to update site ownership when system POIs are edited
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