-- Update rpc_upsert_site to also sync relation tables atomically (bypassing RLS)
-- The function remains SECURITY DEFINER and will update link tables only if arrays are provided in p_payload

CREATE OR REPLACE FUNCTION public.rpc_upsert_site(
  p_site_id uuid,
  p_payload jsonb,
  p_publish boolean,
  p_clear_geom boolean,
  p_user uuid
)
RETURNS sites
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
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

  -- === Sync relation tables (only when corresponding arrays are provided) ===
  -- Helper macro via repeated blocks to keep function simple and explicit

  -- Cronologia
  IF (p_payload ? 'cronologia_ids') OR (p_payload ? 'cronologie') THEN
    DELETE FROM public.site_cronologia WHERE site_id = v_site_id;
    INSERT INTO public.site_cronologia (site_id, cronologia_id)
    SELECT v_site_id, value::uuid
    FROM jsonb_array_elements_text(COALESCE(p_payload->'cronologia_ids', p_payload->'cronologie'))
    WHERE value ~ '^[0-9a-f-]{36}$';
  END IF;

  -- Definizione
  IF (p_payload ? 'definizione_ids') OR (p_payload ? 'definizioni') THEN
    DELETE FROM public.site_definizione WHERE site_id = v_site_id;
    INSERT INTO public.site_definizione (site_id, definizione_id)
    SELECT v_site_id, value::uuid
    FROM jsonb_array_elements_text(COALESCE(p_payload->'definizione_ids', p_payload->'definizioni'))
    WHERE value ~ '^[0-9a-f-]{36}$';
  END IF;

  -- Tipo rinvenimento
  IF (p_payload ? 'tipo_rinvenimento_ids') OR (p_payload ? 'tipi_rinvenimento') THEN
    DELETE FROM public.site_tipo_rinvenimento WHERE site_id = v_site_id;
    INSERT INTO public.site_tipo_rinvenimento (site_id, tipo_rinvenimento_id)
    SELECT v_site_id, value::uuid
    FROM jsonb_array_elements_text(COALESCE(p_payload->'tipo_rinvenimento_ids', p_payload->'tipi_rinvenimento'))
    WHERE value ~ '^[0-9a-f-]{36}$';
  END IF;

  -- Grado esplorazione
  IF (p_payload ? 'grado_esplorazione_ids') OR (p_payload ? 'gradi_esplorazione') THEN
    DELETE FROM public.site_grado_esplorazione WHERE site_id = v_site_id;
    INSERT INTO public.site_grado_esplorazione (site_id, grado_id)
    SELECT v_site_id, value::uuid
    FROM jsonb_array_elements_text(COALESCE(p_payload->'grado_esplorazione_ids', p_payload->'gradi_esplorazione'))
    WHERE value ~ '^[0-9a-f-]{36}$';
  END IF;

  -- Strutture
  IF (p_payload ? 'strutture_ids') OR (p_payload ? 'strutture') THEN
    DELETE FROM public.site_strutture WHERE site_id = v_site_id;
    INSERT INTO public.site_strutture (site_id, struttura_id)
    SELECT v_site_id, value::uuid
    FROM jsonb_array_elements_text(COALESCE(p_payload->'strutture_ids', p_payload->'strutture'))
    WHERE value ~ '^[0-9a-f-]{36}$';
  END IF;

  -- Contesti
  IF (p_payload ? 'contesti_ids') OR (p_payload ? 'contesti') THEN
    DELETE FROM public.site_contesti WHERE site_id = v_site_id;
    INSERT INTO public.site_contesti (site_id, contesto_id)
    SELECT v_site_id, value::uuid
    FROM jsonb_array_elements_text(COALESCE(p_payload->'contesti_ids', p_payload->'contesti'))
    WHERE value ~ '^[0-9a-f-]{36}$';
  END IF;

  -- Indicatori
  IF (p_payload ? 'indicatori_ids') OR (p_payload ? 'indicatori') THEN
    DELETE FROM public.site_indicatori WHERE site_id = v_site_id;
    INSERT INTO public.site_indicatori (site_id, indicatore_id)
    SELECT v_site_id, value::uuid
    FROM jsonb_array_elements_text(COALESCE(p_payload->'indicatori_ids', p_payload->'indicatori'))
    WHERE value ~ '^[0-9a-f-]{36}$';
  END IF;

  -- Ambiti
  IF (p_payload ? 'ambiti_ids') OR (p_payload ? 'ambiti') THEN
    DELETE FROM public.site_ambiti WHERE site_id = v_site_id;
    INSERT INTO public.site_ambiti (site_id, ambito_id)
    SELECT v_site_id, value::uuid
    FROM jsonb_array_elements_text(COALESCE(p_payload->'ambiti_ids', p_payload->'ambiti'))
    WHERE value ~ '^[0-9a-f-]{36}$';
  END IF;

  -- Biblio
  IF (p_payload ? 'biblio_ids') OR (p_payload ? 'bibliografie') THEN
    DELETE FROM public.site_biblio WHERE site_id = v_site_id;
    INSERT INTO public.site_biblio (site_id, biblio_id)
    SELECT v_site_id, value::uuid
    FROM jsonb_array_elements_text(COALESCE(p_payload->'biblio_ids', p_payload->'bibliografie'))
    WHERE value ~ '^[0-9a-f-]{36}$';
  END IF;

  -- Handle publishing (after relations are synced)
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
$$;