-- Public reference knowledge is separate from all personal profiles and reports.
begin;
create table public.kb_roles (
  id text primary key,
  name text not null,
  aliases text[] not null,
  direction_ids text[] not null,
  mapping_basis text not null,
  scope text not null
);
create table public.kb_sources (
  id text primary key,
  url text not null unique check (url ~ '^https://'),
  organization text not null,
  title text not null,
  jurisdiction text not null,
  source_tier text not null check (source_tier = 'primary'),
  published_at date,
  publication_date_note text not null
);
create table public.kb_snapshots (
  content_hash text primary key check (content_hash ~ '^[a-f0-9]{64}$'),
  source_id text not null references public.kb_sources(id),
  raw_hash text not null check (raw_hash ~ '^[a-f0-9]{64}$'),
  raw_base64 text not null,
  text_body text not null,
  content_type text not null,
  fetched_at timestamptz not null
);
create table public.kb_records (
  id text primary key,
  source_id text not null references public.kb_sources(id),
  role_id text not null references public.kb_roles(id),
  category text not null check (category in ('occupation','recruitment','admissions','industry','learning')),
  title text not null,
  summary text not null,
  applicability text not null,
  relation text not null check (relation in ('direct','related','context')),
  tags text[] not null,
  facts jsonb not null check (jsonb_typeof(facts) = 'array' and jsonb_array_length(facts) between 1 and 200),
  missing_fields text[] not null,
  verification text not null check (verification = 'quote_verified'),
  content_hash text not null references public.kb_snapshots(content_hash),
  collected_at timestamptz not null,
  verified_at timestamptz not null,
  valid_through date,
  freshness_days integer not null check (freshness_days between 1 and 730),
  unique (role_id, source_id, category)
);
create index kb_records_retrieval on public.kb_records(role_id, category, collected_at desc);

-- Offsets are JavaScript UTF-16 indices, so database enforcement checks exact
-- substring presence; the importer additionally validates start/end offsets.
create function public.kb_check_evidence() returns trigger
language plpgsql set search_path = '' as $$
declare body text; fact jsonb;
begin
  select text_body into body from public.kb_snapshots
    where content_hash = new.content_hash and source_id = new.source_id;
  if body is null then raise exception 'KB_SNAPSHOT_SOURCE_MISMATCH'; end if;
  for fact in select value from jsonb_array_elements(new.facts) loop
    if coalesce(length(fact->>'quote'),0) < 10
      or (fact->>'value') is distinct from (fact->>'quote')
      or coalesce(fact->>'field','') = ''
      or position(fact->>'quote' in body) = 0 then
      raise exception 'KB_EVIDENCE_MISMATCH';
    end if;
  end loop;
  return new;
end $$;
create trigger kb_records_evidence before insert or update on public.kb_records
for each row execute function public.kb_check_evidence();
revoke all on function public.kb_check_evidence() from public, anon, authenticated;

alter table public.kb_roles enable row level security;
alter table public.kb_roles force row level security;
alter table public.kb_sources enable row level security;
alter table public.kb_sources force row level security;
alter table public.kb_records enable row level security;
alter table public.kb_records force row level security;
alter table public.kb_snapshots enable row level security;
alter table public.kb_snapshots force row level security;
revoke all on public.kb_roles, public.kb_sources, public.kb_records, public.kb_snapshots from anon, authenticated;
grant select on public.kb_roles, public.kb_sources, public.kb_records to anon, authenticated;
create policy kb_roles_public_read on public.kb_roles for select to anon, authenticated using (true);
create policy kb_sources_public_read on public.kb_sources for select to anon, authenticated using (true);
create policy kb_records_verified_read on public.kb_records for select to anon, authenticated using (verification = 'quote_verified');
-- No snapshot policy or public write policy. Imports run only through the
-- maintainer's existing database-management credential, never a client key.
notify pgrst, 'reload schema';
commit;
