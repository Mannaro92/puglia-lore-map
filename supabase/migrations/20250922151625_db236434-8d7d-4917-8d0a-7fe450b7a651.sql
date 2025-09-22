-- Fix rpc_get_lookups function to resolve GROUP BY and ORDER BY conflict
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
            SELECT jsonb_agg(
                jsonb_build_object('id', id, 'label', label, 'sort_order', sort_order)
                ORDER BY sort_order, label
            )
            FROM ref_ubicazione_confidenza 
            WHERE is_active = true
        ),
        'posizione', (
            SELECT jsonb_agg(
                jsonb_build_object('id', id, 'label', label, 'sort_order', sort_order)
                ORDER BY sort_order, label
            )
            FROM ref_posizione 
            WHERE is_active = true
        ),
        'cronologia', (
            SELECT jsonb_agg(
                jsonb_build_object('id', id, 'label', label, 'sort_order', sort_order)
                ORDER BY sort_order, label
            )
            FROM ref_cronologia 
            WHERE is_active = true
        ),
        'definizione', (
            SELECT jsonb_agg(
                jsonb_build_object('id', id, 'label', label, 'sort_order', sort_order)
                ORDER BY sort_order, label
            )
            FROM ref_definizione 
            WHERE is_active = true
        ),
        'tipo_rinvenimento', (
            SELECT jsonb_agg(
                jsonb_build_object('id', id, 'label', label, 'sort_order', sort_order)
                ORDER BY sort_order, label
            )
            FROM ref_tipo_rinvenimento 
            WHERE is_active = true
        ),
        'grado_esplorazione', (
            SELECT jsonb_agg(
                jsonb_build_object('id', id, 'label', label, 'sort_order', sort_order)
                ORDER BY sort_order, label
            )
            FROM ref_grado_esplorazione 
            WHERE is_active = true
        ),
        'strutture_componenti', (
            SELECT jsonb_agg(
                jsonb_build_object('id', id, 'label', label, 'sort_order', sort_order)
                ORDER BY sort_order, label
            )
            FROM ref_strutture_componenti 
            WHERE is_active = true
        ),
        'contesti_stratigrafici', (
            SELECT jsonb_agg(
                jsonb_build_object('id', id, 'label', label, 'sort_order', sort_order)
                ORDER BY sort_order, label
            )
            FROM ref_contesti_stratigrafici 
            WHERE is_active = true
        ),
        'indicatori_cultuali', (
            SELECT jsonb_agg(
                jsonb_build_object('id', id, 'label', label, 'sort_order', sort_order)
                ORDER BY sort_order, label
            )
            FROM ref_indicatori_cultuali 
            WHERE is_active = true
        ),
        'ambito_cultuale', (
            SELECT jsonb_agg(
                jsonb_build_object('id', id, 'label', label, 'sort_order', sort_order)
                ORDER BY sort_order, label
            )
            FROM ref_ambito_cultuale 
            WHERE is_active = true
        )
    ) INTO result;
    
    RETURN result;
END;
$$;