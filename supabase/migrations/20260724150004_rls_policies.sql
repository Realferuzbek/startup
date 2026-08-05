-- Row Level Security. RLS is MANDATORY on every table — no exceptions.
--
-- Two-layer access control:
--   1. GRANTs decide which Data API roles can touch a table at all. The current
--      Supabase cloud default does NOT auto-grant new tables, so grants are
--      explicit here.
--   2. RLS policies decide which ROWS each role may see or change.
-- The service_role bypasses RLS and is used only from server-only code.

-- 1. Enable RLS on all eight tables.
alter table public.regions enable row level security;
alter table public.profiles enable row level security;
alter table public.properties enable row level security;
alter table public.listings enable row level security;
alter table public.listing_photos enable row level security;
alter table public.favorites enable row level security;
alter table public.contact_reveals enable row level security;
alter table public.reports enable row level security;

-- 2. Grants.
grant usage on schema public to anon, authenticated, service_role;

-- service_role: full DML everywhere (RLS is bypassed for it).
grant select, insert, update, delete on all tables in schema public to service_role;

grant select on public.regions to anon, authenticated;

grant select on public.profiles to anon, authenticated;
grant update on public.profiles to authenticated;

grant select on public.properties to anon, authenticated;
grant insert, update, delete on public.properties to authenticated;

grant select on public.listings to anon, authenticated;
grant insert, update, delete on public.listings to authenticated;

grant select on public.listing_photos to anon, authenticated;
grant insert, update, delete on public.listing_photos to authenticated;

grant select, insert, delete on public.favorites to authenticated;

grant select, insert on public.contact_reveals to authenticated;

grant select, insert on public.reports to authenticated;

-- 3. Policies.

-- regions: public read; no client writes (writes go through migrations / service role).
create policy regions_select_all
  on public.regions for select
  using (true);

-- profiles: public read; a user may update only their own row. Changing role or
-- identity_verified is blocked by the protect_profile_columns() trigger.
create policy profiles_select_all
  on public.profiles for select
  using (true);

create policy profiles_update_own
  on public.profiles for update
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- properties: owner has full access to own rows; admin full access; the public
-- may read a property only if it has at least one active listing.
create policy properties_owner_all
  on public.properties for all
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

create policy properties_admin_all
  on public.properties for all
  using (public.is_admin())
  with check (public.is_admin());

create policy properties_select_public
  on public.properties for select
  using (
    exists (
      select 1
      from public.listings l
      where l.property_id = id
        and l.status = 'active'
    )
  );

-- listings: public reads active listings; owner has full access to own rows;
-- admin full access. owner_id is set authoritatively by set_listing_owner(), so
-- the owner WITH CHECK requires that derived owner to be the current user — a
-- user can only create listings for a property they own, and any client-supplied
-- owner_id is neutralized.
create policy listings_select_public
  on public.listings for select
  using (status = 'active');

create policy listings_owner_all
  on public.listings for all
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

create policy listings_admin_all
  on public.listings for all
  using (public.is_admin())
  with check (public.is_admin());

-- listing_photos: public reads photos of active listings; owner writes photos of
-- their own listings (any status); admin full access.
create policy listing_photos_select_public
  on public.listing_photos for select
  using (
    exists (
      select 1
      from public.listings l
      where l.id = listing_id
        and l.status = 'active'
    )
  );

create policy listing_photos_owner_all
  on public.listing_photos for all
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

create policy listing_photos_admin_all
  on public.listing_photos for all
  using (public.is_admin())
  with check (public.is_admin());

-- favorites: a user may read/add/remove only their own rows.
create policy favorites_own_all
  on public.favorites for all
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- contact_reveals: authenticated users insert only their own reveals; a user
-- reads their own; admin reads all.
create policy contact_reveals_insert_self
  on public.contact_reveals for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy contact_reveals_select_own
  on public.contact_reveals for select
  using ((select auth.uid()) = user_id);

create policy contact_reveals_admin_select
  on public.contact_reveals for select
  using (public.is_admin());

-- reports: authenticated users file reports as themselves; a reporter reads
-- their own; admin has full access.
create policy reports_insert_self
  on public.reports for insert
  to authenticated
  with check ((select auth.uid()) = reporter_id);

create policy reports_select_own
  on public.reports for select
  using ((select auth.uid()) = reporter_id);

create policy reports_admin_all
  on public.reports for all
  using (public.is_admin())
  with check (public.is_admin());
