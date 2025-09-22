-- Update RLS policy to allow public read access to all sites
DROP POLICY IF EXISTS "Allow public read access to published sites" ON sites;

-- Create new policy that allows public access to all sites
CREATE POLICY "Allow public read access to all sites"
ON sites
FOR SELECT
TO public
USING (true);

-- Update media policy to allow access to media for all sites (not just published)
DROP POLICY IF EXISTS "Allow public read access to media" ON media;

-- Create new policy for public media access
CREATE POLICY "Allow public read access to all media"
ON media
FOR SELECT  
TO public
USING (true);