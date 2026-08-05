-- Photos move from listings to PROPERTIES: a host re-listing the same apartment
-- reuses the property's photos and never re-uploads. listing_photos is empty, so
-- this is a pure rename + re-point with no data migration.

alter table public.listing_photos rename to property_photos;
alter table public.property_photos rename column listing_id to property_id;

-- Re-point the FK at properties (was listings).
alter table public.property_photos
  drop constraint listing_photos_listing_id_fkey;
alter table public.property_photos
  add constraint property_photos_property_id_fkey
  foreign key (property_id) references public.properties (id) on delete cascade;

-- Rebuild the index.
drop index public.listing_photos_listing_order_idx;
create index property_photos_property_order_idx
  on public.property_photos (property_id, display_order);

-- Replace the RLS policies (the old ones referenced listings and the renamed
-- column, so they are now semantically wrong).
drop policy listing_photos_select_public on public.property_photos;
drop policy listing_photos_owner_all on public.property_photos;
drop policy listing_photos_admin_all on public.property_photos;

-- Public read only for properties that have a publicly-visible listing — the
-- same time-filter used by the listings public policy.
create policy property_photos_select_public
  on public.property_photos for select
  using (
    exists (
      select 1
      from public.listings l
      where l.property_id = property_photos.property_id
        and l.status = 'active'
        and (l.expires_at is null or l.expires_at > now())
    )
  );

-- Owner has full access to photos of their own properties, any listing state.
create policy property_photos_owner_all
  on public.property_photos for all
  using (
    exists (
      select 1
      from public.properties p
      where p.id = property_id
        and p.owner_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1
      from public.properties p
      where p.id = property_id
        and p.owner_id = (select auth.uid())
    )
  );

create policy property_photos_admin_all
  on public.property_photos for all
  using (public.is_admin())
  with check (public.is_admin());

-- Reorder a property's photos atomically: display_order becomes the position in
-- the supplied id array. SECURITY INVOKER + the property_id scope means RLS lets
-- a caller reorder only their own property's photos.
create or replace function public.reorder_property_photos(
  p_property_id uuid,
  p_photo_ids uuid[]
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  update public.property_photos pp
  set display_order = t.ord
  from (
    select id, (ordinality - 1)::smallint as ord
    from unnest(p_photo_ids) with ordinality as u(id, ordinality)
  ) t
  where pp.id = t.id
    and pp.property_id = p_property_id;
end;
$$;

grant execute on function public.reorder_property_photos(uuid, uuid[])
  to authenticated;
