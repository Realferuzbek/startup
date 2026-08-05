-- A property with an active, publicly-visible listing must not be reducible to
-- zero photos (the publish gate requires >= 1 photo; deleting the last one would
-- leave an active public listing with no images). Deleting the last remaining
-- photo of such a property is rejected with a distinct, catchable code so the UI
-- can tell the host to pause the listing first.

create or replace function public.prevent_last_photo_delete()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.property_photos
    where property_id = old.property_id and id <> old.id
  )
  and exists (
    select 1 from public.listings l
    where l.property_id = old.property_id
      and l.status = 'active'
      and (l.expires_at is null or l.expires_at > now())
  ) then
    raise exception 'cannot remove the last photo of a property with an active listing'
      using errcode = 'PH002';
  end if;

  return old;
end;
$$;

create trigger prevent_last_photo_delete
  before delete on public.property_photos
  for each row execute function public.prevent_last_photo_delete();
