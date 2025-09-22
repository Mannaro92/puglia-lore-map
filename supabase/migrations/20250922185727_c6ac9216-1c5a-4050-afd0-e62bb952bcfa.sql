-- Drop the existing restrictive policy for media insertion
DROP POLICY IF EXISTS "Owners can insert media for their sites" ON public.media;

-- Create new policy that allows insertion for sites the user can edit
CREATE POLICY "Users can insert media for editable sites" 
ON public.media 
FOR INSERT 
WITH CHECK (
  EXISTS ( 
    SELECT 1
    FROM sites s
    WHERE s.id = media.site_id 
    AND (
      s.created_by = auth.uid() 
      OR s.created_by = '00000000-0000-0000-0000-000000000000'::uuid 
      OR s.created_by IS NULL
    )
  )
);

-- Also update the update policy to be consistent
DROP POLICY IF EXISTS "Owners can update their media" ON public.media;

CREATE POLICY "Users can update media for editable sites" 
ON public.media 
FOR UPDATE 
USING (
  EXISTS ( 
    SELECT 1
    FROM sites s
    WHERE s.id = media.site_id 
    AND (
      s.created_by = auth.uid() 
      OR s.created_by = '00000000-0000-0000-0000-000000000000'::uuid 
      OR s.created_by IS NULL
    )
  )
);

-- Update delete policy to be consistent
DROP POLICY IF EXISTS "Owners can delete their media" ON public.media;

CREATE POLICY "Users can delete media for editable sites" 
ON public.media 
FOR DELETE 
USING (
  EXISTS ( 
    SELECT 1
    FROM sites s
    WHERE s.id = media.site_id 
    AND (
      s.created_by = auth.uid() 
      OR s.created_by = '00000000-0000-0000-0000-000000000000'::uuid 
      OR s.created_by IS NULL
    )
  )
);