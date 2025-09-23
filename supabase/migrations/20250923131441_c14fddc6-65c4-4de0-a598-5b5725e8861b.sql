-- Create RPC function to attach media to sites atomically
CREATE OR REPLACE FUNCTION public.rpc_attach_media(
  p_site_id uuid,
  p_items jsonb  -- [{storage_path, tipo, titolo, didascalia, ordine}, ...]
)
RETURNS setof public.media
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_item jsonb;
BEGIN
  -- Validation
  IF p_site_id IS NULL THEN
    RAISE EXCEPTION 'rpc_attach_media: site_id mancante';
  END IF;

  -- Authorization: user must own the site
  IF NOT EXISTS (
    SELECT 1 FROM public.sites s
    WHERE s.id = p_site_id AND s.created_by = auth.uid()
  ) THEN
    RAISE EXCEPTION 'rpc_attach_media: permesso negato';
  END IF;

  -- Insert/update media items
  FOR v_item in SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    INSERT INTO public.media (site_id, storage_path, tipo, titolo, didascalia, ordine)
    VALUES (
      p_site_id,
      v_item->>'storage_path',
      COALESCE(v_item->>'tipo','image'),
      v_item->>'titolo',
      v_item->>'didascalia',
      COALESCE((v_item->>'ordine')::int, 0)
    )
    ON CONFLICT (site_id, storage_path) DO UPDATE
      SET titolo = EXCLUDED.titolo,
          didascalia = EXCLUDED.didascalia,
          ordine = EXCLUDED.ordine;
  END LOOP;

  -- Return updated media list for the site
  RETURN QUERY
    SELECT * FROM public.media m 
    WHERE m.site_id = p_site_id 
    ORDER BY ordine, created_at;
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_attach_media(uuid, jsonb) TO authenticated;