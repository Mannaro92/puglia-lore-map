-- Storage policies for poi-media bucket
-- Public read (if bucket is public, this ensures anon can fetch)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'POI media public read'
  ) THEN
    CREATE POLICY "POI media public read"
    ON storage.objects
    FOR SELECT
    USING (bucket_id = 'poi-media');
  END IF;
END $$;

-- Allow authenticated users to upload temp files under temp/<session_id>/...
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'POI media upload temp'
  ) THEN
    CREATE POLICY "POI media upload temp"
    ON storage.objects
    FOR INSERT
    WITH CHECK (
      bucket_id = 'poi-media'
      AND auth.uid() IS NOT NULL
      AND (storage.foldername(name))[1] = 'temp'
    );
  END IF;
END $$;

-- Allow upload to poi/<site_id>/... if user can edit that site
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'POI media upload editable sites'
  ) THEN
    CREATE POLICY "POI media upload editable sites"
    ON storage.objects
    FOR INSERT
    WITH CHECK (
      bucket_id = 'poi-media'
      AND (storage.foldername(name))[1] = 'poi'
      AND EXISTS (
        SELECT 1
        FROM public.sites s
        WHERE s.id::text = (storage.foldername(name))[2]
          AND (
            s.created_by = auth.uid()
            OR s.created_by = '00000000-0000-0000-0000-000000000000'::uuid
            OR s.created_by IS NULL
          )
      )
    );
  END IF;
END $$;

-- Allow delete for poi/<site_id>/... if user can edit that site
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'POI media delete editable'
  ) THEN
    CREATE POLICY "POI media delete editable"
    ON storage.objects
    FOR DELETE
    USING (
      bucket_id = 'poi-media'
      AND (storage.foldername(name))[1] = 'poi'
      AND EXISTS (
        SELECT 1
        FROM public.sites s
        WHERE s.id::text = (storage.foldername(name))[2]
          AND (
            s.created_by = auth.uid()
            OR s.created_by = '00000000-0000-0000-0000-000000000000'::uuid
            OR s.created_by IS NULL
          )
      )
    );
  END IF;
END $$;