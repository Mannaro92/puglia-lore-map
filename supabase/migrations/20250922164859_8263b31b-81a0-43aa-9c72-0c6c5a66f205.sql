-- Create storage bucket for POI media
INSERT INTO storage.buckets (id, name, public) 
VALUES ('poi-media', 'poi-media', true)
ON CONFLICT (id) DO NOTHING;