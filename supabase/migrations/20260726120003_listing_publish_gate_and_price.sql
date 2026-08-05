-- Publish gate (closes Known gap #2): a listing may not become `active` unless
-- its property has at least one photo. Enforced inside the lifecycle trigger so
-- it cannot be bypassed. Also makes the price ceiling currency-aware.

create or replace function public.enforce_listing_lifecycle()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' then
    if new.status is distinct from old.status then
      -- Allowed transitions. `removed` is terminal.
      if not (
        (old.status = 'draft' and new.status in ('active', 'removed')) or
        (old.status = 'active' and new.status in ('paused', 'expired', 'removed')) or
        (old.status = 'paused' and new.status in ('active', 'removed')) or
        (old.status = 'expired' and new.status in ('active', 'removed'))
      ) then
        raise exception 'invalid listing status transition: % -> %',
          old.status, new.status
          using errcode = 'check_violation';
      end if;

      if new.status = 'active' then
        -- Publish gate: the property must have at least one photo. Distinct,
        -- catchable SQLSTATE so the app can show an actionable message.
        if not exists (
          select 1 from public.property_photos pp
          where pp.property_id = new.property_id
        ) then
          raise exception 'a listing cannot be published without at least one property photo'
            using errcode = 'PH001';
        end if;

        -- Entering `active` (re)starts the 30-day clock, in the DB.
        new.expires_at := now() + interval '30 days';
      end if;
    end if;

  elsif tg_op = 'INSERT' then
    if new.status = 'active' then
      -- Same gate for a listing inserted directly as active (closes the
      -- direct-insert loophole).
      if not exists (
        select 1 from public.property_photos pp
        where pp.property_id = new.property_id
      ) then
        raise exception 'a listing cannot be published without at least one property photo'
          using errcode = 'PH001';
      end if;

      if new.expires_at is null then
        new.expires_at := now() + interval '30 days';
      end if;
    end if;
  end if;

  return new;
end;
$$;

-- Currency-aware price ceiling at the database layer. The previous single bound
-- (numeric(12,2) column, app-side max 9,999,999,999) is replaced with market
-- maximums per currency. The existing `price_amount > 0` CHECK stays.
alter table public.listings
  add constraint listings_price_currency_max check (
    (price_currency = 'UZS' and price_amount <= 1000000000)
    or (price_currency = 'USD' and price_amount <= 1000000)
  );
