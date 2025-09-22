-- Remove the problematic duplicate normalize_site_text function without arguments
-- Keep only the secure version with proper search_path
DROP FUNCTION IF EXISTS public.normalize_site_text() CASCADE;

-- Ensure we only have the secure version of normalize_site_text
-- This function should already exist with proper security settings