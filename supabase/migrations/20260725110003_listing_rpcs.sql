-- Atomic listing create/update (listing row + amenity set in one transaction).
-- SECURITY INVOKER so RLS applies: a caller can only create a listing on a
-- property they own (WITH CHECK on the trigger-derived owner_id), and can only
-- update their own listing. Status is NEVER changed here — it moves only via the
-- dedicated status actions.

create or replace function public.create_listing(
  p_property_id uuid,
  p_title text,
  p_content_language public.content_language,
  p_price_amount numeric,
  p_description text default null,
  p_price_currency text default 'UZS',
  p_rental_period public.rental_period default 'monthly',
  p_rooms smallint default null,
  p_area_sqm numeric default null,
  p_floor smallint default null,
  p_total_floors smallint default null,
  p_available_from date default null,
  p_amenity_ids smallint[] default '{}'
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  new_id uuid;
begin
  insert into public.listings (
    property_id, title, content_language, price_amount, description,
    price_currency, rental_period, rooms, area_sqm, floor, total_floors,
    available_from
  ) values (
    p_property_id, p_title, p_content_language, p_price_amount, p_description,
    p_price_currency, p_rental_period, p_rooms, p_area_sqm, p_floor,
    p_total_floors, p_available_from
  )
  returning id into new_id;
  -- status defaults to 'draft'; owner_id is set by set_listing_owner.

  if array_length(p_amenity_ids, 1) is not null then
    insert into public.listing_amenities (listing_id, amenity_id)
    select new_id, unnest(p_amenity_ids);
  end if;

  return new_id;
end;
$$;

create or replace function public.update_listing(
  p_id uuid,
  p_title text,
  p_content_language public.content_language,
  p_price_amount numeric,
  p_description text default null,
  p_price_currency text default 'UZS',
  p_rental_period public.rental_period default 'monthly',
  p_rooms smallint default null,
  p_area_sqm numeric default null,
  p_floor smallint default null,
  p_total_floors smallint default null,
  p_available_from date default null,
  p_amenity_ids smallint[] default '{}'
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  update public.listings set
    title = p_title,
    content_language = p_content_language,
    price_amount = p_price_amount,
    description = p_description,
    price_currency = p_price_currency,
    rental_period = p_rental_period,
    rooms = p_rooms,
    area_sqm = p_area_sqm,
    floor = p_floor,
    total_floors = p_total_floors,
    available_from = p_available_from
  where id = p_id;  -- RLS restricts to the owner; status untouched.

  if not found then
    raise exception 'listing not found or not permitted'
      using errcode = 'no_data_found';
  end if;

  -- Replace the amenity set wholesale.
  delete from public.listing_amenities where listing_id = p_id;
  if array_length(p_amenity_ids, 1) is not null then
    insert into public.listing_amenities (listing_id, amenity_id)
    select p_id, unnest(p_amenity_ids);
  end if;
end;
$$;

grant execute on function public.create_listing(
  uuid, text, public.content_language, numeric, text, text,
  public.rental_period, smallint, numeric, smallint, smallint, date, smallint[]
) to authenticated;

grant execute on function public.update_listing(
  uuid, text, public.content_language, numeric, text, text,
  public.rental_period, smallint, numeric, smallint, smallint, date, smallint[]
) to authenticated;
