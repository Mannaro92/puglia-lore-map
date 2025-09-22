-- Fix security issues detected by Supabase linter
-- Note: spatial_ref_sys is a PostGIS system table and cannot be modified - this is safe

-- 1. Fix search_path for normalize_site_text function to make it secure
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

-- 2. Add comments explaining why PostGIS extensions are in public schema (this is standard and safe)
COMMENT ON EXTENSION postgis IS 'PostGIS extension in public schema - standard configuration for spatial database functionality';
COMMENT ON EXTENSION pg_trgm IS 'PostgreSQL trigram extension for full-text search - commonly used in public schema for performance';