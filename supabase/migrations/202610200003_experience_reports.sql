begin;
create table public.experiences (
  id uuid primary key references auth.users(id) on delete cascade,
  payload jsonb not null check (jsonb_typeof(payload) = 'object'),
  updated_at timestamptz not null default now()
);
create table public.reports (
  id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('R1', 'R2')),
  payload jsonb not null check (jsonb_typeof(payload) = 'object'),
  updated_at timestamptz not null default now(),
  primary key (id, kind)
);
alter table public.experiences enable row level security;
alter table public.experiences force row level security;
alter table public.reports enable row level security;
alter table public.reports force row level security;
revoke all on public.experiences, public.reports from anon, authenticated;
grant select, insert, update, delete on public.experiences, public.reports to authenticated;
create policy experiences_own on public.experiences for all to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);
create policy reports_own on public.reports for all to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);
commit;
