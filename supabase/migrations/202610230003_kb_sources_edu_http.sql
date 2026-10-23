-- 放宽 kb_sources.url 的协议约束：除 https 外，允许政府与高校站点在
-- HTTPS 通道不可用时只提供 http 版本（与 src/lib/knowledge.ts 的 publicUrl 保持一致）。
-- 触发原因：东北大学就业信息网 job.neu.edu.cn 的 443 直接超时，报告只提供 http，
-- 而 .edu.cn 此前不在例外内，导入被数据库层拦下。
-- 例外仍要求是正式机构域名（.gov.cn / .edu.cn），不接受裸 IP；
-- 导入侧必须在 publication_date_note 里披露取得方式。
alter table public.kb_sources drop constraint if exists kb_sources_url_check;
alter table public.kb_sources add constraint kb_sources_url_check
  check (
    url ~ '^https://'
    or url ~ '^http://[^/]*\.(gov|edu)\.cn(/|:|$)'
  );
