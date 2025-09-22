-- Create function to get complete POI data with all metadata
CREATE OR REPLACE FUNCTION public.rpc_get_poi_detail(poi_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
  cronologie_array text[];
  definizioni_array text[];
  ambiti_array text[];
  indicatori_array text[];
  strutture_array text[];
  contesti_array text[];
  tipi_rinvenimento_array text[];
  gradi_esplorazione_array text[];
BEGIN
  -- Get cronologie
  SELECT ARRAY(
    SELECT rc.label 
    FROM site_cronologia sc
    JOIN ref_cronologia rc ON sc.cronologia_id = rc.id
    WHERE sc.site_id = poi_id AND rc.is_active = true
    ORDER BY rc.sort_order, rc.label
  ) INTO cronologie_array;

  -- Get definizioni  
  SELECT ARRAY(
    SELECT rd.label
    FROM site_definizione sd
    JOIN ref_definizione rd ON sd.definizione_id = rd.id
    WHERE sd.site_id = poi_id AND rd.is_active = true
    ORDER BY rd.sort_order, rd.label
  ) INTO definizioni_array;

  -- Get ambiti
  SELECT ARRAY(
    SELECT ra.label
    FROM site_ambiti sa
    JOIN ref_ambito_cultuale ra ON sa.ambito_id = ra.id
    WHERE sa.site_id = poi_id AND ra.is_active = true
    ORDER BY ra.sort_order, ra.label
  ) INTO ambiti_array;

  -- Get indicatori
  SELECT ARRAY(
    SELECT ri.label
    FROM site_indicatori si
    JOIN ref_indicatori_cultuali ri ON si.indicatore_id = ri.id
    WHERE si.site_id = poi_id AND ri.is_active = true
    ORDER BY ri.sort_order, ri.label
  ) INTO indicatori_array;

  -- Get strutture
  SELECT ARRAY(
    SELECT rs.label
    FROM site_strutture ss
    JOIN ref_strutture_componenti rs ON ss.struttura_id = rs.id
    WHERE ss.site_id = poi_id AND rs.is_active = true
    ORDER BY rs.sort_order, rs.label
  ) INTO strutture_array;

  -- Get contesti
  SELECT ARRAY(
    SELECT rcs.label
    FROM site_contesti sc
    JOIN ref_contesti_stratigrafici rcs ON sc.contesto_id = rcs.id
    WHERE sc.site_id = poi_id AND rcs.is_active = true
    ORDER BY rcs.sort_order, rcs.label
  ) INTO contesti_array;

  -- Get tipi rinvenimento
  SELECT ARRAY(
    SELECT rtr.label
    FROM site_tipo_rinvenimento str
    JOIN ref_tipo_rinvenimento rtr ON str.tipo_rinvenimento_id = rtr.id
    WHERE str.site_id = poi_id AND rtr.is_active = true
    ORDER BY rtr.sort_order, rtr.label
  ) INTO tipi_rinvenimento_array;

  -- Get gradi esplorazione
  SELECT ARRAY(
    SELECT rge.label
    FROM site_grado_esplorazione sge
    JOIN ref_grado_esplorazione rge ON sge.grado_id = rge.id
    WHERE sge.site_id = poi_id AND rge.is_active = true
    ORDER BY rge.sort_order, rge.label
  ) INTO gradi_esplorazione_array;

  -- Build the complete result
  SELECT to_jsonb(s.*) ||
    jsonb_build_object(
      'cronologie', cronologie_array,
      'definizioni', definizioni_array,
      'ambiti', ambiti_array,
      'indicatori', indicatori_array,
      'strutture', strutture_array,
      'contesti', contesti_array,
      'tipi_rinvenimento', tipi_rinvenimento_array,
      'gradi_esplorazione', gradi_esplorazione_array,
      'comune_nome', c.nome,
      'provincia_nome', p.nome,
      'provincia_sigla', p.sigla,
      'posizione_label', rp.label,
      'ubicazione_confidenza_label', ruc.label
    )
  FROM sites s
  LEFT JOIN comuni c ON s.comune_id = c.id
  LEFT JOIN province p ON s.provincia_id = p.id
  LEFT JOIN ref_posizione rp ON s.posizione_id = rp.id
  LEFT JOIN ref_ubicazione_confidenza ruc ON s.ubicazione_confidenza_id = ruc.id
  WHERE s.id = poi_id
  INTO result;

  RETURN result;
END;
$$;