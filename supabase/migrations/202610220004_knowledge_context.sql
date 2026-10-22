-- Additive public-reference metadata; existing policies and personal tables untouched.
begin;
alter table public.kb_records add column context jsonb not null default '{}'::jsonb
  check (jsonb_typeof(context) = 'object');
create index kb_records_context_gin on public.kb_records using gin(context);
notify pgrst, 'reload schema';
commit;
