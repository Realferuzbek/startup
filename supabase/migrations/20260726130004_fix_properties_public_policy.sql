-- Fix a latent bug in the original properties public-read policy.
--
-- The chunk-1 policy used `where l.property_id = id`. Inside the EXISTS subquery
-- the FROM is `listings l`, and `listings` has an `id` column, so the unqualified
-- `id` resolved to listings.id (not properties.id). The predicate became
-- `l.property_id = l.id`, which is essentially never true — so anon could never
-- read a publicly-listed property. It went unnoticed because no query read a
-- property row as anon until the public browse surface.
--
-- Qualify the reference as properties.id and align visibility with the
-- time-filtered listing rule so a property is publicly readable exactly when it
-- has a publicly-visible listing.
drop policy properties_select_public on public.properties;

create policy properties_select_public
  on public.properties for select
  using (
    exists (
      select 1
      from public.listings l
      where l.property_id = properties.id
        and l.status = 'active'
        and (l.expires_at is null or l.expires_at > now())
    )
  );
