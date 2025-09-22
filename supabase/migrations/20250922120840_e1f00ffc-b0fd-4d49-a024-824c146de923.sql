-- Fix function search_path issues for MVT functions to make them secure

-- Fix function search_path for MVT functions to make them secure definer
CREATE OR REPLACE FUNCTION public.mvt_sites_tile(
    z INTEGER,
    x INTEGER,
    y INTEGER,
    definizione_filters TEXT[] DEFAULT NULL,
    cronologia_filters TEXT[] DEFAULT NULL,
    ambito_filters TEXT[] DEFAULT NULL
)
RETURNS BYTEA
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    result BYTEA;
    tile_bbox GEOMETRY;
BEGIN
    -- Get tile bounds
    tile_bbox := ST_TileEnvelope(z, x, y);
    
    -- Generate MVT
    WITH mvt_data AS (
        SELECT 
            s.id,
            s.toponimo,
            s.descrizione,
            p.nome as provincia,
            c.nome as comune,
            
            -- Arrays of related data
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
                    SELECT ra.label 
                    FROM public.site_ambiti sa 
                    JOIN public.ref_ambito_cultuale ra ON sa.ambito_id = ra.id 
                    WHERE sa.site_id = s.id
                ), 
                ARRAY[]::TEXT[]
            ) as ambiti,
            
            -- Geometry for tile
            ST_AsMVTGeom(
                s.centroid,
                tile_bbox,
                4096,
                64,
                true
            ) AS geom
            
        FROM public.sites s
        LEFT JOIN public.province p ON s.provincia_id = p.id
        LEFT JOIN public.comuni c ON s.comune_id = c.id
        WHERE 
            s.stato_validazione = 'published'
            AND s.centroid && tile_bbox
            -- Apply filters if provided
            AND (definizione_filters IS NULL OR EXISTS (
                SELECT 1 FROM public.site_definizione sd 
                JOIN public.ref_definizione rd ON sd.definizione_id = rd.id 
                WHERE sd.site_id = s.id AND rd.label = ANY(definizione_filters)
            ))
            AND (cronologia_filters IS NULL OR EXISTS (
                SELECT 1 FROM public.site_cronologia sc 
                JOIN public.ref_cronologia rc ON sc.cronologia_id = rc.id 
                WHERE sc.site_id = s.id AND rc.label = ANY(cronologia_filters)
            ))
            AND (ambito_filters IS NULL OR EXISTS (
                SELECT 1 FROM public.site_ambiti sa 
                JOIN public.ref_ambito_cultuale ra ON sa.ambito_id = ra.id 
                WHERE sa.site_id = s.id AND ra.label = ANY(ambito_filters)
            ))
    )
    SELECT ST_AsMVT(mvt_data.*, 'sites', 4096, 'geom', 'id') 
    INTO result
    FROM mvt_data 
    WHERE geom IS NOT NULL;
    
    RETURN COALESCE(result, ''::bytea);
END;
$$;

-- Fix function search_path for province MVT function
CREATE OR REPLACE FUNCTION public.mvt_province_tile(
    z INTEGER,
    x INTEGER,
    y INTEGER
)
RETURNS BYTEA
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    result BYTEA;
    tile_bbox GEOMETRY;
BEGIN
    -- Get tile bounds
    tile_bbox := ST_TileEnvelope(z, x, y);
    
    -- Generate MVT
    WITH mvt_data AS (
        SELECT 
            id,
            nome,
            sigla,
            ST_AsMVTGeom(
                geom,
                tile_bbox,
                4096,
                64,
                true
            ) AS geom
        FROM public.province
        WHERE geom && tile_bbox
    )
    SELECT ST_AsMVT(mvt_data.*, 'province', 4096, 'geom', 'id') 
    INTO result
    FROM mvt_data 
    WHERE geom IS NOT NULL;
    
    RETURN COALESCE(result, ''::bytea);
END;
$$;

-- Fix function search_path for comuni MVT function
CREATE OR REPLACE FUNCTION public.mvt_comuni_tile(
    z INTEGER,
    x INTEGER,
    y INTEGER
)
RETURNS BYTEA
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    result BYTEA;
    tile_bbox GEOMETRY;
BEGIN
    -- Get tile bounds
    tile_bbox := ST_TileEnvelope(z, x, y);
    
    -- Generate MVT
    WITH mvt_data AS (
        SELECT 
            id,
            nome,
            codice_istat,
            ST_AsMVTGeom(
                geom,
                tile_bbox,
                4096,
                64,
                true
            ) AS geom
        FROM public.comuni
        WHERE geom && tile_bbox
    )
    SELECT ST_AsMVT(mvt_data.*, 'comuni', 4096, 'geom', 'id') 
    INTO result
    FROM mvt_data 
    WHERE geom IS NOT NULL;
    
    RETURN COALESCE(result, ''::bytea);
END;
$$;