-- Fix RLS policy for media table to allow anonymous access to media of published sites
-- Drop existing conflicting policies
DROP POLICY IF EXISTS "Allow public read access to all media" ON public.media;
DROP POLICY IF EXISTS "Owners can view their site media" ON public.media;

-- Create new policy that allows:
-- 1. Anonymous users to view media of published sites
-- 2. Authenticated users to view media of their own sites (any status)
-- 3. Authenticated users to view media of published sites
CREATE POLICY "Media read access for published sites"
ON public.media
FOR SELECT
TO anon, authenticated
USING (
  -- For published sites, everyone can see media
  EXISTS (
    SELECT 1 FROM public.sites s
    WHERE s.id = media.site_id 
    AND s.stato_validazione = 'published'
  )
  OR
  -- For any sites, authenticated users can see their own media
  (
    auth.role() = 'authenticated' 
    AND EXISTS (
      SELECT 1 FROM public.sites s
      WHERE s.id = media.site_id 
      AND s.created_by = auth.uid()
    )
  )
);