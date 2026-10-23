-- 修正 7 条 industry 记录的 context.program 污染。
-- 问题：这些记录把「学校名」写进了 program，与 context.institution 完全重复，
--       导致按专业检索时会把「全校毕业生」口径误当成某个专业的去向。
-- 处理：改为与上海交通大学同类记录一致的诚实口径「全校毕业生（未细分专业）」，
--       不推测具体专业，也不删除这些有价值的全校级数据。
update public.kb_records
set context = jsonb_set(context, '{program}', '"全校毕业生（未细分专业）"'::jsonb, true)
where category = 'industry'
  and context->>'program' = context->>'institution';
