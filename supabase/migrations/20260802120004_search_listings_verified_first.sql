-- Verified listings rank above unverified — but ONLY in the default (newest)
-- sort. A user who explicitly sorts by price expects pure price order, so the
-- verified-first term is gated on p_sort = 'newest' (a constant for the other
-- sorts, hence inert). Still a single query, single ORDER BY.

create or replace function public.search_listings(
  p_region_id smallint default null,
  p_district_id smallint default null,
  p_currency text default null,
  p_price_min numeric default null,
  p_price_max numeric default null,
  p_rooms_min smallint default null,
  p_rooms_max smallint default null,
  p_rental_period public.rental_period default null,
  p_amenity_ids smallint[] default '{}',
  p_sort text default 'newest',
  p_limit int default 20,
  p_offset int default 0
)
returns table (
  id uuid,
  title text,
  price_amount numeric,
  price_currency text,
  rental_period public.rental_period,
  rooms smallint,
  area_sqm numeric,
  region_id smallint,
  district_id smallint,
  verification_status public.property_verification_status,
  created_at timestamptz,
  cover_path text,
  total_count bigint
)
language sql
security invoker
set search_path = ''
as $$
  with filtered as (
    select
      l.id, l.title, l.price_amount, l.price_currency, l.rental_period,
      l.rooms, l.area_sqm, p.region_id, p.district_id, p.verification_status,
      l.created_at, l.property_id
    from public.listings l
    join public.properties p on p.id = l.property_id
    where l.status = 'active'
      and (l.expires_at is null or l.expires_at > now())
      and (p_region_id is null or p.region_id = p_region_id)
      and (p_district_id is null or p.district_id = p_district_id)
      and (p_currency is null or l.price_currency = p_currency)
      and (p_price_min is null or l.price_amount >= p_price_min)
      and (p_price_max is null or l.price_amount <= p_price_max)
      and (p_rooms_min is null or l.rooms >= p_rooms_min)
      and (p_rooms_max is null or l.rooms <= p_rooms_max)
      and (p_rental_period is null or l.rental_period = p_rental_period)
      -- Amenity AND: the listing must have ALL selected amenities. One grouped
      -- subquery — not an N+1 fan-out.
      and (
        array_length(p_amenity_ids, 1) is null
        or l.id in (
          select la.listing_id
          from public.listing_amenities la
          where la.amenity_id = any(p_amenity_ids)
          group by la.listing_id
          having count(distinct la.amenity_id) = array_length(p_amenity_ids, 1)
        )
      )
  )
  select
    f.id, f.title, f.price_amount, f.price_currency, f.rental_period,
    f.rooms, f.area_sqm, f.region_id, f.district_id, f.verification_status,
    f.created_at,
    (
      select pp.storage_path
      from public.property_photos pp
      where pp.property_id = f.property_id
      order by pp.display_order asc
      limit 1
    ) as cover_path,
    count(*) over () as total_count
  from filtered f
  order by
    (case when p_sort = 'price_asc' then f.price_amount end) asc nulls last,
    (case when p_sort = 'price_desc' then f.price_amount end) desc nulls last,
    -- verified-first, newest sort only:
    (case when p_sort = 'newest' and f.verification_status = 'verified'
          then 0 else 1 end) asc,
    (case when p_sort = 'newest' then f.created_at end) desc nulls last,
    f.id
  limit greatest(p_limit, 0)
  offset greatest(p_offset, 0);
$$;

grant execute on function public.search_listings(
  smallint, smallint, text, numeric, numeric, smallint, smallint,
  public.rental_period, smallint[], text, int, int
) to anon, authenticated;
