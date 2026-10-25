/**
 * 生成 data/knowledge/skill-requirements.json。
 *
 * 输入是 data/knowledge/skill-requirements.spec.json（LIMEN 编辑性归并：每个方向列出技能项，
 * 每项指向知识库某个 record 的某个 fact 里的一段 needle）。本脚本不信任 spec 里手写的说法：
 * 它到 data/knowledge/*.collected.json 里按 record id 找到原文，断言 needle 是原文的连续子串，
 * 再用原文截取 quote（不做任何改写）。任何一条对不上就让整次构建失败。
 *
 * 这与 prepare-import 的纪律一致：引用必须是原文，offset 可回查；编辑信息（名称、分类、
 * aliases）单独存放，不伪装成官方原文。
 */
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "../..");
const KNOWLEDGE_DIR = resolve(ROOT, "data/knowledge");
const SPEC_PATH = resolve(KNOWLEDGE_DIR, "skill-requirements.spec.json");
const OUTPUT_PATH = resolve(KNOWLEDGE_DIR, "skill-requirements.json");

const KINDS = ["tool", "method", "domain", "engineering", "communication"] as const;
const REQUIREMENTS = ["must", "plus"] as const;
type Kind = (typeof KINDS)[number];
type Requirement = (typeof REQUIREMENTS)[number];

type SpecEvidence = { record: string; field: string; needle: string; max_length?: number };
type SpecSkill = { id: string; name: string; kind: Kind; requirement: Requirement; aliases: string[]; evidence: SpecEvidence[] };
type SpecDirection = { role_id: string; occupation_label: string; coverage_note: string; skills: SpecSkill[] };
type Spec = { schema_version: string; note: string; method: string; directions: Record<string, SpecDirection> };

type Fact = { field: string; value: string; quote: string; start: number; end: number };
type RecordRow = { id: string; role_id: string; category: string; title: string; facts: Fact[] };
type SourceRow = { id: string; url: string; organization: string; title: string; jurisdiction: string; published_at: string | null };
type Bundle = { sources: SourceRow[]; records: RecordRow[] };

const sentences = new Set(["。", "；", "\n", "!", "！"]);
/** 从原文里截取包含 needle 的连续片段：优先整句；句子过长时取 needle 前后的窗口。 */
function extractQuote(value: string, needle: string, maxLength: number) {
  const at = value.indexOf(needle);
  if (at < 0) return null;
  const cap = Math.max(maxLength, needle.length + 20);
  let sentenceStart = at;
  while (sentenceStart > 0 && !sentences.has(value[sentenceStart - 1])) sentenceStart -= 1;
  let sentenceEnd = at + needle.length;
  while (sentenceEnd < value.length && !sentences.has(value[sentenceEnd])) sentenceEnd += 1;
  let start: number;
  let end: number;
  if (sentenceEnd - sentenceStart <= cap) {
    start = sentenceStart;
    end = sentenceEnd;
  } else {
    start = Math.max(sentenceStart, at - 40);
    end = Math.min(sentenceEnd, Math.max(at + needle.length, start + cap));
  }
  let quote = value.slice(start, end);
  const leading = quote.length - quote.trimStart().length;
  quote = quote.trim();
  start += leading;
  end = start + quote.length;
  if (!quote || !quote.includes(needle)) return null;
  // 长句被窗口截断时才需要省略号；从句读边界（，、；。）之后开始的片段不需要。
  // 原文常出现「。 」这类标点后带空格的情况，判断前要跳过空白。
  const softStart = new Set(["。", "；", "\n", "!", "！", "，", ",", "、", "：", ":"]);
  let before = start - 1;
  while (before >= 0 && /\s/.test(value[before])) before -= 1;
  let after = end;
  while (after < value.length && /\s/.test(value[after])) after += 1;
  return {
    quote, start, end,
    ellipsisStart: before >= 0 && !softStart.has(value[before]),
    ellipsisEnd: after < value.length && !sentences.has(value[after]),
  };
}

type RecordEntry = { row: RecordRow; source: SourceRow | null; file: string };

function loadBundles(): Map<string, RecordEntry[]> {
  // 同一 record id 会出现在多个采集批次里（重新采集或同一官方页面进入不同批次）。
  // 按 id 保留全部出现位置；取引用时要求内容一致，避免「拿错批次」。
  const records = new Map<string, RecordEntry[]>();
  for (const name of readdirSync(KNOWLEDGE_DIR).filter((file) => file.endsWith(".collected.json") && !file.endsWith(".manifest.json"))) {
    const bundle = JSON.parse(readFileSync(resolve(KNOWLEDGE_DIR, name), "utf8")) as Bundle;
    const sources = new Map((bundle.sources ?? []).map((source) => [source.id, source]));
    for (const row of bundle.records ?? []) {
      const entry = { row, source: sources.get((row as RecordRow & { source_id?: string }).source_id ?? "") ?? null, file: name };
      const list = records.get(row.id) ?? [];
      list.push(entry);
      records.set(row.id, list);
    }
  }
  return records;
}

function directionNames(): Map<string, string> {
  const map = JSON.parse(readFileSync(resolve(ROOT, "data/occupation_direction_map.json"), "utf8")) as {
    directions: { specializations: { id: string; name: string }[] }[];
  };
  const medicine = JSON.parse(readFileSync(resolve(ROOT, "data/medicine_direction.json"), "utf8")) as {
    id: string;
    name: string;
    specializations: { id: string; name: string }[];
  };
  const names = new Map<string, string>();
  for (const group of map.directions) for (const item of group.specializations) names.set(item.id, item.name);
  for (const item of medicine.specializations) names.set(item.id, item.name);
  return names;
}

function validateSpec(spec: Spec, names: Map<string, string>) {
  const roles = new Map(
    (JSON.parse(readFileSync(resolve(KNOWLEDGE_DIR, "roles.json"), "utf8")) as { roles: { id: string; direction_ids: string[] }[] }).roles.map((role) => [role.id, role]),
  );
  const errors: string[] = [];
  if (spec.schema_version !== "skill-requirements-spec-1") errors.push(`spec schema_version 应为 skill-requirements-spec-1，实际 ${spec.schema_version}`);
  const expected = [...names.keys()].sort();
  const actual = Object.keys(spec.directions).sort();
  const missing = expected.filter((id) => !actual.includes(id));
  const extra = actual.filter((id) => !expected.includes(id));
  if (missing.length) errors.push(`缺少方向：${missing.join(", ")}`);
  if (extra.length) errors.push(`未知方向：${extra.join(", ")}`);
  for (const [directionId, direction] of Object.entries(spec.directions)) {
    const role = roles.get(direction.role_id);
    if (!direction.role_id.trim()) errors.push(`${directionId}：role_id 为空`);
    else if (!role) errors.push(`${directionId}：role_id ${direction.role_id} 不在 data/knowledge/roles.json`);
    else if (directionId === "medicine" ? role.direction_ids.length > 0 : !role.direction_ids.includes(directionId)) {
      errors.push(`${directionId}：role ${direction.role_id} 的方向映射不匹配（${role.direction_ids.join(", ") || "空"}）`);
    }
    if (!direction.occupation_label.trim()) errors.push(`${directionId}：occupation_label 为空`);
    if (!direction.coverage_note.trim()) errors.push(`${directionId}：coverage_note 为空`);
    const skills = direction.skills ?? [];
    if (skills.length < 4 || skills.length > 7) errors.push(`${directionId}：技能数应为 4–7，实际 ${skills.length}`);
    const ids = new Set<string>();
    for (const skill of skills) {
      const label = `${directionId}/${skill.id}`;
      if (!/^[a-z][a-z0-9_]{1,39}$/.test(skill.id)) errors.push(`${label}：id 只允许小写字母数字下划线`);
      if (ids.has(skill.id)) errors.push(`${label}：id 重复`);
      ids.add(skill.id);
      if (!skill.name.trim()) errors.push(`${label}：name 为空`);
      if (!KINDS.includes(skill.kind)) errors.push(`${label}：kind 非法 ${skill.kind}`);
      if (!REQUIREMENTS.includes(skill.requirement)) errors.push(`${label}：requirement 非法 ${skill.requirement}`);
      if (!skill.aliases?.length) errors.push(`${label}：aliases 为空`);
      if ((skill.aliases ?? []).some((alias) => !alias.trim())) errors.push(`${label}：aliases 含空串`);
      if (!skill.evidence?.length) errors.push(`${label}：evidence 为空`);
      for (const evidence of skill.evidence ?? []) {
        if (!evidence.record?.trim() || !evidence.field?.trim() || !evidence.needle?.trim()) errors.push(`${label}：evidence 缺 record/field/needle`);
        if (evidence.max_length !== undefined && (!Number.isInteger(evidence.max_length) || evidence.max_length < 20 || evidence.max_length > 400)) errors.push(`${label}：max_length 应为 20–400 的整数`);
      }
    }
  }
  return errors;
}

function main() {
  const spec = JSON.parse(readFileSync(SPEC_PATH, "utf8")) as Spec;
  const names = directionNames();
  const errors = validateSpec(spec, names);
  if (errors.length) {
    console.error("spec 校验失败：\n- " + errors.join("\n- "));
    process.exit(1);
  }
  const records = loadBundles();

  const directions = Object.entries(spec.directions).map(([directionId, direction]) => {
    const skills = direction.skills.map((skill) => {
      const evidence = skill.evidence.map((item) => {
        const occurrences = records.get(item.record);
        if (!occurrences?.length) throw new Error(`${directionId}/${skill.id}：知识库里没有 record ${item.record}`);
        // 同一 id 可能来自多个批次；只接受 needle 命中、且各批次内容一致的那一条原文。
        const matches: { entry: RecordEntry; fact: Fact }[] = [];
        for (const entry of occurrences) {
          for (const fact of entry.row.facts) if (fact.field === item.field && fact.value.includes(item.needle)) matches.push({ entry, fact });
        }
        const fields = [...new Set(occurrences.flatMap((entry) => entry.row.facts.map((fact) => fact.field)))];
        if (!matches.length) throw new Error(`${directionId}/${skill.id}：needle 不是 record ${item.record}.${item.field} 任一原文的连续子串：${JSON.stringify(item.needle)}（现有 field：${fields.join(", ")}）`);
        const distinctQuotes = new Set(matches.map((match) => match.fact.value));
        if (distinctQuotes.size > 1) throw new Error(`${directionId}/${skill.id}：record ${item.record} 在多个采集批次中原文不一致，拒绝引用：${[...distinctQuotes].map((value) => JSON.stringify(value.slice(0, 60))).join(" / ")}`);
        const found = matches[0].entry;
        const fact = matches[0].fact;
        const extracted = extractQuote(fact.value, item.needle, item.max_length ?? 90);
        if (!extracted) throw new Error(`${directionId}/${skill.id}：needle 不是 record ${item.record}.${item.field} 原文的连续子串：${JSON.stringify(item.needle)}`);
        return {
          record_id: found.row.id,
          role_id: found.row.role_id,
          category: found.row.category,
          field: item.field,
          needle: item.needle,
          quote: extracted.quote,
          quote_start: extracted.start,
          quote_end: extracted.end,
          ellipsis_start: extracted.ellipsisStart,
          ellipsis_end: extracted.ellipsisEnd,
          source_id: found.source?.id ?? null,
          source_url: found.source?.url ?? null,
          organization: found.source?.organization ?? null,
          jurisdiction: found.source?.jurisdiction ?? null,
          published_at: found.source?.published_at ?? null,
          collected_file: found.file,
        };
      });
      return {
        id: skill.id,
        name: skill.name,
        kind: skill.kind,
        requirement: skill.requirement,
        aliases: [...new Set(skill.aliases.map((alias) => alias.trim().toLocaleLowerCase()))],
        evidence,
      };
    });
    return {
      direction_id: directionId,
      direction_name: names.get(directionId),
      role_id: direction.role_id,
      occupation_label: direction.occupation_label,
      coverage_note: direction.coverage_note,
      skills,
    };
  });

  const output = {
    schema_version: "skill-requirements-1",
    generated_at: new Date().toISOString(),
    note: "LIMEN 编辑性归并：把知识库里「国家职业标准 / 真实招聘岗位」原文要求的技能，按方向整理成可与画像对照的清单。技能名称与分类是编辑信息；每条 evidence 的 quote 均由脚本从 kb_records 原文逐字截取，可用 record_id + quote_start/quote_end 回查。不是官方统一招聘标准，不构成报考资格或能力结论。",
    method: "spec（data/knowledge/skill-requirements.spec.json）只写 record/field/needle；build-skill-requirements.ts 到 *.collected.json 校验 needle 是原文连续子串后截取 quote。任何一条对不上即整次构建失败。",
    source: {
      kb_records: "Supabase public.kb_records 的本地采集原文（data/knowledge/*.collected.json）",
      edited_by: "LIMEN",
      extraction: "verbatim_quote_verified",
    },
    directions,
    limitations: [
      "技能清单是知识库原文的编辑性归并，不等于该职业的官方统一要求，也不覆盖全部岗位。",
      "部分方向只有少数招聘原文（如医学信号处理、医疗NLP），覆盖有限，已在各方向 coverage_note 标注。",
      "与画像的对照只做名称/别名文本匹配，不代表已掌握或未掌握；信息不足不等于不具备。",
    ],
  };
  writeFileSync(OUTPUT_PATH, `${JSON.stringify(output, null, 2)}\n`, "utf8");

  const report = directions.map((direction) => {
    const recordCount = new Set(direction.skills.flatMap((skill) => skill.evidence.map((item) => item.record_id))).size;
    return `${direction.direction_id.padEnd(14)} ${String(direction.skills.length).padStart(2)} 项 / ${recordCount} 个来源 record`;
  });
  console.log(`已写出 ${OUTPUT_PATH}`);
  console.log(report.join("\n"));
  console.log(`共 ${directions.length} 个方向、${directions.reduce((sum, d) => sum + d.skills.length, 0)} 项技能、${directions.reduce((sum, d) => sum + d.skills.reduce((n, s) => n + s.evidence.length, 0), 0)} 条原文引用。所有 needle 均已在原文命中。`);
}

main();
