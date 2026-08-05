-- Public view counter for listings.
--
-- SECURITY DEFINER is NECESSARY: anonymous visitors have (and must have) no
-- UPDATE grant on public.listings, yet a public detail page needs to bump one
-- counter. This function is the narrow, audited exception.
--
-- It is SAFE because it:
--   * touches ONLY listings.view_count, and only increments it,
--   * reads/writes no other column and no other table,
--   * re-applies the public-visibility predicate in its WHERE, so a listing that
--     is not currently publicly visible (draft/paused/expired/removed, or
--     time-expired) is never incremented — the UPDATE simply matches 0 rows.
--
-- The counter is naive and inflatable by refreshes; that is acceptable for now.
-- No deduplication is built.
create or replace function public.increment_listing_view(p_listing_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.listings
  set view_count = view_count + 1
  where id = p_listing_id
    and status = 'active'
    and (expires_at is null or expires_at > now());
$$;

grant execute on function public.increment_listing_view(uuid) to anon, authenticated;
