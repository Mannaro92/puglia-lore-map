-- Ensure bucket exists
insert into storage.buckets (id, name, public)
values ('poi-media', 'poi-media', true)
on conflict (id) do nothing;

-- Add cover image column on sites
alter table public.sites
  add column if not exists cover_media_id uuid references public.media(id);

-- Enable RLS on media (idempotent)
alter table public.media enable row level security;

-- Allow owners to read their own media (drafts included)
create policy if not exists "media_owner_can_read" on public.media
  for select using (
    exists (
      select 1 from public.sites s
      where s.id = media.site_id and s.created_by = auth.uid()
    )
  );

-- Allow owners to insert media for their own sites
create policy if not exists "media_owner_can_insert" on public.media
  for insert with check (
    exists (
      select 1 from public.sites s
      where s.id = media.site_id and s.created_by = auth.uid()
    )
  );

-- Allow owners to update media for their own sites
create policy if not exists "media_owner_can_update" on public.media
  for update using (
    exists (
      select 1 from public.sites s
      where s.id = media.site_id and s.created_by = auth.uid()
    )
  );

-- Allow owners to delete media for their own sites
create policy if not exists "media_owner_can_delete" on public.media
  for delete using (
    exists (
      select 1 from public.sites s
      where s.id = media.site_id and s.created_by = auth.uid()
    )
  );

-- Storage policies for poi-media bucket
create policy if not exists "poi-media public read" on storage.objects
  for select using (bucket_id = 'poi-media');

create policy if not exists "poi-media auth upload" on storage.objects
  for insert with check (bucket_id = 'poi-media' and auth.uid() is not null);

create policy if not exists "poi-media auth update" on storage.objects
  for update using (bucket_id = 'poi-media' and auth.uid() is not null);

create policy if not exists "poi-media auth delete" on storage.objects
  for delete using (bucket_id = 'poi-media' and auth.uid() is not null);
