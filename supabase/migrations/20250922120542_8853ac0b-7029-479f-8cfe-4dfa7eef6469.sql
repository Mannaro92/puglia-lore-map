-- Fix critical security issues by enabling RLS and adding missing policies
-- Only add policies that don't already exist

-- Enable RLS on tables that have policies but RLS disabled
ALTER TABLE public.sites ENABLE ROW LEVEL SECURITY;

-- Add missing RLS policies for reference tables (only if they don't exist)
DO $$
BEGIN
    -- Check and add policy for ref_definizione
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'ref_definizione' AND policyname = 'Allow public read access to ref_definizione') THEN
        EXECUTE 'CREATE POLICY "Allow public read access to ref_definizione" ON public.ref_definizione FOR SELECT USING (true)';
    END IF;
    
    -- Check and add policy for ref_cronologia
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'ref_cronologia' AND policyname = 'Allow public read access to ref_cronologia') THEN
        EXECUTE 'CREATE POLICY "Allow public read access to ref_cronologia" ON public.ref_cronologia FOR SELECT USING (true)';
    END IF;
    
    -- Check and add policy for ref_ambito_cultuale
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'ref_ambito_cultuale' AND policyname = 'Allow public read access to ref_ambito_cultuale') THEN
        EXECUTE 'CREATE POLICY "Allow public read access to ref_ambito_cultuale" ON public.ref_ambito_cultuale FOR SELECT USING (true)';
    END IF;
    
    -- Add policies for geographic data
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'province' AND policyname = 'Allow public read access to province') THEN
        EXECUTE 'CREATE POLICY "Allow public read access to province" ON public.province FOR SELECT USING (true)';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'comuni' AND policyname = 'Allow public read access to comuni') THEN
        EXECUTE 'CREATE POLICY "Allow public read access to comuni" ON public.comuni FOR SELECT USING (true)';
    END IF;
    
    -- Add policies for layers
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'layers' AND policyname = 'Allow public read access to layers') THEN
        EXECUTE 'CREATE POLICY "Allow public read access to layers" ON public.layers FOR SELECT USING (true)';
    END IF;
    
    -- Add policies for bibliography
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'biblio' AND policyname = 'Allow public read access to biblio') THEN
        EXECUTE 'CREATE POLICY "Allow public read access to biblio" ON public.biblio FOR SELECT USING (true)';
    END IF;
    
    -- Add policies for media
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'media' AND policyname = 'Allow public read access to media') THEN
        EXECUTE 'CREATE POLICY "Allow public read access to media" ON public.media FOR SELECT USING (EXISTS (SELECT 1 FROM sites s WHERE s.id = media.site_id AND s.stato_validazione = ''published''))';
    END IF;
    
    -- Add policies for itinerari
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'itinerari' AND policyname = 'Allow public read access to published itinerari') THEN
        EXECUTE 'CREATE POLICY "Allow public read access to published itinerari" ON public.itinerari FOR SELECT USING (published_at IS NOT NULL)';
    END IF;
    
    -- Add policies for sites
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'sites' AND policyname = 'Allow public read access to published sites') THEN
        EXECUTE 'CREATE POLICY "Allow public read access to published sites" ON public.sites FOR SELECT USING (stato_validazione = ''published'')';
    END IF;
    
    -- Add audit log policy
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'audit_log' AND policyname = 'Restrict audit log access') THEN
        EXECUTE 'CREATE POLICY "Restrict audit log access" ON public.audit_log FOR SELECT USING (false)';
    END IF;
    
    -- Add imports policy
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'imports' AND policyname = 'Users can view their own imports') THEN
        EXECUTE 'CREATE POLICY "Users can view their own imports" ON public.imports FOR SELECT USING (actor = auth.jwt()->>''email'')';
    END IF;
END $$;