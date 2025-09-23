-- Add missing columns to media table for video support
ALTER TABLE public.media 
ADD COLUMN IF NOT EXISTS size_bytes bigint,
ADD COLUMN IF NOT EXISTS duration_seconds numeric,
ADD COLUMN IF NOT EXISTS width integer,
ADD COLUMN IF NOT EXISTS height integer;

-- Create unique index for conflict resolution in rpc_attach_media
CREATE UNIQUE INDEX IF NOT EXISTS ux_media_site_path ON public.media(site_id, storage_path);

-- RPC function to get video bytes used for a site
CREATE OR REPLACE FUNCTION public.rpc_video_bytes_used(p_site_id uuid)
RETURNS bigint
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(SUM(size_bytes), 0)
  FROM public.media
  WHERE site_id = p_site_id AND tipo = 'video';
$$;

-- Update rpc_attach_media to include video quota enforcement
CREATE OR REPLACE FUNCTION public.rpc_attach_media(
  p_site_id uuid,
  p_items jsonb
)
RETURNS SETOF public.media
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_used bigint;
  v_new bigint := 0;
  v_item jsonb;
  VIDEO_QUOTA_BYTES CONSTANT bigint := 104857600; -- 100MB
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

  -- Calculate new video bytes to be added
  SELECT COALESCE(SUM((item->>'size_bytes')::bigint), 0)
  INTO v_new
  FROM jsonb_array_elements(p_items) item
  WHERE (item->>'tipo') = 'video';

  -- Get currently used video bytes
  SELECT public.rpc_video_bytes_used(p_site_id) INTO v_used;

  -- Check video quota
  IF v_used + v_new > VIDEO_QUOTA_BYTES THEN
    RAISE EXCEPTION 'Quota video superata: % / % bytes', v_used + v_new, VIDEO_QUOTA_BYTES;
  END IF;

  -- Insert/update media items
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    INSERT INTO public.media (
      site_id, 
      storage_path, 
      tipo, 
      titolo, 
      didascalia, 
      ordine, 
      size_bytes,
      duration_seconds,
      width,
      height
    )
    VALUES (
      p_site_id,
      v_item->>'storage_path',
      COALESCE(v_item->>'tipo', 'image'),
      v_item->>'titolo',
      v_item->>'didascalia',
      COALESCE((v_item->>'ordine')::int, 0),
      COALESCE((v_item->>'size_bytes')::bigint, NULL),
      COALESCE((v_item->>'duration_seconds')::numeric, NULL),
      COALESCE((v_item->>'width')::int, NULL),
      COALESCE((v_item->>'height')::int, NULL)
    )
    ON CONFLICT (site_id, storage_path) DO UPDATE
    SET 
      titolo = EXCLUDED.titolo,
      didascalia = EXCLUDED.didascalia,
      ordine = EXCLUDED.ordine,
      size_bytes = EXCLUDED.size_bytes,
      duration_seconds = EXCLUDED.duration_seconds,
      width = EXCLUDED.width,
      height = EXCLUDED.height;
  END LOOP;

  -- Return updated media list for the site
  RETURN QUERY
    SELECT * FROM public.media m 
    WHERE m.site_id = p_site_id 
    ORDER BY ordine, created_at;
END;
$$;