-- PRIVATE bucket for verification documents (cadastral extracts).
--
-- Unlike property-photos (public, CDN-cacheable), these are identity documents:
-- the bucket is PRIVATE, viewed by the reviewer through a short-lived SIGNED URL
-- only, and the object is deleted on decision. Cadastral extracts are commonly
-- PDFs, so application/pdf is allowed alongside raster images. image/svg+xml
-- stays forbidden (XSS vector) — as everywhere.
--
-- Path convention: {property_id}/{uuid}.{ext} — the first segment is the owning
-- property, which is what the owner storage policies key on.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'verification-documents',
  'verification-documents',
  false,
  5242880, -- 5 MB
  array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Owner writes only under their own property's path.
create policy "verification_docs_insert_own"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'verification-documents'
    and exists (
      select 1 from public.properties p
      where p.id = ((storage.foldername(name))[1])::uuid
        and p.owner_id = (select auth.uid())
    )
  );

-- Owner reads their own documents.
create policy "verification_docs_select_own"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'verification-documents'
    and exists (
      select 1 from public.properties p
      where p.id = ((storage.foldername(name))[1])::uuid
        and p.owner_id = (select auth.uid())
    )
  );

-- Admin reads all (needed to mint the review signed URL).
create policy "verification_docs_admin_select"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'verification-documents'
    and public.is_admin()
  );

-- Admin deletes on decision (retention — the document does not survive review).
create policy "verification_docs_admin_delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'verification-documents'
    and public.is_admin()
  );

-- anon gets no policy → RLS default-denies. Verification documents are never
-- publicly reachable.
