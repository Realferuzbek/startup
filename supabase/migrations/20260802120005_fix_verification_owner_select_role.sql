-- Fix: property_verifications_owner_select was public-scoped, so it applied to
-- anon. Its USING reads properties.owner_id, but anon is column-restricted on
-- properties (only id/region_id/district_id/verification_status since the public
-- browse hardening) and cannot read owner_id — so any anon touch of the table
-- raised "permission denied for table properties" instead of a clean deny.
--
-- Owner reads are an authenticated-only concern (anon has no grant on the table
-- anyway), so scope the policy to `authenticated`. Then anon never evaluates the
-- properties subquery.

drop policy property_verifications_owner_select on public.property_verifications;

create policy property_verifications_owner_select
  on public.property_verifications for select
  to authenticated
  using (
    exists (
      select 1 from public.properties p
      where p.id = property_id and p.owner_id = (select auth.uid())
    )
  );
