-- Fix rpc_upsert_site function to properly handle the fonte field
CREATE OR REPLACE FUNCTION public.rpc_upsert_site(p_site_id uuid, p_payload jsonb, p_publish boolean, p_clear_geom boolean, p_user uuid)
 RETURNS sites
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_site_id UUID;
  v_lat DOUBLE PRECISION;
  v_lon DOUBLE PRECISION;
  v_has_latlon BOOLEAN;
BEGIN
  -- Extract numeric coordinates (NULL if not present or not numeric)
  BEGIN 
    v_lat := (p_payload->>'lat')::DOUBLE PRECISION; 
  EXCEPTION 
    WHEN others THEN v_lat := NULL; 
  END;
  
  BEGIN 
    v_lon := (p_payload->>'lon')::DOUBLE PRECISION; 
  EXCEPTION 
    WHEN others THEN v_lon := NULL; 
  END;
  
  v_has_latlon := v_lat IS NOT NULL AND v_lon IS NOT NULL;

  -- Prevent publishing without coordinates
  IF p_publish AND NOT v_has_latlon THEN
    -- Check if existing site has coordinates
    IF p_site_id IS NOT NULL THEN
      IF NOT EXISTS (SELECT 1 FROM sites WHERE id = p_site_id AND geom_point IS NOT NULL) THEN
        RAISE EXCEPTION 'Impossibile pubblicare: coordinate mancanti';
      END IF;
    ELSE
      RAISE EXCEPTION 'Impossibile pubblicare: coordinate mancanti';
    END IF;
  END IF;

  IF p_site_id IS NULL THEN
    -- Insert new site
    INSERT INTO public.sites (
      toponimo, 
      descrizione, 
      fonte,
      indirizzo_libero,
      comune_id,
      provincia_id,
      posizione_id,
      ubicazione_confidenza_id,
      geom_point, 
      stato_validazione, 
      created_by, 
      updated_at
    )
    VALUES (
      COALESCE(p_payload->>'toponimo',''),
      p_payload->>'descrizione',
      p_payload->>'fonte',
      p_payload->>'indirizzo_libero',
      CASE WHEN p_payload->>'comune_id' ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' 
           THEN (p_payload->>'comune_id')::UUID ELSE NULL END,
      CASE WHEN p_payload->>'provincia_id' ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' 
           THEN (p_payload->>'provincia_id')::UUID ELSE NULL END,
      CASE WHEN p_payload->>'posizione_id' ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' 
           THEN (p_payload->>'posizione_id')::UUID ELSE NULL END,
      CASE WHEN p_payload->>'ubicazione_confidenza_id' ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' 
           THEN (p_payload->>'ubicazione_confidenza_id')::UUID ELSE NULL END,
      CASE WHEN v_has_latlon THEN ST_SetSRID(ST_MakePoint(v_lon, v_lat), 4326) ELSE NULL END,
      'draft',
      COALESCE(p_user, auth.uid()),
      now()
    )
    RETURNING id INTO v_site_id;
  ELSE
    -- Update existing site
    UPDATE public.sites s
    SET
      toponimo = COALESCE(p_payload->>'toponimo', s.toponimo),
      descrizione = COALESCE(p_payload->>'descrizione', s.descrizione),
      fonte = CASE WHEN p_payload ? 'fonte' THEN p_payload->>'fonte' ELSE s.fonte END,
      indirizzo_libero = COALESCE(p_payload->>'indirizzo_libero', s.indirizzo_libero),
      comune_id = CASE WHEN p_payload ? 'comune_id' THEN
        CASE WHEN p_payload->>'comune_id' ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' 
             THEN (p_payload->>'comune_id')::UUID ELSE NULL END
        ELSE s.comune_id END,
      provincia_id = CASE WHEN p_payload ? 'provincia_id' THEN
        CASE WHEN p_payload->>'provincia_id' ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' 
             THEN (p_payload->>'provincia_id')::UUID ELSE NULL END
        ELSE s.provincia_id END,
      posizione_id = CASE WHEN p_payload ? 'posizione_id' THEN
        CASE WHEN p_payload->>'posizione_id' ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' 
             THEN (p_payload->>'posizione_id')::UUID ELSE NULL END
        ELSE s.posizione_id END,
      ubicazione_confidenza_id = CASE WHEN p_payload ? 'ubicazione_confidenza_id' THEN
        CASE WHEN p_payload->>'ubicazione_confidenza_id' ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' 
             THEN (p_payload->>'ubicazione_confidenza_id')::UUID ELSE NULL END
        ELSE s.ubicazione_confidenza_id END,
      geom_point = CASE
        WHEN p_clear_geom THEN NULL
        WHEN v_has_latlon THEN ST_SetSRID(ST_MakePoint(v_lon, v_lat), 4326)
        ELSE s.geom_point
      END,
      updated_at = now()
    WHERE s.id = p_site_id
    RETURNING id INTO v_site_id;
  END IF;

  -- Handle publishing
  IF p_publish THEN
    UPDATE public.sites
    SET 
      stato_validazione = 'published',
      updated_at = now()
    WHERE id = v_site_id;
  END IF;

  -- Return the updated site
  RETURN (SELECT s FROM public.sites s WHERE s.id = v_site_id);
END;
$function$