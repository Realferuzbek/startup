-- Host contact details: collection, a publish gate, and locking down the phone.
--
-- Until now profiles.phone/full_name were never collected and profiles were
-- world-readable (profiles_select_all USING(true)) — which would make a
-- contact-reveal rate limit pointless, since anyone could read every owner's
-- phone directly. This migration:
--   1. adds telegram_username (Telegram is how rental contact happens locally),
--   2. adds listings.reveal_count (denormalized public trust signal, like
--      view_count),
--   3. dedups contact_reveals per (user, listing),
--   4. restricts profile reads to the owner (and admins), so the reveal RPC
--      (added next migration, SECURITY DEFINER) becomes the sole phone-disclosure
--      path,
--   5. gates publishing on the owner having a name + phone (distinct SQLSTATE
--      CT001, mirroring the PH001 photo gate).

alter table public.profiles add column telegram_username text;

alter table public.listings add column reveal_count integer not null default 0;

-- One reveal row per (user, listing) — lets the reveal RPC upsert idempotently.
create unique index contact_reveals_user_listing_uniq
  on public.contact_reveals (user_id, listing_id);

-- Profiles are no longer world-readable: only the owner (and admins) may read a
-- profile row. The owner's phone is disclosed to renters ONLY through the
-- SECURITY DEFINER reveal_contact() RPC, which dedups + rate-limits.
drop policy profiles_select_all on public.profiles;

create policy profiles_select_own
  on public.profiles for select
  using ((select auth.uid()) = id or public.is_admin());

-- Recreate the lifecycle trigger function, adding the contact gate (CT001) to
-- both `active` branches, right after the PH001 photo gate. The gate reads the
-- owner via the property, so it is robust regardless of BEFORE-trigger ordering.
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
        -- Publish gate 1: the property must have at least one photo.
        if not exists (
          select 1 from public.property_photos pp
          where pp.property_id = new.property_id
        ) then
          raise exception 'a listing cannot be published without at least one property photo'
            using errcode = 'PH001';
        end if;

        -- Publish gate 2: the owner must have a name + phone so a renter can be
        -- given real contact details on reveal.
        if not exists (
          select 1
          from public.properties pr
          join public.profiles pf on pf.id = pr.owner_id
          where pr.id = new.property_id
            and pf.full_name is not null
            and length(trim(pf.full_name)) > 0
            and pf.phone is not null
        ) then
          raise exception 'a listing cannot be published until the owner has a name and phone'
            using errcode = 'CT001';
        end if;

        -- Entering `active` (re)starts the 30-day clock, in the DB.
        new.expires_at := now() + interval '30 days';
      end if;
    end if;

  elsif tg_op = 'INSERT' then
    if new.status = 'active' then
      -- Same gates for a listing inserted directly as active.
      if not exists (
        select 1 from public.property_photos pp
        where pp.property_id = new.property_id
      ) then
        raise exception 'a listing cannot be published without at least one property photo'
          using errcode = 'PH001';
      end if;

      if not exists (
        select 1
        from public.properties pr
        join public.profiles pf on pf.id = pr.owner_id
        where pr.id = new.property_id
          and pf.full_name is not null
          and length(trim(pf.full_name)) > 0
          and pf.phone is not null
      ) then
        raise exception 'a listing cannot be published until the owner has a name and phone'
          using errcode = 'CT001';
      end if;

      if new.expires_at is null then
        new.expires_at := now() + interval '30 days';
      end if;
    end if;
  end if;

  return new;
end;
$$;
