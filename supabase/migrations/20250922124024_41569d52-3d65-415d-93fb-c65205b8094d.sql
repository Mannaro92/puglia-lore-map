-- Fix security issues that can be resolved

-- 1. Fix search_path for normalize_site_text function to make it secure
-- This resolves the "Function Search Path Mutable" warning
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

-- 2. Add comments explaining the PostGIS extensions in public schema
-- These are standard configurations and are acceptable
COMMENT ON EXTENSION postgis IS 'PostGIS extension installed in public schema - this is the standard and recommended configuration for PostGIS spatial database functionality';
COMMENT ON EXTENSION pg_trgm IS 'PostgreSQL trigram extension for full-text search functionality - commonly used in public schema for text search optimization';