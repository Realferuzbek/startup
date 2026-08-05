-- Daily job that flips time-expired active listings to `expired`, keeping the
-- host dashboard label current. Public visibility does NOT depend on this — the
-- listings public policy is already time-filtered — so if pg_cron were
-- unavailable this migration could be skipped without any correctness impact.
--
-- The UPDATE goes through enforce_listing_lifecycle (active -> expired is a
-- valid transition), so the lifecycle rules still hold.

create extension if not exists pg_cron;

select cron.schedule(
  'expire-listings',
  '0 3 * * *',
  $$
    update public.listings
    set status = 'expired'
    where status = 'active'
      and expires_at is not null
      and expires_at <= now()
  $$
);
