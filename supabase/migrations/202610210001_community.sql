begin;
create table public.community_posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('help','experience')),
  title text not null check (length(trim(title)) between 4 and 100),
  body text not null check (length(trim(body)) between 10 and 4000),
  hidden boolean not null default false,
  created_at timestamptz not null default now()
);
create table public.community_flags (
  post_id uuid not null references public.community_posts(id) on delete cascade,
  reporter_id uuid not null references auth.users(id) on delete cascade,
  reason text not null check (reason in ('privacy','abuse','spam','other')),
  created_at timestamptz not null default now(),
  primary key (post_id, reporter_id)
);
alter table public.community_posts enable row level security;
alter table public.community_posts force row level security;
alter table public.community_flags enable row level security;
alter table public.community_flags force row level security;
-- No direct table grants: RPC output deliberately excludes account identifiers.
revoke all on public.community_posts, public.community_flags from public, anon, authenticated;
create function public.community_member() returns uuid
language plpgsql security definer set search_path = '' as $$
declare subject uuid := auth.uid();
begin
  if subject is null or not exists(select 1 from auth.users where id=subject and email_confirmed_at is not null and not coalesce(is_anonymous,true)) then
    raise exception 'Verified account required' using errcode='42501';
  end if;
  return subject;
end;
$$;
create function public.community_list() returns table(id uuid,kind text,title text,body text,created_at timestamptz,mine boolean)
language plpgsql security definer set search_path = '' as $$
declare subject uuid := public.community_member();
begin
  return query select p.id,p.kind,p.title,p.body,p.created_at,p.author_id=subject from public.community_posts p where not p.hidden order by p.created_at desc limit 50;
end;
$$;
create function public.community_publish(post_kind text, post_title text, post_body text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare subject uuid := public.community_member(); new_id uuid;
begin
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(subject::text,0));
  if exists(select 1 from public.community_posts where author_id=subject and created_at > now()-interval '1 minute') then raise exception 'Please wait before posting'; end if;
  insert into public.community_posts(author_id,kind,title,body) values(subject,post_kind,trim(post_title),trim(post_body)) returning id into new_id;
  return new_id;
end;
$$;
create function public.community_delete(post_id uuid) returns boolean
language plpgsql security definer set search_path = '' as $$
declare subject uuid := public.community_member();
begin
  delete from public.community_posts where id=post_id and author_id=subject;
  return found;
end;
$$;
create function public.community_report(target_id uuid, flag_reason text) returns void
language plpgsql security definer set search_path = '' as $$
declare subject uuid := public.community_member();
begin
  if not exists(select 1 from public.community_posts where id=target_id and not hidden) then raise exception 'Post unavailable'; end if;
  insert into public.community_flags(post_id,reporter_id,reason) values(target_id,subject,flag_reason) on conflict(post_id,reporter_id) do update set reason=excluded.reason;
end;
$$;
revoke all on function public.community_member(), public.community_list(), public.community_publish(text,text,text), public.community_delete(uuid), public.community_report(uuid,text) from public, anon, authenticated;
grant execute on function public.community_list(), public.community_publish(text,text,text), public.community_delete(uuid), public.community_report(uuid,text) to authenticated;
commit;
