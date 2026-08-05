-- Verification RPCs: one atomic submit (owner) and one atomic decision (admin).

-- Host submits: create the pending submission and move the property to pending,
-- in one statement. SECURITY INVOKER, so RLS + the one-pending index + the
-- VF001 "already verified" trigger enforce the rules against the CALLER. The
-- protect_verification_status trigger permits the owner's unverified/rejected →
-- pending move (and nothing else).
create or replace function public.submit_verification(
  p_property_id uuid,
  p_cadastral_number text,
  p_document_path text
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_id uuid;
begin
  insert into public.property_verifications
    (property_id, submitted_by, cadastral_number, document_path)
  values
    (p_property_id, (select auth.uid()), p_cadastral_number, p_document_path)
  returning id into v_id;

  update public.properties
  set verification_status = 'pending'
  where id = p_property_id;

  return v_id;
end;
$$;

grant execute on function public.submit_verification(uuid, text, text)
  to authenticated;

-- Admin decision: approve or reject the pending submission and the property, in
-- one statement, and CLEAR the document path (retention). SECURITY DEFINER +
-- an is_admin() guard. Returns the OLD document_path so the caller can delete
-- the storage object afterwards — the row is already consistent regardless of
-- whether that byte-delete succeeds.
create or replace function public.decide_verification(
  p_verification_id uuid,
  p_approve boolean,
  p_reason public.verification_rejection_reason default null,
  p_note text default null
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_old_path text;
  v_property uuid;
begin
  if not public.is_admin() then
    raise exception 'admin only' using errcode = '42501';
  end if;

  select document_path, property_id
    into v_old_path, v_property
  from public.property_verifications
  where id = p_verification_id and status = 'pending';

  if v_property is null then
    raise exception 'no pending verification' using errcode = 'no_data_found';
  end if;

  if p_approve then
    update public.property_verifications set
      status = 'approved',
      document_path = null,
      decided_by = (select auth.uid()),
      decided_at = now()
    where id = p_verification_id;

    update public.properties set
      verification_status = 'verified',
      verified_at = now()
    where id = v_property;
  else
    if p_reason is null then
      raise exception 'rejection reason required' using errcode = '23514';
    end if;

    update public.property_verifications set
      status = 'rejected',
      rejection_reason = p_reason,
      rejection_note = p_note,
      document_path = null,
      decided_by = (select auth.uid()),
      decided_at = now()
    where id = p_verification_id;

    update public.properties set
      verification_status = 'rejected',
      verified_at = null
    where id = v_property;
  end if;

  return v_old_path;
end;
$$;

grant execute on function public.decide_verification(
  uuid, boolean, public.verification_rejection_reason, text
) to authenticated;
