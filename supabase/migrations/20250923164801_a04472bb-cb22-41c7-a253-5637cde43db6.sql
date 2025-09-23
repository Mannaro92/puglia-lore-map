-- RPC to fetch a site with all relation arrays for editing, bypassing RLS on link tables
CREATE OR REPLACE FUNCTION public.rpc_get_site_full(p_site_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'id', s.id,
    'toponimo', s.toponimo,
    'descrizione', s.descrizione,
    'fonte', s.fonte,
    'indirizzo_libero', s.indirizzo_libero,
    'posizione_id', s.posizione_id,
    'ubicazione_confidenza_id', s.ubicazione_confidenza_id,
    'stato_validazione', s.stato_validazione,
    'geom_point', s.geom_point,
    'cronologia_ids', COALESCE((SELECT jsonb_agg(cronologia_id) FROM public.site_cronologia WHERE site_id = s.id), '[]'::jsonb),
    'definizione_ids', COALESCE((SELECT jsonb_agg(definizione_id) FROM public.site_definizione WHERE site_id = s.id), '[]'::jsonb),
    'tipo_rinvenimento_ids', COALESCE((SELECT jsonb_agg(tipo_rinvenimento_id) FROM public.site_tipo_rinvenimento WHERE site_id = s.id), '[]'::jsonb),
    'grado_esplorazione_ids', COALESCE((SELECT jsonb_agg(grado_id) FROM public.site_grado_esplorazione WHERE site_id = s.id), '[]'::jsonb),
    'strutture_ids', COALESCE((SELECT jsonb_agg(struttura_id) FROM public.site_strutture WHERE site_id = s.id), '[]'::jsonb),
    'contesti_ids', COALESCE((SELECT jsonb_agg(contesto_id) FROM public.site_contesti WHERE site_id = s.id), '[]'::jsonb),
    'indicatori_ids', COALESCE((SELECT jsonb_agg(indicatore_id) FROM public.site_indicatori WHERE site_id = s.id), '[]'::jsonb),
    'ambiti_ids', COALESCE((SELECT jsonb_agg(ambito_id) FROM public.site_ambiti WHERE site_id = s.id), '[]'::jsonb),
    'biblio_ids', COALESCE((SELECT jsonb_agg(biblio_id) FROM public.site_biblio WHERE site_id = s.id), '[]'::jsonb)
  )
  INTO result
  FROM public.sites s
  WHERE s.id = p_site_id;

  IF result IS NULL THEN
    RAISE EXCEPTION 'Site not found';
  END IF;

  RETURN result;
END;
$$;

-- Allow both anon and authenticated to execute (function is SECURITY DEFINER)
GRANT EXECUTE ON FUNCTION public.rpc_get_site_full(uuid) TO anon, authenticated;