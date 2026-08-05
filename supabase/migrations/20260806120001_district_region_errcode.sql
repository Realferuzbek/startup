-- Give the district/region integrity trigger its own SQLSTATE.
--
-- The rule is unchanged and is NOT relaxed: a NULL district is still allowed
-- (only Tashkent city has districts, so every other region's properties have
-- none), and a district belonging to a different region is still refused.
--
-- What changes is only how the refusal identifies itself. It used to raise
-- `check_violation` (23514), which `properties` also raises for the
-- properties_location_bounds CHECK. The application therefore could not tell
-- "your district is not in that region" from "your pin is outside Uzbekistan",
-- and collapsed both into one generic error. A distinct SQLSTATE — following
-- the PH001/CT001 precedent — lets each be surfaced by name.
create or replace function public.enforce_property_district_region()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  -- NULL district: nothing to check. Districts exist for Tashkent city only,
  -- so this is the normal path for the other thirteen regions.
  if new.district_id is not null then
    if (select region_id from public.districts where id = new.district_id)
       is distinct from new.region_id then
      raise exception 'district % does not belong to region %',
        new.district_id, new.region_id
        using errcode = 'DR001';
    end if;
  end if;
  return new;
end;
$$;
