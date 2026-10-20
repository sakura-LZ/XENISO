-- Apply in a development Supabase project with Anonymous Sign-Ins enabled.
begin;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  payload jsonb not null default '{}'::jsonb check (jsonb_typeof(payload) = 'object'),
  updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
alter table public.profiles force row level security;
revoke all on public.profiles from anon, authenticated;
grant select, insert, update, delete on public.profiles to authenticated;

create policy profiles_select_own on public.profiles for select to authenticated
  using ((select auth.uid()) = id);
create policy profiles_insert_own on public.profiles for insert to authenticated
  with check ((select auth.uid()) = id);
create policy profiles_update_own on public.profiles for update to authenticated
  using ((select auth.uid()) = id) with check ((select auth.uid()) = id);
create policy profiles_delete_own on public.profiles for delete to authenticated
  using ((select auth.uid()) = id);

-- No user-supplied target ID; only the verified JWT subject can be deleted.
-- Empty search_path prevents object shadowing inside this privileged function.
create function public.delete_own_account() returns void
language plpgsql security definer set search_path = '' as $$
declare subject uuid := auth.uid();
begin
  if subject is null then raise exception 'Authentication required'; end if;
  delete from auth.users where id = subject;
end;
$$;
revoke all on function public.delete_own_account() from public, anon;
grant execute on function public.delete_own_account() to authenticated;

commit;
