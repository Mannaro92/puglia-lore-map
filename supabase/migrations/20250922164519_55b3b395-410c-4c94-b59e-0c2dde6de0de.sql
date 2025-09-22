-- Create storage bucket for POI media
INSERT INTO storage.buckets (id, name, public) VALUES ('poi-media', 'poi-media', true)
ON CONFLICT (id) DO NOTHING;

-- Create media table with minimal structure first
CREATE TABLE IF NOT EXISTS public.media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id uuid REFERENCES sites(id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  title text,
  caption text,
  crediti text, 
  licenza text NOT NULL DEFAULT 'CC BY 4.0',
  order_index integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Add created_by after table creation
ALTER TABLE media ADD COLUMN IF NOT EXISTS created_by uuid;

-- Add cover media reference to sites table  
ALTER TABLE sites ADD COLUMN IF NOT EXISTS cover_media_id uuid REFERENCES media(id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS media_site_idx ON media(site_id);
CREATE INDEX IF NOT EXISTS media_order_idx ON media(site_id, order_index);