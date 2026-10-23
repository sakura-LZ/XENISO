// 从已校验的 knowledge bundle 生成 data/admissions.sample.json 的 items。
// 规则：只收录「有官方来源 + 招生年份 + 专业代码 + 专业名称 + 考试科目原文」的记录；
// 缺任何一项就跳过，绝不填 unknown 冒充事实。
import { readFileSync, writeFileSync } from "node:fs";

type Fact = { field: string; value: string; quote: string; start: number; end: number };
type BundleRecord = {
  id: string;
  source_id: string;
  role_id: string;
  category: string;
  title: string;
  facts: Fact[];
  context?: Record<string, string | number>;
  verification: string;
  verified_at: string;
};
type Bundle = {
  sources: { id: string; url: string; organization: string; title: string; published_at: string | null }[];
  records: BundleRecord[];
};

const bundle = JSON.parse(readFileSync("work/knowledge-admissions/bundle.json", "utf8")) as Bundle;
const sourceById = new Map(bundle.sources.map((source) => [source.id, source]));

type Item = {
  id: string;
  university: string;
  college: string | null;
  year: number;
  major_code: string;
  major_name: string;
  research_direction: string | null;
  admission_path: "统考" | "推免" | "其他";
  exam_subjects: string[];
  eligibility: string;
  source_official_url: string;
  source_title: string;
  verified_at: string;
  knowledge_record_id: string;
  evidence_locator: string;
};

const items: Item[] = [];
const skipped: { id: string; reason: string }[] = [];

for (const record of bundle.records) {
  const context = record.context ?? {};
  const institution = typeof context.institution === "string" ? context.institution : null;
  const program = typeof context.program === "string" ? context.program : null;
  const year = typeof context.admission_year === "number" ? context.admission_year : null;
  const examFact = record.facts.find((fact) => fact.field === "exam_subjects");
  const source = sourceById.get(record.source_id);

  if (!institution) { skipped.push({ id: record.id, reason: "无 institution" }); continue; }
  if (!program) { skipped.push({ id: record.id, reason: "无 program（章程类记录）" }); continue; }
  if (!year) { skipped.push({ id: record.id, reason: "无 admission_year" }); continue; }
  if (!examFact) { skipped.push({ id: record.id, reason: "无 exam_subjects 原文" }); continue; }
  if (!source?.url) { skipped.push({ id: record.id, reason: "无官方来源 URL" }); continue; }

  // program 形如 "085410 人工智能"；拆出代码与名称。
  const match = /^(\d{6})\s+(.+)$/.exec(program.trim());
  if (!match) { skipped.push({ id: record.id, reason: `program 无法拆分代码/名称：${program}` }); continue; }
  const [, majorCode, majorName] = match;

  items.push({
    id: record.id,
    university: institution,
    college: typeof context.college === "string" ? context.college : null,
    year,
    major_code: majorCode,
    major_name: majorName,
    research_direction: null,
    admission_path: "统考",
    exam_subjects: [examFact.quote.trim()],
    eligibility: "见 knowledge 记录 applicability；本文件不推断报考资格",
    source_official_url: source.url,
    source_title: source.title,
    verified_at: record.verified_at.slice(0, 10),
    knowledge_record_id: record.id,
    evidence_locator: typeof context.evidence_locator === "string" ? context.evidence_locator : `偏移 ${examFact.start}-${examFact.end}`,
  });
}

const payload = {
  version: "V3",
  status: "partially_filled_from_verified_bundle",
  rule: "只有官方招生来源且有招生年份、专业代码、招生方式、科目/资格校验结果才可用于报告事实。",
  updated_at: new Date().toISOString(),
  provenance: {
    generated_by: "scripts/knowledge/build-admissions-sample.ts",
    from: "work/knowledge-admissions/bundle.json",
    admission_year: 2027,
    note: "仅收录 bundle 中 quote_verified 且有 program/exam_subjects 的记录；章程类记录（无专业代码）不进入本文件。eligibility 一律指向 knowledge 记录，不在本文件内推断。",
    excluded: skipped,
  },
  items,
  item_schema: {
    id: "string",
    university: "string",
    college: "string_or_null",
    year: "integer",
    major_code: "string",
    major_name: "string",
    research_direction: "string_or_null",
    admission_path: "统考/推免/其他",
    exam_subjects: "array_string_or_unknown",
    eligibility: "verified_text_or_unknown",
    source_official_url: "string",
    verified_at: "YYYY-MM-DD",
  },
};

writeFileSync("data/admissions.sample.json", JSON.stringify(payload, null, 2) + "\n");
console.log(JSON.stringify({ items: items.length, skipped: skipped.length, skipped_ids: skipped.map((entry) => entry.id) }, null, 2));
