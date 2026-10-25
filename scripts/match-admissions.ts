/**
 * 招生条目结构化生成器：只读 `data/knowledge/*.collected.json` + 本地快照文本 →
 * `data/match/admissions.structured.json`（每条都过 `admissionSchema.parse`）。
 *
 * 设计口径（对齐 MATCH_V2_PLAN.md §3.4 / §四 P2-2 与 docs/testing/kb-structured-contract.md）：
 * 1. 只写原文明确写出的事实。年份取记录 context.admission_year（并要求官方来源标题/发布日期说明
 *    能对上）；专业代码与名称取原文摘录或官方来源标题；科目与「报考说明/报考限制」逐字取
 *    facts[].quote。原文没写的字段一律 unknown()，不从「有初试科目」反推「就是统考」。
 * 2. 路径（统考/推免/申请制）在 admissionSchema 里是必填枚举，不是 Fact，因此**只收原文明确
 *    写出路径的条目**；路径条款必须能在原文里正则命中，否则整条拒收。
 * 3. 每条 Evidence：official + https + retrieved_at + verification:"verified"，locator 保留
 *    `sha256:<内容哈希> [start,end) <原文摘录>`（对齐 knowledge-adapter.ts）。生成前重新计算
 *    快照 sha256 并逐字核对偏移，任何漂移直接抛错。
 * 4. 专业代码归属校验：用到的原文里若出现 6 位专业代码，必须包含本条目的专业代码（或官方标题
 *    带该代码），否则视为「条款错挂到别的专业」并拒收。语料确有此类错挂（中山大学 670 计算机
 *    学院 085404 的「仅招收推免生」被抄进 083100/105800 的记录），见
 *    docs/testing/kb-admissions-acceptance.md §五。
 * 5. valid_through：语料记录的 valid_through 均为 null，按记录自带 freshness_days 计算
 *    「抓取日 + freshness_days」作为 LIMEN 复核窗口约定——不是院校公布的有效期，不可当录取依据。
 * 6. hard_requirements 只在原文条款能完整映射到契约五字段（major/degree/graduation_year/
 *    pathway/recommendation_eligible）时才写 known；映射不了的条件（如「不接收同等学力考生」）
 *    保持 unknown()，原文留在 cross_major 并计入「待确认材料清单」。
 *
 * 用法（在仓库根目录运行）：
 *   npx tsx scripts/match-admissions.ts              # 生成 + 逐条审计输出
 *   npx tsx scripts/match-admissions.ts --forensics  # 生成后跑三值规则取证（计数 + 证据链）
 */
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";
import { match } from "../src/lib/match/engine";
import { matchOccupations } from "../src/lib/match/catalog.official";
import { matchAdmissions } from "../src/lib/match/admissions-catalog";
import { adaptProfile } from "../src/lib/match/adapters";
import {
  admissionSchema, known, requirementSchema,
  type Admission, type Evidence, type Fact, type MatchUser,
} from "../src/lib/match/contracts";
import { emptyProfile } from "../src/lib/profile";
import { recordSchema, sourceSchema, type KnowledgeRecord, type KnowledgeSource } from "../src/lib/knowledge";

const CORPUS_DIR = "data/knowledge";
const OUTPUT = "data/match/admissions.structured.json";
const AUDIT = "work/match/admissions-build-audit.json";

/** 快照抽取文本目录：manifest 未登记 extracted_path 时，在这些目录里按 sha256 反查原文。 */
const SNAPSHOT_DIRS = [
  "work/knowledge-adm-92c", "work/knowledge-adm-92c-check", "work/knowledge-adm-92c-csu", "work/knowledge-adm-92c2",
  "work/knowledge-adm-92d", "work/knowledge-adm-92e", "work/knowledge-adm-92f", "work/knowledge-adm-92g",
  "work/knowledge-adm-92h", "work/knowledge-adm-92i", "work/knowledge-adm-csu", "work/knowledge-adm-eng",
  "work/knowledge-adm-eng-2", "work/knowledge-adm-tier1", "work/knowledge-adm-tier1b", "work/knowledge-adm-tier1c",
  "work/knowledge-adm-tier1d", "work/knowledge-adm-tier1e", "work/knowledge-adm-tier1f", "work/knowledge-adm-tier1g",
  "work/knowledge-adm-tier2", "work/knowledge-adm-tier2b", "work/knowledge-admissions", "work/knowledge-admissions-92",
  "work/knowledge-admissions-92b", "work/knowledge-admissions-others", "work/knowledge-admissions-others2",
  "work/knowledge-admissions2", "work/knowledge-expansion", "work/knowledge-medical", "work/knowledge-medical-2026",
  "work/knowledge-school-majors", "work/knowledge-school-majors-2", "work/knowledge-school-majors-3",
];

/** 编辑性「招生专业 → App 职业方向出口」映射（LIMEN 编辑，不是官方职业分类结论）。 */
const MAPPING_RULES = {
  R1: "R1 计算机/软件/电子信息类硕士 → ml_cv、software、llm_agent（AI / 计算机方向：影像处理、数据管线、模型部署都需要计算机与软件训练）。LIMEN 编辑性出口映射，需人工复核。",
  R2: "R2 生物医学工程类硕士 → devices、signals、imaging_eng（医工交叉做影像/信号/器械工程）；医学信息类 → clinical_data、health_systems、med_nlp_kg（医疗信息、临床数据与医学NLP）。LIMEN 编辑性出口映射，需人工复核。",
} as const;
const MAPPING_VERSION = "limen-admission-occupation-map@3.0";
// 岗位粒度从 4 个组级方向扩到 9 个特化 + 医学后，组级招生映射展开到组内特化；
// 这是编辑性展开（同一培养项目可对应多个特化出口），不是官方专业目录结论。
const GROUP_TO_SPECIALIZATIONS: Record<string, string[]> = {
  cs_ai: ["ml_cv", "software", "llm_agent"],
  biomed_eng: ["devices", "signals", "imaging_eng"],
  med_informatics: ["clinical_data", "health_systems", "med_nlp_kg"],
  medicine: ["medicine"],
};

const sha256 = (value: string) => createHash("sha256").update(value, "utf8").digest("hex");
const isoDate = (value: string) => value.slice(0, 10);
const addDays = (date: string, days: number) =>
  new Date(Date.parse(`${date}T00:00:00Z`) + days * 86400000).toISOString().slice(0, 10);

type FactField = "exam_subjects" | "cross_major_restrictions" | "admission_requirements";
type FactSource = { record: string; field: FactField };
type Requirement = z.infer<typeof requirementSchema>;
type HardRuleSpec = { field: Requirement["field"]; allowed: string[]; from: FactSource; pattern: RegExp };
type EntrySpec = {
  id: string;
  university: string;
  major_code: string;
  major_name: string;
  year: number;
  pathway: "统考" | "推免" | "申请制";
  /** 路径必须由原文明确写出：pattern 命中 from 指向的原文摘录，否则拒收。 */
  pathway_clause: { from: FactSource; pattern: RegExp };
  occupation_ids: string[];
  mapping_rule: keyof typeof MAPPING_RULES;
  facts: { exam_subjects?: FactSource; cross_major?: FactSource };
  hard_requirements: HardRuleSpec[];
  /** 审计用：本条为何可以收（人读的一句话）。 */
  basis: string;
};

/**
 * 收录表。每条都要求原文明确写出「学校 + 专业代码/名称 + 招生年度 + 路径」。
 * 未列入的记录主要因为原文没有写路径，逐条理由见 docs/testing/match-admissions-coverage.md。
 */
const SELECTION: EntrySpec[] = [
  {
    id: "adm-tongji-2027-077700-bme",
    university: "同济大学", major_code: "077700", major_name: "生物医学工程", year: 2027, pathway: "统考",
    pathway_clause: { from: { record: "admissions-tongji-2027-077700-yjfx-guide-devices", field: "exam_subjects" }, pattern: /（全国统考）/ },
    occupation_ids: ["biomed_eng", "med_informatics"], mapping_rule: "R2",
    facts: {
      exam_subjects: { record: "admissions-tongji-2027-077700-yjfx-guide-devices", field: "exam_subjects" },
      cross_major: { record: "admissions-tongji-2027-077700-yjfx-guide-devices", field: "cross_major_restrictions" },
    },
    // 「不接收同等学力考生」映射不到契约五字段 → hard_requirements 保持 unknown（进入待确认清单）。
    hard_requirements: [],
    basis: "专业目录原文并列「（学术学位）生物医学工程（全国统考）」与初试科目；备注写明「不接收同等学力考生」。",
  },
  {
    id: "adm-ustc-2026-083100-bme",
    university: "中国科学技术大学", major_code: "083100", major_name: "生物医学工程", year: 2026, pathway: "推免",
    pathway_clause: { from: { record: "admissions-ustc-2026-master-bme-guide-signals-040bb01b", field: "cross_major_restrictions" }, pattern: /仅接收推免生/ },
    occupation_ids: ["biomed_eng", "med_informatics"], mapping_rule: "R2",
    facts: { cross_major: { record: "admissions-ustc-2026-master-bme-guide-signals-040bb01b", field: "cross_major_restrictions" } },
    hard_requirements: [{ field: "pathway", allowed: ["推免"], from: { record: "admissions-ustc-2026-master-bme-guide-signals-040bb01b", field: "cross_major_restrictions" }, pattern: /仅接收推免生/ }],
    basis: "院系招生页「报考说明」写明「仅接收推免生」；该页未列初试科目，故 exam_subjects 保持 unknown。",
  },
  {
    id: "adm-ustc-2026-085405-software-regular",
    university: "中国科学技术大学", major_code: "085405", major_name: "软件工程（常规班）", year: 2026, pathway: "统考",
    pathway_clause: { from: { record: "admissions-ustc-2026-sse-085405-guide-software-201d2bb2", field: "exam_subjects" }, pattern: /仅招收统考生/ },
    occupation_ids: ["cs_ai"], mapping_rule: "R1",
    facts: {
      exam_subjects: { record: "admissions-ustc-2026-sse-085405-guide-software-201d2bb2", field: "exam_subjects" },
      cross_major: { record: "admissions-ustc-2026-sse-085405-guide-software-110aef42", field: "cross_major_restrictions" },
    },
    hard_requirements: [
      { field: "pathway", allowed: ["统考"], from: { record: "admissions-ustc-2026-sse-085405-guide-software-110aef42", field: "cross_major_restrictions" }, pattern: /常规班仅招收统考生/ },
      // 原文是开放式范围「软件工程、计算机及其相关专业」；结构化只登记被点名的两个专业，
      // 未列出的本科专业会被判为「明确不符」——保守口径：宁可不报，也不误报可报。
      { field: "major", allowed: ["软件工程", "计算机科学与技术"], from: { record: "admissions-ustc-2026-sse-085405-guide-software-110aef42", field: "cross_major_restrictions" }, pattern: /软件工程、计算机及其相关专业/ },
    ],
    basis: "初试科目原文带「（注：仅招收统考生）」；同一学院简章报考说明写明常规班仅招统考生、专业范围为软件工程与计算机及其相关专业。",
  },
  {
    id: "adm-ustc-2026-085405-software-special",
    university: "中国科学技术大学", major_code: "085405", major_name: "软件工程（特色化创新试点班）", year: 2026, pathway: "推免",
    pathway_clause: { from: { record: "admissions-ustc-2026-sse-085405-guide-software-110aef42", field: "cross_major_restrictions" }, pattern: /特色化创新试点班仅接收推免生/ },
    occupation_ids: ["cs_ai"], mapping_rule: "R1",
    facts: { cross_major: { record: "admissions-ustc-2026-sse-085405-guide-software-110aef42", field: "cross_major_restrictions" } },
    hard_requirements: [
      { field: "pathway", allowed: ["推免"], from: { record: "admissions-ustc-2026-sse-085405-guide-software-110aef42", field: "cross_major_restrictions" }, pattern: /特色化创新试点班仅接收推免生/ },
      { field: "major", allowed: ["软件工程", "计算机科学与技术"], from: { record: "admissions-ustc-2026-sse-085405-guide-software-110aef42", field: "cross_major_restrictions" }, pattern: /软件工程、计算机及其相关专业/ },
    ],
    basis: "同一「报考说明」写明特色化创新试点班仅接收推免生；该班无单独初试科目，故 exam_subjects 保持 unknown。",
  },
  {
    id: "adm-fudan-2026-083100-bme",
    university: "复旦大学", major_code: "083100", major_name: "生物医学工程（学术学位）", year: 2026, pathway: "推免",
    pathway_clause: { from: { record: "admissions-fudan-2026-catalog-306-bme-guide-devices-53c053e3", field: "cross_major_restrictions" }, pattern: /本专业只招收推免生/ },
    occupation_ids: ["biomed_eng", "med_informatics"], mapping_rule: "R2",
    facts: { cross_major: { record: "admissions-fudan-2026-catalog-306-bme-guide-devices-53c053e3", field: "cross_major_restrictions" } },
    hard_requirements: [{ field: "pathway", allowed: ["推免"], from: { record: "admissions-fudan-2026-catalog-306-bme-guide-devices-53c053e3", field: "cross_major_restrictions" }, pattern: /本专业只招收推免生/ }],
    basis: "专业目录该专业行写明「17 只招收推免生 1.本专业只招收推免生。」；该行未给初试科目。",
  },
  {
    id: "adm-sysu-2027-085404-cs-670",
    university: "中山大学", major_code: "085404", major_name: "计算机技术（670 计算机学院）", year: 2027, pathway: "推免",
    pathway_clause: { from: { record: "admissions-sysu-2027-catalog-670-085404-guide-software-96f30f4e", field: "cross_major_restrictions" }, pattern: /085404 计算机技术 210 仅招收推免生/ },
    occupation_ids: ["cs_ai"], mapping_rule: "R1",
    facts: { cross_major: { record: "admissions-sysu-2027-catalog-670-085404-guide-software-96f30f4e", field: "cross_major_restrictions" } },
    hard_requirements: [{ field: "pathway", allowed: ["推免"], from: { record: "admissions-sysu-2027-catalog-670-085404-guide-software-96f30f4e", field: "cross_major_restrictions" }, pattern: /085404 计算机技术 210 仅招收推免生/ }],
    basis: "670 计算机学院页原文「085404 计算机技术 210 仅招收推免生。」；同校 772 微电子学院同代码专业另有统考科目，故本条限定 670 学院。",
  },
  {
    id: "adm-pku-2027-085400-ee-050607",
    university: "北京大学", major_code: "085400", major_name: "电子信息（05 网络与信息安全 / 06 关键软件 / 07 高端芯片）", year: 2027, pathway: "推免",
    pathway_clause: { from: { record: "admissions-pku-ss-2027-ei-notice-guide-software-b892d8ee", field: "cross_major_restrictions" }, pattern: /只招收推免生/ },
    occupation_ids: ["cs_ai"], mapping_rule: "R1",
    facts: { cross_major: { record: "admissions-pku-ss-2027-ei-notice-guide-software-b892d8ee", field: "cross_major_restrictions" } },
    hard_requirements: [{ field: "pathway", allowed: ["推免"], from: { record: "admissions-pku-ss-2027-ei-notice-guide-software-b892d8ee", field: "cross_major_restrictions" }, pattern: /只招收推免生/ }],
    basis: "招生说明原文逐方向写明「05/06/07 … 只招收推免生」；该段未给初试科目。",
  },
  // 说明：语料里新增的「同济大学 2027 招生目录（adm-92h）」在本次生成期间被并发改写/移除，
  // 相关记录 id 已不存在，因此未收录。收录表只依赖已稳定落盘、可回溯的语料记录；
  // 若某条记录消失，生成器会直接抛错（记录不存在），不会静默少收。
];

const bundleSchema = z.looseObject({ sources: z.array(sourceSchema), records: z.array(recordSchema) });
const shardSchema = z.looseObject({
  artifact_capture: z.looseObject({
    extracted_path: z.string().min(1).optional(),
    extracted_sha256: z.string().regex(/^[a-f0-9]{64}$/).optional(),
  }).optional(),
});

function loadCorpus() {
  const records = new Map<string, KnowledgeRecord>();
  const sources = new Map<string, KnowledgeSource>();
  const duplicates: string[] = [];
  let bundles = 0;
  for (const file of readdirSync(CORPUS_DIR).filter(name => name.endsWith(".collected.json"))) {
    const raw: unknown = JSON.parse(readFileSync(join(CORPUS_DIR, file), "utf8"));
    if (Array.isArray(raw)) throw new Error(`${file}: 预期 {sources, records} 打包格式，实际是数组`);
    const bundle = bundleSchema.parse(raw);
    bundles++;
    for (const source of bundle.sources) if (!sources.has(source.id)) sources.set(source.id, source);
    for (const record of bundle.records) {
      if (record.category !== "admissions") continue;
      if (records.has(record.id)) { duplicates.push(record.id); continue; }
      records.set(record.id, record);
    }
  }
  return { records, sources, duplicates, bundles };
}

/** 用 sha256 把记录连回本地快照原文：先看 manifest 的 extracted_path，再在快照目录里按哈希反查。 */
function buildTextIndex(records: Map<string, KnowledgeRecord>) {
  const wanted = new Set([...records.values()].map(record => record.content_hash));
  const index = new Map<string, string>();
  const remember = (hash: string, text: string) => {
    if (wanted.has(hash) && !index.has(hash)) index.set(hash, text);
  };
  for (const file of readdirSync(CORPUS_DIR).filter(name => name.endsWith(".manifest.json"))) {
    const raw: unknown = JSON.parse(readFileSync(join(CORPUS_DIR, file), "utf8"));
    for (const shard of Array.isArray(raw) ? raw : [raw]) {
      const parsed = shardSchema.safeParse(shard);
      if (!parsed.success) continue;
      const capture = parsed.data.artifact_capture;
      if (!capture?.extracted_path || !capture.extracted_sha256 || !wanted.has(capture.extracted_sha256)) continue;
      if (!existsSync(capture.extracted_path)) continue;
      try { if (statSync(capture.extracted_path).size > 4_000_000) continue; } catch { continue; }
      const text = readFileSync(capture.extracted_path, "utf8");
      if (sha256(text) === capture.extracted_sha256) remember(capture.extracted_sha256, text);
    }
  }
  const walk = (path: string, depth = 0) => {
    if (depth > 4 || index.size === wanted.size) return;
    let stat; try { stat = statSync(path); } catch { return; }
    if (stat.isDirectory()) { for (const entry of readdirSync(path)) walk(join(path, entry), depth + 1); return; }
    if (!path.endsWith(".txt") || stat.size > 4_000_000) return;
    const text = readFileSync(path, "utf8");
    remember(sha256(text), text);
  };
  for (const root of SNAPSHOT_DIRS) walk(root);
  return index;
}

function officialEvidence(record: KnowledgeRecord, source: KnowledgeSource, field: string, quote: string, start: number, end: number): Evidence {
  const url = new URL(source.url);
  if (url.protocol !== "https:" || url.username || url.password) throw new Error(`${record.id}: 来源不是合规 https URL`);
  const locator = `sha256:${record.content_hash} [${start},${end}) ${quote}`;
  if (locator.length > 2000) throw new Error(`${record.id}: locator 超长 (${locator.length})`);
  return {
    ref: `kb:${record.id}:${field}`,
    source_kind: "official",
    url: source.url,
    published_at: source.published_at,
    retrieved_at: record.collected_at,
    verification: "verified",
    locator,
  };
}

function mappingEvidence(rule: keyof typeof MAPPING_RULES, majorCode: string, majorName: string, occupationIds: string[]): Evidence {
  return {
    ref: `${MAPPING_VERSION}#${rule}`,
    source_kind: "editorial",
    url: null,
    published_at: "2026-10-23",
    retrieved_at: "2026-10-23T00:00:00.000Z",
    verification: "verified",
    locator: `${MAPPING_RULES[rule]} 本条：${majorCode} ${majorName} → ${occupationIds.join(" / ")}。`,
  };
}

/**
 * 科目**不做拆分**：整段原文作为一个元素保存。
 * 目录行的「①…④… 复试科目：…」里既有初试科目也有复试科目，机械切分会把复试科目算成初试科目，
 * 那是推断。保留逐字原文行，由 UI 原样展示、由人工判断。
 */
function examSubjects(quote: string) {
  return [quote];
}

type UsedFact = { record: KnowledgeRecord; source: KnowledgeSource; fact: KnowledgeRecord["facts"][number] };

function verifyFactSource(spec: FactSource, records: Map<string, KnowledgeRecord>, sources: Map<string, KnowledgeSource>, texts: Map<string, string>): UsedFact {
  const record = records.get(spec.record);
  if (!record) throw new Error(`记录不存在: ${spec.record}`);
  if (record.category !== "admissions") throw new Error(`${spec.record}: 不是招生类记录`);
  if (record.verification !== "quote_verified") throw new Error(`${spec.record}: 记录未逐字核对`);
  const fact = record.facts.find(entry => entry.field === spec.field);
  if (!fact) throw new Error(`${spec.record}: 缺少字段 ${spec.field}`);
  const text = texts.get(record.content_hash);
  if (!text) throw new Error(`${spec.record}: 找不到可回溯的本地快照文本（content_hash=${record.content_hash}）`);
  if (sha256(text) !== record.content_hash) throw new Error(`${spec.record}: 快照哈希不一致`);
  if (text.slice(fact.start, fact.end) !== fact.quote) throw new Error(`${spec.record}.${spec.field}: 原文偏移对不上`);
  if (fact.value !== fact.quote) throw new Error(`${spec.record}.${spec.field}: value 与 quote 不一致`);
  const source = sources.get(record.source_id);
  if (!source) throw new Error(`${spec.record}: 缺少来源 ${record.source_id}`);
  return { record, source, fact };
}

function buildAdmissions(records: Map<string, KnowledgeRecord>, sources: Map<string, KnowledgeSource>, texts: Map<string, string>) {
  const admissions: Admission[] = [];
  const audit: Array<Record<string, unknown>> = [];
  for (const spec of SELECTION) {
    const used = new Map<string, UsedFact>();
    const touch = (source: FactSource) => {
      const key = `${source.record}::${source.field}`;
      if (!used.has(key)) used.set(key, verifyFactSource(source, records, sources, texts));
      return used.get(key)!;
    };
    const exam = spec.facts.exam_subjects ? touch(spec.facts.exam_subjects) : null;
    const cross = spec.facts.cross_major ? touch(spec.facts.cross_major) : null;
    const pathwayFact = touch(spec.pathway_clause.from);
    if (!spec.pathway_clause.pattern.test(pathwayFact.fact.value)) {
      throw new Error(`${spec.id}: 路径条款不成立，原文里找不到 ${spec.pathway_clause.pattern}`);
    }
    const titles = [...used.values()].map(item => item.source.title).join(" ");
    const codes = new Set([...used.values()].flatMap(item => item.fact.value.match(/\d{6}/g) ?? []));
    const codeInFacts = codes.has(spec.major_code);
    const codeInTitle = titles.includes(spec.major_code);
    if (codes.size > 0 && !codeInFacts && !codeInTitle) {
      throw new Error(`${spec.id}: 原文出现的专业代码 ${[...codes].join(",")} 与目标 ${spec.major_code} 不符（疑似条款错挂）`);
    }
    const yearText = `${titles} ${[...used.values()].map(item => item.source.publication_date_note).join(" ")}`;
    if (!yearText.includes(String(spec.year))) throw new Error(`${spec.id}: 招生年度 ${spec.year} 在官方标题/发布日期说明里没有依据`);
    const institutions = new Set([...used.values()].map(item => item.record.context?.institution).filter(Boolean));
    for (const institution of institutions) {
      if (institution !== spec.university) throw new Error(`${spec.id}: 采集上下文院校 ${institution} 与目标 ${spec.university} 不一致`);
    }

    const evidenceOf = (item: UsedFact) => officialEvidence(item.record, item.source, item.fact.field, item.fact.quote, item.fact.start, item.fact.end);

    const hardRules: Requirement[] = spec.hard_requirements.map((rule, index) => {
      const item = touch(rule.from);
      if (!rule.pattern.test(item.fact.value)) throw new Error(`${spec.id}: 硬条件 ${rule.field} 的原文依据不存在`);
      return { id: `${spec.id}-r${index + 1}`, field: rule.field, allowed: rule.allowed, evidence: [evidenceOf(item)] };
    });

    const examFact: Fact<string[]> = exam
      ? { value: examSubjects(exam.fact.quote), status: "known", evidence: [evidenceOf(exam)] }
      : { value: null, status: "unknown", evidence: [] };
    const crossFact: Fact<string> = cross
      ? { value: cross.fact.quote, status: "known", evidence: [evidenceOf(cross)] }
      : { value: null, status: "unknown", evidence: [] };
    const hardFact: Fact<Requirement[]> = hardRules.length
      ? { value: hardRules, status: "known", evidence: [...new Map(hardRules.flatMap(rule => rule.evidence).map(evidence => [evidence.ref, evidence])).values()] }
      : { value: null, status: "unknown", evidence: [] };
    // research_directions：语料没有独立字段承载「研究方向」原文（方向名混在专业名里），无法逐字取证 → unknown。
    const researchFact: Fact<string[]> = { value: null, status: "unknown", evidence: [] };

    const validThrough = [...used.values()]
      .map(item => addDays(isoDate(item.record.collected_at), item.record.freshness_days))
      .sort()[0];
    const programEvidence = evidenceOf(exam ?? cross ?? pathwayFact);

    const admission = admissionSchema.parse({
      schema_version: "match-2",
      id: spec.id,
      simulation: false,
      university: spec.university,
      major_code: spec.major_code,
      major_name: spec.major_name,
      year: spec.year,
      pathway: spec.pathway,
      occupation_ids: spec.occupation_ids.flatMap(id => GROUP_TO_SPECIALIZATIONS[id] ?? [id]),
      mapping_evidence: [programEvidence, mappingEvidence(spec.mapping_rule, spec.major_code, spec.major_name, spec.occupation_ids)],
      valid_through: validThrough,
      exam_subjects: examFact,
      research_directions: researchFact,
      cross_major: crossFact,
      hard_requirements: hardFact,
    } satisfies Admission);
    admissions.push(admission);
    audit.push({
      id: spec.id, university: spec.university, major_code: spec.major_code, year: spec.year, pathway: spec.pathway,
      records: [...new Set([...used.values()].map(item => item.record.id))],
      sources: [...new Set([...used.values()].map(item => item.source.url))],
      content_hashes: [...new Set([...used.values()].map(item => item.record.content_hash))],
      facts_known: { exam_subjects: examFact.status, cross_major: crossFact.status, hard_requirements: hardFact.status, research_directions: researchFact.status },
      valid_through: validThrough, code_in_facts: codeInFacts, code_in_title: codeInTitle,
      basis: spec.basis,
    });
  }
  return { admissions, audit };
}

function generate() {
  const { records, sources, duplicates, bundles } = loadCorpus();
  const texts = buildTextIndex(records);
  const { admissions, audit } = buildAdmissions(records, sources, texts);
  const generatedAt = new Date().toISOString();
  const withText = [...records.values()].filter(record => texts.has(record.content_hash));
  if (new Set(admissions.map(admission => admission.id)).size !== admissions.length) throw new Error("生成结果存在重复 id");

  const output = {
    schema_version: "match-admissions-1",
    generated_at: generatedAt,
    note: "由 scripts/match-admissions.ts 从 data/knowledge/*.collected.json 生成，不要手改。只收原文明确写出「学校+专业+年份+路径」的条目；原文没写的字段为 unknown。valid_through 是按语料 freshness_days 计算的 LIMEN 复核窗口，不是院校公布的有效期，也不是录取依据。",
    corpus: {
      bundles_scanned: bundles,
      admissions_records: records.size,
      records_with_local_snapshot_text: withText.length,
      duplicate_record_ids_skipped: duplicates.length,
    },
    admission_count: admissions.length,
    admissions,
  };
  mkdirSync("data/match", { recursive: true });
  writeFileSync(OUTPUT, `${JSON.stringify(output, null, 2)}\n`, "utf8");
  mkdirSync("work/match", { recursive: true });
  writeFileSync(AUDIT, `${JSON.stringify({ generated_at: generatedAt, corpus: output.corpus, entries: audit }, null, 2)}\n`, "utf8");
  return { admissions, audit, corpus: output.corpus };
}

const selfEvidence = (field: string): Evidence => ({
  ref: `demo-profile.${field}`, source_kind: "self_report", url: null, published_at: null,
  retrieved_at: "2026-10-23T00:00:00.000Z", verification: "self_reported", locator: `示例画像自述：${field}`,
});

type DemoProfile = { label: string; target_year: number; study_intent: "统考" | "推免"; major: string; degree: string; graduation_year: string; pathway: string; recommendation_eligible: string };

function demoUser(spec: DemoProfile): MatchUser {
  const user = adaptProfile({ ...emptyProfile, major: spec.major }, null, null, "2026-10-23T00:00:00.000Z");
  user.qualifications = {
    major: known(spec.major, selfEvidence("major")),
    degree: known(spec.degree, selfEvidence("degree")),
    graduation_year: known(spec.graduation_year, selfEvidence("graduation_year")),
    pathway: known(spec.pathway, selfEvidence("pathway")),
    recommendation_eligible: known(spec.recommendation_eligible, selfEvidence("recommendation_eligible")),
  };
  user.study_intent = known(spec.study_intent, selfEvidence("study_intent"));
  user.target_year = spec.target_year;
  return user;
}

const DEMO_PROFILES: DemoProfile[] = [
  { label: "2027 统考 / 本科临床医学", target_year: 2027, study_intent: "统考", major: "临床医学", degree: "本科毕业", graduation_year: "2026", pathway: "统考", recommendation_eligible: "否" },
  { label: "2026 统考 / 本科软件工程", target_year: 2026, study_intent: "统考", major: "软件工程", degree: "学士学位", graduation_year: "2026", pathway: "统考", recommendation_eligible: "否" },
  { label: "2026 推免 / 本科生物医学工程", target_year: 2026, study_intent: "推免", major: "生物医学工程", degree: "学士学位", graduation_year: "2026", pathway: "推免", recommendation_eligible: "是" },
];

type ProgramStatus = "met" | "unknown" | "not_met" | "plan_mismatch" | "expired";
type Bucket = "可报" | "待确认" | "明确不符";
const STATUS_BUCKET: Record<ProgramStatus, Bucket> = {
  met: "可报", unknown: "待确认", not_met: "明确不符", plan_mismatch: "明确不符", expired: "明确不符",
};

function runForensics() {
  const admissions = matchAdmissions();
  console.log(`\n[forensics] 加载结构化招生条目 ${admissions.length} 条（data/match/admissions.structured.json）`);
  const now = new Date();
  for (const profile of DEMO_PROFILES) {
    const user = demoUser(profile);
    const report = match({ user, occupations: matchOccupations, admissions }, now);
    // 同一招生项目可能挂在多个职业出口下；状态只取决于用户与项目本身，按项目去重后计数。
    const programs = new Map<string, (typeof report.results)[number]["programs"][number]>();
    for (const result of report.results) for (const program of result.programs) if (!programs.has(program.id)) programs.set(program.id, program);
    const counts: Record<ProgramStatus, number> = { met: 0, unknown: 0, not_met: 0, plan_mismatch: 0, expired: 0 };
    const statusOf = (program: { status: string }) => program.status as ProgramStatus;
    for (const program of programs.values()) counts[statusOf(program)] = (counts[statusOf(program)] ?? 0) + 1;
    const bucket = (name: Bucket) => [...programs.values()].filter(program => STATUS_BUCKET[statusOf(program)] === name).length;
    console.log(`\n[画像] ${profile.label}（target_year=${profile.target_year} study_intent=${profile.study_intent} 本科专业=${profile.major}）`);
    console.log(`  可报 ${bucket("可报")} 项 / 待确认 ${bucket("待确认")} 项 / 明确不符 ${bucket("明确不符")} 项（共 ${programs.size} 项已结构化项目）`);
    console.log(`  状态明细：met=${counts.met} unknown=${counts.unknown} not_met=${counts.not_met} plan_mismatch=${counts.plan_mismatch} expired=${counts.expired}`);
    for (const program of programs.values()) {
      console.log(`    - [${program.status}] ${program.university} ${program.major} ${program.year} ${program.pathway}（${program.id}）`);
    }
  }
  const samples = ["adm-tongji-2027-077700-bme", "adm-sysu-2027-085404-cs-670"]
    .flatMap(id => admissions.filter(admission => admission.id === id));
  for (const sample of samples.length ? samples : admissions.slice(0, 1)) {
    console.log(`\n[证据链] ${sample.university} ${sample.major_code} ${sample.major_name} / ${sample.year} / ${sample.pathway}`);
    console.log(`  id=${sample.id} simulation=${sample.simulation} valid_through=${sample.valid_through} occupation_ids=${sample.occupation_ids.join(",")}`);
    console.log(`  exam_subjects(${sample.exam_subjects.status}) = ${JSON.stringify(sample.exam_subjects.value)}`);
    console.log(`  cross_major(${sample.cross_major.status}) = ${JSON.stringify(sample.cross_major.value)}`);
    console.log(`  hard_requirements(${sample.hard_requirements.status}) = ${JSON.stringify(sample.hard_requirements.value)}`);
    console.log(`  research_directions(${sample.research_directions.status}) = ${JSON.stringify(sample.research_directions.value)}`);
    const evidences = [
      ...sample.mapping_evidence,
      ...sample.exam_subjects.evidence, ...sample.cross_major.evidence,
      ...sample.hard_requirements.evidence, ...sample.research_directions.evidence,
    ];
    // 同一条原文会同时充当 mapping_evidence 与某个 Fact 的证据，按 ref 去重后逐条打印。
    for (const evidence of new Map(evidences.map(item => [item.ref, item])).values()) {
      console.log(`  - ref=${evidence.ref} kind=${evidence.source_kind} verification=${evidence.verification}`);
      console.log(`    url=${evidence.url ?? "(editorial，无 URL)"} retrieved_at=${evidence.retrieved_at} published_at=${evidence.published_at ?? "null"}`);
      console.log(`    locator=${evidence.locator}`);
    }
  }
}

/**
 * 语料摸底：不生成产物，只回答「有多少条真的能收、为什么收不了」。
 * 路径判定规则与收录表一致：原文里必须出现明确的统考/推免/申请制措辞，否则视为路径未知。
 */
const PATHWAY_PATTERNS: Array<{ pathway: "统考" | "推免" | "申请制"; pattern: RegExp }> = [
  { pathway: "推免", pattern: /(仅|只)(招收|接收|招|接受|从|限)?[^，。；\n]{0,10}推免生|仅从推免生选拔|仅限推免/ },
  { pathway: "统考", pattern: /(仅|只)(招收|接收|招|接受)[^，。；\n]{0,10}统考|（全国统考）|全国统考/ },
  { pathway: "申请制", pattern: /申请制|申请考核制/ },
];
const MIXED_PATTERN = /推免生和统考生|统考生和推免生|接收推免生和统考/;

function runAudit() {
  const { records } = loadCorpus();
  const texts = buildTextIndex(records);
  const rows = [...records.values()].map(record => {
    const text = texts.get(record.content_hash) ?? null;
    const quotes = record.facts.map(fact => fact.quote).join("\n");
    const title = "";
    const hay = `${quotes}\n${title}`;
    const hits = PATHWAY_PATTERNS.filter(entry => entry.pattern.test(hay));
    const mixed = MIXED_PATTERN.test(hay);
    const factsOk = text ? record.facts.every(fact => text.slice(fact.start, fact.end) === fact.quote) : false;
    return { record, hasText: Boolean(text), factsOk, hits, mixed, fields: record.facts.map(fact => fact.field) };
  });
  const withText = rows.filter(row => row.hasText);
  const verified = withText.filter(row => row.factsOk);
  const explicit = verified.filter(row => row.hits.length > 0 && !row.mixed);
  const single = explicit.filter(row => row.hits.length === 1);
  const ambiguous = verified.filter(row => row.hits.length > 1 || row.mixed);
  const selectedIds = new Set(SELECTION.map(spec => spec.id));
  const usedRecordIds = new Set(SELECTION.flatMap(spec => [
    ...(spec.facts.exam_subjects ? [spec.facts.exam_subjects.record] : []),
    ...(spec.facts.cross_major ? [spec.facts.cross_major.record] : []),
    spec.pathway_clause.from.record,
  ]));

  console.log("[audit] 语料可核实性");
  console.log(`  招生记录（按 id 去重）: ${rows.length}`);
  console.log(`  有本地快照文本: ${withText.length}；其中 quote 偏移与 sha256 均核对通过: ${verified.length}`);
  console.log(`  原文明确写出单一路径: ${single.length}；路径措辞冲突/混写（不可判定）: ${ambiguous.length}`);
  console.log(`  单一路径且带初试科目: ${single.filter(row => row.fields.includes("exam_subjects")).length}`);
  console.log(`  最终收录: ${selectedIds.size} 条（引用 ${usedRecordIds.size} 条语料记录）`);
  console.log("\n[audit] 原文明确写出路径的记录（未收录的需人工复核作用域/归属）:");
  for (const row of [...single, ...ambiguous]) {
    const record = row.record;
    const tag = usedRecordIds.has(record.id) ? "已收录" : "未收录";
    const pathway = row.hits.map(hit => hit.pathway).join("+");
    console.log(`  [${tag}] ${record.context?.institution ?? "(无院校)"} | ${record.context?.program ?? "(无专业)"} | ${record.context?.admission_year ?? "-"} | ${pathway}${row.mixed ? "(混写)" : ""} | fields=${row.fields.join("+")} | ${record.id}`);
  }
}

if (process.argv.includes("--audit")) {
  runAudit();
} else if (process.argv.includes("--forensics")) {
  const { admissions, audit, corpus } = generate();
  console.log(`[generate] ${OUTPUT} 条目数=${admissions.length}`);
  console.log(`[corpus] ${JSON.stringify(corpus)}`);
  for (const row of audit) {
    console.log(`  - ${row.university} ${row.major_code} ${row.year} ${row.pathway} | exam=${(row.facts_known as Record<string, string>).exam_subjects} cross=${(row.facts_known as Record<string, string>).cross_major} hard=${(row.facts_known as Record<string, string>).hard_requirements} | valid_through=${row.valid_through}`);
  }
  runForensics();
} else {
  const { admissions, audit, corpus } = generate();
  console.log(`[generate] ${OUTPUT} 条目数=${admissions.length}`);
  console.log(`[corpus] ${JSON.stringify(corpus)}`);
  for (const row of audit) {
    console.log(`  - ${row.university} ${row.major_code} ${row.year} ${row.pathway} | exam=${(row.facts_known as Record<string, string>).exam_subjects} cross=${(row.facts_known as Record<string, string>).cross_major} hard=${(row.facts_known as Record<string, string>).hard_requirements} | valid_through=${row.valid_through}`);
  }
  console.log("[hint] 加 --forensics 跑三值规则取证");
}
