-- Amenities as a localized reference table + join table, following the same
-- pattern as regions/districts (localizable without ALTER TYPE; no enum arrays).

create table public.amenities (
  id smallint generated always as identity primary key,
  slug text not null unique,
  name_uz text not null,
  name_ru text not null,
  sort_order smallint not null default 0
);

alter table public.amenities enable row level security;
grant select on public.amenities to anon, authenticated;
grant select, insert, update, delete on public.amenities to service_role;

-- Public read, no client writes (mirrors regions/districts).
create policy amenities_select_all
  on public.amenities for select
  using (true);

create table public.listing_amenities (
  listing_id uuid not null references public.listings (id) on delete cascade,
  amenity_id smallint not null references public.amenities (id),
  primary key (listing_id, amenity_id)
);

create index listing_amenities_amenity_listing_idx
  on public.listing_amenities (amenity_id, listing_id);

alter table public.listing_amenities enable row level security;
grant select on public.listing_amenities to anon;
grant select, insert, update, delete on public.listing_amenities to authenticated;
grant select, insert, update, delete on public.listing_amenities to service_role;

-- Public may read amenities only for publicly-visible listings. Visibility is
-- time-filtered exactly like the listings public policy — an expired-by-time
-- listing hides its amenities too.
create policy listing_amenities_select_public
  on public.listing_amenities for select
  using (
    exists (
      select 1
      from public.listings l
      where l.id = listing_id
        and l.status = 'active'
        and (l.expires_at is null or l.expires_at > now())
    )
  );

-- Owner has full access to the amenities of their own listings.
create policy listing_amenities_owner_all
  on public.listing_amenities for all
  using (
    exists (
      select 1
      from public.listings l
      where l.id = listing_id
        and l.owner_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1
      from public.listings l
      where l.id = listing_id
        and l.owner_id = (select auth.uid())
    )
  );

create policy listing_amenities_admin_all
  on public.listing_amenities for all
  using (public.is_admin())
  with check (public.is_admin());
