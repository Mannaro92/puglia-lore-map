-- Fix security issues: Add RLS to M:N tables and create security policies
ALTER TABLE public.site_cronologia ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_definizione ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_tipo_rinvenimento ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_grado_esplorazione ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_strutture ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_contesti ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_indicatori ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_ambiti ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_biblio ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.itinerario_sites ENABLE ROW LEVEL SECURITY;

-- Fix function search path
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.normalize_site_text()
RETURNS TRIGGER AS $$
BEGIN
    NEW.toponimo = TRIM(NEW.toponimo);
    NEW.descrizione = TRIM(NEW.descrizione);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- RLS POLICIES

-- Public read access to reference tables
CREATE POLICY "Reference tables are publicly readable" ON public.ref_ubicazione_confidenza FOR SELECT USING (true);
CREATE POLICY "Reference tables are publicly readable" ON public.ref_posizione FOR SELECT USING (true);
CREATE POLICY "Reference tables are publicly readable" ON public.ref_cronologia FOR SELECT USING (true);
CREATE POLICY "Reference tables are publicly readable" ON public.ref_definizione FOR SELECT USING (true);
CREATE POLICY "Reference tables are publicly readable" ON public.ref_tipo_rinvenimento FOR SELECT USING (true);
CREATE POLICY "Reference tables are publicly readable" ON public.ref_grado_esplorazione FOR SELECT USING (true);
CREATE POLICY "Reference tables are publicly readable" ON public.ref_strutture_componenti FOR SELECT USING (true);
CREATE POLICY "Reference tables are publicly readable" ON public.ref_contesti_stratigrafici FOR SELECT USING (true);
CREATE POLICY "Reference tables are publicly readable" ON public.ref_indicatori_cultuali FOR SELECT USING (true);
CREATE POLICY "Reference tables are publicly readable" ON public.ref_ambito_cultuale FOR SELECT USING (true);

-- Geographic data is publicly readable
CREATE POLICY "Province are publicly readable" ON public.province FOR SELECT USING (true);
CREATE POLICY "Comuni are publicly readable" ON public.comuni FOR SELECT USING (true);

-- Sites policies: public read for published, authenticated for all operations
CREATE POLICY "Published sites are publicly readable" ON public.sites 
    FOR SELECT USING (stato_validazione = 'published');

CREATE POLICY "Authenticated users can view all sites" ON public.sites 
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Editors can insert their own sites" ON public.sites 
    FOR INSERT TO authenticated 
    WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Creators can update their own sites" ON public.sites 
    FOR UPDATE TO authenticated 
    USING (auth.uid() = created_by);

CREATE POLICY "Creators can delete their own sites" ON public.sites 
    FOR DELETE TO authenticated 
    USING (auth.uid() = created_by);

-- M:N relationship policies (follow site permissions)
CREATE POLICY "Site relationships follow site permissions" ON public.site_cronologia 
    FOR ALL TO authenticated 
    USING (EXISTS (SELECT 1 FROM public.sites WHERE id = site_id AND (stato_validazione = 'published' OR created_by = auth.uid())));

CREATE POLICY "Site relationships follow site permissions" ON public.site_definizione 
    FOR ALL TO authenticated 
    USING (EXISTS (SELECT 1 FROM public.sites WHERE id = site_id AND (stato_validazione = 'published' OR created_by = auth.uid())));

CREATE POLICY "Site relationships follow site permissions" ON public.site_tipo_rinvenimento 
    FOR ALL TO authenticated 
    USING (EXISTS (SELECT 1 FROM public.sites WHERE id = site_id AND (stato_validazione = 'published' OR created_by = auth.uid())));

CREATE POLICY "Site relationships follow site permissions" ON public.site_grado_esplorazione 
    FOR ALL TO authenticated 
    USING (EXISTS (SELECT 1 FROM public.sites WHERE id = site_id AND (stato_validazione = 'published' OR created_by = auth.uid())));

CREATE POLICY "Site relationships follow site permissions" ON public.site_strutture 
    FOR ALL TO authenticated 
    USING (EXISTS (SELECT 1 FROM public.sites WHERE id = site_id AND (stato_validazione = 'published' OR created_by = auth.uid())));

CREATE POLICY "Site relationships follow site permissions" ON public.site_contesti 
    FOR ALL TO authenticated 
    USING (EXISTS (SELECT 1 FROM public.sites WHERE id = site_id AND (stato_validazione = 'published' OR created_by = auth.uid())));

CREATE POLICY "Site relationships follow site permissions" ON public.site_indicatori 
    FOR ALL TO authenticated 
    USING (EXISTS (SELECT 1 FROM public.sites WHERE id = site_id AND (stato_validazione = 'published' OR created_by = auth.uid())));

CREATE POLICY "Site relationships follow site permissions" ON public.site_ambiti 
    FOR ALL TO authenticated 
    USING (EXISTS (SELECT 1 FROM public.sites WHERE id = site_id AND (stato_validazione = 'published' OR created_by = auth.uid())));

-- Bibliografia policies
CREATE POLICY "Published biblio is publicly readable" ON public.biblio 
    FOR SELECT USING (true);

CREATE POLICY "Authenticated users can manage bibliography" ON public.biblio 
    FOR ALL TO authenticated USING (true);

CREATE POLICY "Site bibliography follows site permissions" ON public.site_biblio 
    FOR ALL TO authenticated 
    USING (EXISTS (SELECT 1 FROM public.sites WHERE id = site_id AND (stato_validazione = 'published' OR created_by = auth.uid())));

-- Media policies
CREATE POLICY "Media for published sites is publicly readable" ON public.media 
    FOR SELECT USING (EXISTS (SELECT 1 FROM public.sites WHERE id = site_id AND stato_validazione = 'published'));

CREATE POLICY "Authenticated users can view all media" ON public.media 
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can manage media" ON public.media 
    FOR INSERT TO authenticated USING (true);
    
CREATE POLICY "Media creators can update their media" ON public.media 
    FOR UPDATE TO authenticated 
    USING (EXISTS (SELECT 1 FROM public.sites WHERE id = site_id AND created_by = auth.uid()));

-- Itinerari policies
CREATE POLICY "Published itineraries are publicly readable" ON public.itinerari 
    FOR SELECT USING (published_at IS NOT NULL);

CREATE POLICY "Authenticated users can view all itineraries" ON public.itinerari 
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Creators can manage their itineraries" ON public.itinerari 
    FOR ALL TO authenticated 
    USING (auth.uid() = created_by);

CREATE POLICY "Itinerary sites follow site permissions" ON public.itinerario_sites 
    FOR ALL TO authenticated 
    USING (EXISTS (SELECT 1 FROM public.sites WHERE id = site_id AND (stato_validazione = 'published' OR created_by = auth.uid())));

-- Layer catalog policies
CREATE POLICY "Layers are publicly readable" ON public.layers 
    FOR SELECT USING (true);

CREATE POLICY "Only admins can manage layers" ON public.layers 
    FOR ALL TO authenticated 
    USING (false); -- Will be managed by admins only

-- Audit and import policies (admin only)
CREATE POLICY "Audit is admin only" ON public.audit_log 
    FOR ALL TO authenticated 
    USING (false);

CREATE POLICY "Imports are admin only" ON public.imports 
    FOR ALL TO authenticated 
    USING (false);

-- PUBLIC VIEW FOR ANONYMOUS ACCESS
CREATE VIEW public.sites_public AS
SELECT 
    s.id,
    s.toponimo,
    s.descrizione,
    s.indirizzo_libero,
    s.centroid,
    s.bbox,
    s.fonte,
    s.licenza,
    s.created_at,
    
    -- Province and Comune
    p.nome as provincia_nome,
    p.sigla as provincia_sigla,
    c.nome as comune_nome,
    
    -- Reference data as arrays
    COALESCE(
        ARRAY(
            SELECT rc.label 
            FROM public.site_cronologia sc 
            JOIN public.ref_cronologia rc ON sc.cronologia_id = rc.id 
            WHERE sc.site_id = s.id
        ), 
        ARRAY[]::TEXT[]
    ) as cronologie,
    
    COALESCE(
        ARRAY(
            SELECT rd.label 
            FROM public.site_definizione sd 
            JOIN public.ref_definizione rd ON sd.definizione_id = rd.id 
            WHERE sd.site_id = s.id
        ), 
        ARRAY[]::TEXT[]
    ) as definizioni,
    
    COALESCE(
        ARRAY(
            SELECT ri.label 
            FROM public.site_indicatori si 
            JOIN public.ref_indicatori_cultuali ri ON si.indicatore_id = ri.id 
            WHERE si.site_id = s.id
        ), 
        ARRAY[]::TEXT[]
    ) as indicatori,
    
    COALESCE(
        ARRAY(
            SELECT ra.label 
            FROM public.site_ambiti sa 
            JOIN public.ref_ambito_cultuale ra ON sa.ambito_id = ra.id 
            WHERE sa.site_id = s.id
        ), 
        ARRAY[]::TEXT[]
    ) as ambiti,
    
    -- Cover media URL (first image)
    (
        SELECT m.storage_path 
        FROM public.media m 
        WHERE m.site_id = s.id AND m.tipo = 'image' 
        ORDER BY m.ordine, m.created_at 
        LIMIT 1
    ) as cover_media_url,
    
    -- Description snippet (first 200 chars)
    CASE 
        WHEN LENGTH(s.descrizione) > 200 
        THEN SUBSTRING(s.descrizione FROM 1 FOR 200) || '...'
        ELSE s.descrizione 
    END as descrizione_snippet,
    
    -- Permalink
    '/s/' || s.id as permalink

FROM public.sites s
LEFT JOIN public.province p ON s.provincia_id = p.id
LEFT JOIN public.comuni c ON s.comune_id = c.id
WHERE s.stato_validazione = 'published';

-- RPC FUNCTIONS FOR SEARCH AND EXPORT

-- Advanced search function
CREATE OR REPLACE FUNCTION public.rpc_search_sites(
    q TEXT DEFAULT NULL,
    bbox GEOMETRY DEFAULT NULL,
    cronologie UUID[] DEFAULT NULL,
    definizioni UUID[] DEFAULT NULL,
    indicatori UUID[] DEFAULT NULL,
    ambiti UUID[] DEFAULT NULL,
    provincia_ids UUID[] DEFAULT NULL,
    comune_ids UUID[] DEFAULT NULL,
    p_limit INTEGER DEFAULT 50,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    sites JSONB,
    total_count BIGINT
) 
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    query_text TEXT;
    where_conditions TEXT[] := ARRAY[]::TEXT[];
    total BIGINT;
BEGIN
    -- Build WHERE conditions
    
    -- Full-text search
    IF q IS NOT NULL AND LENGTH(TRIM(q)) > 0 THEN
        where_conditions := array_append(where_conditions, 
            'to_tsvector(''italian'', s.toponimo || '' '' || COALESCE(s.descrizione, '''')) @@ plainto_tsquery(''italian'', ''' || q || ''')');
    END IF;
    
    -- Spatial filter
    IF bbox IS NOT NULL THEN
        where_conditions := array_append(where_conditions, 
            'ST_Intersects(s.centroid, ''' || bbox::text || ''')');
    END IF;
    
    -- Province filter
    IF provincia_ids IS NOT NULL AND array_length(provincia_ids, 1) > 0 THEN
        where_conditions := array_append(where_conditions, 
            's.provincia_id = ANY(''' || provincia_ids::text || ''')');
    END IF;
    
    -- Comune filter
    IF comune_ids IS NOT NULL AND array_length(comune_ids, 1) > 0 THEN
        where_conditions := array_append(where_conditions, 
            's.comune_id = ANY(''' || comune_ids::text || ''')');
    END IF;
    
    -- Cronologie filter
    IF cronologie IS NOT NULL AND array_length(cronologie, 1) > 0 THEN
        where_conditions := array_append(where_conditions, 
            'EXISTS (SELECT 1 FROM public.site_cronologia sc WHERE sc.site_id = s.id AND sc.cronologia_id = ANY(''' || cronologie::text || '''))');
    END IF;
    
    -- Definizioni filter
    IF definizioni IS NOT NULL AND array_length(definizioni, 1) > 0 THEN
        where_conditions := array_append(where_conditions, 
            'EXISTS (SELECT 1 FROM public.site_definizione sd WHERE sd.site_id = s.id AND sd.definizione_id = ANY(''' || definizioni::text || '''))');
    END IF;
    
    -- Indicatori filter
    IF indicatori IS NOT NULL AND array_length(indicatori, 1) > 0 THEN
        where_conditions := array_append(where_conditions, 
            'EXISTS (SELECT 1 FROM public.site_indicatori si WHERE si.site_id = s.id AND si.indicatore_id = ANY(''' || indicatori::text || '''))');
    END IF;
    
    -- Ambiti filter
    IF ambiti IS NOT NULL AND array_length(ambiti, 1) > 0 THEN
        where_conditions := array_append(where_conditions, 
            'EXISTS (SELECT 1 FROM public.site_ambiti sa WHERE sa.site_id = s.id AND sa.ambito_id = ANY(''' || ambiti::text || '''))');
    END IF;
    
    -- Build final query
    query_text := 'SELECT json_agg(row_to_json(sp.*)) as sites, COUNT(*) OVER() as total_count
                   FROM public.sites_public sp';
    
    IF array_length(where_conditions, 1) > 0 THEN
        -- Need to join with sites table for complex filters
        query_text := 'SELECT json_agg(row_to_json(sp.*)) as sites, COUNT(*) OVER() as total_count
                       FROM public.sites_public sp 
                       JOIN public.sites s ON s.id = sp.id
                       WHERE ' || array_to_string(where_conditions, ' AND ');
    END IF;
    
    query_text := query_text || ' ORDER BY sp.created_at DESC LIMIT ' || p_limit || ' OFFSET ' || p_offset;
    
    RETURN QUERY EXECUTE query_text;
END;
$$;

-- Export sites as GeoJSON
CREATE OR REPLACE FUNCTION public.rpc_site_geojson(site_ids UUID[])
RETURNS JSONB 
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    result JSONB;
BEGIN
    SELECT jsonb_build_object(
        'type', 'FeatureCollection',
        'features', COALESCE(json_agg(feature), '[]'::json)
    ) INTO result
    FROM (
        SELECT jsonb_build_object(
            'type', 'Feature',
            'id', s.id,
            'geometry', ST_AsGeoJSON(s.centroid)::jsonb,
            'properties', jsonb_build_object(
                'toponimo', s.toponimo,
                'descrizione', s.descrizione,
                'provincia', p.nome,
                'comune', c.nome,
                'cronologie', COALESCE(
                    ARRAY(
                        SELECT rc.label 
                        FROM public.site_cronologia sc 
                        JOIN public.ref_cronologia rc ON sc.cronologia_id = rc.id 
                        WHERE sc.site_id = s.id
                    ), 
                    ARRAY[]::TEXT[]
                ),
                'definizioni', COALESCE(
                    ARRAY(
                        SELECT rd.label 
                        FROM public.site_definizione sd 
                        JOIN public.ref_definizione rd ON sd.definizione_id = rd.id 
                        WHERE sd.site_id = s.id
                    ), 
                    ARRAY[]::TEXT[]
                ),
                'indicatori', COALESCE(
                    ARRAY(
                        SELECT ri.label 
                        FROM public.site_indicatori si 
                        JOIN public.ref_indicatori_cultuali ri ON si.indicatore_id = ri.id 
                        WHERE si.site_id = s.id
                    ), 
                    ARRAY[]::TEXT[]
                ),
                'fonte', s.fonte,
                'licenza', s.licenza
            )
        ) as feature
        FROM public.sites s
        LEFT JOIN public.province p ON s.provincia_id = p.id
        LEFT JOIN public.comuni c ON s.comune_id = c.id
        WHERE s.id = ANY(site_ids) 
          AND (s.stato_validazione = 'published' OR auth.uid() = s.created_by)
    ) features;
    
    RETURN result;
END;
$$;

-- Export function with format support
CREATE OR REPLACE FUNCTION public.rpc_export_sites(
    export_format TEXT DEFAULT 'geojson',
    filters JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB 
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    site_ids UUID[];
    result JSONB;
BEGIN
    -- Get filtered site IDs (simplified version - full implementation would use same filters as search)
    SELECT array_agg(s.id) INTO site_ids
    FROM public.sites s
    WHERE s.stato_validazione = 'published';
    
    IF export_format = 'geojson' THEN
        SELECT public.rpc_site_geojson(site_ids) INTO result;
    ELSIF export_format = 'csv' THEN
        -- CSV export would need custom formatting
        result := jsonb_build_object('error', 'CSV export not implemented yet');
    ELSE
        result := jsonb_build_object('error', 'Unsupported format');
    END IF;
    
    RETURN result;
END;
$$;