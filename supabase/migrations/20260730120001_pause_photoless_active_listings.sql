-- Backfill guard for grandfathered listings.
--
-- The publish gate (20260726120003) only fires on the transition INTO `active`,
-- so a listing published before the gate existed can be live with zero photos —
-- visible on the public site with no cover. This one-time backfill pauses every
-- such listing so it leaves the public surface without being destroyed; the host
-- can add a photo and republish.
--
-- The UPDATE goes through enforce_listing_lifecycle: `active -> paused` is a
-- whitelisted transition, it does NOT trip the PH001 photo gate (that only
-- guards entering `active`), and it leaves expires_at and every other column
-- untouched. Nothing is deleted.

do $$
declare
  n int;
begin
  update public.listings l
  set status = 'paused'
  where l.status = 'active'
    and not exists (
      select 1 from public.property_photos pp
      where pp.property_id = l.property_id
    );
  get diagnostics n = row_count;
  raise notice 'paused % photoless active listing(s)', n;
end $$;
