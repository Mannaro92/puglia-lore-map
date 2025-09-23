-- Fix Function Search Path Mutable security issue
-- Update rpc_upsert_site function to include SET search_path

CREATE OR REPLACE FUNCTION public.rpc_upsert_site(site_data jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    site_id uuid;
    result jsonb;
BEGIN
    -- Extract site ID if provided
    site_id := (site_data->>'id')::uuid;
    
    -- If no ID provided, this is an insert
    IF site_id IS NULL THEN
        INSERT INTO sites (
            toponimo,
            descrizione,
            fonte,
            indirizzo_libero,
            geom_point,
            geom_area,
            comune_id,
            provincia_id,
            posizione_id,
            ubicazione_confidenza_id,
            licenza,
            created_by
        ) VALUES (
            site_data->>'toponimo',
            site_data->>'descrizione',
            site_data->>'fonte',
            site_data->>'indirizzo_libero',
            CASE 
                WHEN site_data->>'geom_point' IS NOT NULL 
                THEN ST_GeomFromGeoJSON(site_data->>'geom_point')
                ELSE NULL
            END,
            CASE 
                WHEN site_data->>'geom_area' IS NOT NULL 
                THEN ST_GeomFromGeoJSON(site_data->>'geom_area')
                ELSE NULL
            END,
            (site_data->>'comune_id')::uuid,
            (site_data->>'provincia_id')::uuid,
            (site_data->>'posizione_id')::uuid,
            (site_data->>'ubicazione_confidenza_id')::uuid,
            COALESCE(site_data->>'licenza', 'CC BY 4.0'),
            auth.uid()
        ) RETURNING id INTO site_id;
    ELSE
        -- This is an update
        UPDATE sites SET
            toponimo = site_data->>'toponimo',
            descrizione = site_data->>'descrizione',
            fonte = site_data->>'fonte',
            indirizzo_libero = site_data->>'indirizzo_libero',
            geom_point = CASE 
                WHEN site_data->>'geom_point' IS NOT NULL 
                THEN ST_GeomFromGeoJSON(site_data->>'geom_point')
                ELSE geom_point
            END,
            geom_area = CASE 
                WHEN site_data->>'geom_area' IS NOT NULL 
                THEN ST_GeomFromGeoJSON(site_data->>'geom_area')
                ELSE geom_area
            END,
            comune_id = (site_data->>'comune_id')::uuid,
            provincia_id = (site_data->>'provincia_id')::uuid,
            posizione_id = (site_data->>'posizione_id')::uuid,
            ubicazione_confidenza_id = (site_data->>'ubicazione_confidenza_id')::uuid,
            licenza = COALESCE(site_data->>'licenza', licenza),
            updated_at = now()
        WHERE id = site_id
        AND (created_by = auth.uid() OR created_by = '00000000-0000-0000-0000-000000000000'::uuid OR created_by IS NULL);
    END IF;
    
    -- Return the site data
    SELECT jsonb_build_object(
        'id', site_id,
        'success', true
    ) INTO result;
    
    RETURN result;
END;
$$;