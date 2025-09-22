-- Fix security issue: set immutable search_path for rpc_upsert_site function
DROP FUNCTION IF EXISTS public.rpc_upsert_site(jsonb);

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
    new_geom_point geometry;
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
        new_geom_point := ST_SetSRID(ST_MakePoint(coord_lon, coord_lat), 4326);
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
            geom_point = COALESCE(new_geom_point, sites.geom_point),
            stato_validazione = COALESCE((payload->>'stato_validazione')::stato_validazione, stato_validazione),
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
            new_geom_point,
            auth.uid(),
            COALESCE((payload->>'stato_validazione')::stato_validazione, 'draft'::stato_validazione)
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
    IF payload->'cronologia_ids' IS NOT NULL AND jsonb_array_length(payload->'cronologia_ids') > 0 THEN
        INSERT INTO site_cronologia (site_id, cronologia_id)
        SELECT site_uuid, CASE 
            WHEN jsonb_typeof(value) = 'string' THEN value::text::uuid
            ELSE (value->>'id')::uuid
        END
        FROM jsonb_array_elements(payload->'cronologia_ids')
        WHERE CASE 
            WHEN jsonb_typeof(value) = 'string' THEN value::text != ''
            ELSE (value->>'id') IS NOT NULL AND (value->>'id') != ''
        END;
    END IF;
    
    IF payload->'definizione_ids' IS NOT NULL AND jsonb_array_length(payload->'definizione_ids') > 0 THEN
        INSERT INTO site_definizione (site_id, definizione_id)
        SELECT site_uuid, CASE 
            WHEN jsonb_typeof(value) = 'string' THEN value::text::uuid
            ELSE (value->>'id')::uuid
        END
        FROM jsonb_array_elements(payload->'definizione_ids')
        WHERE CASE 
            WHEN jsonb_typeof(value) = 'string' THEN value::text != ''
            ELSE (value->>'id') IS NOT NULL AND (value->>'id') != ''
        END;
    END IF;
    
    IF payload->'tipo_rinvenimento_ids' IS NOT NULL AND jsonb_array_length(payload->'tipo_rinvenimento_ids') > 0 THEN
        INSERT INTO site_tipo_rinvenimento (site_id, tipo_rinvenimento_id)
        SELECT site_uuid, CASE 
            WHEN jsonb_typeof(value) = 'string' THEN value::text::uuid
            ELSE (value->>'id')::uuid
        END
        FROM jsonb_array_elements(payload->'tipo_rinvenimento_ids')
        WHERE CASE 
            WHEN jsonb_typeof(value) = 'string' THEN value::text != ''
            ELSE (value->>'id') IS NOT NULL AND (value->>'id') != ''
        END;
    END IF;
    
    IF payload->'grado_esplorazione_ids' IS NOT NULL AND jsonb_array_length(payload->'grado_esplorazione_ids') > 0 THEN
        INSERT INTO site_grado_esplorazione (site_id, grado_id)
        SELECT site_uuid, CASE 
            WHEN jsonb_typeof(value) = 'string' THEN value::text::uuid
            ELSE (value->>'id')::uuid
        END
        FROM jsonb_array_elements(payload->'grado_esplorazione_ids')
        WHERE CASE 
            WHEN jsonb_typeof(value) = 'string' THEN value::text != ''
            ELSE (value->>'id') IS NOT NULL AND (value->>'id') != ''
        END;
    END IF;
    
    IF payload->'strutture_ids' IS NOT NULL AND jsonb_array_length(payload->'strutture_ids') > 0 THEN
        INSERT INTO site_strutture (site_id, struttura_id)
        SELECT site_uuid, CASE 
            WHEN jsonb_typeof(value) = 'string' THEN value::text::uuid
            ELSE (value->>'id')::uuid
        END
        FROM jsonb_array_elements(payload->'strutture_ids')
        WHERE CASE 
            WHEN jsonb_typeof(value) = 'string' THEN value::text != ''
            ELSE (value->>'id') IS NOT NULL AND (value->>'id') != ''
        END;
    END IF;
    
    IF payload->'contesti_ids' IS NOT NULL AND jsonb_array_length(payload->'contesti_ids') > 0 THEN
        INSERT INTO site_contesti (site_id, contesto_id)
        SELECT site_uuid, CASE 
            WHEN jsonb_typeof(value) = 'string' THEN value::text::uuid
            ELSE (value->>'id')::uuid
        END
        FROM jsonb_array_elements(payload->'contesti_ids')
        WHERE CASE 
            WHEN jsonb_typeof(value) = 'string' THEN value::text != ''
            ELSE (value->>'id') IS NOT NULL AND (value->>'id') != ''
        END;
    END IF;
    
    IF payload->'indicatori_ids' IS NOT NULL AND jsonb_array_length(payload->'indicatori_ids') > 0 THEN
        INSERT INTO site_indicatori (site_id, indicatore_id)
        SELECT site_uuid, CASE 
            WHEN jsonb_typeof(value) = 'string' THEN value::text::uuid
            ELSE (value->>'id')::uuid
        END
        FROM jsonb_array_elements(payload->'indicatori_ids')
        WHERE CASE 
            WHEN jsonb_typeof(value) = 'string' THEN value::text != ''
            ELSE (value->>'id') IS NOT NULL AND (value->>'id') != ''
        END;
    END IF;
    
    IF payload->'ambiti_ids' IS NOT NULL AND jsonb_array_length(payload->'ambiti_ids') > 0 THEN
        INSERT INTO site_ambiti (site_id, ambito_id)
        SELECT site_uuid, CASE 
            WHEN jsonb_typeof(value) = 'string' THEN value::text::uuid
            ELSE (value->>'id')::uuid
        END
        FROM jsonb_array_elements(payload->'ambiti_ids')
        WHERE CASE 
            WHEN jsonb_typeof(value) = 'string' THEN value::text != ''
            ELSE (value->>'id') IS NOT NULL AND (value->>'id') != ''
        END;
    END IF;
    
    RETURN site_uuid;
END;
$$;