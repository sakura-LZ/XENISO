import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { z } from "zod";
import { knowledgeRoles, sourceSchema, recordSchema, verifyQuotes } from "../../src/lib/knowledge";

const snapshotSchema = z.object({ content_hash: z.string(), source_id: z.string(), raw_hash: z.string(), raw_base64: z.string(), text_body: z.string(), content_type: z.string(), fetched_at: z.iso.datetime() });
const name = process.argv[2] ?? "pilot";
if (!/^[a-z0-9-]{2,40}$/.test(name)) throw new Error("Invalid bundle name");
const bundle = z.object({ sources: sourceSchema.array(), records: recordSchema.array(), snapshots: snapshotSchema.array() }).parse(JSON.parse(readFileSync(`work/knowledge-${name}/bundle.json`, "utf8")));
for (const record of bundle.records) {
  const snapshot = bundle.snapshots.find(snapshot => snapshot.content_hash === record.content_hash && snapshot.source_id === record.source_id);
  const hash = (value: string | Buffer) => createHash("sha256").update(value).digest("hex");
  if (!snapshot || !bundle.sources.some(source => source.id === record.source_id) || !verifyQuotes(record, snapshot.text_body) || hash(snapshot.text_body) !== snapshot.content_hash || hash(Buffer.from(snapshot.raw_base64, "base64")) !== snapshot.raw_hash) throw new Error(`Import evidence failed: ${record.id}`);
}
function insert(table: string, rows: unknown[], declaration: string, columns: string[]) {
  // All table/column names are code constants; JSON is encoded as a safe SQL text literal.
  const literal = JSON.stringify(rows).replace(/'/g, "''");
  return `insert into public.${table} (${columns.join(",")}) select ${columns.join(",")} from jsonb_to_recordset('${literal}'::jsonb) as x(${declaration}) on conflict (id) do update set ${columns.filter(column => column !== "id").map(column => `${column}=excluded.${column}`).join(",")};`;
}
const sourceColumns = ["id", "url", "organization", "title", "jurisdiction", "source_tier", "published_at", "publication_date_note"];
// kb_sources 上有 UNIQUE(url)：不同清单会用不同 id 引用同一个 URL，
// 因此 sources 必须按 url 做 upsert，records 再通过 join 解析出库里真实的 source id。
function insertByUrl(table: string, rows: unknown[], declaration: string, columns: string[]) {
  const literal = JSON.stringify(rows).replace(/'/g, "''");
  return `insert into public.${table} (${columns.join(",")}) select ${columns.join(",")} from jsonb_to_recordset('${literal}'::jsonb) as x(${declaration}) on conflict (url) do update set ${columns.filter(column => column !== "id" && column !== "url").map(column => `${column}=excluded.${column}`).join(",")};`;
}
const urlById = new Map(bundle.sources.map(source => [source.id, source.url]));
const recordDeclaration = "id text,source_id text,source_url text,role_id text,category text,title text,summary text,applicability text,relation text,tags text[],facts jsonb,missing_fields text[],verification text,content_hash text,collected_at timestamptz,verified_at timestamptz,valid_through date,freshness_days integer,context jsonb";
function mergeRecords(rows: Array<Record<string, unknown>>) {
  // 不同 source id 可能指向同一个 URL（kb_sources.url 唯一），join 后这些记录
  // 会落到同一个 source_id 上。若它们的 (role, source, category, program) 相同
  // 就会撞唯一索引，所以按该键合并并取事实并集，既不冲突也不丢事实。
  const merged = new Map<string, Record<string, unknown>>();
  for (const row of rows) {
    const url = urlById.get(String(row.source_id)) ?? "";
    const ctx = (row.context ?? {}) as Record<string, unknown>;
    const key = `${url}::${row.role_id}::${row.category}::${ctx.program ?? ""}`;
    const existing = merged.get(key);
    if (!existing) {
      merged.set(key, { ...row, facts: [...(row.facts as unknown[])], missing_fields: [...(row.missing_fields as string[])] });
      continue;
    }
    const seen = new Set((existing.facts as Array<{ quote?: string }>).map(fact => fact.quote));
    for (const fact of row.facts as Array<{ quote?: string }>) {
      if (!seen.has(fact.quote)) { (existing.facts as unknown[]).push(fact); seen.add(fact.quote); }
    }
    const haveFields = new Set((existing.facts as Array<{ field: string }>).map(fact => fact.field));
    const extraMissing = (row.missing_fields as string[]).filter(field => !haveFields.has(field));
    existing.missing_fields = [...new Set([...(existing.missing_fields as string[]), ...extraMissing])];
  }
  return [...merged.values()];
}
function insertRecords(rows: Array<Record<string, unknown>>) {
  const withUrl = rows.map(row => ({ ...row, source_url: urlById.get(String(row.source_id)) ?? null }));
  const literal = JSON.stringify(withUrl).replace(/'/g, "''");
  const select = recordColumns.map(column => (column === "source_id" ? "coalesce(sn.source_id, s.id, r.source_id) as source_id" : `r.${column}`)).join(",");
  // 触发器 kb_check_evidence() 要求「记录 source_id = 其快照 source_id」。
  // 快照可能是早期批次写入的、保留旧的 source_id，所以记录的 source_id
  // 必须以它引用的那份快照为准，否则会抛 KB_SNAPSHOT_SOURCE_MISMATCH。
  return `insert into public.kb_records (${recordColumns.join(",")}) select ${select} from jsonb_to_recordset('${literal}'::jsonb) as r(${recordDeclaration}) left join public.kb_sources s on s.url = r.source_url left join public.kb_snapshots sn on sn.content_hash = r.content_hash where not exists (select 1 from public.kb_records t where t.role_id = r.role_id and t.source_id = coalesce(sn.source_id, s.id, r.source_id) and t.category = r.category and coalesce(t.context ->> 'program', '') = coalesce(r.context ->> 'program', '') and t.id <> r.id) on conflict (id) do update set ${recordColumns.filter(column => column !== "id").map(column => `${column}=excluded.${column}`).join(",")};`;
}
const roleColumns = ["id", "name", "aliases", "direction_ids", "mapping_basis", "scope"];
const recordColumns = ["id", "source_id", "role_id", "category", "title", "summary", "applicability", "relation", "tags", "facts", "missing_fields", "verification", "content_hash", "collected_at", "verified_at", "valid_through", "freshness_days", "context"];
const sql = [
  "begin; set local standard_conforming_strings = on;",
  insert("kb_roles", knowledgeRoles, "id text,name text,aliases text[],direction_ids text[],mapping_basis text,scope text", roleColumns),
  insert("kb_sources", bundle.sources, "id text,url text,organization text,title text,jurisdiction text,source_tier text,published_at date,publication_date_note text", sourceColumns),
  `insert into public.kb_snapshots (content_hash,source_id,raw_hash,raw_base64,text_body,content_type,fetched_at) select * from jsonb_to_recordset('${JSON.stringify(bundle.snapshots).replace(/'/g, "''")}'::jsonb) as x(content_hash text,source_id text,raw_hash text,raw_base64 text,text_body text,content_type text,fetched_at timestamptz) on conflict (content_hash) do nothing;`,
  insert("kb_records", bundle.records.map(record => ({ ...record, context: record.context ?? {} })), "id text,source_id text,role_id text,category text,title text,summary text,applicability text,relation text,tags text[],facts jsonb,missing_fields text[],verification text,content_hash text,collected_at timestamptz,verified_at timestamptz,valid_through date,freshness_days integer,context jsonb", recordColumns),
  "commit; select r.category,s.jurisdiction,count(*) as records from public.kb_records r join public.kb_sources s on s.id=r.source_id group by r.category,s.jurisdiction order by s.jurisdiction,r.category;",
].join("\n");
mkdirSync(`work/knowledge-${name}`, { recursive: true });
writeFileSync(`work/knowledge-${name}/import.sql`, sql);
// Management API requests have a size limit. Keep raw snapshots private and load
// resumable chunks before publishing any new records; every chunk is idempotent.
const partRoot = `work/knowledge-${name}/import-parts`;
mkdirSync(partRoot, { recursive: true });
const parts: string[] = [];
const verifiedPath = `work/knowledge-${name}/verified-remote-snapshots.json`;
const existingHashes = new Set<string>(existsSync(verifiedPath) ? JSON.parse(readFileSync(verifiedPath, "utf8").replace(/^\uFEFF/, "")).rows.map((row: { content_hash: string }) => row.content_hash) : []);
function part(body: string) {
  const path = `${partRoot}/${String(parts.length).padStart(3, "0")}.sql`;
  writeFileSync(path, `begin; set local standard_conforming_strings = on;\n${body}\ncommit;`);
  parts.push(path);
}
part([insert("kb_roles", knowledgeRoles, "id text,name text,aliases text[],direction_ids text[],mapping_basis text,scope text", roleColumns), insertByUrl("kb_sources", bundle.sources, "id text,url text,organization text,title text,jurisdiction text,source_tier text,published_at date,publication_date_note text", sourceColumns)].join("\n"));
for (const snapshot of bundle.snapshots) {
  // A final database-side digest check still runs even for skipped uploads.
  if (existingHashes.has(snapshot.content_hash)) continue;
  // kb_sources 按 url upsert 后，清单里的 source id 可能并没有真正落库
  // （同 URL 已存在、但库里存的是另一个 id）。快照的 source_id 同样必须
  // 通过 url 解析成库里真实的 id，否则会撞 kb_snapshots_source_id_fkey。
  const snapshotLiteral = JSON.stringify([{ ...snapshot, raw_base64: "", source_url: urlById.get(snapshot.source_id) ?? null }]).replace(/'/g, "''");
  part(`insert into public.kb_snapshots (content_hash,source_id,raw_hash,raw_base64,text_body,content_type,fetched_at) select x.content_hash, coalesce(s.id, x.source_id), x.raw_hash, x.raw_base64, x.text_body, x.content_type, x.fetched_at from jsonb_to_recordset('${snapshotLiteral}'::jsonb) as x(content_hash text,source_id text,source_url text,raw_hash text,raw_base64 text,text_body text,content_type text,fetched_at timestamptz) left join public.kb_sources s on s.url = x.source_url on conflict (content_hash) do nothing;`);
  for (let offset = 0; offset < snapshot.raw_base64.length; offset += 300000) {
    const chunk = snapshot.raw_base64.slice(offset, offset + 300000);
    part(`do $kb$ begin if exists (select 1 from public.kb_snapshots where content_hash='${snapshot.content_hash}' and raw_hash='${snapshot.raw_hash}' and length(raw_base64)<${offset}) then raise exception 'Missing prior snapshot chunk'; end if; end $kb$;\nupdate public.kb_snapshots set raw_base64=overlay(raw_base64 placing '${chunk}' from ${offset + 1} for ${chunk.length}) where content_hash='${snapshot.content_hash}' and raw_hash='${snapshot.raw_hash}';`);
  }
}
const ids = bundle.snapshots.map(snapshot => `'${snapshot.content_hash}'`).join(",");
part(`do $kb$ begin if (select count(*) from public.kb_snapshots where content_hash in (${ids}))<>${bundle.snapshots.length} or exists (select 1 from public.kb_snapshots where content_hash in (${ids}) and (encode(extensions.digest(convert_to(text_body,'UTF8'),'sha256'),'hex')<>content_hash or encode(extensions.digest(decode(raw_base64,'base64'),'sha256'),'hex')<>raw_hash)) then raise exception 'Snapshot integrity verification failed'; end if; end $kb$;`);
// 记录必须分块插入：单个清单可能有 282 条事实（每条 quote 最多 1600 字符），
// 一次性 insert 会超过管理 API 的 750KB 单请求上限而被拒。
const RECORDS_PER_PART = 4;
const allRecords = bundle.records.map(record => ({ ...record, context: record.context ?? {} }));
// 跨分块也必须先合并，否则同一键可能落在不同分块里，分块内去重管不到。
const mergedRecords = mergeRecords(allRecords);
for (let i = 0; i < mergedRecords.length; i += RECORDS_PER_PART) {
  part(insertRecords(mergedRecords.slice(i, i + RECORDS_PER_PART)));
}
writeFileSync(`${partRoot}/files.json`, JSON.stringify(parts, null, 2));
console.log(JSON.stringify({ prepared: true, sources: bundle.sources.length, records: bundle.records.length, snapshots: bundle.snapshots.length, sql_bytes: Buffer.byteLength(sql), resumable_parts: parts.length, part_files: `${partRoot}/files.json` }));
