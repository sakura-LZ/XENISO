// Curated official source allowlist; never accepts arbitrary browser input.
import { readFileSync, writeFileSync, mkdirSync, appendFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { z } from "zod";
import { sourceSchema, recordSchema, normalizeSourceUrl, verifyQuotes, type KnowledgeRecord, type KnowledgeSource } from "../../src/lib/knowledge";
import { htmlText } from "./html";
import { classifyFacts } from "./classify";

const manifestSchema = z.array(z.object({
  source: sourceSchema, record: recordSchema.omit({ source_id: true, facts: true, verification: true, content_hash: true, collected_at: true, verified_at: true, missing_fields: true }),
  extracts: z.array(z.object({ field: z.string(), pattern: z.string().min(10).max(2000) })).min(1),
  expected_fields: z.array(z.string()), publication_pattern: z.string().min(8).optional(),
  browser_capture: z.object({ path: z.string().startsWith("data/knowledge/captures/"), captured_at: z.iso.datetime(), sha256: z.string().regex(/^[a-f0-9]{64}$/), method: z.literal("browser_visible_excerpt") }).optional(),
  artifact_capture: z.object({ path: z.string().startsWith("work/knowledge-"), sha256: z.string().regex(/^[a-f0-9]{64}$/), captured_at: z.iso.datetime(), content_type: z.enum(["text/html", "application/pdf", "text/plain"]), extracted_path: z.string().startsWith("work/knowledge-").optional(), extracted_sha256: z.string().regex(/^[a-f0-9]{64}$/).optional(), method: z.enum(["downloaded_html", "pypdf_page_text", "downloaded_text"]) }).optional(),
}).refine(item => item.source.published_at === null || Boolean(item.publication_pattern), "Known publication date requires raw metadata evidence"));
const name = process.argv[2] ?? "pilot";
if (!/^[a-z0-9-]{2,40}$/.test(name)) throw new Error("Invalid collection manifest name");
const manifest = manifestSchema.parse(JSON.parse(readFileSync(`data/knowledge/${name}.manifest.json`, "utf8")));
const dir = `work/knowledge-${name}`;
mkdirSync(dir, { recursive: true });
const hash = (value: string | Buffer) => createHash("sha256").update(value).digest("hex");
const records: KnowledgeRecord[] = [], sources: KnowledgeSource[] = [];
const snapshots: { content_hash: string; source_id: string; raw_hash: string; raw_base64: string; text_body: string; content_type: string; fetched_at: string }[] = [];
const attempts: { source_id: string; url: string; at: string; status: string; http_status?: number; reason?: string; missing_fields?: string[] }[] = [];
const seenUrls = new Set<string>(), seenContent = new Set<string>();
const seenEntries = new Set<string>();
for (const item of manifest) {
  const at = item.artifact_capture?.captured_at ?? item.browser_capture?.captured_at ?? new Date().toISOString(), url = normalizeSourceUrl(item.source.url);
  // 去重键必须与 merge-handoff.ts 一致，把 program（专业代码/方向）算进去。
  // 否则同一 URL 下不同专业会被误判为重复而丢弃（实测：北大软微 7 个方向只入 1 个）。
  const entryKey = `${url}:${item.record.role_id}:${item.record.category}:${item.record.context?.program ?? ""}`;
  if (seenEntries.has(entryKey)) { attempts.push({ source_id: item.source.id, url, at, status: "duplicate_url_category" }); continue; }
  seenEntries.add(entryKey);
  let httpStatus: number | undefined;
  try {
    // Redirects are rejected: add the observed canonical URL to the reviewed manifest.
    const cached = sources.find(source => source.url === url);
    if (cached && cached.id !== item.source.id) throw new Error("source_id_conflict");
    const cachedSnapshot = cached ? snapshots.find(snapshot => snapshot.source_id === cached.id) : undefined;
    const artifact = item.artifact_capture;
    const capture = artifact ? readFileSync(artifact.path) : item.browser_capture ? readFileSync(item.browser_capture.path) : undefined;
    if (capture && hash(capture) !== (artifact?.sha256 ?? item.browser_capture!.sha256)) throw new Error("capture_hash_mismatch");
    const response = capture ? new Response(capture, { status: 200, headers: { "Content-Type": artifact?.content_type ?? "text/plain; charset=utf-8; capture=browser-visible-excerpt" } }) : cachedSnapshot ? new Response(Buffer.from(cachedSnapshot.raw_base64, "base64"), { status: 200, headers: { "Content-Type": cachedSnapshot.content_type } }) : await fetch(url, { redirect: "error", signal: AbortSignal.timeout(40000), headers: { "User-Agent": "LIMEN-Research/1.0 (official public reference pilot)", Accept: "text/html,text/plain" } });
    httpStatus = capture || cachedSnapshot ? undefined : response.status;
    if (!response.ok) throw new Error(`http_${response.status}`);
    const contentType = response.headers.get("content-type") ?? "";
    if (!/text\/(html|plain)|application\/xhtml\+xml/i.test(contentType) && !(artifact?.method === "pypdf_page_text" && contentType === "application/pdf")) throw new Error("unsupported_content_type");
    const reader = response.body!.getReader(), chunks: Buffer[] = []; let size = 0;
    for (;;) { const { value, done } = await reader.read(); if (done) break; size += value.byteLength; if (size > 5000000) { await reader.cancel(); throw new Error("response_too_large"); } chunks.push(Buffer.from(value)); }
    const raw = Buffer.concat(chunks), rawHash = hash(raw);
    const head = raw.subarray(0, 4000).toString("ascii");
    const charset = /charset\s*=\s*["']?([\w-]+)/i.exec(contentType)?.[1] ?? /charset\s*=\s*["']?([\w-]+)/i.exec(head)?.[1] ?? "utf-8";
    const extracted = artifact?.method === "pypdf_page_text" && artifact.extracted_path ? readFileSync(artifact.extracted_path) : undefined;
    if (artifact?.method === "pypdf_page_text" && (!extracted || hash(extracted) !== artifact.extracted_sha256 || !raw.subarray(0, 5).equals(Buffer.from("%PDF-")))) throw new Error("pdf_extraction_hash_mismatch");
    const decoded = extracted ? extracted.toString("utf8") : new TextDecoder(charset).decode(raw);
    if (item.publication_pattern && !new RegExp(item.publication_pattern, "iu").test(decoded)) throw new Error("publication_date_unverified");
    // 控制字符清洗：部分 PDF 抽取器会产出 \u0000 等控制字节（UTF-16 误读），
    // Postgres 的 text 类型无法存储 NUL，会导致整批导入失败。
    // 这些字符对证据文本无意义，在计算 content_hash 之前就剔除，
    // 保证「hash = 实际入库文本的 hash」，避免校验错位。
    const sanitize = (value: string) => value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "");
    const text = sanitize(/html/i.test(contentType) ? htmlText(decoded) : decoded.replace(/\s+/g, " ").trim());
    const contentHash = hash(text);
    // 注意：绝不能回写到 work/<清单>/<source>.raw|.txt 的原始位置。
    // 那些文件是调研线的证据原件，覆盖会导致下游 literal 全部失配
    // （实测：JD 正文被 htmlText 截断，原文丢失）。
    // 快照已完整存进 bundle.json 的 base64，这里只落一份到 captures/ 子目录便于人工核对。
    mkdirSync(`${dir}/captures`, { recursive: true });
    writeFileSync(`${dir}/captures/${item.source.id}.raw`, raw);
    writeFileSync(`${dir}/captures/${item.source.id}.txt`, text);
    if (!cachedSnapshot && seenContent.has(contentHash)) { attempts.push({ source_id: item.source.id, url, at, status: "duplicate_content", http_status: httpStatus }); continue; }
    const facts = item.extracts.flatMap(extract => {
      const match = new RegExp(extract.pattern, "iu").exec(text);
      if (!match || match[0].length < 10 || match[0].length > 1600) return [];
      return [{ field: extract.field, value: match[0], quote: match[0], start: match.index, end: match.index + match[0].length }];
    });
    if (!facts.length) throw new Error("no_evidence_matched");
    if (classifyFacts(facts) !== item.record.category) throw new Error("classification_review_required");
    const missingFields = item.expected_fields.filter(field => !facts.some(fact => fact.field === field));
    const record = recordSchema.parse({ ...item.record, source_id: item.source.id, facts, missing_fields: missingFields, verification: "quote_verified", content_hash: contentHash, collected_at: at, verified_at: new Date().toISOString() });
    if (!verifyQuotes(record, text)) throw new Error("evidence_offsets_mismatch");
    seenContent.add(contentHash);
    records.push(record);
    if (!seenUrls.has(url)) {
      sources.push({ ...item.source, url });
      snapshots.push({ content_hash: contentHash, source_id: item.source.id, raw_hash: rawHash, raw_base64: raw.toString("base64"), text_body: text, content_type: contentType, fetched_at: at });
      seenUrls.add(url);
    }
    attempts.push({ source_id: item.source.id, url, at, status: "collected", http_status: httpStatus, missing_fields: missingFields });
  } catch (error) {
    const safeReasons = ["unsupported_content_type", "response_too_large", "no_evidence_matched", "evidence_offsets_mismatch", "publication_date_unverified", "classification_review_required", "capture_hash_mismatch", "pdf_extraction_hash_mismatch", "source_id_conflict"];
    const message = error instanceof Error ? error.message : "";
    attempts.push({ source_id: item.source.id, url, at, status: "failed", http_status: httpStatus, reason: safeReasons.includes(message) || /^http_\d+$/.test(message) ? message : "network_redirect_or_contract_error" });
  }
}
const bundle = { version: "1.0", generated_at: new Date().toISOString(), sources, records, snapshots, attempts };
writeFileSync(`${dir}/bundle.json`, JSON.stringify(bundle, null, 2) + "\n");
// Public provenance artifact includes evidence, never complete raw pages or credentials.
mkdirSync("data/knowledge", { recursive: true });
writeFileSync(`data/knowledge/${name}.collected.json`, JSON.stringify({ ...bundle, snapshots: undefined }, null, 2) + "\n");
const summary = { at: bundle.generated_at, sources: sources.length, records: records.length, by_category: Object.fromEntries(["occupation", "recruitment", "admissions", "industry", "learning"].map(category => [category, records.filter(record => record.category === category).length])), attempts };
writeFileSync(`docs/testing/knowledge-${name === "pilot" ? "collection" : "expansion-collection"}.latest.json`, JSON.stringify(summary, null, 2) + "\n");
appendFileSync("docs/testing/knowledge-collection.history.jsonl", JSON.stringify(summary) + "\n");
console.log(JSON.stringify(summary, null, 2));
if (attempts.some(attempt => attempt.status === "failed")) process.exitCode = 1;
