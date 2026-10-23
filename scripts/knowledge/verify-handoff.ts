// 交接文件自检：校验 literal 必须是 text 的逐字子串，并检查 role/field/context 是否在契约范围内。
// 用法：npx tsx scripts/knowledge/verify-handoff.ts work/knowledge-<stream>/handoff.json
import { readFileSync, existsSync } from "node:fs";

const fieldsByCategory: Record<string, string[]> = {
  occupation: ["interests", "responsibilities", "privacy_requirements", "skills", "career_path", "occupation_definition", "program_definition", "employment_directions", "departments", "work_tasks", "abilities", "education", "related_occupations", "standard_status"],
  recruitment: ["employer", "city", "education", "major_restrictions", "technical_requirements", "salary", "job_title", "experience", "job_type"],
  admissions: ["institution", "program", "admission_year", "exam_subjects", "cross_major_restrictions", "training_direction", "admission_requirements", "degree_type"],
  industry: ["scope", "coverage_limit", "design_constraints", "governance_scope", "china_legal_requirement", "talent_demand", "policy_requirement", "policy_goals", "employment_statistics", "salary_statistics", "statistical_definition", "major_catalog"],
  learning: ["topics", "materials", "prerequisites", "access_requirement", "training", "regional_limit", "learning_hours", "research_project", "resource_title"],
};
const contextKeys = ["institution", "college", "program", "admission_year", "region", "medical_topic", "medical_department", "department_type", "statistic_scope", "evidence_locator", "valid_from", "valid_through"];

const path = process.argv[2];
if (!path) throw new Error("usage: tsx scripts/knowledge/verify-handoff.ts <handoff.json>");
const entries = JSON.parse(readFileSync(path, "utf8")) as Array<Record<string, unknown>>;
const roles = (JSON.parse(readFileSync("data/knowledge/roles.json", "utf8")) as { roles: { id: string }[] }).roles.map((role) => role.id);

const errors: string[] = [];
const warnings: string[] = [];
let quotes = 0;

if (!Array.isArray(entries)) errors.push("handoff 根节点必须是数组");

for (const [index, entry] of entries.entries()) {
  const where = `[${index}] ${(entry.source as { id?: string })?.id ?? "?"}`;
  const category = entry.category as string;
  if (!fieldsByCategory[category]) {
    errors.push(`${where}: category 非法 ${category}`);
    continue;
  }
  const artifact = entry.artifact as { text_path?: string; raw_path?: string; content_type?: string } | undefined;
  if (!artifact?.text_path || !existsSync(artifact.text_path)) {
    errors.push(`${where}: text_path 不存在 ${artifact?.text_path}`);
    continue;
  }
  if (!artifact.raw_path || !existsSync(artifact.raw_path)) errors.push(`${where}: raw_path 不存在 ${artifact.raw_path}`);
  const text = readFileSync(artifact.text_path, "utf8");
  const source = entry.source as { url?: string; published_at?: string | null; publication_date_note?: string; jurisdiction?: string; source_tier?: string };
  // 默认要求 https。唯一例外：政府站点只提供 http（含其公布的 IP 端点），
  // 且必须在 publication_date_note 里写明 https 通道不可用及取得方式，
  // 否则视为不可复验的引用。
  const srcUrl = source.url ?? "";
  const httpExceptionAllowed = /^http:\/\/(\d{1,3}(\.\d{1,3}){3}|[^/]*\.gov\.cn)(\/|:|$)/i.test(srcUrl)
    && /https|http|IP|端点|通道/i.test(source.publication_date_note ?? "");
  if (!/^https:/i.test(srcUrl) && !httpExceptionAllowed) errors.push(`${where}: url 必须是 https（政府站 http 例外需在 publication_date_note 披露）`);
  if (!source.published_at && !source.publication_date_note) errors.push(`${where}: published_at 为 null 时必须写 publication_date_note`);
  if (source.source_tier !== "primary") errors.push(`${where}: source_tier 必须是 primary`);

  const list = entry.quotes as Array<Record<string, unknown>> | undefined;
  if (!Array.isArray(list) || !list.length) {
    errors.push(`${where}: quotes 为空`);
    continue;
  }
  for (const [qIndex, quote] of list.entries()) {
    quotes += 1;
    const at = `${where}.quotes[${qIndex}]`;
    const literal = quote.literal as string;
    if (typeof literal !== "string") {
      errors.push(`${at}: literal 缺失`);
      continue;
    }
    if (literal.length < 10) errors.push(`${at}: literal 过短(${literal.length})`);
    if (literal.length > 1600) errors.push(`${at}: literal 过长(${literal.length})`);
    if (!text.includes(literal)) {
      errors.push(`${at}: literal 不是原文子串（检查换行/全角/页码）`);
    }
    if (!roles.includes(quote.role_id as string)) errors.push(`${at}: role_id 不存在 ${quote.role_id}`);
    if (!fieldsByCategory[category].includes(quote.field as string)) errors.push(`${at}: field 不在 ${category} 允许集合 ${quote.field}`);
    const context = (quote.context ?? {}) as Record<string, unknown>;
    for (const key of Object.keys(context)) if (!contextKeys.includes(key)) errors.push(`${at}: context 键非法 ${key}`);
    if (context.admission_year !== undefined) {
      const year = Number(context.admission_year);
      if (!Number.isInteger(year) || year < 2000 || year > 2100) errors.push(`${at}: admission_year 非法 ${context.admission_year}`);
    }
    if (!quote.title || String(quote.title).length > 250) errors.push(`${at}: title 缺失或超长`);
    if (!quote.applicability) warnings.push(`${at}: 建议填写 applicability`);
    if (!quote.missing_fields) warnings.push(`${at}: 建议显式写 missing_fields（未知就是未知）`);
  }
}

console.log(JSON.stringify({ file: path, sources: entries.length, quotes, errors, warnings }, null, 2));
if (errors.length) process.exitCode = 1;
