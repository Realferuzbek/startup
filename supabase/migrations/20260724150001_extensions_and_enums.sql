-- Extensions & enums for the Realtor.uz data model.
-- PostGIS and pgcrypto are installed into the `extensions` schema (Supabase
-- convention). gen_random_uuid() is native in Postgres 13+; pgcrypto is enabled
-- per spec for future cryptographic needs.

create extension if not exists postgis with schema extensions;
create extension if not exists pgcrypto with schema extensions;

create type public.user_role as enum ('user', 'admin');

create type public.property_verification_status as enum (
  'unverified',
  'pending',
  'verified',
  'rejected'
);

create type public.listing_status as enum (
  'draft',
  'active',
  'paused',
  'expired',
  'removed'
);

create type public.rental_period as enum ('monthly', 'daily');

create type public.content_language as enum ('uz', 'ru');

create type public.report_reason as enum (
  'fake_listing',
  'wrong_price',
  'already_rented',
  'scam_attempt',
  'inappropriate_content',
  'other'
);

create type public.report_status as enum (
  'open',
  'reviewing',
  'resolved',
  'dismissed'
);
