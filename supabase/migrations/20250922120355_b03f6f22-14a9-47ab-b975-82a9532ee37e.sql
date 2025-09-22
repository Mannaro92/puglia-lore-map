-- Fix critical security issues by enabling RLS and adding proper policies

-- Enable RLS on tables that have policies but RLS disabled
ALTER TABLE public.sites ENABLE ROW LEVEL SECURITY;

-- Add missing RLS policies for public read access to reference tables
-- Reference tables should be publicly viewable
CREATE POLICY "Allow public read access to ref_definizione" ON public.ref_definizione FOR SELECT USING (true);
CREATE POLICY "Allow public read access to ref_cronologia" ON public.ref_cronologia FOR SELECT USING (true);
CREATE POLICY "Allow public read access to ref_ambito_cultuale" ON public.ref_ambito_cultuale FOR SELECT USING (true);
CREATE POLICY "Allow public read access to ref_contesti_stratigrafici" ON public.ref_contesti_stratigrafici FOR SELECT USING (true);
CREATE POLICY "Allow public read access to ref_grado_esplorazione" ON public.ref_grado_esplorazione FOR SELECT USING (true);
CREATE POLICY "Allow public read access to ref_indicatori_cultuali" ON public.ref_indicatori_cultuali FOR SELECT USING (true);
CREATE POLICY "Allow public read access to ref_posizione" ON public.ref_posizione FOR SELECT USING (true);
CREATE POLICY "Allow public read access to ref_strutture_componenti" ON public.ref_strutture_componenti FOR SELECT USING (true);
CREATE POLICY "Allow public read access to ref_tipo_rinvenimento" ON public.ref_tipo_rinvenimento FOR SELECT USING (true);
CREATE POLICY "Allow public read access to ref_ubicazione_confidenza" ON public.ref_ubicazione_confidenza FOR SELECT USING (true);

-- Add policies for geographic data (provinces and comuni should be publicly viewable)
CREATE POLICY "Allow public read access to province" ON public.province FOR SELECT USING (true);
CREATE POLICY "Allow public read access to comuni" ON public.comuni FOR SELECT USING (true);

-- Add policies for layers (should be publicly viewable)
CREATE POLICY "Allow public read access to layers" ON public.layers FOR SELECT USING (true);

-- Add policies for bibliography (publicly viewable)
CREATE POLICY "Allow public read access to biblio" ON public.biblio FOR SELECT USING (true);

-- Add policies for media (public read access for published site media)
CREATE POLICY "Allow public read access to media" ON public.media FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM sites s 
    WHERE s.id = media.site_id 
    AND s.stato_validazione = 'published'
  )
);

-- Add policies for itinerari (public read for published itineraries)
CREATE POLICY "Allow public read access to published itinerari" ON public.itinerari FOR SELECT USING (published_at IS NOT NULL);

-- Add policies for sites (public read for published sites, edit for creators)
CREATE POLICY "Allow public read access to published sites" ON public.sites FOR SELECT USING (stato_validazione = 'published');
CREATE POLICY "Allow users to read their own sites" ON public.sites FOR SELECT USING (created_by = auth.uid());
CREATE POLICY "Allow users to create sites" ON public.sites FOR INSERT WITH CHECK (created_by = auth.uid());
CREATE POLICY "Allow users to update their own sites" ON public.sites FOR UPDATE USING (created_by = auth.uid());
CREATE POLICY "Allow users to delete their own sites" ON public.sites FOR DELETE USING (created_by = auth.uid());

-- Add audit log policy (only admins can read)
CREATE POLICY "Restrict audit log access" ON public.audit_log FOR SELECT USING (false);

-- Add imports policy (only creators can see their imports) 
CREATE POLICY "Users can view their own imports" ON public.imports FOR SELECT USING (actor = auth.jwt()->>'email');