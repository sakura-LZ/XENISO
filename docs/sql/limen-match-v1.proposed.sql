-- PROPOSAL ONLY: not a migration, not executed by LIMEN-Match V1.
-- Review in an isolated database before any production adoption.
-- payload follows data/match/*.schema.json plus runtime matchInputSchema invariants.
-- Existing profiles/assessments/experiences and knowledge tables are untouched.
begin;

create table public.match_occupations (
  id text primary key,
  schema_version text not null default 'match-1' check (schema_version = 'match-1'),
  skill_standard_version text not null default 'limen-skills-1',
  review_status text not null default 'draft' check (review_status in ('draft','reviewed')),
  payload jsonb not null check (jsonb_typeof(payload) = 'object' and payload->>'id' = id and payload->>'schema_version' = 'match-1'),
  updated_at timestamptz not null default now()
);
create table public.match_admissions (
  id text primary key,
  schema_version text not null default 'match-1' check (schema_version = 'match-1'),
  review_status text not null default 'draft' check (review_status in ('draft','reviewed')),
  payload jsonb not null check (jsonb_typeof(payload) = 'object' and payload->>'id' = id and payload->>'schema_version' = 'match-1'),
  updated_at timestamptz not null default now()
);
-- Canonical many-to-many relation. Import transaction must mirror payload.occupation_ids.
create table public.match_admission_occupations (
  admission_id text not null references public.match_admissions(id) on delete cascade,
  occupation_id text not null references public.match_occupations(id) on delete cascade,
  mapping_evidence jsonb not null check (jsonb_typeof(mapping_evidence) = 'array' and jsonb_array_length(mapping_evidence) > 0),
  primary key (admission_id, occupation_id)
);
-- Optional normalized snapshots; existing P1 data remains canonical in V1.
create table public.match_user_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  schema_version text not null default 'match-1' check (schema_version = 'match-1'),
  skill_standard_version text not null default 'limen-skills-1',
  payload jsonb not null check (jsonb_typeof(payload) = 'object' and payload->>'schema_version' = 'match-1'),
  updated_at timestamptz not null default now()
);

alter table public.match_occupations enable row level security;
alter table public.match_admissions enable row level security;
alter table public.match_admission_occupations enable row level security;
alter table public.match_user_profiles enable row level security;
revoke all on public.match_occupations, public.match_admissions, public.match_admission_occupations, public.match_user_profiles from anon, authenticated;
grant select on public.match_occupations, public.match_admissions, public.match_admission_occupations to anon, authenticated;
grant select, insert, update, delete on public.match_user_profiles to authenticated;
create policy match_occupation_read on public.match_occupations for select to anon, authenticated
  using (review_status = 'reviewed' and payload->>'simulation' = 'false');
create policy match_admission_read on public.match_admissions for select to anon, authenticated
  using (review_status = 'reviewed' and payload->>'simulation' = 'false');
create policy match_link_read on public.match_admission_occupations for select to anon, authenticated
  using (exists (select 1 from public.match_occupations o where o.id = occupation_id)
     and exists (select 1 from public.match_admissions a where a.id = admission_id));
create policy match_user_own on public.match_user_profiles for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

commit;
