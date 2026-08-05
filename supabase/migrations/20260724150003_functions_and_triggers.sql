-- Functions & triggers.
-- All functions pin an empty search_path and use fully schema-qualified names.

-- Generic updated_at maintenance.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create trigger set_updated_at
  before update on public.properties
  for each row execute function public.set_updated_at();

create trigger set_updated_at
  before update on public.listings
  for each row execute function public.set_updated_at();

-- Admin check. SECURITY DEFINER so it reads profiles WITHOUT invoking the
-- profiles RLS policies — this is what prevents recursive policy evaluation
-- when profiles policies (indirectly) need an admin check.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and role = 'admin'
  );
$$;

-- listings.owner_id is authoritative: always derived from the parent property,
-- never trusted from the client. Runs on INSERT and UPDATE.
create or replace function public.set_listing_owner()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  select p.owner_id
    into new.owner_id
  from public.properties p
  where p.id = new.property_id;

  if new.owner_id is null then
    raise exception 'property % does not exist', new.property_id;
  end if;

  return new;
end;
$$;

create trigger set_listing_owner
  before insert or update on public.listings
  for each row execute function public.set_listing_owner();

-- Prevent non-admins from changing their own role or identity_verified.
-- auth.uid() IS NULL for the service role and for direct/superuser sessions, so
-- server-side admin management (via the service role) is still allowed.
create or replace function public.protect_profile_columns()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (
    new.role is distinct from old.role
    or new.identity_verified is distinct from old.identity_verified
  )
  and (select auth.uid()) is not null
  and not public.is_admin() then
    raise exception 'modifying role or identity_verified is not allowed';
  end if;
  return new;
end;
$$;

create trigger protect_profile_columns
  before update on public.profiles
  for each row execute function public.protect_profile_columns();

-- Auto-create a profile row when a new auth user is created.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'name'
    ),
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
