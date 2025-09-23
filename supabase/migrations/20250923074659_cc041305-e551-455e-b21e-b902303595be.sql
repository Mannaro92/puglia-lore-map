-- Fix RLS security issue: Enable RLS on spatial_ref_sys table
-- This table contains spatial reference system definitions and is safe to be publicly readable

-- Enable Row Level Security on spatial_ref_sys
ALTER TABLE public.spatial_ref_sys ENABLE ROW LEVEL SECURITY;

-- Create policy to allow public read access since this is reference data
CREATE POLICY "Allow public read access to spatial reference systems" 
ON public.spatial_ref_sys 
FOR SELECT 
USING (true);

-- Note: spatial_ref_sys is a PostGIS system table containing spatial reference system definitions
-- It's typically read-only reference data, so public read access is appropriate