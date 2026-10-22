begin;

create table public.avatar_sessions (
  request_id text primary key check (request_id ~ '^[A-Za-z0-9_.-]{1,160}$'),
  owner_id uuid not null references auth.users(id) on delete cascade,
  claim_hash text not null check (claim_hash ~ '^[a-f0-9]{64}$'),
  session_id text check (length(session_id) between 1 and 256),
  created_at timestamptz not null default now(),
  closed_at timestamptz
);
create unique index avatar_one_active_owner on public.avatar_sessions(owner_id) where closed_at is null;
create index avatar_owner_created on public.avatar_sessions(owner_id, created_at);
alter table public.avatar_sessions enable row level security;
alter table public.avatar_sessions force row level security;
revoke all on public.avatar_sessions from public, anon, authenticated;
grant select on public.avatar_sessions to authenticated;
create policy avatar_select_own on public.avatar_sessions for select to authenticated
  using ((select auth.uid()) = owner_id);

-- The server derives a capability with its secret; only its hash is readable.
-- User JWTs alone cannot bind/close a real provider session behind the proxy.
create function public.avatar_reserve(target_request text, target_claim_hash text) returns void
language plpgsql security definer set search_path = '' as $$
declare subject uuid := auth.uid();
begin
  if subject is null then raise exception 'Authentication required' using errcode='42501'; end if;
  perform pg_catalog.pg_advisory_xact_lock(742103681);
  delete from public.avatar_sessions where closed_at < now() - interval '1 day';
  if exists(select 1 from public.avatar_sessions where owner_id=subject and closed_at is null) then
    raise exception 'AVATAR_ACTIVE';
  end if;
  if (select count(*) from public.avatar_sessions where owner_id=subject and created_at > now() - interval '1 minute') >= 5 then
    raise exception 'AVATAR_RATE_LIMITED';
  end if;
  if (select count(*) from public.avatar_sessions where closed_at is null) >= 30 then
    raise exception 'AVATAR_BUSY';
  end if;
  insert into public.avatar_sessions(request_id,owner_id,claim_hash) values(target_request,subject,target_claim_hash);
end;
$$;

create function public.avatar_bind(target_request text, target_session text, capability text) returns boolean
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode='42501'; end if;
  update public.avatar_sessions set session_id=target_session
    where request_id=target_request and owner_id=auth.uid() and closed_at is null and session_id is null
      and claim_hash=pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(capability,'UTF8')),'hex');
  return found;
end;
$$;

create function public.avatar_close(target_request text, capability text) returns boolean
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode='42501'; end if;
  update public.avatar_sessions set closed_at=now()
    where request_id=target_request and owner_id=auth.uid() and closed_at is null
      and claim_hash=pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(capability,'UTF8')),'hex');
  return found;
end;
$$;
revoke all on function public.avatar_reserve(text,text), public.avatar_bind(text,text,text), public.avatar_close(text,text) from public, anon, authenticated;
grant execute on function public.avatar_reserve(text,text), public.avatar_bind(text,text,text), public.avatar_close(text,text) to authenticated;
commit;
