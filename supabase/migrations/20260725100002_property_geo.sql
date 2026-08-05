-- Safe, RLS-respecting read/write paths for property coordinates.
--
-- Selecting a geography column through PostgREST returns opaque WKB hex, not
-- usable numbers. Reads therefore go through a view that projects numeric
-- latitude/longitude; writes go through RPCs that build the point with the
-- correct coordinate order. NEITHER uses SECURITY DEFINER — RLS on
-- public.properties applies in both directions.

-- ── Read path ────────────────────────────────────────────────────────────────
-- security_invoker = true (Postgres 15+/17): the view runs with the caller's
-- privileges, so the underlying properties RLS policies are enforced.
create view public.properties_with_coords
with (security_invoker = true)
as
select
  p.id,
  p.owner_id,
  p.region_id,
  p.district_id,
  p.address_line,
  p.cadastral_number,
  p.verification_status,
  p.verified_at,
  p.created_at,
  p.updated_at,
  -- location was stored as ST_MakePoint(longitude, latitude), so within the
  -- geometry X = longitude and Y = latitude.
  extensions.st_y(p.location::extensions.geometry) as latitude,
  extensions.st_x(p.location::extensions.geometry) as longitude
from public.properties p;

grant select on public.properties_with_coords to anon, authenticated, service_role;

-- ── Write path ───────────────────────────────────────────────────────────────
-- SECURITY INVOKER (the default) so the INSERT/UPDATE is subject to the
-- properties RLS policies. owner_id is taken from the authenticated session,
-- never from the caller's arguments.
create or replace function public.create_property(
  p_region_id smallint,
  p_district_id smallint,
  p_address_line text,
  p_latitude double precision,
  p_longitude double precision
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  new_id uuid;
begin
  insert into public.properties (owner_id, region_id, district_id, address_line, location)
  values (
    (select auth.uid()),
    p_region_id,
    p_district_id,
    p_address_line,
    -- CRITICAL: ST_MakePoint takes (longitude, latitude) — longitude FIRST.
    -- Swapping these silently places the point in the wrong hemisphere.
    extensions.st_setsrid(
      extensions.st_makepoint(p_longitude, p_latitude),
      4326
    )::extensions.geography
  )
  returning id into new_id;

  return new_id;
end;
$$;

create or replace function public.update_property(
  p_id uuid,
  p_region_id smallint,
  p_district_id smallint,
  p_address_line text,
  p_latitude double precision,
  p_longitude double precision
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  update public.properties set
    region_id = p_region_id,
    district_id = p_district_id,
    address_line = p_address_line,
    -- CRITICAL: ST_MakePoint takes (longitude, latitude) — longitude FIRST.
    location = extensions.st_setsrid(
      extensions.st_makepoint(p_longitude, p_latitude),
      4326
    )::extensions.geography
  where id = p_id;  -- RLS restricts this to the owner's row.

  if not found then
    raise exception 'property not found or not permitted'
      using errcode = 'no_data_found';
  end if;
end;
$$;

grant execute on function public.create_property(
  smallint, smallint, text, double precision, double precision
) to authenticated;

grant execute on function public.update_property(
  uuid, smallint, smallint, text, double precision, double precision
) to authenticated;
