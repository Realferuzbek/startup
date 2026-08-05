-- Ownership verification submissions — the product's core trust mechanism.
--
-- A host submits a cadastral extract (the document lives in the PRIVATE
-- verification-documents bucket, added next migration); an admin reviews it and
-- approves or rejects. The submission ROW is a durable audit trail; the DOCUMENT
-- is deleted on decision (CLAUDE.md: identity documents are never retained). The
-- decision writes `properties.verification_status` — and a protect trigger makes
-- sure ONLY an admin can set verified/rejected, so an owner can never
-- self-verify (owner_all previously allowed a raw self-verify update).

create type public.verification_rejection_reason as enum (
  'name_mismatch',
  'unreadable',
  'wrong_document',
  'cadastral_mismatch',
  'other'
);

create type public.verification_submission_status as enum (
  'pending',
  'approved',
  'rejected'
);

create table public.property_verifications (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties (id) on delete cascade,
  submitted_by uuid not null references public.profiles (id) on delete cascade,
  cadastral_number text not null,
  -- Nullable: the document path is cleared on decision (retention). The row and
  -- its decision survive; the document does not.
  document_path text,
  status public.verification_submission_status not null default 'pending',
  rejection_reason public.verification_rejection_reason,
  rejection_note text,
  decided_by uuid references public.profiles (id),
  decided_at timestamptz,
  created_at timestamptz not null default now()
);

-- At most one pending submission per property.
create unique index property_verifications_one_pending
  on public.property_verifications (property_id)
  where status = 'pending';

create index property_verifications_property_idx
  on public.property_verifications (property_id, created_at desc);

alter table public.property_verifications enable row level security;

grant select, insert on public.property_verifications to authenticated;
grant select, insert, update, delete on public.property_verifications to service_role;

-- Owner reads submissions for their own properties.
create policy property_verifications_owner_select
  on public.property_verifications for select
  using (
    exists (
      select 1 from public.properties p
      where p.id = property_id and p.owner_id = (select auth.uid())
    )
  );

-- Owner inserts their own submission for a property they own.
create policy property_verifications_owner_insert
  on public.property_verifications for insert
  to authenticated
  with check (
    submitted_by = (select auth.uid())
    and exists (
      select 1 from public.properties p
      where p.id = property_id and p.owner_id = (select auth.uid())
    )
  );

create policy property_verifications_admin_all
  on public.property_verifications for all
  using (public.is_admin())
  with check (public.is_admin());

-- A property that is already verified cannot receive a new submission.
create or replace function public.prevent_verification_when_verified()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if exists (
    select 1 from public.properties p
    where p.id = new.property_id and p.verification_status = 'verified'
  ) then
    raise exception 'property is already verified'
      using errcode = 'VF001';
  end if;
  return new;
end;
$$;

create trigger prevent_verification_when_verified
  before insert on public.property_verifications
  for each row execute function public.prevent_verification_when_verified();

-- Only an admin (or the service role, for migrations) may set a property's
-- verification_status to anything other than `pending`. An owner may move their
-- own property INTO pending (submitting for review) and nothing else — they can
-- never self-verify. Mirrors protect_profile_columns().
create or replace function public.protect_verification_status()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (
    new.verification_status is distinct from old.verification_status
    or new.verified_at is distinct from old.verified_at
  )
  and (select auth.uid()) is not null
  and not public.is_admin() then
    if not (
      new.verification_status = 'pending'
      and old.verification_status in ('unverified', 'rejected')
      and new.verified_at is not distinct from old.verified_at
    ) then
      raise exception 'verification status can only be changed by an admin'
        using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

create trigger protect_verification_status
  before update on public.properties
  for each row execute function public.protect_verification_status();
