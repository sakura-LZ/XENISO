// 整合器：把研究线的 handoff.json 转成知识库 manifest 条目。
// 关键规则：collect.ts 去重键是 url + role_id + category，因此同一来源同一角色的多段原文
// 必须合并成「一条记录 + 多个 facts」，而不是多条记录（否则会被去重键丢弃）。
// 用法：npx tsx scripts/knowledge/merge-handoff.ts work/knowledge-standards/handoff.json standards
import { readFileSync, writeFileSync, statSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { htmlText } from "./html";

const [handoffPath, name] = process.argv.slice(2);
if (!handoffPath || !name) throw new Error("usage: tsx scripts/knowledge/merge-handoff.ts <handoff.json> <manifest-name>");
if (!existsSync(handoffPath)) throw new Error(`handoff_not_found: ${handoffPath}`);

const hash = (value: Buffer) => createHash("sha256").update(value).digest("hex");
const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const slug = (value: string) => value.toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "").slice(0, 120);

type HandoffQuote = {
  role_id: string;
  field: string;
  literal: string;
  title: string;
  summary?: string;
  applicability: string;
  relation?: "direct" | "related" | "context";
  tags?: string[];
  context?: Record<string, string | number>;
  expected_fields?: string[];
  missing_fields?: string[];
  note?: string;
};
type HandoffSource = {
  category: string;
  source: {
    id: string;
    url: string;
    organization: string;
    title: string;
    jurisdiction: string;
    source_tier: string;
    published_at: string | null;
    publication_date_note: string;
  };
  artifact: { raw_path: string; text_path: string; content_type: string };
  quotes: HandoffQuote[];
};

const handoff = JSON.parse(readFileSync(handoffPath, "utf8")) as HandoffSource[];
const entries: unknown[] = [];
const problems: string[] = [];
const warnings: string[] = [];
type Group = { key: string; source: HandoffSource; role: string; quotes: HandoffQuote[] };
const groups = new Map<string, Group>();
const groupDateFallback = new Set<string>();
const groupDatePattern = new Map<string, string>();
const canonicalByUrl = new Map<string, HandoffSource["source"]>();

for (const item of handoff) {
  const { artifact, source, category } = item;
  if (!existsSync(artifact.raw_path) || !existsSync(artifact.text_path)) {
    problems.push(`${source.id}: 缺少 artifact 文件`);
    continue;
  }
  const raw = readFileSync(artifact.raw_path);
  const rawDecoded = raw.toString("utf8");
  const text = readFileSync(artifact.text_path, "utf8");
  // 与 collect.ts 的文本归一化保持一致：html 走 htmlText，其余折叠空白
  const isHtml = artifact.content_type === "text/html";
  const normalized = (isHtml ? htmlText(text) : text.replace(/\s+/g, " ")).trim();
  const capturedAt = statSync(artifact.raw_path).mtime.toISOString();
  const isPdf = artifact.content_type === "application/pdf";
  // 同为 zip 容器的 Office 原件（政府站常直接发布 Word/Excel 版目录）与 PDF 一样，
  // 必须同时登记抽取文本及其 sha256，否则采集器无法在纯文本上定位 literal。
  const isDocx = artifact.content_type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  const isXlsx = artifact.content_type === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  const needsExtraction = isPdf || isDocx || isXlsx;
  const capture = {
    path: artifact.raw_path,
    sha256: hash(raw),
    captured_at: capturedAt,
    content_type: artifact.content_type,
    method: isPdf ? "pypdf_page_text" : isDocx ? "docx_text" : isXlsx ? "xlsx_text" : /^text\/plain$|javascript/i.test(artifact.content_type) ? "downloaded_text" : "downloaded_html",
    ...(needsExtraction && artifact.text_path ? { extracted_path: artifact.text_path, extracted_sha256: hash(Buffer.from(text, "utf8")) } : {}),
  };

  for (const quote of item.quotes) {
    const literal = quote.literal.replace(/\s+/g, " ").trim();
    if (!normalized.includes(literal)) {
      problems.push(`${source.id}/${quote.role_id}: literal 不是原文子串（${quote.field}）`);
      continue;
    }
    if (literal.length < 10 || literal.length > 1600) {
      problems.push(`${source.id}/${quote.role_id}: literal 长度越界 ${literal.length}（${quote.field}）`);
      continue;
    }
    // published_at 有值时，manifest 要求原文中存在日期证据（publication_pattern）
    const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(source.published_at ?? "");
    if (dateMatch) {
      const [, y, m, d] = dateMatch;
      const candidates = [
        `${y}-${m}-${d}`,
        `${y}\\s*年\\s*${Number(m)}\\s*月\\s*${Number(d)}\\s*日`,
        `${y}/${Number(m)}/${Number(d)}`,
        `${y}\\.${Number(m)}\\.${Number(d)}`,
        `${y}\\D{0,6}0?${Number(m)}\\D{0,6}0?${Number(d)}`,
      ];
      // PDF 的日期证据必须来自抽取后的正文，而不是二进制原文
      const dateEvidence = isHtml || /^text\/plain$|javascript/i.test(artifact.content_type) ? rawDecoded : text;
      const hit = candidates.find((candidate) => new RegExp(candidate, "iu").test(dateEvidence));
      if (hit) groupDatePattern.set(source.id, hit);
      else {
        // 日期降级是「自动纠正」而非失败：数据已按诚实原则置为 null，
        // 不应中断入库流程，记为 warning 供审计追溯。
        warnings.push(`${source.id}: 原文未出现发布日期 ${source.published_at}，已降级为未知`);
        groupDateFallback.add(source.id);
      }
    }
    // 去重键：同一 URL 下不同「专业代码/项目」必须保留为不同记录。
    // 典型场景：浙大 2027 目录是单页应用，6 个专业共用同一个 URL；
    // 若只按 url+role+category 聚合，会让不同专业的事实互相覆盖（后者被去重丢弃）。
    const programKey = quote.context?.program ?? quote.context?.program_code ?? "";
    const key = `${source.url}::${quote.role_id}::${category}::${programKey}`;
    const group = groups.get(key);
    if (group) {
      group.quotes.push(quote);
    } else {
      const canonical = canonicalByUrl.get(source.url) ?? source;
      canonicalByUrl.set(source.url, canonical);
      groups.set(key, { key, source: { ...item, source: canonical, artifact: undefined as never }, role: quote.role_id, quotes: [quote] });
    }
    // artifact/category 附着到分组
    const stored = groups.get(key)!;
    (stored as unknown as { category: string; capture: typeof capture; artifactPath: string }).category = category;
    (stored as unknown as { capture: typeof capture }).capture = capture;
  }
}

for (const group of groups.values()) {
  const first = group.quotes[0];
  const meta = group as unknown as { category: string; capture: Record<string, unknown> };
  const fields = [...new Set(group.quotes.map((quote) => quote.field))];
  // collect.ts 由 expected_fields 推导 missing_fields，故把声明缺失项并入期望字段
  const expected = [...new Set(group.quotes.flatMap((quote) => [...(quote.expected_fields ?? [quote.field]), quote.field, ...(quote.missing_fields ?? [])]))].slice(0, 30);
  const tags = [...new Set(group.quotes.flatMap((quote) => quote.tags ?? []))].slice(0, 30);
  const context = group.quotes.reduce<Record<string, string | number>>((acc, quote) => ({ ...acc, ...(quote.context ?? {}) }), {});
  const profKey = String(context.program ?? context.program_code ?? "");
  // department_type 在 schema 中是枚举（clinical|medical_technology），自由文本必须落到 medical_department
  if (context.department_type !== undefined && !["clinical", "medical_technology"].includes(String(context.department_type))) {
    context.medical_department = context.medical_department ?? String(context.department_type);
    delete context.department_type;
  }

  const summary = group.quotes.length > 1
    ? `${first.summary ?? "事实见下列官方原文。"}（同一官方来源共 ${group.quotes.length} 条原文事实，字段：${fields.join("、")}；标题与适用范围为 LIMEN 编辑索引。）`
    : (first.summary ?? "事实见下列官方原文；标题、分类与适用范围为 LIMEN 编辑索引。");

  entries.push({
    source: { ...group.source.source, source_tier: "primary", published_at: groupDateFallback.has(group.source.source.id) ? null : group.source.source.published_at, publication_date_note: group.source.source.publication_date_note ?? "" },
    ...(groupDatePattern.has(group.source.source.id) ? { publication_pattern: groupDatePattern.get(group.source.source.id)! } : {}),
    artifact_capture: meta.capture,
    record: {
      // id 必须全局唯一：同一来源下不同「专业代码/方向」会产生多条记录，
      // 若不带 program 会撞成同一个 id，写入库时报
      // 「ON CONFLICT DO UPDATE command cannot affect row a second time」。
      // 用 program 的短哈希后缀，既唯一又不会把中文专业名塞进 id。
      id: slug(`${meta.category}-${group.source.source.id}-${group.role}${profKey ? "-" + createHash("sha256").update(profKey).digest("hex").slice(0, 8) : ""}`),
      role_id: group.role,
      category: meta.category,
      title: first.title.slice(0, 250),
      summary: summary.slice(0, 600),
      applicability: first.applicability.slice(0, 700),
      relation: first.relation ?? "related",
      tags,

      valid_through: null,
      freshness_days: 60,
      ...(Object.keys(context).length ? { context } : {}),
    },
    extracts: group.quotes.map((quote) => ({ field: quote.field, pattern: escapeRegExp(quote.literal.replace(/\s+/g, " ").trim()) })),
    expected_fields: expected,
  });
}

writeFileSync(`data/knowledge/${name}.manifest.json`, JSON.stringify(entries, null, 2) + "\n");
console.log(JSON.stringify({ name, entries: entries.length, facts: entries.reduce<number>((sum, entry) => sum + ((entry as { extracts: unknown[] }).extracts.length), 0), problems, warnings }, null, 2));
if (problems.length) process.exitCode = 1;
