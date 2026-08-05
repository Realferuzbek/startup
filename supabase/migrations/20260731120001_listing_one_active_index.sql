-- One active listing per property (the "one live offer per home" rule from the
-- homes model). Paused / expired / draft / removed listings do NOT count, so a
-- home can carry historical listings freely and still be re-published.
--
-- A PARTIAL UNIQUE INDEX is the enforcement: it is the only race-safe option (a
-- trigger `exists` check has a TOCTOU window under concurrent publishes; a
-- unique index does not). Publishing a second active listing on the same
-- property raises SQLSTATE 23505 — the only possible unique violation on the
-- publish path (listings has no other unique constraint) — which the publish
-- action maps to a "pause the other listing first" message.
--
-- Verified before adding: no existing row violates this (0 properties have more
-- than one active listing).

create unique index listings_one_active_per_property
  on public.listings (property_id)
  where status = 'active';
