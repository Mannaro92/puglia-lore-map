-- Enable RLS on spatial_ref_sys table (PostGIS system table)
-- This table contains spatial reference system definitions and should be publicly readable
alter table public.spatial_ref_sys enable row level security;

-- Create policy to allow public read access to spatial reference systems
create policy "Public read access to spatial reference systems"
on public.spatial_ref_sys for select
to anon, authenticated
using (true);