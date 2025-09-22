-- Create storage bucket for POI media
INSERT INTO storage.buckets (id, name, public) VALUES ('poi-media', 'poi-media', true)
ON CONFLICT (id) DO NOTHING;

-- Create media table
CREATE TABLE IF NOT EXISTS public.media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id uuid REFERENCES sites(id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  title text,
  caption text,
  crediti text,
  licenza text NOT NULL DEFAULT 'CC BY 4.0',
  order_index integer NOT NULL DEFAULT 0,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Add cover media reference to sites table
ALTER TABLE sites ADD COLUMN IF NOT EXISTS cover_media_id uuid REFERENCES media(id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS media_site_idx ON media(site_id);
CREATE INDEX IF NOT EXISTS media_created_by_idx ON media(created_by);
CREATE INDEX IF NOT EXISTS media_order_idx ON media(site_id, order_index);

-- Create security definer function to check site ownership without RLS recursion
CREATE OR REPLACE FUNCTION public.user_owns_site(_site_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM sites 
    WHERE id = _site_id AND created_by = _user_id
  );
$$;

-- Create security definer function to check if site is published
CREATE OR REPLACE FUNCTION public.site_is_published(_site_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM sites 
    WHERE id = _site_id AND stato_validazione = 'published'
  );
$$;

-- Enable RLS on media table
ALTER TABLE media ENABLE ROW LEVEL SECURITY;

-- Admin full access policy
CREATE POLICY media_admin_all ON media
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles ur 
      WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
    )
  );

-- Public read policy: only for published sites or own content
CREATE POLICY media_read_public ON media
  FOR SELECT USING (
    (site_id IS NOT NULL AND public.site_is_published(site_id))
    OR (site_id IS NOT NULL AND public.user_owns_site(site_id, auth.uid()))
    OR created_by = auth.uid()
  );

-- Insert policy: authenticated users for their own content
CREATE POLICY media_insert ON media
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL
    AND created_by = auth.uid()
    AND (
      site_id IS NULL 
      OR public.user_owns_site(site_id, auth.uid())
    )
  );

-- Update policy: own content or own sites
CREATE POLICY media_update ON media
  FOR UPDATE USING (
    created_by = auth.uid()
    OR (site_id IS NOT NULL AND public.user_owns_site(site_id, auth.uid()))
  );

-- Delete policy: own content or own sites
CREATE POLICY media_delete ON media
  FOR DELETE USING (
    created_by = auth.uid()
    OR (site_id IS NOT NULL AND public.user_owns_site(site_id, auth.uid()))
  );

-- Storage policies for poi-media bucket
CREATE POLICY "Public read access to poi-media" ON storage.objects
  FOR SELECT USING (bucket_id = 'poi-media');

CREATE POLICY "Authenticated users can upload to poi-media" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'poi-media' 
    AND auth.uid() IS NOT NULL
  );

CREATE POLICY "Users can update their own media files" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'poi-media' 
    AND auth.uid() IS NOT NULL
  );

CREATE POLICY "Users can delete their own media files" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'poi-media' 
    AND auth.uid() IS NOT NULL
  );