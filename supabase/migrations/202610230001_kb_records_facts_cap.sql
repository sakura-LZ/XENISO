-- 单条记录可承载的事实数上限从 30 放宽到 200。
-- 起因：招聘类数据按「同源 + 同岗位组」成组，迈瑞/联影单组专业要求可达 34–36 条，
-- 30 会把合法同质事实卡成导入失败。上限仍保留，用于挡住把整站事实塞进一条记录的滥用。
alter table public.kb_records drop constraint if exists kb_records_facts_check;
alter table public.kb_records
  add constraint kb_records_facts_check
  check (jsonb_typeof(facts) = 'array' and jsonb_array_length(facts) between 1 and 200);
