-- Core tables for the Realtor.uz data model.
--
-- Architecture:
--   properties = the physical real-estate object; verification attaches HERE.
--   listings   = one time-bound offer to rent a property; one property has many
--                listings over time. Listing text is stored ONCE in the host's
--                chosen language, tagged by content_language. No per-language
--                content columns.

-- Reference data: Uzbekistan regions (viloyatlar). Seeded separately.
create table public.regions (
  id smallint generated always as identity primary key,
  slug text not null unique,
  name_uz text not null,
  name_ru text not null,
  sort_order smallint not null default 0
);

-- Extends auth.users. Rows are auto-created by the handle_new_user() trigger.
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  phone text unique,
  avatar_url text,
  role public.user_role not null default 'user',
  identity_verified boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- The physical property. Verification status lives here.
create table public.properties (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  region_id smallint not null references public.regions (id),
  address_line text not null,
  location extensions.geography (Point, 4326) not null,
  cadastral_number text,
  verification_status public.property_verification_status not null default 'unverified',
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- A cadastral number, when present, uniquely identifies one property.
create unique index properties_cadastral_uniq
  on public.properties (cadastral_number)
  where cadastral_number is not null;

-- A time-bound rental offer for a property.
create table public.listings (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties (id) on delete cascade,
  -- Denormalized from properties.owner_id by the set_listing_owner() trigger.
  -- Authoritative and NEVER client-supplied.
  owner_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  description text,
  content_language public.content_language not null,
  price_amount numeric(12, 2) not null check (price_amount > 0),
  price_currency text not null default 'UZS' check (price_currency in ('UZS', 'USD')),
  rental_period public.rental_period not null default 'monthly',
  rooms smallint check (rooms between 1 and 20),
  area_sqm numeric(7, 2) check (area_sqm > 0),
  floor smallint,
  total_floors smallint,
  available_from date,
  status public.listing_status not null default 'draft',
  expires_at timestamptz,
  view_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.listing_photos (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings (id) on delete cascade,
  storage_path text not null,
  -- Perceptual hash, reserved for duplicate detection in a later chunk. No
  -- logic computes this yet.
  phash text,
  display_order smallint not null default 0,
  created_at timestamptz not null default now()
);

create table public.favorites (
  user_id uuid not null references public.profiles (id) on delete cascade,
  listing_id uuid not null references public.listings (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, listing_id)
);

create table public.contact_reveals (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  revealed_at timestamptz not null default now()
);

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings (id) on delete cascade,
  -- Kept (nullable) if the reporter's account is later deleted.
  reporter_id uuid references public.profiles (id) on delete set null,
  reason public.report_reason not null,
  details text,
  status public.report_status not null default 'open',
  created_at timestamptz not null default now()
);

-- Indexes
create index properties_location_gist on public.properties using gist (location);
create index properties_owner_idx on public.properties (owner_id);
create index properties_region_idx on public.properties (region_id);

create index listings_status_created_idx on public.listings (status, created_at desc);
create index listings_owner_idx on public.listings (owner_id);
create index listings_property_idx on public.listings (property_id);

create index listing_photos_listing_order_idx
  on public.listing_photos (listing_id, display_order);
