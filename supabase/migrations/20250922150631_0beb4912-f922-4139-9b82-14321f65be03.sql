-- Fix Function Search Path Mutable issues by setting secure search_path

-- Update rpc_upsert_site function with secure search_path
CREATE OR REPLACE FUNCTION public.rpc_upsert_site(payload jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    site_record record;
    site_uuid uuid;
    coord_lon double precision;
    coord_lat double precision;
    geom_point geometry;
BEGIN
    -- Validate required fields
    IF (payload->>'toponimo') IS NULL OR trim(payload->>'toponimo') = '' THEN
        RAISE EXCEPTION 'toponimo is required';
    END IF;
    
    IF (payload->>'descrizione') IS NULL OR trim(payload->>'descrizione') = '' THEN
        RAISE EXCEPTION 'descrizione is required';
    END IF;
    
    IF (payload->>'ubicazione_confidenza_id') IS NULL THEN
        RAISE EXCEPTION 'ubicazione_confidenza_id is required';
    END IF;
    
    -- Extract coordinates if provided
    IF (payload->'coordinates'->>'lon') IS NOT NULL AND (payload->'coordinates'->>'lat') IS NOT NULL THEN
        coord_lon := (payload->'coordinates'->>'lon')::double precision;
        coord_lat := (payload->'coordinates'->>'lat')::double precision;
        geom_point := ST_SetSRID(ST_MakePoint(coord_lon, coord_lat), 4326);
    END IF;
    
    -- If updating existing site
    IF (payload->>'id') IS NOT NULL THEN
        site_uuid := (payload->>'id')::uuid;
        
        -- Update main sites table
        UPDATE sites SET
            toponimo = payload->>'toponimo',
            descrizione = payload->>'descrizione',
            ubicazione_confidenza_id = (payload->>'ubicazione_confidenza_id')::uuid,
            posizione_id = CASE WHEN payload->>'posizione_id' != '' THEN (payload->>'posizione_id')::uuid ELSE NULL END,
            indirizzo_libero = payload->>'indirizzo_libero',
            fonte = payload->>'fonte',
            geom_point = COALESCE(geom_point, geom_point),
            updated_at = now()
        WHERE id = site_uuid AND created_by = auth.uid();
        
        IF NOT FOUND THEN
            RAISE EXCEPTION 'Site not found or access denied';
        END IF;
    ELSE
        -- Insert new site
        site_uuid := gen_random_uuid();
        
        INSERT INTO sites (
            id, toponimo, descrizione, ubicazione_confidenza_id, posizione_id,
            indirizzo_libero, fonte, geom_point, created_by, stato_validazione
        ) VALUES (
            site_uuid,
            payload->>'toponimo',
            payload->>'descrizione', 
            (payload->>'ubicazione_confidenza_id')::uuid,
            CASE WHEN payload->>'posizione_id' != '' THEN (payload->>'posizione_id')::uuid ELSE NULL END,
            payload->>'indirizzo_libero',
            payload->>'fonte',
            geom_point,
            auth.uid(),
            'draft'::stato_validazione
        );
    END IF;
    
    -- Handle M:N relationships
    -- Clear existing relationships
    DELETE FROM site_cronologia WHERE site_id = site_uuid;
    DELETE FROM site_definizione WHERE site_id = site_uuid;
    DELETE FROM site_tipo_rinvenimento WHERE site_id = site_uuid;
    DELETE FROM site_grado_esplorazione WHERE site_id = site_uuid;
    DELETE FROM site_strutture WHERE site_id = site_uuid;
    DELETE FROM site_contesti WHERE site_id = site_uuid;
    DELETE FROM site_indicatori WHERE site_id = site_uuid;
    DELETE FROM site_ambiti WHERE site_id = site_uuid;
    
    -- Insert new relationships from arrays
    IF payload->'cronologia_ids' IS NOT NULL THEN
        INSERT INTO site_cronologia (site_id, cronologia_id)
        SELECT site_uuid, (value->>'id')::uuid
        FROM jsonb_array_elements(payload->'cronologia_ids');
    END IF;
    
    IF payload->'definizione_ids' IS NOT NULL THEN
        INSERT INTO site_definizione (site_id, definizione_id)
        SELECT site_uuid, (value->>'id')::uuid
        FROM jsonb_array_elements(payload->'definizione_ids');
    END IF;
    
    IF payload->'tipo_rinvenimento_ids' IS NOT NULL THEN
        INSERT INTO site_tipo_rinvenimento (site_id, tipo_rinvenimento_id)
        SELECT site_uuid, (value->>'id')::uuid
        FROM jsonb_array_elements(payload->'tipo_rinvenimento_ids');
    END IF;
    
    IF payload->'grado_esplorazione_ids' IS NOT NULL THEN
        INSERT INTO site_grado_esplorazione (site_id, grado_id)
        SELECT site_uuid, (value->>'id')::uuid
        FROM jsonb_array_elements(payload->'grado_esplorazione_ids');
    END IF;
    
    IF payload->'strutture_ids' IS NOT NULL THEN
        INSERT INTO site_strutture (site_id, struttura_id)
        SELECT site_uuid, (value->>'id')::uuid
        FROM jsonb_array_elements(payload->'strutture_ids');
    END IF;
    
    IF payload->'contesti_ids' IS NOT NULL THEN
        INSERT INTO site_contesti (site_id, contesto_id)
        SELECT site_uuid, (value->>'id')::uuid
        FROM jsonb_array_elements(payload->'contesti_ids');
    END IF;
    
    IF payload->'indicatori_ids' IS NOT NULL THEN
        INSERT INTO site_indicatori (site_id, indicatore_id)
        SELECT site_uuid, (value->>'id')::uuid
        FROM jsonb_array_elements(payload->'indicatori_ids');
    END IF;
    
    IF payload->'ambiti_ids' IS NOT NULL THEN
        INSERT INTO site_ambiti (site_id, ambito_id)
        SELECT site_uuid, (value->>'id')::uuid
        FROM jsonb_array_elements(payload->'ambiti_ids');
    END IF;
    
    RETURN site_uuid;
END;
$$;

-- Update rpc_get_lookups function with secure search_path
CREATE OR REPLACE FUNCTION public.rpc_get_lookups()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    result jsonb;
BEGIN
    SELECT jsonb_build_object(
        'ubicazione_confidenza', (
            SELECT jsonb_agg(jsonb_build_object('id', id, 'label', label, 'sort_order', sort_order))
            FROM ref_ubicazione_confidenza 
            WHERE is_active = true 
            ORDER BY sort_order, label
        ),
        'posizione', (
            SELECT jsonb_agg(jsonb_build_object('id', id, 'label', label, 'sort_order', sort_order))
            FROM ref_posizione 
            WHERE is_active = true 
            ORDER BY sort_order, label
        ),
        'cronologia', (
            SELECT jsonb_agg(jsonb_build_object('id', id, 'label', label, 'sort_order', sort_order))
            FROM ref_cronologia 
            WHERE is_active = true 
            ORDER BY sort_order, label
        ),
        'definizione', (
            SELECT jsonb_agg(jsonb_build_object('id', id, 'label', label, 'sort_order', sort_order))
            FROM ref_definizione 
            WHERE is_active = true 
            ORDER BY sort_order, label
        ),
        'tipo_rinvenimento', (
            SELECT jsonb_agg(jsonb_build_object('id', id, 'label', label, 'sort_order', sort_order))
            FROM ref_tipo_rinvenimento 
            WHERE is_active = true 
            ORDER BY sort_order, label
        ),
        'grado_esplorazione', (
            SELECT jsonb_agg(jsonb_build_object('id', id, 'label', label, 'sort_order', sort_order))
            FROM ref_grado_esplorazione 
            WHERE is_active = true 
            ORDER BY sort_order, label
        ),
        'strutture_componenti', (
            SELECT jsonb_agg(jsonb_build_object('id', id, 'label', label, 'sort_order', sort_order))
            FROM ref_strutture_componenti 
            WHERE is_active = true 
            ORDER BY sort_order, label
        ),
        'contesti_stratigrafici', (
            SELECT jsonb_agg(jsonb_build_object('id', id, 'label', label, 'sort_order', sort_order))
            FROM ref_contesti_stratigrafici 
            WHERE is_active = true 
            ORDER BY sort_order, label
        ),
        'indicatori_cultuali', (
            SELECT jsonb_agg(jsonb_build_object('id', id, 'label', label, 'sort_order', sort_order))
            FROM ref_indicatori_cultuali 
            WHERE is_active = true 
            ORDER BY sort_order, label
        ),
        'ambito_cultuale', (
            SELECT jsonb_agg(jsonb_build_object('id', id, 'label', label, 'sort_order', sort_order))
            FROM ref_ambito_cultuale 
            WHERE is_active = true 
            ORDER BY sort_order, label
        )
    ) INTO result;
    
    RETURN result;
END;
$$;

-- Update rpc_list_sites_bbox function with secure search_path
CREATE OR REPLACE FUNCTION public.rpc_list_sites_bbox(bbox_geom geometry DEFAULT NULL, include_drafts boolean DEFAULT false)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    result jsonb;
    query_text text;
BEGIN
    -- Build the base query
    query_text := '
        SELECT jsonb_build_object(
            ''type'', ''FeatureCollection'',
            ''features'', jsonb_agg(
                jsonb_build_object(
                    ''type'', ''Feature'',
                    ''id'', s.id,
                    ''geometry'', ST_AsGeoJSON(s.geom_point)::jsonb,
                    ''properties'', jsonb_build_object(
                        ''id'', s.id,
                        ''toponimo'', s.toponimo,
                        ''descrizione'', s.descrizione,
                        ''stato_validazione'', s.stato_validazione,
                        ''is_owner'', CASE WHEN s.created_by = auth.uid() THEN true ELSE false END
                    )
                )
            )
        )
        FROM sites s
        WHERE s.geom_point IS NOT NULL';
    
    -- Add filters based on parameters
    IF NOT include_drafts THEN
        query_text := query_text || ' AND s.stato_validazione = ''published''';
    ELSE
        query_text := query_text || ' AND (s.stato_validazione = ''published'' OR s.created_by = auth.uid())';
    END IF;
    
    IF bbox_geom IS NOT NULL THEN
        query_text := query_text || ' AND ST_Intersects(s.geom_point, $1)';
        EXECUTE query_text INTO result USING bbox_geom;
    ELSE
        EXECUTE query_text INTO result;
    END IF;
    
    -- Return empty FeatureCollection if no results
    IF result IS NULL THEN
        result := jsonb_build_object(
            'type', 'FeatureCollection',
            'features', jsonb_build_array()
        );
    END IF;
    
    RETURN result;
END;
$$;

-- Enable RLS on spatial_ref_sys table (this is a PostGIS system table)
-- Note: This table contains coordinate system definitions and should be publicly readable
ALTER TABLE public.spatial_ref_sys ENABLE ROW LEVEL SECURITY;

-- Create a policy to allow public read access to spatial_ref_sys
CREATE POLICY "Allow public read access to spatial_ref_sys"
    ON public.spatial_ref_sys
    FOR SELECT
    USING (true);