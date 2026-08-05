-- Districts (Tashkent city only for now), the properties.district_id link, and
-- the integrity/safety rules for property geography.

-- Reference data: districts (tumanlar). Only Tashkent city has districts in the
-- MVP; other regions intentionally have none. Seeded separately.
create table public.districts (
  id smallint generated always as identity primary key,
  region_id smallint not null references public.regions (id),
  slug text not null unique,
  name_uz text not null,
  name_ru text not null,
  sort_order smallint not null default 0
);

create index districts_region_sort_idx on public.districts (region_id, sort_order);

-- Mirror regions: public read, no client writes.
alter table public.districts enable row level security;
grant select on public.districts to anon, authenticated;
grant select, insert, update, delete on public.districts to service_role;

create policy districts_select_all
  on public.districts for select
  using (true);

-- A property may optionally be pinned to a district.
alter table public.properties
  add column district_id smallint references public.districts (id);

create index properties_district_idx on public.properties (district_id);

-- Integrity: a property's district must belong to its region.
create or replace function public.enforce_property_district_region()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.district_id is not null then
    if (select region_id from public.districts where id = new.district_id)
       is distinct from new.region_id then
      raise exception 'district % does not belong to region %',
        new.district_id, new.region_id
        using errcode = 'check_violation';
    end if;
  end if;
  return new;
end;
$$;

create trigger enforce_property_district_region
  before insert or update on public.properties
  for each row execute function public.enforce_property_district_region();

-- Coordinate bounds enforced at the database layer for ANY write path
-- (approximate bounding box of Uzbekistan). location is geography(Point,4326);
-- cast to geometry to read numeric X/Y. Both functions and the cast are
-- IMMUTABLE, so this is valid in a CHECK constraint.
--   ST_X = longitude, ST_Y = latitude.
alter table public.properties
  add constraint properties_location_bounds check (
    extensions.st_x(location::extensions.geometry) between 55.0 and 74.0
    and extensions.st_y(location::extensions.geometry) between 37.0 and 46.0
  );

-- Refuse deleting a property that still has listings. listings.property_id is
-- ON DELETE CASCADE, so without this guard a property delete would silently
-- destroy its listings. Deletion must be refused instead.
create or replace function public.prevent_property_delete_with_listings()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if exists (select 1 from public.listings where property_id = old.id) then
    raise exception 'cannot delete a property that has listings'
      using errcode = 'foreign_key_violation';
  end if;
  return old;
end;
$$;

create trigger prevent_property_delete_with_listings
  before delete on public.properties
  for each row execute function public.prevent_property_delete_with_listings();
