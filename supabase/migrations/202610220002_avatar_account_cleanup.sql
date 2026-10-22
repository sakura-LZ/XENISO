begin;
-- Direct RPC callers must also release provider sessions before deleting ownership.
create or replace function public.delete_own_account() returns void
language plpgsql security definer set search_path = '' as $$
declare subject uuid := auth.uid();
begin
  if subject is null then raise exception 'Authentication required'; end if;
  perform pg_catalog.pg_advisory_xact_lock(742103681);
  if exists(select 1 from public.avatar_sessions where owner_id=subject and closed_at is null) then
    raise exception 'End active avatar session before deleting account';
  end if;
  delete from auth.users where id=subject;
end;
$$;
commit;
