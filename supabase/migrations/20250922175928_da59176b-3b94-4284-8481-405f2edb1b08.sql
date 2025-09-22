-- Enable RLS on spatial_ref_sys table and allow public read access
ALTER TABLE public.spatial_ref_sys ENABLE ROW LEVEL SECURITY;

-- Create policy to allow public read access to spatial reference systems
CREATE POLICY "Allow public read access to spatial_ref_sys" 
ON public.spatial_ref_sys 
FOR SELECT 
USING (true);