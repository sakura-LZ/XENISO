import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { z } from "zod";
import { knowledgeRoles, sourceSchema, recordSchema, verifyQuotes } from "../../src/lib/knowledge";

const snapshotSchema = z.object({ content_hash: z.string(), source_id: z.string(), raw_hash: z.string(), raw_base64: z.string(), text_body: z.string(), content_type: z.string(), fetched_at: z.iso.datetime() });
const name = process.argv[2] ?? "pilot";
if (!["pilot", "expansion"].includes(name)) throw new Error("Unknown import bundle");
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
part([insert("kb_roles", knowledgeRoles, "id text,name text,aliases text[],direction_ids text[],mapping_basis text,scope text", roleColumns), insert("kb_sources", bundle.sources, "id text,url text,organization text,title text,jurisdiction text,source_tier text,published_at date,publication_date_note text", sourceColumns)].join("\n"));
for (const snapshot of bundle.snapshots) {
  // A final database-side digest check still runs even for skipped uploads.
  if (existingHashes.has(snapshot.content_hash)) continue;
  const literal = JSON.stringify([{ ...snapshot, raw_base64: "" }]).replace(/'/g, "''");
  part(`insert into public.kb_snapshots (content_hash,source_id,raw_hash,raw_base64,text_body,content_type,fetched_at) select * from jsonb_to_recordset('${literal}'::jsonb) as x(content_hash text,source_id text,raw_hash text,raw_base64 text,text_body text,content_type text,fetched_at timestamptz) on conflict (content_hash) do nothing;`);
  for (let offset = 0; offset < snapshot.raw_base64.length; offset += 300000) {
    const chunk = snapshot.raw_base64.slice(offset, offset + 300000);
    part(`do $kb$ begin if exists (select 1 from public.kb_snapshots where content_hash='${snapshot.content_hash}' and raw_hash='${snapshot.raw_hash}' and length(raw_base64)<${offset}) then raise exception 'Missing prior snapshot chunk'; end if; end $kb$;\nupdate public.kb_snapshots set raw_base64=overlay(raw_base64 placing '${chunk}' from ${offset + 1} for ${chunk.length}) where content_hash='${snapshot.content_hash}' and raw_hash='${snapshot.raw_hash}';`);
  }
}
const ids = bundle.snapshots.map(snapshot => `'${snapshot.content_hash}'`).join(",");
part(`do $kb$ begin if (select count(*) from public.kb_snapshots where content_hash in (${ids}))<>${bundle.snapshots.length} or exists (select 1 from public.kb_snapshots where content_hash in (${ids}) and (encode(extensions.digest(convert_to(text_body,'UTF8'),'sha256'),'hex')<>content_hash or encode(extensions.digest(decode(raw_base64,'base64'),'sha256'),'hex')<>raw_hash)) then raise exception 'Snapshot integrity verification failed'; end if; end $kb$;\n${insert("kb_records", bundle.records.map(record => ({ ...record, context: record.context ?? {} })), "id text,source_id text,role_id text,category text,title text,summary text,applicability text,relation text,tags text[],facts jsonb,missing_fields text[],verification text,content_hash text,collected_at timestamptz,verified_at timestamptz,valid_through date,freshness_days integer,context jsonb", recordColumns)}`);
writeFileSync(`${partRoot}/files.json`, JSON.stringify(parts, null, 2));
console.log(JSON.stringify({ prepared: true, sources: bundle.sources.length, records: bundle.records.length, snapshots: bundle.snapshots.length, sql_bytes: Buffer.byteLength(sql), resumable_parts: parts.length, part_files: `${partRoot}/files.json` }));
