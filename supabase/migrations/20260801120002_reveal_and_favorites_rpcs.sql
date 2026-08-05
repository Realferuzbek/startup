-- RPCs for contact reveal + the favorites list. All SECURITY DEFINER so they can
-- read the owner's now-locked-down phone / non-public favorited listings, while
-- returning ONLY the fields each flow is allowed to see. Granted to authenticated
-- only (anon has no business revealing contacts or having favorites).

-- Reveal the owner's contact for a publicly-visible listing. Dedups per
-- (user, listing) via the unique index, rate-limits NEW reveals to 30 per
-- rolling 24h (a real renter never hits this; it blocks bulk phone harvesting),
-- and bumps the denormalized reveal_count only on a genuinely new reveal.
create or replace function public.reveal_contact(p_listing_id uuid)
returns table (full_name text, phone text, telegram_username text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_owner uuid;
  v_visible boolean;
  v_already boolean;
  v_recent int;
  v_inserted int;
begin
  if v_uid is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;

  select l.owner_id,
         (l.status = 'active' and (l.expires_at is null or l.expires_at > now()))
    into v_owner, v_visible
  from public.listings l
  where l.id = p_listing_id;

  if v_owner is null or v_visible is not true then
    raise exception 'listing is not available' using errcode = 'no_data_found';
  end if;

  select exists (
    select 1 from public.contact_reveals cr
    where cr.listing_id = p_listing_id and cr.user_id = v_uid
  ) into v_already;

  if not v_already then
    select count(*) into v_recent
    from public.contact_reveals cr
    where cr.user_id = v_uid
      and cr.revealed_at > now() - interval '24 hours';
    if v_recent >= 30 then
      raise exception 'reveal rate limit exceeded' using errcode = 'CR001';
    end if;

    insert into public.contact_reveals (listing_id, user_id)
    values (p_listing_id, v_uid)
    on conflict (user_id, listing_id) do nothing;
    get diagnostics v_inserted = row_count;

    if v_inserted > 0 then
      update public.listings
      set reveal_count = reveal_count + 1
      where id = p_listing_id;
    end if;
  end if;

  return query
    select pf.full_name, pf.phone, pf.telegram_username
    from public.profiles pf
    where pf.id = v_owner;
end;
$$;

grant execute on function public.reveal_contact(uuid) to authenticated;

-- Read-only: returns the owner's contact ONLY if the caller has already revealed
-- this listing (else empty). Lets the detail page server-render the contact for a
-- returning revealer without leaking it to anyone else and without writing a row.
create or replace function public.get_revealed_contact(p_listing_id uuid)
returns table (full_name text, phone text, telegram_username text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_owner uuid;
begin
  if v_uid is null then
    return;
  end if;
  if not exists (
    select 1 from public.contact_reveals cr
    where cr.listing_id = p_listing_id and cr.user_id = v_uid
  ) then
    return;
  end if;
  select l.owner_id into v_owner from public.listings l where l.id = p_listing_id;
  if v_owner is null then
    return;
  end if;
  return query
    select pf.full_name, pf.phone, pf.telegram_username
    from public.profiles pf
    where pf.id = v_owner;
end;
$$;

grant execute on function public.get_revealed_contact(uuid) to authenticated;

-- The caller's favorited listings, INCLUDING ones no longer publicly visible
-- (so the favorites list can mark them unavailable rather than hiding them).
-- Returns only public-safe card fields — never address_line, phone, or owner_id.
create or replace function public.get_favorite_cards()
returns table (
  listing_id uuid,
  title text,
  price_amount numeric,
  price_currency text,
  rental_period public.rental_period,
  rooms smallint,
  area_sqm numeric,
  region_id smallint,
  district_id smallint,
  verification_status public.property_verification_status,
  cover_path text,
  created_at timestamptz,
  is_available boolean
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
begin
  if v_uid is null then
    return;
  end if;
  return query
    select
      l.id,
      l.title,
      l.price_amount,
      l.price_currency,
      l.rental_period,
      l.rooms,
      l.area_sqm,
      pr.region_id,
      pr.district_id,
      pr.verification_status,
      (
        select pp.storage_path
        from public.property_photos pp
        where pp.property_id = l.property_id
        order by pp.display_order
        limit 1
      ),
      l.created_at,
      (l.status = 'active' and (l.expires_at is null or l.expires_at > now())) as is_available
    from public.favorites f
    join public.listings l on l.id = f.listing_id
    join public.properties pr on pr.id = l.property_id
    where f.user_id = v_uid
    order by f.created_at desc;
end;
$$;

grant execute on function public.get_favorite_cards() to authenticated;
