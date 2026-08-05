-- Storage bucket for property photos.
--
-- PUBLIC bucket: listing photos are meant for public display; a public bucket is
-- CDN-cacheable and needs no signed-URL round-trip per image. The tradeoff is
-- that anyone who knows an object's path can fetch its bytes, so paths MUST be
-- UUID-based and non-enumerable.
--
-- Path convention: {property_id}/{uuid}.{ext}
--   e.g. 3f2b…/9a1c….webp — the first segment is the owning property.
--
-- Allowed MIME types are restricted to raster images at the bucket level.
-- image/svg+xml is intentionally ABSENT: SVG can carry embedded JavaScript and
-- is an XSS vector, so it is forbidden here and everywhere else.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'property-photos',
  'property-photos',
  true,
  2097152, -- 2 MB
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Storage RLS on storage.objects for this bucket. Writes are strictly scoped to
-- the owner of the property named by the path's first segment. Public SELECT is
-- fine (public bucket). Uploads use the caller's session, so these apply.

drop policy if exists "property_photos_insert_own" on storage.objects;
create policy "property_photos_insert_own"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'property-photos'
    and exists (
      select 1 from public.properties p
      where p.id = ((storage.foldername(name))[1])::uuid
        and p.owner_id = (select auth.uid())
    )
  );

drop policy if exists "property_photos_update_own" on storage.objects;
create policy "property_photos_update_own"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'property-photos'
    and exists (
      select 1 from public.properties p
      where p.id = ((storage.foldername(name))[1])::uuid
        and p.owner_id = (select auth.uid())
    )
  )
  with check (
    bucket_id = 'property-photos'
    and exists (
      select 1 from public.properties p
      where p.id = ((storage.foldername(name))[1])::uuid
        and p.owner_id = (select auth.uid())
    )
  );

drop policy if exists "property_photos_delete_own" on storage.objects;
create policy "property_photos_delete_own"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'property-photos'
    and exists (
      select 1 from public.properties p
      where p.id = ((storage.foldername(name))[1])::uuid
        and p.owner_id = (select auth.uid())
    )
  );

drop policy if exists "property_photos_public_read" on storage.objects;
create policy "property_photos_public_read"
  on storage.objects for select
  using (bucket_id = 'property-photos');
