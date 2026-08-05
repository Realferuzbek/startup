-- RLS proof for the Realtor.uz schema.
--
-- Runs as one transaction that is ALWAYS rolled back, so it leaves no data.
-- Identities are simulated with `set local role` + `set local
-- request.jwt.claims`. Every assertion raises an exception (aborting the
-- transaction) if a policy does not hold, so the runner fails loudly.
--
-- Run with: npm run test:rls

begin;

-- ── Structural guarantees ───────────────────────────────────────────────────

-- Every table in the public schema must have RLS enabled.
do $$
declare
  missing text;
begin
  select string_agg(tablename, ', ' order by tablename)
    into missing
  from pg_tables
  where schemaname = 'public'
    and rowsecurity = false;
  if missing is not null then
    raise exception 'FAIL(rls): RLS not enabled on: %', missing;
  end if;
end $$;

-- Exactly the 14 seeded regions, no invented geography.
do $$
declare
  n int;
begin
  select count(*) into n from public.regions;
  if n <> 14 then
    raise exception 'FAIL(regions): expected 14 regions, found %', n;
  end if;
end $$;

-- Exactly the 12 Tashkent-city districts, and none under any other region.
do $$
declare
  n int;
  misplaced int;
begin
  select count(*) into n from public.districts;
  if n <> 12 then
    raise exception 'FAIL(districts): expected 12 districts, found %', n;
  end if;
  select count(*) into misplaced
  from public.districts
  where region_id <> (select id from public.regions where slug = 'tashkent-city');
  if misplaced <> 0 then
    raise exception 'FAIL(districts): % district(s) not under tashkent-city', misplaced;
  end if;
end $$;

-- Exactly the 14 seeded amenities.
do $$
declare
  n int;
begin
  select count(*) into n from public.amenities;
  if n <> 14 then
    raise exception 'FAIL(amenities): expected 14 amenities, found %', n;
  end if;
end $$;

-- No `active` listing may have a property with zero photos. The publish gate
-- only fires on the transition into `active`, so grandfathered rows could slip
-- through; the pause-photoless backfill migration enforces this, and this
-- invariant proves it holds. Runs as the privileged role (before any RLS role
-- switch) so every row is visible.
do $$
declare
  n int;
begin
  select count(*) into n
  from public.listings l
  where l.status = 'active'
    and not exists (
      select 1 from public.property_photos pp
      where pp.property_id = l.property_id
    );
  if n <> 0 then
    raise exception 'FAIL(photos): % active listing(s) have zero property_photos', n;
  end if;
end $$;

-- ── Fixtures (created as the privileged connecting role, which bypasses RLS) ──

-- Two auth users; handle_new_user() auto-creates their profiles.
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data
) values
  ('00000000-0000-0000-0000-000000000000',
   'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
   'authenticated', 'authenticated', 'user-a@test.local', '',
   now(), now(), now(),
   '{"provider":"email","providers":["email"]}', '{}'),
  ('00000000-0000-0000-0000-000000000000',
   'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
   'authenticated', 'authenticated', 'user-b@test.local', '',
   now(), now(), now(),
   '{"provider":"email","providers":["email"]}', '{}'),
  ('00000000-0000-0000-0000-000000000000',
   '99999999-9999-9999-9999-999999999999',
   'authenticated', 'authenticated', 'admin@test.local', '',
   now(), now(), now(),
   '{"provider":"email","providers":["email"]}', '{}');

-- Give A and B a name + phone so their listings can be published (the CT001
-- contact gate). phone is UNIQUE, so the two values must differ.
update public.profiles set full_name = 'Owner A', phone = '+998900000001'
  where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
update public.profiles set full_name = 'Owner B', phone = '+998900000002'
  where id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
-- The admin reviewer (role set here as the privileged role, since
-- protect_profile_columns only blocks role changes for a non-null auth.uid()).
update public.profiles set full_name = 'Admin', role = 'admin'
  where id = '99999999-9999-9999-9999-999999999999';

-- Property owned by A, with an active and a draft listing.
insert into public.properties (id, owner_id, region_id, address_line, location)
values (
  'cccccccc-cccc-cccc-cccc-cccccccccccc',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  (select id from public.regions where slug = 'tashkent-city'),
  'Test address A',
  'SRID=4326;POINT(69.2401 41.2995)'::extensions.geography
);

-- Property C has a photo, so its listings may be published (publish gate).
insert into public.property_photos (property_id, storage_path)
values (
  'cccccccc-cccc-cccc-cccc-cccccccccccc',
  'cccccccc-cccc-cccc-cccc-cccccccccccc/photo1.webp'
);

-- owner_id is set by the trigger; any value supplied here is overwritten.
insert into public.listings (id, property_id, title, content_language, price_amount, status)
values
  ('dddddddd-0000-0000-0000-000000000001',
   'cccccccc-cccc-cccc-cccc-cccccccccccc',
   'A active listing', 'uz', 1000000, 'active'),
  ('dddddddd-0000-0000-0000-000000000002',
   'cccccccc-cccc-cccc-cccc-cccccccccccc',
   'A draft listing', 'uz', 1000000, 'draft');

-- Property + active listing owned by B.
insert into public.properties (id, owner_id, region_id, address_line, location)
values (
  'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  (select id from public.regions where slug = 'andijan'),
  'Test address B',
  'SRID=4326;POINT(72.3442 40.7821)'::extensions.geography
);

-- Property E has a photo, so its active listing may be published.
insert into public.property_photos (property_id, storage_path)
values (
  'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
  'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee/photo1.webp'
);

insert into public.listings (id, property_id, title, content_language, price_amount, status)
values
  ('dddddddd-0000-0000-0000-0000000000b1',
   'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
   'B active listing', 'uz', 2000000, 'active');

-- A favorite belonging to B.
insert into public.favorites (user_id, listing_id)
values (
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  'dddddddd-0000-0000-0000-000000000001'
);

-- A contact reveal belonging to B (used to prove cross-user privacy).
insert into public.contact_reveals (listing_id, user_id)
values (
  'dddddddd-0000-0000-0000-000000000001',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
);

-- An amenity on A's DRAFT listing (to prove draft amenities stay private).
insert into public.listing_amenities (listing_id, amenity_id)
values (
  'dddddddd-0000-0000-0000-000000000002',
  (select id from public.amenities where slug = 'internet')
);

-- Two more A-owned properties (F, F2) so the one-active-per-property index is
-- satisfied: the expired-by-time ACTIVE listing and the transition-test listing
-- (which assertion 20 later publishes) must NOT share property C — C already
-- carries the active `…0001`. Both F and F2 have a photo so the publish gate
-- passes.
insert into public.properties (id, owner_id, region_id, address_line, location)
values
  ('cccccccc-cccc-cccc-cccc-0000000000f0',
   'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
   (select id from public.regions where slug = 'andijan'),
   'Property F', 'SRID=4326;POINT(72.3403 40.7803)'::extensions.geography),
  ('cccccccc-cccc-cccc-cccc-0000000000f1',
   'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
   (select id from public.regions where slug = 'andijan'),
   'Property F2', 'SRID=4326;POINT(72.3404 40.7804)'::extensions.geography);

insert into public.property_photos (property_id, storage_path)
values
  ('cccccccc-cccc-cccc-cccc-0000000000f0',
   'cccccccc-cccc-cccc-cccc-0000000000f0/photo.webp'),
  ('cccccccc-cccc-cccc-cccc-0000000000f1',
   'cccccccc-cccc-cccc-cccc-0000000000f1/photo.webp');

-- An active listing whose expiry is already in the PAST (on its own property F).
-- The explicit expiry means the lifecycle trigger leaves it as-is.
insert into public.listings (id, property_id, title, content_language, price_amount, status, expires_at)
values (
  'dddddddd-0000-0000-0000-000000000f02',
  'cccccccc-cccc-cccc-cccc-0000000000f0',
  'A expired-by-time listing', 'uz', 1500000, 'active', now() - interval '1 day'
);

-- A draft listing (on its own property F2), used for the status-transition
-- assertions — publishing it must not collide with another active listing.
insert into public.listings (id, property_id, title, content_language, price_amount, status)
values (
  'dddddddd-0000-0000-0000-000000000f03',
  'cccccccc-cccc-cccc-cccc-0000000000f1',
  'A transition test listing', 'uz', 1200000, 'draft'
);

-- Three more A-owned properties for the photo-visibility and publish-gate tests
-- (region andijan, in-bounds coordinates):
--   G: has a photo, but only a DRAFT listing        -> photos not public
--   H: has a photo, but only an EXPIRED-by-time one  -> photos not public
--   I: has NO photo, a draft listing                 -> cannot be published
insert into public.properties (id, owner_id, region_id, address_line, location)
values
  ('77777777-7777-7777-7777-777777777771',
   'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
   (select id from public.regions where slug = 'andijan'),
   'Property G', 'SRID=4326;POINT(72.3400 40.7800)'::extensions.geography),
  ('77777777-7777-7777-7777-777777777772',
   'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
   (select id from public.regions where slug = 'andijan'),
   'Property H', 'SRID=4326;POINT(72.3401 40.7801)'::extensions.geography),
  ('77777777-7777-7777-7777-777777777773',
   'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
   (select id from public.regions where slug = 'andijan'),
   'Property I', 'SRID=4326;POINT(72.3402 40.7802)'::extensions.geography);

insert into public.property_photos (property_id, storage_path)
values
  ('77777777-7777-7777-7777-777777777771',
   '77777777-7777-7777-7777-777777777771/photo.webp'),
  ('77777777-7777-7777-7777-777777777772',
   '77777777-7777-7777-7777-777777777772/photo.webp');

insert into public.listings (id, property_id, title, content_language, price_amount, status, expires_at)
values
  ('88888888-8888-8888-8888-888888888871',
   '77777777-7777-7777-7777-777777777771',
   'G draft listing', 'uz', 900000, 'draft', null),
  ('88888888-8888-8888-8888-888888888872',
   '77777777-7777-7777-7777-777777777772',
   'H expired listing', 'uz', 900000, 'active', now() - interval '1 day'),
  ('88888888-8888-8888-8888-888888888873',
   '77777777-7777-7777-7777-777777777773',
   'I draft listing', 'uz', 900000, 'draft', null);

-- Property K (owned by A) with a photo and a draft listing, dedicated to the
-- contact-gate assertions (35/36) so no other assertion mutates its state.
insert into public.properties (id, owner_id, region_id, address_line, location)
values (
  '77777777-7777-7777-7777-77777777777a',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  (select id from public.regions where slug = 'andijan'),
  'Property K', 'SRID=4326;POINT(72.3405 40.7805)'::extensions.geography
);
insert into public.property_photos (property_id, storage_path)
values (
  '77777777-7777-7777-7777-77777777777a',
  '77777777-7777-7777-7777-77777777777a/photo.webp'
);
insert into public.listings (id, property_id, title, content_language, price_amount, status)
values (
  '88888888-8888-8888-8888-8888888888aa',
  '77777777-7777-7777-7777-77777777777a',
  'K contact-gate listing', 'uz', 900000, 'draft'
);

-- Sanity: the trigger set A's listings' owner_id to A, never client input.
do $$
begin
  if (select owner_id from public.listings
      where id = 'dddddddd-0000-0000-0000-000000000001')
     <> 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' then
    raise exception 'FAIL(owner): listing.owner_id was not derived from property';
  end if;
end $$;

-- Verification fixtures: two more A-owned properties — M (unverified, with a
-- pending submission + its storage object) and N (unverified, no submission).
insert into public.properties (id, owner_id, region_id, address_line, location)
values
  ('77777777-7777-7777-7777-77777777777b',
   'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
   (select id from public.regions where slug = 'andijan'),
   'Property M', 'SRID=4326;POINT(72.3406 40.7806)'::extensions.geography),
  ('77777777-7777-7777-7777-77777777777c',
   'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
   (select id from public.regions where slug = 'andijan'),
   'Property N', 'SRID=4326;POINT(72.3407 40.7807)'::extensions.geography);

insert into public.property_verifications
  (id, property_id, submitted_by, cadastral_number, document_path, status)
values (
  'ffffffff-0000-0000-0000-000000000001',
  '77777777-7777-7777-7777-77777777777b',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  '01:01:01:01:01', '77777777-7777-7777-7777-77777777777b/doc.pdf', 'pending'
);

insert into storage.objects (id, bucket_id, name)
values (
  gen_random_uuid(),
  'verification-documents',
  '77777777-7777-7777-7777-77777777777b/doc.pdf'
);

-- ── Assertions as anon ──────────────────────────────────────────────────────
set local role anon;

-- (1) anon CAN select an active listing.
do $$
begin
  if not exists (
    select 1 from public.listings
    where id = 'dddddddd-0000-0000-0000-000000000001'
  ) then
    raise exception 'FAIL(1): anon cannot select an active listing';
  end if;
end $$;

-- (2) anon CANNOT select a draft listing.
do $$
begin
  if exists (
    select 1 from public.listings
    where id = 'dddddddd-0000-0000-0000-000000000002'
  ) then
    raise exception 'FAIL(2): anon can select a draft listing';
  end if;
end $$;

-- (3) anon CANNOT insert a listing.
do $$
declare
  blocked boolean := false;
begin
  begin
    insert into public.listings (property_id, title, content_language, price_amount)
    values ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'anon insert', 'uz', 500000);
  exception when others then
    blocked := true;
  end;
  if not blocked then
    raise exception 'FAIL(3): anon was able to insert a listing';
  end if;
end $$;

-- (12) anon CAN see photos of a property with an active, non-expired listing.
do $$
begin
  if not exists (
    select 1 from public.property_photos
    where property_id = 'cccccccc-cccc-cccc-cccc-cccccccccccc'
  ) then
    raise exception 'FAIL(12): anon cannot see photos of a publicly-listed property';
  end if;
end $$;

-- (12b) anon CANNOT see photos of a property whose only listing is a draft.
do $$
declare
  n int;
begin
  select count(*) into n from public.property_photos
  where property_id = '77777777-7777-7777-7777-777777777771';
  if n <> 0 then
    raise exception 'FAIL(12b): anon can see photos of a draft-only property (% rows)', n;
  end if;
end $$;

-- (12c) anon CANNOT see photos of a property whose listing expired by time.
do $$
declare
  n int;
begin
  select count(*) into n from public.property_photos
  where property_id = '77777777-7777-7777-7777-777777777772';
  if n <> 0 then
    raise exception 'FAIL(12c): anon can see photos of an expired-by-time property (% rows)', n;
  end if;
end $$;

-- (28) anon CANNOT read the host-private address_line of a publicly-listed
--      property (column-level privilege), but CAN read region_id.
do $$
declare
  did_raise boolean := false;
  err_state text;
  r smallint;
begin
  begin
    perform address_line from public.properties
    where id = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
  exception when others then
    did_raise := true;
    err_state := sqlstate;
  end;
  if not did_raise then
    raise exception 'FAIL(28): anon could read properties.address_line';
  elsif err_state <> '42501' then
    raise exception 'FAIL(28): address_line read raised % (expected 42501)', err_state;
  end if;

  -- The safe subset must still be readable.
  select region_id into r from public.properties
  where id = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
  if r is null then
    raise exception 'FAIL(28): anon cannot read properties.region_id (should be allowed)';
  end if;
end $$;

-- (17) anon CAN see an active listing with a FUTURE expires_at.
do $$
begin
  if not exists (
    select 1 from public.listings
    where id = 'dddddddd-0000-0000-0000-000000000001'
      and expires_at > now()
  ) then
    raise exception 'FAIL(17): anon cannot see an active listing with a future expiry';
  end if;
end $$;

-- (18) anon CANNOT see an active listing whose expires_at is in the PAST.
do $$
begin
  if exists (
    select 1 from public.listings
    where id = 'dddddddd-0000-0000-0000-000000000f02'
  ) then
    raise exception 'FAIL(18): anon can see an active listing whose expiry is in the past';
  end if;
end $$;

-- (19) anon CANNOT see listing_amenities of a draft listing.
do $$
declare
  n int;
begin
  select count(*) into n from public.listing_amenities
  where listing_id = 'dddddddd-0000-0000-0000-000000000002';
  if n <> 0 then
    raise exception 'FAIL(19): anon can see amenities of a draft listing (% rows)', n;
  end if;
end $$;

-- (V1) anon cannot read verification submissions (no grant → denied; caught).
do $$
declare n int;
begin
  begin
    select count(*) into n from public.property_verifications;
  exception when others then
    n := 0;
  end;
  if n <> 0 then
    raise exception 'FAIL(V1): anon read a verification submission';
  end if;
end $$;

-- (V2) anon cannot read verification documents (private bucket, no anon policy).
do $$
declare n int;
begin
  begin
    select count(*) into n from storage.objects
    where bucket_id = 'verification-documents';
  exception when others then
    n := 0;
  end;
  if n <> 0 then
    raise exception 'FAIL(V2): anon read a verification document';
  end if;
end $$;

-- ── Assertions as user A ────────────────────────────────────────────────────
set local role authenticated;
set local request.jwt.claims =
  '{"sub":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa","role":"authenticated"}';

-- (4) user A CANNOT update user B's listing (row filtered → 0 affected).
do $$
declare
  n int;
begin
  update public.listings set title = 'hacked by A'
  where id = 'dddddddd-0000-0000-0000-0000000000b1';
  get diagnostics n = row_count;
  if n <> 0 then
    raise exception 'FAIL(4): user A updated user B''s listing (% rows)', n;
  end if;
end $$;

-- (5) user A CAN update their own listing.
do $$
declare
  n int;
begin
  update public.listings set title = 'updated by A'
  where id = 'dddddddd-0000-0000-0000-000000000001';
  get diagnostics n = row_count;
  if n <> 1 then
    raise exception 'FAIL(5): user A could not update own listing (% rows)', n;
  end if;
end $$;

-- (6) user A CANNOT read user B's favorites.
do $$
declare
  n int;
begin
  select count(*) into n from public.favorites
  where user_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
  if n <> 0 then
    raise exception 'FAIL(6): user A can read user B''s favorites (% rows)', n;
  end if;
end $$;

-- (7) a non-admin CANNOT elevate their own role to admin.
do $$
declare
  blocked boolean := false;
begin
  begin
    update public.profiles set role = 'admin'
    where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  exception when others then
    blocked := true;
  end;
  if not blocked then
    raise exception 'FAIL(7): non-admin user elevated own role to admin';
  end if;
end $$;

-- Cross-owner listing attacks. P_A = A's property (ccc…), P_B = B's property
-- (eee…). Rejections must be the RLS/policy violation (SQLSTATE 42501), not an
-- unrelated error, so each caught exception's SQLSTATE is verified.

-- (8) A CANNOT INSERT a listing onto B's property (owner_id omitted → derived
--     to B by the trigger → owner WITH CHECK fails).
do $$
declare
  did_raise boolean := false;
  err_state text;
begin
  begin
    insert into public.listings (property_id, title, content_language, price_amount)
    values ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'A onto B property', 'uz', 500000);
  exception when others then
    did_raise := true;
    err_state := sqlstate;
  end;
  if not did_raise then
    raise exception 'FAIL(8): cross-owner INSERT onto B''s property was not rejected';
  elsif err_state <> '42501' then
    raise exception
      'FAIL(8): cross-owner INSERT raised SQLSTATE % (expected 42501 RLS violation)', err_state;
  end if;
end $$;

-- (9) A CANNOT INSERT onto B's property even when forging owner_id = A (the
--     trigger overwrites owner_id to B → owner WITH CHECK still fails).
do $$
declare
  did_raise boolean := false;
  err_state text;
begin
  begin
    insert into public.listings (property_id, owner_id, title, content_language, price_amount)
    values ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
            'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
            'A forging owner_id', 'uz', 500000);
  exception when others then
    did_raise := true;
    err_state := sqlstate;
  end;
  if not did_raise then
    raise exception 'FAIL(9): cross-owner INSERT with forged owner_id was not rejected';
  elsif err_state <> '42501' then
    raise exception
      'FAIL(9): forged-owner INSERT raised SQLSTATE % (expected 42501 RLS violation)', err_state;
  end if;
end $$;

-- (10) A CANNOT move their own listing onto B's property. Must be rejected
--      (42501) or affect 0 rows.
do $$
declare
  did_raise boolean := false;
  err_state text;
  n int := -1;
begin
  begin
    update public.listings set property_id = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee'
    where id = 'dddddddd-0000-0000-0000-000000000001';
    get diagnostics n = row_count;
  exception when others then
    did_raise := true;
    err_state := sqlstate;
  end;
  if did_raise then
    if err_state <> '42501' then
      raise exception
        'FAIL(10): cross-owner UPDATE raised SQLSTATE % (expected 42501 or 0 rows)', err_state;
    end if;
  elsif n <> 0 then
    raise exception 'FAIL(10): cross-owner UPDATE moved listing onto B''s property (% rows)', n;
  end if;
end $$;

-- (11) A CAN INSERT a listing on their OWN property, and the stored owner_id is
--      A even though a different owner_id (B) was supplied.
do $$
declare
  stored uuid;
begin
  insert into public.listings (id, property_id, owner_id, title, content_language, price_amount)
  values ('dddddddd-0000-0000-0000-0000000000a9',
          'cccccccc-cccc-cccc-cccc-cccccccccccc',
          'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
          'A legit listing', 'uz', 750000);

  select owner_id into stored from public.listings
  where id = 'dddddddd-0000-0000-0000-0000000000a9';

  if stored is null then
    raise exception 'FAIL(11): legitimate INSERT on own property did not succeed';
  elsif stored <> 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' then
    raise exception
      'FAIL(11): stored owner_id % is not A — supplied owner_id was not overridden', stored;
  end if;
end $$;

-- (13) A CANNOT read B's contact_reveals rows.
do $$
declare
  n int;
begin
  select count(*) into n from public.contact_reveals
  where user_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
  if n <> 0 then
    raise exception 'FAIL(13): user A can read user B''s contact_reveals (% rows)', n;
  end if;
end $$;

-- Coordinate write/read path (still as user A). These exercise the real
-- create_property RPC and the properties_with_coords view.

-- (14) A known Tashkent coordinate (lat 41.311, lng 69.279) must round-trip
--      WITHOUT being swapped. A swap would read back lat≈69.279 (also out of
--      bounds), so this is the swap-detection assertion for ST_MakePoint order.
do $$
declare
  new_id uuid;
  lat double precision;
  lng double precision;
begin
  new_id := public.create_property(
    (select id from public.regions where slug = 'tashkent-city')::smallint,
    (select id from public.districts where slug = 'chilonzor')::smallint,
    'Round-trip test address',
    41.311,
    69.279
  );

  select latitude, longitude into lat, lng
  from public.properties_with_coords
  where id = new_id;

  if lat is null or abs(lat - 41.311) > 0.0001 then
    raise exception
      'FAIL(14): latitude read back as % (expected 41.311 — ST_MakePoint order swapped?)', lat;
  end if;
  if lng is null or abs(lng - 69.279) > 0.0001 then
    raise exception
      'FAIL(14): longitude read back as % (expected 69.279 — ST_MakePoint order swapped?)', lng;
  end if;
end $$;

-- (15) A coordinate outside Uzbekistan's bounds is rejected at the DB layer
--      (CHECK constraint → SQLSTATE 23514).
do $$
declare
  did_raise boolean := false;
  err_state text;
begin
  begin
    perform public.create_property(
      (select id from public.regions where slug = 'tashkent-city')::smallint,
      (select id from public.districts where slug = 'chilonzor')::smallint,
      'Out of bounds address',
      89.0,
      200.0
    );
  exception when others then
    did_raise := true;
    err_state := sqlstate;
  end;
  if not did_raise then
    raise exception 'FAIL(15): out-of-bounds coordinate was not rejected';
  elsif err_state <> '23514' then
    raise exception
      'FAIL(15): out-of-bounds raised SQLSTATE % (expected 23514 check_violation)', err_state;
  end if;
end $$;

-- (16) A district that does not belong to the property's region is rejected at
--      the DB layer (integrity trigger → SQLSTATE DR001, its own code so the
--      app can tell it apart from the coordinate-bounds CHECK, which is 23514).
do $$
declare
  did_raise boolean := false;
  err_state text;
begin
  begin
    perform public.create_property(
      (select id from public.regions where slug = 'andijan')::smallint,
      (select id from public.districts where slug = 'chilonzor')::smallint,
      'Mismatched district address',
      40.78,
      72.34
    );
  exception when others then
    did_raise := true;
    err_state := sqlstate;
  end;
  if not did_raise then
    raise exception 'FAIL(16): district from another region was not rejected';
  elsif err_state <> 'DR001' then
    raise exception
      'FAIL(16): district-region mismatch raised SQLSTATE % (expected DR001)', err_state;
  end if;
end $$;

-- (16a) The other half of the same rule, and the one no test covered: districts
--       exist for Tashkent city ONLY, so a property in any other region has a
--       NULL district and MUST be accepted. Every property created during
--       development was in Tashkent, so this path had never been exercised.
do $$
declare
  new_id uuid;
  d_id smallint;
  lat double precision;
  lng double precision;
begin
  new_id := public.create_property(
    (select id from public.regions where slug = 'jizzakh')::smallint,
    null,                                  -- no district: Jizzakh has none
    'Jizzakh, no district',
    40.1158,
    67.8422
  );

  select district_id, latitude, longitude into d_id, lat, lng
  from public.properties_with_coords
  where id = new_id;

  if d_id is not null then
    raise exception 'FAIL(16a): district_id stored as % (expected null)', d_id;
  end if;
  if lat is null or abs(lat - 40.1158) > 0.0001
     or lng is null or abs(lng - 67.8422) > 0.0001 then
    raise exception
      'FAIL(16a): Jizzakh coordinate round-tripped as %, % (expected 40.1158, 67.8422)',
      lat, lng;
  end if;
end $$;

-- (16b) A NULL district must stay legal on UPDATE too — the edit form sends the
--       same shape, and the trigger fires on both INSERT and UPDATE.
do $$
declare
  new_id uuid;
  d_id smallint;
begin
  new_id := public.create_property(
    (select id from public.regions where slug = 'tashkent-city')::smallint,
    (select id from public.districts where slug = 'chilonzor')::smallint,
    'Moving out of Tashkent',
    41.311,
    69.279
  );

  perform public.update_property(
    new_id,
    (select id from public.regions where slug = 'samarkand')::smallint,
    null,                                  -- district cleared with the region
    'Samarkand, no district',
    39.6542,
    66.9597
  );

  select district_id into d_id from public.properties where id = new_id;
  if d_id is not null then
    raise exception 'FAIL(16b): district_id survived as % (expected null)', d_id;
  end if;
end $$;

-- Listing lifecycle assertions (still as user A).

-- (20) Transitioning a listing INTO active sets expires_at ~30 days out, in the
--      database (not the app).
do $$
declare
  exp timestamptz;
begin
  update public.listings set status = 'active'
  where id = 'dddddddd-0000-0000-0000-000000000f03';

  select expires_at into exp from public.listings
  where id = 'dddddddd-0000-0000-0000-000000000f03';

  if exp is null
     or exp < now() + interval '29 days'
     or exp > now() + interval '31 days' then
    raise exception
      'FAIL(20): publishing did not set expires_at ~30 days out (got %)', exp;
  end if;
end $$;

-- (21) An invalid status transition (removed -> active) is rejected at the DB.
do $$
declare
  did_raise boolean := false;
  err_state text;
begin
  -- active -> removed is valid.
  update public.listings set status = 'removed'
  where id = 'dddddddd-0000-0000-0000-000000000f03';

  -- removed -> active must be rejected (removed is terminal).
  begin
    update public.listings set status = 'active'
    where id = 'dddddddd-0000-0000-0000-000000000f03';
  exception when others then
    did_raise := true;
    err_state := sqlstate;
  end;

  if not did_raise then
    raise exception 'FAIL(21): removed -> active transition was not rejected';
  elsif err_state <> '23514' then
    raise exception
      'FAIL(21): invalid transition raised SQLSTATE % (expected 23514)', err_state;
  end if;
end $$;

-- (22) A CANNOT attach an amenity to B's listing.
do $$
declare
  did_raise boolean := false;
  err_state text;
begin
  begin
    insert into public.listing_amenities (listing_id, amenity_id)
    values (
      'dddddddd-0000-0000-0000-0000000000b1',
      (select id from public.amenities where slug = 'internet')
    );
  exception when others then
    did_raise := true;
    err_state := sqlstate;
  end;

  if not did_raise then
    raise exception 'FAIL(22): A attached an amenity to B''s listing';
  elsif err_state <> '42501' then
    raise exception
      'FAIL(22): cross-owner amenity insert raised SQLSTATE % (expected 42501)', err_state;
  end if;
end $$;

-- Photo & price assertions (still as user A).

-- (23) A CANNOT insert a property_photos row for B's property.
do $$
declare
  did_raise boolean := false;
  err_state text;
begin
  begin
    insert into public.property_photos (property_id, storage_path)
    values (
      'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
      'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee/hack.webp'
    );
  exception when others then
    did_raise := true;
    err_state := sqlstate;
  end;
  if not did_raise then
    raise exception 'FAIL(23): A inserted a photo for B''s property';
  elsif err_state <> '42501' then
    raise exception
      'FAIL(23): cross-owner photo insert raised SQLSTATE % (expected 42501)', err_state;
  end if;
end $$;

-- (24) A listing CANNOT transition to active when its property has zero photos.
do $$
declare
  did_raise boolean := false;
  err_state text;
begin
  begin
    update public.listings set status = 'active'
    where id = '88888888-8888-8888-8888-888888888873';
  exception when others then
    did_raise := true;
    err_state := sqlstate;
  end;
  if not did_raise then
    raise exception 'FAIL(24): published a listing whose property has no photos';
  elsif err_state <> 'PH001' then
    raise exception
      'FAIL(24): publish gate raised SQLSTATE % (expected PH001)', err_state;
  end if;
end $$;

-- (25) The same listing CAN be published once a photo row exists.
do $$
declare
  st public.listing_status;
begin
  insert into public.property_photos (property_id, storage_path)
  values (
    '77777777-7777-7777-7777-777777777773',
    '77777777-7777-7777-7777-777777777773/photo.webp'
  );

  update public.listings set status = 'active'
  where id = '88888888-8888-8888-8888-888888888873';

  select status into st from public.listings
  where id = '88888888-8888-8888-8888-888888888873';
  if st <> 'active' then
    raise exception 'FAIL(25): listing did not publish after a photo was added (status %)', st;
  end if;
end $$;

-- (26) A UZS price of 5,000,000 is accepted (regression for the old bound).
do $$
begin
  insert into public.listings (property_id, title, content_language, price_amount, price_currency)
  values (
    'cccccccc-cccc-cccc-cccc-cccccccccccc',
    'Price regression listing', 'uz', 5000000, 'UZS'
  );
end $$;

-- (27) A UZS price above the new maximum is rejected.
do $$
declare
  did_raise boolean := false;
  err_state text;
begin
  begin
    insert into public.listings (property_id, title, content_language, price_amount, price_currency)
    values (
      'cccccccc-cccc-cccc-cccc-cccccccccccc',
      'Overpriced listing', 'uz', 2000000000, 'UZS'
    );
  exception when others then
    did_raise := true;
    err_state := sqlstate;
  end;
  if not did_raise then
    raise exception 'FAIL(27): a UZS price above the maximum was accepted';
  elsif err_state <> '23514' then
    raise exception
      'FAIL(27): over-max price raised SQLSTATE % (expected 23514)', err_state;
  end if;
end $$;

-- Photo-deletion guard & view counter (still as user A, who owns C and G).

-- (29) Deleting the LAST photo of a property with an active listing is rejected.
--      Property C has one photo and an active listing (…0001).
do $$
declare
  did_raise boolean := false;
  err_state text;
begin
  begin
    delete from public.property_photos
    where property_id = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
  exception when others then
    did_raise := true;
    err_state := sqlstate;
  end;
  if not did_raise then
    raise exception 'FAIL(29): removed the last photo of a property with an active listing';
  elsif err_state <> 'PH002' then
    raise exception 'FAIL(29): last-photo delete raised % (expected PH002)', err_state;
  end if;
end $$;

-- (30) Deleting the last photo of a property whose only listing is a draft
--      SUCCEEDS. Property G has one photo and only a draft listing.
do $$
declare
  remaining int;
begin
  delete from public.property_photos
  where property_id = '77777777-7777-7777-7777-777777777771';
  select count(*) into remaining from public.property_photos
  where property_id = '77777777-7777-7777-7777-777777777771';
  if remaining <> 0 then
    raise exception 'FAIL(30): draft-only property photo was not deleted (% left)', remaining;
  end if;
end $$;

-- (31) increment_listing_view bumps an actively-visible listing…
do $$
declare
  v int;
begin
  perform public.increment_listing_view('dddddddd-0000-0000-0000-000000000001');
  select view_count into v from public.listings
  where id = 'dddddddd-0000-0000-0000-000000000001';
  if v <> 1 then
    raise exception 'FAIL(31): active listing view_count is % (expected 1)', v;
  end if;
end $$;

-- (32) …but NOT a draft listing.
do $$
declare
  v int;
begin
  perform public.increment_listing_view('dddddddd-0000-0000-0000-000000000002');
  select view_count into v from public.listings
  where id = 'dddddddd-0000-0000-0000-000000000002';
  if v <> 0 then
    raise exception 'FAIL(32): draft listing view_count is % (expected 0)', v;
  end if;
end $$;

-- (33) The partial unique index rejects a SECOND active listing on a property.
--      Property C already has the active `…0001`; publishing its draft `…0002`
--      must be rejected with a unique_violation (23505).
do $$
declare
  did_raise boolean := false;
  err_state text;
begin
  begin
    update public.listings set status = 'active'
    where id = 'dddddddd-0000-0000-0000-000000000002';
  exception when others then
    did_raise := true;
    err_state := sqlstate;
  end;
  if not did_raise then
    raise exception
      'FAIL(33): a second active listing on the same property was allowed';
  elsif err_state <> '23505' then
    raise exception
      'FAIL(33): one-active index raised SQLSTATE % (expected 23505)', err_state;
  end if;
end $$;

-- (34) …but a second NON-active (paused) listing on the same property is fine
--      (the index only constrains status = 'active').
do $$
declare
  n int;
begin
  insert into public.listings
    (id, property_id, title, content_language, price_amount, status)
  values (
    'dddddddd-0000-0000-0000-0000000000fa',
    'cccccccc-cccc-cccc-cccc-cccccccccccc',
    'A second paused listing', 'uz', 1000000, 'paused'
  );
  get diagnostics n = row_count;
  if n <> 1 then
    raise exception
      'FAIL(34): a second paused listing on the same property was rejected (% rows)', n;
  end if;
end $$;

-- (35) The contact gate: publishing fails (CT001) when the owner has no phone.
--      Property K's draft `…88aa` has a photo and no competing active listing, so
--      only the missing contact can block it.
do $$
declare
  did_raise boolean := false;
  err_state text;
begin
  update public.profiles set phone = null
    where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  begin
    update public.listings set status = 'active'
    where id = '88888888-8888-8888-8888-8888888888aa';
  exception when others then
    did_raise := true;
    err_state := sqlstate;
  end;
  if not did_raise then
    raise exception 'FAIL(35): published a listing whose owner has no phone';
  elsif err_state <> 'CT001' then
    raise exception
      'FAIL(35): contact gate raised SQLSTATE % (expected CT001)', err_state;
  end if;
end $$;

-- (36) …and succeeds once the owner has a name + phone.
do $$
declare
  n int;
begin
  update public.profiles set full_name = 'Owner A', phone = '+998900000001'
    where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  update public.listings set status = 'active'
    where id = '88888888-8888-8888-8888-8888888888aa';
  get diagnostics n = row_count;
  if n <> 1 then
    raise exception 'FAIL(36): publish with contact set did not succeed (% rows)', n;
  end if;
end $$;

-- (37) reveal_contact returns the owner's phone, dedups, and bumps reveal_count
--      exactly once. User A reveals B's active listing `…b1` twice.
do $$
declare
  v_phone text;
  v_reveals int;
  v_cnt int;
begin
  select phone into v_phone
  from public.reveal_contact('dddddddd-0000-0000-0000-0000000000b1');
  if v_phone <> '+998900000002' then
    raise exception 'FAIL(37): reveal_contact returned phone % (expected B''s)', v_phone;
  end if;
  perform public.reveal_contact('dddddddd-0000-0000-0000-0000000000b1');
  select count(*) into v_reveals from public.contact_reveals
    where user_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
      and listing_id = 'dddddddd-0000-0000-0000-0000000000b1';
  if v_reveals <> 1 then
    raise exception 'FAIL(37): reveal was not deduped (% rows)', v_reveals;
  end if;
  select reveal_count into v_cnt from public.listings
    where id = 'dddddddd-0000-0000-0000-0000000000b1';
  if v_cnt <> 1 then
    raise exception 'FAIL(37): reveal_count is % (expected 1)', v_cnt;
  end if;
end $$;

-- (38) get_favorite_cards returns the caller's favorites with availability.
do $$
declare
  v_cnt int;
  v_id uuid;
  v_avail boolean;
begin
  insert into public.favorites (user_id, listing_id)
    values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
            'dddddddd-0000-0000-0000-0000000000b1');
  select count(*) into v_cnt from public.get_favorite_cards();
  if v_cnt <> 1 then
    raise exception 'FAIL(38): get_favorite_cards returned % rows (expected 1)', v_cnt;
  end if;
  select listing_id, is_available into v_id, v_avail
  from public.get_favorite_cards() limit 1;
  if v_id <> 'dddddddd-0000-0000-0000-0000000000b1' or v_avail is not true then
    raise exception 'FAIL(38): favorite card mismatch (id=% avail=%)', v_id, v_avail;
  end if;
end $$;

-- (V3) user A cannot submit verification for B's property (RLS → 42501).
do $$
declare did boolean := false; st text;
begin
  begin
    perform public.submit_verification(
      'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', '09:09:09:09:09', 'e/doc.pdf');
  exception when others then did := true; st := sqlstate;
  end;
  if not did then
    raise exception 'FAIL(V3): submitted verification for another owner''s property';
  elsif st <> '42501' then
    raise exception 'FAIL(V3): expected 42501, got %', st;
  end if;
end $$;

-- (V4) an owner cannot self-verify (protect trigger → 42501).
do $$
declare did boolean := false; st text;
begin
  begin
    update public.properties set verification_status = 'verified'
    where id = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
  exception when others then did := true; st := sqlstate;
  end;
  if not did then
    raise exception 'FAIL(V4): owner self-verified a property';
  elsif st <> '42501' then
    raise exception 'FAIL(V4): expected 42501, got %', st;
  end if;
end $$;

-- (V5) an owner submits for their own property → it becomes pending.
do $$
declare vs text;
begin
  perform public.submit_verification(
    '77777777-7777-7777-7777-77777777777c', '02:02:02:02:02', 'n/doc.pdf');
  select verification_status into vs from public.properties
  where id = '77777777-7777-7777-7777-77777777777c';
  if vs <> 'pending' then
    raise exception 'FAIL(V5): property not set to pending (got %)', vs;
  end if;
end $$;

-- (V6) a second pending submission on the same property is refused (23505).
do $$
declare did boolean := false; st text;
begin
  begin
    perform public.submit_verification(
      '77777777-7777-7777-7777-77777777777b', '03:03:03:03:03', 'm/doc2.pdf');
  exception when others then did := true; st := sqlstate;
  end;
  if not did then
    raise exception 'FAIL(V6): a second pending submission was allowed';
  elsif st <> '23505' then
    raise exception 'FAIL(V6): expected 23505, got %', st;
  end if;
end $$;

-- (V7) an admin decision approves: submission approved, document_path cleared,
--      property verified. Switch the jwt sub to the admin (role stays
--      authenticated; is_admin() reads the profile).
set local request.jwt.claims =
  '{"sub":"99999999-9999-9999-9999-999999999999","role":"authenticated"}';
do $$
declare v_status text; v_path text; v_prop text;
begin
  perform public.decide_verification(
    'ffffffff-0000-0000-0000-000000000001', true, null, null);
  select status, document_path into v_status, v_path
  from public.property_verifications
  where id = 'ffffffff-0000-0000-0000-000000000001';
  if v_status <> 'approved' then
    raise exception 'FAIL(V7): submission not approved (got %)', v_status;
  end if;
  if v_path is not null then
    raise exception 'FAIL(V7): document_path was not cleared on approval';
  end if;
  select verification_status into v_prop from public.properties
  where id = '77777777-7777-7777-7777-77777777777b';
  if v_prop <> 'verified' then
    raise exception 'FAIL(V7): property not verified (got %)', v_prop;
  end if;
end $$;

reset role;
rollback;
