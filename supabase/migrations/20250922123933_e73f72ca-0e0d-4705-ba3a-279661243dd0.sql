-- Fix security issues detected by Supabase linter

-- 1. Enable RLS on spatial_ref_sys table (PostGIS system table)
-- This is a PostGIS system table containing spatial reference system data
-- We enable RLS with a public read policy since it contains reference data
ALTER TABLE public.spatial_ref_sys ENABLE ROW LEVEL SECURITY;

-- Create a policy to allow public read access to spatial reference systems
CREATE POLICY "Allow public read access to spatial_ref_sys"
ON public.spatial_ref_sys
FOR SELECT
USING (true);

-- 2. Fix search_path for normalize_site_text function to make it secure
-- Drop and recreate the function with proper security settings
DROP FUNCTION IF EXISTS public.normalize_site_text(text);

CREATE OR REPLACE FUNCTION public.normalize_site_text(input_text text)
RETURNS text
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $function$
  SELECT CASE 
    WHEN input_text IS NULL OR trim(input_text) = '' THEN NULL
    ELSE lower(trim(regexp_replace(input_text, '[^a-zA-Z0-9\s]', '', 'g')))
  END;
$function$;

-- 3. Create a comment explaining why PostGIS extensions are in public schema
COMMENT ON EXTENSION postgis IS 'PostGIS extension installed in public schema - this is the standard configuration for PostGIS spatial database functionality';
COMMENT ON EXTENSION pg_trgm IS 'PostgreSQL trigram extension for full-text search functionality - commonly used in public schema';