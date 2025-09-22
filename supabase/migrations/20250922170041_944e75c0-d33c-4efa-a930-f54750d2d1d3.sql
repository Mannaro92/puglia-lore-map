-- Ensure poi-media bucket exists and is public
insert into storage.buckets (id, name, public)
values ('poi-media', 'poi-media', true)
on conflict (id) do nothing;

-- Make sure the bucket is public in case it already existed
update storage.buckets set public = true where id = 'poi-media';

-- Drop existing policies to recreate them
drop policy if exists "Anyone can upload temp files to poi-media" on storage.objects;
drop policy if exists "Public can read poi-media" on storage.objects;
drop policy if exists "Site owners can insert into poi-media poi/{site_id}" on storage.objects;
drop policy if exists "Site owners can update their poi-media files" on storage.objects;
drop policy if exists "Site owners can delete their poi-media files" on storage.objects;

-- Storage policies for temporary uploads (allow anyone to upload to temp/<session_id>/)
create policy "Anyone can upload temp files to poi-media"
on storage.objects for insert
to anon, authenticated
with check (
  bucket_id = 'poi-media'
  and (storage.foldername(name))[1] = 'temp'
);

-- Public read of poi-media bucket (useful for listing during edit)
create policy "Public can read poi-media"
on storage.objects for select
to anon, authenticated
using (bucket_id = 'poi-media');

-- Site owners can manage files under poi/<site_id>/* in poi-media
create policy "Site owners can insert into poi-media poi/{site_id}"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'poi-media'
  and (storage.foldername(name))[1] = 'poi'
  and exists (
    select 1 from public.sites s
    where s.id::text = (storage.foldername(name))[2]
      and s.created_by = auth.uid()
  )
);

create policy "Site owners can update their poi-media files"
on storage.objects for update
to authenticated
using (
  bucket_id = 'poi-media'
  and (storage.foldername(name))[1] = 'poi'
  and exists (
    select 1 from public.sites s
    where s.id::text = (storage.foldername(name))[2]
      and s.created_by = auth.uid()
  )
)
with check (bucket_id = 'poi-media');

create policy "Site owners can delete their poi-media files"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'poi-media'
  and (storage.foldername(name))[1] = 'poi'
  and exists (
    select 1 from public.sites s
    where s.id::text = (storage.foldername(name))[2]
      and s.created_by = auth.uid()
  )
);

-- Drop existing media policies
drop policy if exists "Owners can view their site media" on public.media;
drop policy if exists "Owners can insert media for their sites" on public.media;
drop policy if exists "Owners can update their media" on public.media;
drop policy if exists "Owners can delete their media" on public.media;

-- Media table policies: owners can manage their media; keep existing public read for published
create policy "Owners can view their site media"
on public.media for select
using (
  exists (
    select 1 from public.sites s
    where s.id = media.site_id and s.created_by = auth.uid()
  )
);

create policy "Owners can insert media for their sites"
on public.media for insert
with check (
  exists (
    select 1 from public.sites s
    where s.id = site_id and s.created_by = auth.uid()
  )
);

create policy "Owners can update their media"
on public.media for update
using (
  exists (
    select 1 from public.sites s
    where s.id = media.site_id and s.created_by = auth.uid()
  )
);

create policy "Owners can delete their media"
on public.media for delete
using (
  exists (
    select 1 from public.sites s
    where s.id = media.site_id and s.created_by = auth.uid()
  )
);