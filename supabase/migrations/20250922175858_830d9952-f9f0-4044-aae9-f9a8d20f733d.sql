-- Enable RLS on spatial_ref_sys table and add public read policy
ALTER TABLE public.spatial_ref_sys ENABLE ROW LEVEL SECURITY;

-- Allow public read access to spatial reference systems (required for PostGIS functionality)
CREATE POLICY "Allow public read access to spatial_ref_sys" 
ON public.spatial_ref_sys 
FOR SELECT 
USING (true);