-- Listing status lifecycle + 30-day expiry, enforced in the database so the
-- rules cannot be bypassed by the application layer.

create or replace function public.enforce_listing_lifecycle()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' then
    if new.status is distinct from old.status then
      -- Allowed transitions. `removed` is terminal (no row below has it as the
      -- source), so any transition out of `removed` is rejected.
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

      -- Entering `active` (re)starts the 30-day clock, in the DB.
      if new.status = 'active' then
        new.expires_at := now() + interval '30 days';
      end if;
    end if;

  elsif tg_op = 'INSERT' then
    -- A listing inserted directly as `active` without an explicit expiry still
    -- gets a 30-day expiry, so it can never be visible forever. An explicitly
    -- supplied expiry is left alone.
    if new.status = 'active' and new.expires_at is null then
      new.expires_at := now() + interval '30 days';
    end if;
  end if;

  return new;
end;
$$;

create trigger enforce_listing_lifecycle
  before insert or update on public.listings
  for each row execute function public.enforce_listing_lifecycle();

-- Public visibility is time-filtered, not status-only: a listing whose
-- expires_at is in the past is invisible to anon even if a status flip has not
-- run yet.
drop policy listings_select_public on public.listings;

create policy listings_select_public
  on public.listings for select
  using (
    status = 'active'
    and (expires_at is null or expires_at > now())
  );
