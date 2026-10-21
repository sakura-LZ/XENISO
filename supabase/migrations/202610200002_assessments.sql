begin;
create table public.assessments (
  id uuid primary key references auth.users(id) on delete cascade,
  payload jsonb not null check (jsonb_typeof(payload) = 'object'),
  updated_at timestamptz not null default now()
);
alter table public.assessments enable row level security;
alter table public.assessments force row level security;
revoke all on public.assessments from anon, authenticated;
grant select, insert, update, delete on public.assessments to authenticated;
create policy assessments_select_own on public.assessments for select to authenticated using ((select auth.uid()) = id);
create policy assessments_insert_own on public.assessments for insert to authenticated with check ((select auth.uid()) = id);
create policy assessments_update_own on public.assessments for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);
create policy assessments_delete_own on public.assessments for delete to authenticated using ((select auth.uid()) = id);
commit;
