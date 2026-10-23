/**
 * 结构化数据代理：把知识库事实整理成网页可直接 join 的三份 JSON。
 *
 * 输出（全部为新建文件）：
 *   data/knowledge/pathway-map.json   本科专业 → 目标学校/项目 → 职业（P0）
 *   data/knowledge/school-index.json  按院校聚合的招生/课程/职业出口索引（P1）
 *   data/knowledge/field-coverage.json + docs/testing/kb-field-coverage.md（P2）
 *
 * 只读取 *.manifest.json 与 role-aliases.json；不改任何既有文件。
 * 用法：
 *   npx tsx scripts/knowledge/build-structured-data.ts pathway   # 只产出 P0
 *   npx tsx scripts/knowledge/build-structured-data.ts all       # 全部产出
 */
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const KNOWLEDGE_DIR = "data/knowledge";
const CATEGORIES = ["occupation", "admissions", "recruitment", "industry", "learning"] as const;

type ExtractItem = {
  field: string;
  pattern?: string;
  quote?: string;
  value?: string;
  locator?: string;
};

type ManifestEntry = {
  source: {
    id: string;
    url: string;
    organization: string;
    title?: string;
    jurisdiction?: string;
    source_tier?: string;
    published_at?: string | null;
    publication_date_note?: string | null;
  };
  record: {
    id: string;
    role_id: string;
    category: string;
    title: string;
    summary?: string;
    applicability?: string;
    relation?: string;
    tags?: string[];
    context?: {
      institution?: string;
      college?: string;
      program?: string;
      admission_year?: number;
      region?: string;
      [key: string]: unknown;
    };
  };
  extracts?: ExtractItem[];
  expected_fields?: string[];
};

type LoadedEntry = ManifestEntry & { manifest: string };

type Major = {
  id: string;
  name: string;
  degree_category: "医学" | "工学" | "理学";
  tokens: string[];
  likely_occupations: Array<{ occupation_id: string; canonical_name: string; basis: string }>;
};

/** 跨考视角（kb-school-list §三）固定的本科专业集合；只做索引，不扩招。 */
const MAJORS: Major[] = [
  {
    id: "clinical_medicine",
    name: "临床医学",
    degree_category: "医学",
    tokens: ["临床医学", "西医临床", "临床医学类"],
    likely_occupations: [
      { occupation_id: "medical_ai_pm", canonical_name: "医学 AI 产品经理", basis: "LIMEN 编辑性对应：临床场景需求与医学 AI 产品定义直接相关。" },
      { occupation_id: "clinical_data_analyst", canonical_name: "临床数据分析师", basis: "LIMEN 编辑性对应：临床医学背景可直接进入临床数据治理与分析。" },
    ],
  },
  {
    id: "stomatology",
    name: "口腔医学",
    degree_category: "医学",
    tokens: ["口腔医学", "口腔"],
    likely_occupations: [
      { occupation_id: "medical_ai_pm", canonical_name: "医学 AI 产品经理", basis: "LIMEN 编辑性对应：口腔影像/诊疗流程的产品需求分析。" },
      { occupation_id: "clinical_data_analyst", canonical_name: "临床数据分析师", basis: "LIMEN 编辑性对应：口腔临床数据与随访数据。" },
    ],
  },
  {
    id: "nursing",
    name: "护理学",
    degree_category: "医学",
    tokens: ["护理学", "护理"],
    likely_occupations: [
      { occupation_id: "clinical_data_analyst", canonical_name: "临床数据分析师", basis: "LIMEN 编辑性对应：护理记录与临床数据质量工作。" },
      { occupation_id: "medical_ai_pm", canonical_name: "医学 AI 产品经理", basis: "LIMEN 编辑性对应：护理流程信息化与产品需求。" },
    ],
  },
  {
    id: "pharmacy",
    name: "药学",
    degree_category: "医学",
    tokens: ["药学", "临床药学"],
    likely_occupations: [
      { occupation_id: "clinical_data_analyst", canonical_name: "临床数据分析师", basis: "LIMEN 编辑性对应：用药与真实世界数据分析。" },
      { occupation_id: "medical_ml_engineer", canonical_name: "医学机器学习工程师", basis: "LIMEN 编辑性对应：药物/分子数据建模。" },
    ],
  },
  {
    id: "medical_technology",
    name: "医学技术类",
    degree_category: "医学",
    tokens: ["医学技术", "医学检验", "医学影像技术", "康复治疗", "检验技术"],
    likely_occupations: [
      { occupation_id: "medical_ml_engineer", canonical_name: "医学机器学习工程师", basis: "LIMEN 编辑性对应：影像/信号/检验数据的模型与工程。" },
      { occupation_id: "clinical_data_analyst", canonical_name: "临床数据分析师", basis: "LIMEN 编辑性对应：检验与影像数据治理。" },
    ],
  },
  {
    id: "preventive_medicine",
    name: "预防医学",
    degree_category: "医学",
    tokens: ["预防医学", "公共卫生"],
    likely_occupations: [
      { occupation_id: "clinical_data_analyst", canonical_name: "临床数据分析师", basis: "LIMEN 编辑性对应：队列与公共卫生统计。" },
      { occupation_id: "medical_ml_engineer", canonical_name: "医学机器学习工程师", basis: "LIMEN 编辑性对应：人群风险建模。" },
    ],
  },
  {
    id: "tcm",
    name: "中医学",
    degree_category: "医学",
    tokens: ["中医学", "针灸推拿"],
    likely_occupations: [
      { occupation_id: "medical_ai_pm", canonical_name: "医学 AI 产品经理", basis: "LIMEN 编辑性对应：中医诊疗流程信息化产品。" },
      { occupation_id: "clinical_data_analyst", canonical_name: "临床数据分析师", basis: "LIMEN 编辑性对应：中医临床数据整理。" },
    ],
  },
  {
    id: "integrated_tcm_western",
    name: "中西医临床医学",
    degree_category: "医学",
    tokens: ["中西医临床医学", "中西医结合"],
    likely_occupations: [
      { occupation_id: "medical_ai_pm", canonical_name: "医学 AI 产品经理", basis: "LIMEN 编辑性对应：中西医结合诊疗产品需求。" },
      { occupation_id: "clinical_data_analyst", canonical_name: "临床数据分析师", basis: "LIMEN 编辑性对应：中西医结合临床数据。" },
    ],
  },
  {
    id: "biomedical_engineering",
    name: "生物医学工程",
    degree_category: "工学",
    tokens: ["生物医学工程", "生物工程", "电子信息", "计算机", "理工科"],
    likely_occupations: [
      { occupation_id: "medical_ml_engineer", canonical_name: "医学机器学习工程师", basis: "LIMEN 编辑性对应：医工交叉的算法与工程实现。" },
      { occupation_id: "medical_ai_pm", canonical_name: "医学 AI 产品经理", basis: "LIMEN 编辑性对应：医疗设备/软件产品定义。" },
    ],
  },
];

/** 院校分层，来自 docs/testing/kb-school-list.md（T1/T2/T3/剔除）。 */
const SCHOOL_TIER: Record<string, "T1" | "T2" | "T3" | "excluded"> = {
  北京大学: "T1", 清华大学: "T1", 复旦大学: "T1", 上海交通大学: "T1", 浙江大学: "T1", 南京大学: "T1", 中国科学技术大学: "T1",
  中山大学: "T2", 华中科技大学: "T2", 四川大学: "T2", 西安交通大学: "T2", 哈尔滨工业大学: "T2", 武汉大学: "T2", 同济大学: "T2",
  东南大学: "T2", 天津大学: "T2", 北京航空航天大学: "T2", 南开大学: "T2", 厦门大学: "T2", 山东大学: "T2", 中南大学: "T2",
  吉林大学: "T2", 华东师范大学: "T2", 北京理工大学: "T2", 大连理工大学: "T2", 华南理工大学: "T2",
  首都医科大学: "T3", 南京医科大学: "T3", 南方医科大学: "T3", 哈尔滨医科大学: "T3", 中国医科大学: "T3", 重庆医科大学: "T3", 天津医科大学: "T3",
  石河子大学: "excluded", 深圳大学: "excluded", 上海理工大学: "excluded", 重庆邮电大学: "excluded", 桂林医科大学: "excluded",
};

const FIELD_LABELS: Record<string, string> = {
  occupation: "职业概述",
  tasks: "工作任务",
  work_activities: "工作活动",
  skills: "技能",
  knowledge: "知识",
  abilities: "能力",
  tools: "工具",
  technology: "技术",
  education: "学历要求",
  certification: "证书/执照",
  work_context: "工作环境",
  work_styles: "工作风格",
  interests: "兴趣",
  job_zone: "Job Zone",
  role_summary: "角色概述",
  admission_requirements: "报考条件",
  cross_major_restrictions: "跨专业限制",
  exam_subjects: "初试科目",
  personal_eligibility: "个人报考资格",
  tuition: "学费",
  college_retest_rules: "复试规则",
  program: "专业/项目",
  institution: "院校",
  registration_window: "报名时间",
  career_path: "职业路径",
  employer: "雇主/去向",
  job_title: "岗位名称",
  responsibilities: "岗位职责",
  requirements: "任职要求",
  salary_statistics: "薪资统计",
  statistical_definition: "统计口径",
  coverage_limit: "覆盖范围",
  topics: "课程主题",
  training: "培养目标",
  learning_hours: "学分/学时",
  industry_context: "行业背景",
  employment_outlook: "就业前景",
  compensation: "薪酬",
  skills_required: "技能要求",
  duties: "职责",
  technical_requirements: "技术要求",
  major_restrictions: "专业限制",
  experience: "经验要求",
  occupation_definition: "职业定义",
  employment_directions: "就业去向",
  program_definition: "项目/专业定义",
  employment_statistics: "就业统计",
  access_requirement: "准入要求",
  policy_requirement: "政策要求",
  departments: "科室/院系",
  policy_goals: "政策目标",
  city: "城市",
  major_catalog: "专业目录",
  job_type: "岗位类型",
  design_constraints: "设计约束",
  scope: "适用范围",
  materials: "材料",
  china_legal_requirement: "中国法规要求",
  regional_limit: "地域限制",
  research_project: "研究项目",
  salary: "薪资",
  prerequisites: "先修要求",
  privacy_requirements: "隐私要求",
  preferred_background: "优先背景",
  governance_scope: "治理范围",
  resource_title: "资源标题",
};

function loadEntries(): LoadedEntry[] {
  const files = readdirSync(KNOWLEDGE_DIR).filter((f) => f.endsWith(".manifest.json"));
  const out: LoadedEntry[] = [];
  const seen = new Set<string>();
  for (const file of files) {
    const arr = JSON.parse(readFileSync(join(KNOWLEDGE_DIR, file), "utf8")) as ManifestEntry[];
    for (const entry of arr) {
      // 同一条记录可能被多个清单重复收录，按 record+source 去重，避免院校/事实计数翻倍。
      const key = `${entry.record.id}::${entry.source.id}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ ...entry, manifest: file });
    }
  }
  return out;
}

function loadAliases(): {
  aliases: Record<string, { canonical_name: string; knowledge_role_ids: string[]; basis: string }>;
  unmapped_knowledge_roles: string[];
} {
  return JSON.parse(readFileSync(join(KNOWLEDGE_DIR, "role-aliases.json"), "utf8"));
}

function quoteOf(ex: ExtractItem): string {
  return (ex.pattern ?? ex.quote ?? ex.value ?? "").replace(/\s+/g, " ").trim();
}

// ---------------------------------------------------------------------------
// P0: pathway map
// ---------------------------------------------------------------------------

type Verdict = "direct" | "conditional" | "restricted" | "unknown";
type Kind = "allowed_list" | "deny" | "allow_scope" | "conditional" | "vague";

type Classified = { verdict: Verdict; kind: Kind; rule: string; clause: string };

function clausesOf(text: string): string[] {
  return text
    .split(/[。；;\n]/)
    .map((s) => s.replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

function majorNamedIn(text: string, major: Major): boolean {
  // 「中西医临床医学」里的「临床医学」不算临床医学专业
  if (major.id === "clinical_medicine") return /(?<!中西医)临床医学|(?<!中)西医临床/.test(text);
  return major.tokens.some((t) => text.includes(t));
}

function allowedMajorsIn(text: string): Major[] {
  return MAJORS.filter((m) => majorNamedIn(text, m));
}

function classifyClause(clause: string, major: Major): Classified | null {
  // 个人状态类限制（已获规培证、服务期内、订单定向等）不是本科专业限制，不参与专业可报判定。
  if (/(已获得[^。；]{0,20}(合格证书|规培)|住院医师规范化培训合格证书|服务期内|订单定向|履约期|定向免费医学生)/.test(clause)) return null;

  // 拆分后残留的孤立短句（如「不得跨专业报考」来自上文的同等学力条款）不足以判定专业限制。
  if (clause.length < 14 && /(不得|不能)/.test(clause)) return null;

  // 同等学力考生的加试/限制不适用于普通本科应届/往届考生，除非同时给出专业白名单。
  if (clause.includes("同等学力") && !/(只接受|只接收|只招收|仅限)/.test(clause)) return null;
  if (/(三年级及以下|非定向就业|定向就业|少数民族)/.test(clause) && !/(跨专业|跨学科|只接受|只接收)/.test(clause)) return null;

  // 模糊条款：说“部分专业不接受…详见目录”，无法据此判定 ✓/✗
  if (/(部分专业|详见|由.{0,6}(院系|学院).{0,12}确定)/.test(clause) && !/(只接受|只接收|只招收|仅限)/.test(clause)) {
    return { verdict: "unknown", kind: "vague", rule: "原文为概括性条款，需逐专业查目录/院系细则", clause };
  }

  // 白名单：只接受/只接收/只招收/仅限 + 专业名
  const allowListMatch = clause.match(/(?:只接受|只接收|只招收|仅限)([^。；]*)/);
  if (allowListMatch) {
    const scope = allowListMatch[1] ?? "";
    const allowed = allowedMajorsIn(scope);
    const medicalGate = /医学门类|医学学科门类/.test(scope);
    if (allowed.length === 0 && !medicalGate) {
      return { verdict: "unknown", kind: "vague", rule: "白名单条款未点名可报专业，需查目录", clause };
    }
    const ok = allowed.includes(major) || (medicalGate && major.degree_category === "医学");
    return {
      verdict: ok ? "direct" : "restricted",
      kind: "allowed_list",
      rule: ok ? `原文白名单包含「${major.name}」` : `原文白名单不含「${major.name}」`,
      clause,
    };
  }

  // 应为/须为 … 专业（等价白名单）
  const shouldBe = clause.match(/(?:一般应为|应为|须为|必须为)([^。；]{0,80}?(?:专业|门类))/);
  if (shouldBe) {
    const scope = shouldBe[1] ?? "";
    const allowed = allowedMajorsIn(scope);
    const medicalGate = /医学门类/.test(scope);
    if (allowed.length > 0 || medicalGate) {
      const ok = allowed.includes(major) || (medicalGate && major.degree_category === "医学");
      return {
        verdict: ok ? "direct" : "restricted",
        kind: "allowed_list",
        rule: ok ? `原文要求/允许「${major.name}」` : `原文要求仅限特定专业，「${major.name}」不在其中`,
        clause,
      };
    }
  }

  // 明确允许跨考的口径
  if (/(可以跨学科报考|可跨学科报考|可以跨专业报考|可跨专业报考|接受跨专业|接受跨学科|不限专业|均可报考)/.test(clause)) {
    const scopeMatch = clause.match(/(?:可以?跨学科报考|可以?跨专业报考)的?专业[:：]?([^。；]*)/);
    const scope = scopeMatch?.[1] ?? clause;
    const sciTech = /理工科|工科/.test(scope);
    const medicine = /医学/.test(scope) && !sciTech;
    const unrestricted = /不限|均可|所有专业/.test(scope);
    if (unrestricted) return { verdict: "direct", kind: "allow_scope", rule: "原文写明不限/均可跨考", clause };
    const ok = (!sciTech && !medicine) || (sciTech && major.degree_category === "工学") || (medicine && major.degree_category === "医学");
    if (sciTech || medicine) {
      return {
        verdict: ok ? "direct" : "restricted",
        kind: "allow_scope",
        rule: ok ? "原文允许的跨考范围包含该专业" : "原文把跨考限定在另一门类，该专业不在范围内",
        clause,
      };
    }
  }

  // 明确禁止
  if (/(不接受|不接收|不招收|不得报考|不得跨专业|不得跨学科|不能报考)/.test(clause)) {
    const named = majorNamedIn(clause, major);
    return {
      verdict: "restricted",
      kind: "deny",
      rule: named ? `原文明确限制「${major.name}」` : "原文明确不接受跨专业/跨学科报考",
      clause,
    };
  }

  // 只能选报目录备注注明招收的专业
  if (/只能选报/.test(clause)) {
    return { verdict: "conditional", kind: "conditional", rule: "仅可报目录备注注明招收的专业，需逐专业核对", clause };
  }

  // 附加条件
  if (/(加试|补修|相近|相关专业|相同或相近|须符合|原则上|审核通过|相关或相近)/.test(clause)) {
    return { verdict: "conditional", kind: "conditional", rule: "原文要求专业相近或加试/补修/审核等附加条件", clause };
  }

  return null;
}

function classifyQuote(quote: string, major: Major): Classified[] {
  const out: Classified[] = [];
  for (const clause of clausesOf(quote)) {
    const c = classifyClause(clause, major);
    if (c) out.push(c);
  }
  return out;
}

type PathEvidence = {
  record_id: string;
  source_url: string;
  source_title: string;
  quote: string;
  field: string;
  published_at: string | null;
  applicability: string | null;
};

/** kb-school-list §三 的目标专业代码 + 医学门类一级学科代码。 */
const PROGRAM_CODES = [
  "085409", "1051", "1052", "1057", "1010", "1058", "0831", "0777", "0854", "0812", "1405",
  "1001", "1002", "1003", "1004", "1005", "1006", "1007", "1008", "1009",
];

function codesIn(text: string): string[] {
  if (!text) return [];
  const found: string[] = [];
  const sorted = [...PROGRAM_CODES].sort((a, b) => b.length - a.length);
  let rest = text;
  for (const code of sorted) {
    const re = new RegExp(`(?:^|[^0-9])${code}(?![0-9])`, "g");
    if (re.test(rest)) found.push(code);
    rest = rest.replace(re, (m) => " ".repeat(m.length));
  }
  return found;
}

function quoteOfAll(entry: LoadedEntry): string {
  return (entry.extracts ?? []).map(quoteOf).join(" \n");
}

function labelForCode(code: string, entries: LoadedEntry[]): string {
  const text = entries.map(quoteOfAll).join(" \n");
  const re1 = new RegExp(`([\\u4e00-\\u9fa5]{2,10}(?:专业学位|学术学位))[（(][^）)]{0,16}${code}`);
  const m1 = text.match(re1);
  if (m1) return m1[1];
  const re2 = new RegExp(`([\\u4e00-\\u9fa5]{2,10}(?:专业学位|学术学位|专业))[^。；\\n]{0,12}${code}`);
  const m2 = text.match(re2);
  if (m2) return m2[1];
  const after = text.slice(text.indexOf(code) + code.length, text.indexOf(code) + code.length + 12);
  const degree = after.match(/(专业学位|学术学位)/);
  return degree ? `${degree[1]}（代码 ${code}）` : `招生项目（代码 ${code}）`;
}

function buildPathway() {
  const entries = loadEntries().filter((e) => e.record.category === "admissions");
  const aliases = loadAliases();
  const appRoleByKnowledgeRole = new Map<string, string[]>();
  for (const [appRole, spec] of Object.entries(aliases.aliases)) {
    for (const k of spec.knowledge_role_ids) {
      const list = appRoleByKnowledgeRole.get(k) ?? [];
      list.push(appRole);
      appRoleByKnowledgeRole.set(k, list);
    }
  }
  const appRoleName = new Map(Object.entries(aliases.aliases).map(([id, s]) => [id, s.canonical_name]));

  // 分组：院校 + 项目（无项目则全校章程）
  type Group = {
    institution: string;
    program: string | null;
    college: string | null;
    entries: LoadedEntry[];
  };
  const groups = new Map<string, Group>();
  for (const e of entries) {
    const inst = e.record.context?.institution;
    if (!inst) continue;
    const program = e.record.context?.program ?? null;
    const college = e.record.context?.college ?? null;
    const key = `${inst}::${program ?? "__school__"}`;
    const g = groups.get(key) ?? { institution: inst, program, college, entries: [] };
    g.entries.push(e);
    groups.set(key, g);
  }

  // 一个项目的记录里常同时写多个专业代码（如「临床医学/口腔医学/中医 专业学位」）。
  // 为了让每条路径只对应一个真实项目，按代码拆分成子路径，并用代码过滤条款。
  type PathGroup = Group & {
    code: string | null;
    label: string | null;
    facts: Array<{ entry: LoadedEntry; quote: string; field: string }>;
  };
  const pathGroups: PathGroup[] = [];
  for (const g of groups.values()) {
    const programCodes = codesIn(g.program ?? "");
    const variantCodes = programCodes.length > 0 ? programCodes : [...new Set(g.entries.flatMap((e) => codesIn(quoteOfAll(e))))];
    const variants: Array<{ code: string | null; label: string | null }> =
      variantCodes.length === 0
        ? [{ code: null, label: g.program }]
        : variantCodes.map((code) => ({
            code,
            label: programCodes.length > 0 && programCodes.length === 1 ? g.program : labelForCode(code, g.entries),
          }));

    for (const variant of variants) {
      const facts: Array<{ entry: LoadedEntry; quote: string; field: string }> = [];
      for (const entry of g.entries) {
        for (const ex of entry.extracts ?? []) {
          const q = quoteOf(ex);
          if (!q) continue;
          if (!["cross_major_restrictions", "admission_requirements", "program", "exam_subjects"].includes(ex.field)) continue;
          const clauses = clausesOf(q);
          // 子条款（如 ②精神病与精神卫生学）不带代码时，继承上一条带代码条款的项目归属。
          let inherited: string[] = [];
          const kept: string[] = [];
          for (const clause of clauses) {
            const own = codesIn(clause);
            if (own.length > 0) inherited = own;
            const effective = own.length > 0 ? own : inherited;
            if (!variant.code || effective.length === 0 || effective.includes(variant.code)) kept.push(clause);
          }
          if (kept.length === 0) continue;
          facts.push({ entry, quote: kept.join("；"), field: ex.field });
        }
      }
      if (facts.length === 0 && variant.code !== null && programCodes.length === 0) continue;
      pathGroups.push({ ...g, code: variant.code, label: variant.label, facts });
    }
  }

  const majors = MAJORS.map((major) => {
    const paths: unknown[] = [];
    for (const g of pathGroups) {
      const facts = g.facts;

      const verdicts: Classified[] = [];
      const evidence: PathEvidence[] = [];
      for (const f of facts) {
        for (const c of classifyQuote(f.quote, major)) {
          verdicts.push(c);
          evidence.push({
            record_id: f.entry.record.id,
            source_url: f.entry.source.url,
            source_title: f.entry.source.title ?? f.entry.record.title,
            quote: f.quote,
            field: f.field,
            published_at: f.entry.source.published_at ?? null,
            applicability: f.entry.record.applicability ?? null,
          });
        }
      }

      const strong = verdicts.filter((v) => v.kind !== "conditional" && v.kind !== "vague");
      if (
        process.env.DEBUG_PATHWAY &&
        process.env.DEBUG_PATHWAY === `${g.institution}|${major.name}|${g.code ?? "none"}`
      ) {
        console.log(`DEBUG ${major.name} @ ${g.institution} ${g.code} ${g.label}:`);
        for (const v of verdicts) console.log(`  ${v.verdict} [${v.kind}] ${v.rule} :: ${v.clause.slice(0, 120)}`);
      }
      let eligibility: Verdict = "unknown";
      let rule = "未取得针对该本科专业的可判定原文条款";
      if (strong.length > 0) {
        const set = new Set(strong.map((v) => v.verdict));
        if (set.size === 1) eligibility = strong[0].verdict;
        else {
          eligibility = "unknown";
          rule = "原文条款之间对该专业的结论不一致，需人工复核";
        }
      } else {
        const cond = verdicts.filter((v) => v.kind === "conditional");
        if (cond.length > 0) eligibility = "conditional";
        else if (verdicts.length > 0) rule = "原文存在概括性条款，未给出可判定结论";
      }
      if (eligibility !== "unknown") {
        const support = verdicts.find((v) => v.verdict === eligibility);
        if (support) rule = support.rule;
      }

      // 只保留与最终结论一致（或未知时全部相关）的证据，并去重
      const seen = new Set<string>();
      const ev = evidence.filter((e) => {
        const key = `${e.record_id}::${e.quote.slice(0, 80)}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      }).slice(0, 3);

      const admissionYear = Math.max(
        0,
        ...g.entries.map((e) => Number(e.record.context?.admission_year ?? 0)).filter((n) => Number.isFinite(n)),
      );
      const programCode = g.code ?? g.program?.match(/\d{4,6}/)?.[0] ?? null;
      const targetProgram =
        g.code && g.label && g.label !== g.program
          ? `${g.code} ${g.label}`
          : g.program ?? "全校招生章程（未限定专业）";
      const roleIds = [...new Set(g.entries.map((e) => e.record.role_id))];
      const mappedOcc = [...new Set(roleIds.flatMap((r) => appRoleByKnowledgeRole.get(r) ?? []))];
      const occIds = mappedOcc.length > 0 ? mappedOcc : major.likely_occupations.map((o) => o.occupation_id);
      const examSubjects = g.entries
        .flatMap((e) => (e.extracts ?? []).filter((x) => x.field === "exam_subjects").map((x) => ({ quote: quoteOf(x), record_id: e.record.id, source_url: e.source.url })))
        .filter((x) => x.quote);

      paths.push({
        target_school: g.institution,
        target_program: targetProgram,
        program_code: programCode,
        admission_year: admissionYear || null,
        school_tier: SCHOOL_TIER[g.institution] ?? "unlisted",
        eligibility,
        eligibility_rule: rule,
        eligibility_evidence: eligibility === "unknown" && ev.length === 0 ? [] : ev,
        occupation_ids: occIds,
        occupation_basis:
          mappedOcc.length > 0
            ? `该路径的招生事实记录挂载角色 ${roleIds.join(" / ")}，经 role-aliases.json 映射到 App 职业 ${mappedOcc.map((id) => `${id}（${appRoleName.get(id)}）`).join("、")}；映射为 LIMEN 编辑性对应。`
            : `该路径的招生记录挂载角色 ${roleIds.join(" / ")} 未映射到 App 职业，occupation_ids 由「本科专业 → 职业」的 LIMEN 编辑映射补齐，不代表该条招生事实本身的结论。`,
        exam_subjects: examSubjects,
        source_record_count: g.entries.length,
        source_manifests: [...new Set(g.entries.map((e) => e.manifest))],
      });
    }

    // 按院校分层 + 校名排序
    const tierRank: Record<string, number> = { T1: 0, T2: 1, T3: 2, excluded: 3, unlisted: 4 };
    paths.sort((a, b) => {
      const pa = a as { school_tier: string; target_school: string; target_program: string };
      const pb = b as { school_tier: string; target_school: string; target_program: string };
      return (
        (tierRank[pa.school_tier] ?? 9) - (tierRank[pb.school_tier] ?? 9) ||
        pa.target_school.localeCompare(pb.target_school, "zh-Hans-CN") ||
        pa.target_program.localeCompare(pb.target_program, "zh-Hans-CN")
      );
    });

    return {
      id: major.id,
      name: major.name,
      degree_category: major.degree_category,
      likely_occupations: major.likely_occupations,
      path_count: paths.length,
      eligibility_summary: (paths as Array<{ eligibility: Verdict }>).reduce<Record<string, number>>((acc, p) => {
        acc[p.eligibility] = (acc[p.eligibility] ?? 0) + 1;
        return acc;
      }, {}),
      paths,
    };
  });

  return {
    schema_version: "pathway-1",
    generated_at: new Date().toISOString(),
    note:
      "LIMEN 编辑性路径映射，依据是 admissions 类事实的原文条款，不是官方结论。eligibility 只由原文可判定条款推导：direct=原文白名单/允许范围包含该专业，conditional=可报但需加试/补修/相近专业审核等附加条件，restricted=原文白名单或禁止条款排除该专业，unknown=未取得可判定条款或条款互相冲突。没有原文即 unknown。",
    eligibility_rules: [
      "只接受/只接收/只招收/仅限 + 专业白名单：白名单含该专业→direct，不含→restricted。",
      "一般应为/应为/须为 … 专业：按白名单处理。",
      "可跨学科报考…理工科/医学：仅该门类→direct，其他门类→restricted。",
      "不接受/不接收/不得跨专业/跨学科：restricted。",
      "加试/补修/相近/审核/只能选报目录注明专业：conditional。",
      "部分专业/详见目录/由院系确定：unknown（需人工复核）。",
      "同等学力考生的加试条款不适用于普通本科考生，不参与判定。",
    ],
    major_occupation_basis:
      "likely_occupations 是 LIMEN 编辑性对应（本科专业→App 当前 3 个职业），不是官方职业分类；paths[].occupation_ids 则由该路径 admissions 记录的 role_id 经 role-aliases.json 机械映射，两者可交叉核对。",
    school_tiers_source: "docs/testing/kb-school-list.md",
    admission_record_count: entries.length,
    majors,
  };
}

// ---------------------------------------------------------------------------
// P1: school index
// ---------------------------------------------------------------------------

function buildSchoolIndex() {
  const entries = loadEntries();
  const aliases = loadAliases();
  const appRoleByKnowledgeRole = new Map<string, string[]>();
  for (const [appRole, spec] of Object.entries(aliases.aliases)) {
    for (const k of spec.knowledge_role_ids) {
      const list = appRoleByKnowledgeRole.get(k) ?? [];
      list.push(appRole);
      appRoleByKnowledgeRole.set(k, list);
    }
  }

  const bySchool = new Map<string, LoadedEntry[]>();
  for (const e of entries) {
    const inst = e.record.context?.institution;
    if (!inst) continue;
    const list = bySchool.get(inst) ?? [];
    list.push(e);
    bySchool.set(inst, list);
  }

  const schools = [...bySchool.entries()]
    .map(([institution, list]) => {
      const byCategory: Record<string, number> = {};
      const programs = new Set<string>();
      const recordIds = new Set<string>();
      let factCount = 0;
      const records = list.map((e) => {
        recordIds.add(e.record.id);
        if (e.record.context?.program) programs.add(e.record.context.program);
        byCategory[e.record.category] = (byCategory[e.record.category] ?? 0) + 1;
        const facts = (e.extracts ?? []).map((x) => ({ field: x.field, quote: quoteOf(x) })).filter((f) => f.quote);
        factCount += facts.length;
        return {
          record_id: e.record.id,
          title: e.record.title,
          category: e.record.category,
          knowledge_role_id: e.record.role_id,
          app_occupation_ids: appRoleByKnowledgeRole.get(e.record.role_id) ?? [],
          program: e.record.context?.program ?? null,
          admission_year: e.record.context?.admission_year ?? null,
          source_id: e.source.id,
          source_url: e.source.url,
          source_organization: e.source.organization,
          source_title: e.source.title ?? null,
          published_at: e.source.published_at ?? null,
          facts,
        };
      });
      const sources = new Map<string, { id: string; organization: string; title: string | null; url: string; published_at: string | null }>();
      for (const e of list) {
        sources.set(e.source.id, {
          id: e.source.id,
          organization: e.source.organization,
          title: e.source.title ?? null,
          url: e.source.url,
          published_at: e.source.published_at ?? null,
        });
      }
      const occupancy = new Set<string>();
      for (const e of list) for (const id of appRoleByKnowledgeRole.get(e.record.role_id) ?? []) occupancy.add(id);
      return {
        institution,
        tier: SCHOOL_TIER[institution] ?? "unlisted",
        in_scope: SCHOOL_TIER[institution] !== "excluded",
        programs: [...programs],
        counts: {
          records: recordIds.size,
          facts: factCount,
          sources: sources.size,
          by_category: Object.fromEntries(CATEGORIES.map((c) => [c, byCategory[c] ?? 0])),
          by_app_occupation: Object.fromEntries([...occupancy].map((id) => [id, list.filter((e) => (appRoleByKnowledgeRole.get(e.record.role_id) ?? []).includes(id)).length])),
        },
        sources: [...sources.values()],
        records,
      };
    })
    .sort((a, b) => {
      const rank: Record<string, number> = { T1: 0, T2: 1, T3: 2, excluded: 3, unlisted: 4 };
      return (rank[a.tier] ?? 9) - (rank[b.tier] ?? 9) || a.institution.localeCompare(b.institution, "zh-Hans-CN");
    });

  return {
    schema_version: "school-index-1",
    generated_at: new Date().toISOString(),
    note:
      "按院校聚合的知识库索引。records[].source_url 为该条事实实际抓取页；facts[].quote 为可逐字核验原文。counts.by_category 按记录数统计（一条记录可能含多条事实）。tier 来自 docs/testing/kb-school-list.md。",
    total: {
      schools: schools.length,
      schools_in_scope: schools.filter((s) => s.in_scope).length,
      records: new Set(entries.filter((e) => e.record.context?.institution).map((e) => e.record.id)).size,
      facts: schools.reduce((n, s) => n + s.counts.facts, 0),
    },
    schools,
  };
}

// ---------------------------------------------------------------------------
// P2: field coverage
// ---------------------------------------------------------------------------

type CoverageRole = {
  role_id: string;
  canonical_name: string;
  mapped_app_role: string | null;
  counts: { total: number; by_category: Record<string, number> };
  coverage: { fields_total: number; fields_with_value: number; fields_missing: number };
  matrix: Record<string, Record<string, { present: boolean; count: number }>>;
  missing_fields: string[];
};

const FIELD_KEY = /^[a-z][a-z0-9_]{1,48}$/;

/** 采集器偶尔把缺口说明写进 field（如 access_requirement（未列…）），归一回基础字段名。 */
function normalizeField(raw: string): { field: string; malformed: boolean } {
  const base = raw.replace(/[（(].*$/, "").trim();
  if (FIELD_KEY.test(base)) return { field: base, malformed: base !== raw.trim() };
  return { field: raw.trim(), malformed: true };
}

function buildFieldCoverage() {
  const entries = loadEntries();
  const malformed = new Map<string, number>();
  const noteMalformed = (raw: string) => malformed.set(raw, (malformed.get(raw) ?? 0) + 1);

  // 期望字段：各记录 expected_fields 的并集，按 category 汇总（只保留合法 snake_case 字段）
  const expectedByCategory: Record<string, string[]> = {};
  for (const e of entries) {
    const cat = e.record.category;
    if (!(cat in expectedByCategory)) expectedByCategory[cat] = [];
    for (const f of e.expected_fields ?? []) {
      const n = normalizeField(f);
      if (n.malformed || !FIELD_KEY.test(n.field)) {
        noteMalformed(f);
        continue;
      }
      if (!expectedByCategory[cat].includes(n.field)) expectedByCategory[cat].push(n.field);
    }
  }

  const roles: Record<string, CoverageRole> = {};

  function addRole(roleId: string, canonicalName: string, mappedAppRole: string | null, rawFacts: Array<{ category: string; field: string }>) {
    const facts: Array<{ category: string; field: string }> = [];
    for (const f of rawFacts) {
      const n = normalizeField(f.field);
      if (n.malformed && !FIELD_KEY.test(n.field)) {
        noteMalformed(f.field);
        continue;
      }
      facts.push({ category: f.category, field: n.field });
    }
    const matrix: CoverageRole["matrix"] = {};
    const countsByCategory: Record<string, number> = {};
    for (const cat of CATEGORIES) {
      const fields = new Set<string>([
        ...facts.filter((f) => f.category === cat).map((f) => f.field),
        ...(expectedByCategory[cat] ?? []),
      ]);
      matrix[cat] = {};
      for (const field of [...fields].sort((a, b) => a.localeCompare(b))) {
        const count = facts.filter((f) => f.category === cat && f.field === field).length;
        matrix[cat][field] = { present: count > 0, count };
      }
      countsByCategory[cat] = facts.filter((f) => f.category === cat).length;
    }
    const missing: string[] = [];
    for (const cat of CATEGORIES) for (const [field, v] of Object.entries(matrix[cat])) if (!v.present) missing.push(`${cat}.${field}`);
    const allFields = new Set<string>();
    for (const cat of CATEGORIES) for (const f of Object.keys(matrix[cat])) allFields.add(f);
    const presentFields = [...allFields].filter((f) => CATEGORIES.some((c) => matrix[c][f]?.present));
    roles[roleId] = {
      role_id: roleId,
      canonical_name: canonicalName,
      mapped_app_role: mappedAppRole,
      counts: { total: facts.length, by_category: countsByCategory },
      coverage: { fields_total: allFields.size, fields_with_value: presentFields.length, fields_missing: allFields.size - presentFields.length },
      matrix,
      missing_fields: missing,
    };
  }

  // App 职业：直接从 manifests 按 aliases 聚合（与 build-role-index 同口径去重），
  // 这样 role-index 尚未重跑时覆盖矩阵也不会滞后。
  const aliases = loadAliases();
  for (const [appRole, spec] of Object.entries(aliases.aliases)) {
    const facts: Array<{ category: string; field: string }> = [];
    const seen = new Set<string>();
    for (const kr of spec.knowledge_role_ids) {
      for (const e of entries) {
        if (e.record.role_id !== kr) continue;
        for (const x of e.extracts ?? []) {
          const q = quoteOf(x);
          if (!q) continue;
          const key = `${e.record.id}::${x.field}::${q.slice(0, 60)}`;
          if (seen.has(key)) continue;
          seen.add(key);
          facts.push({ category: e.record.category, field: x.field });
        }
      }
    }
    addRole(appRole, spec.canonical_name, appRole, facts);
  }

  // 未映射知识角色：直接从 manifests 聚合
  for (const kr of aliases.unmapped_knowledge_roles) {
    const facts: Array<{ category: string; field: string }> = [];
    for (const e of entries) {
      if (e.record.role_id !== kr) continue;
      for (const x of e.extracts ?? []) if (quoteOf(x)) facts.push({ category: e.record.category, field: x.field });
    }
    addRole(kr, kr, null, facts);
  }

  return {
    schema_version: "field-coverage-1",
    generated_at: new Date().toISOString(),
    note:
      "每个职业 × category × field 的有值/缺值矩阵。present=true 表示该职业在该 category 至少有一条该 field 的事实。missing_fields 含 expected_fields 中从未采集到的字段（真实缺口）。malformed_fields 是采集器写进 field 的缺口说明或非 snake_case 名称，已归一/剔除，不进入矩阵。",
    category_order: CATEGORIES,
    field_labels: FIELD_LABELS,
    malformed_fields: [...malformed.entries()].sort((a, b) => b[1] - a[1]).map(([raw, count]) => ({ raw, count })),
    roles,
  };
}

function coverageMarkdown(cov: ReturnType<typeof buildFieldCoverage>): string {
  const catLabel: Record<string, string> = {
    occupation: "职业",
    admissions: "招生",
    recruitment: "招聘",
    industry: "行业",
    learning: "学习",
  };
  const roleEntries = Object.entries(cov.roles);
  const lines: string[] = [];
  lines.push("# 知识库字段完整度矩阵");
  lines.push("");
  lines.push(`> 生成时间：${cov.generated_at}。机器可读版本：\`data/knowledge/field-coverage.json\`。`);
  lines.push(">");
  lines.push("> 说明：`✓ n` 表示该职业在该类别下有 n 条该字段事实；`—` 表示缺值。缺值分两种：");
  lines.push("> 1) **应有但未采到**：来自各记录的 `expected_fields`（例如 `tuition`、`college_retest_rules`）；");
  lines.push("> 2) **本类目本就不适用**：该类别本来不会出现的字段（例如招聘类不产 `exam_subjects`），按缺值显示但不算采集失败。");
  lines.push("");
  lines.push("## 总览");
  lines.push("");
  lines.push("| 职业 id | 名称 | 映射到 App 职业 | 事实总数 | 职业 | 招生 | 招聘 | 行业 | 学习 | 字段有值/总数 | 缺失字段数 |");
  lines.push("| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |");
  for (const [id, r] of roleEntries) {
    const c = r.counts.by_category;
    lines.push(
      `| \`${id}\` | ${r.canonical_name} | ${r.mapped_app_role ? "是" : "否（未映射）"} | ${r.counts.total} | ${c.occupation ?? 0} | ${c.admissions ?? 0} | ${c.recruitment ?? 0} | ${c.industry ?? 0} | ${c.learning ?? 0} | ${r.coverage.fields_with_value}/${r.coverage.fields_total} | ${r.coverage.fields_missing} |`,
    );
  }
  lines.push("");
  for (const [id, r] of roleEntries) {
    const fields = new Set<string>();
    for (const cat of cov.category_order) for (const f of Object.keys(r.matrix[cat] ?? {})) fields.add(f);
    lines.push(`## ${r.canonical_name}（\`${id}\`）`);
    lines.push("");
    lines.push(`事实总数 ${r.counts.total}；字段有值 ${r.coverage.fields_with_value}/${r.coverage.fields_total}，缺失 ${r.coverage.fields_missing}。`);
    lines.push("");
    lines.push(`| 字段 | 中文名 | ${cov.category_order.map((c) => catLabel[c]).join(" | ")} |`);
    lines.push(`| --- | --- | ${cov.category_order.map(() => "---").join(" | ")} |`);
    for (const f of [...fields].sort((a, b) => a.localeCompare(b))) {
      const cells = cov.category_order.map((cat) => {
        const cell = r.matrix[cat]?.[f];
        return cell?.present ? `✓ ${cell.count}` : "—";
      });
      lines.push(`| \`${f}\` | ${cov.field_labels[f] ?? "（未登记）"} | ${cells.join(" | ")} |`);
    }
    lines.push("");
    const realMissing = r.missing_fields.filter((m) => {
      const [cat, field] = m.split(".");
      return (cov.field_labels[field] ?? "") !== "" && (cov.category_order as readonly string[]).includes(cat);
    });
    lines.push(`<details><summary>缺值清单（${realMissing.length}）</summary>`);
    lines.push("");
    lines.push(realMissing.map((m) => `- \`${m}\``).join("\n"));
    lines.push("");
    lines.push("</details>");
    lines.push("");
  }

  lines.push("## 采集器字段名问题（已剔除，不进入矩阵）");
  lines.push("");
  if (!cov.malformed_fields.length) {
    lines.push("无。");
  } else {
    lines.push("以下 `field` 值不是 snake_case 字段名，而是采集器把「缺口说明」写进了字段位（或中文标签）。已归一为对应的基础字段或剔除；建议在下次采集时修正来源。");
    lines.push("");
    lines.push("| 原始 field 值 | 出现次数 |");
    lines.push("| --- | --- |");
    for (const m of cov.malformed_fields) lines.push(`| \`${m.raw}\` | ${m.count} |`);
  }
  lines.push("");
  return lines.join("\n");
}

// ---------------------------------------------------------------------------

function main() {
  const mode = process.argv[2] ?? "all";
  if (mode === "pathway" || mode === "all") {
    const pathway = buildPathway();
    const out = join(KNOWLEDGE_DIR, "pathway-map.json");
    writeFileSync(out, JSON.stringify(pathway, null, 2), "utf8");
    const totalPaths = pathway.majors.reduce((n, m) => n + m.paths.length, 0);
    console.log(`写入 ${out}`);
    console.log(`  ${pathway.majors.length} 个本科专业 / ${totalPaths} 条路径 / ${pathway.admission_record_count} 条招生记录`);
    for (const m of pathway.majors) console.log(`  ${m.name.padEnd(10)} ${String(m.path_count).padStart(3)} 条  ${JSON.stringify(m.eligibility_summary)}`);
  }

  if (mode === "all") {
    const schoolIndex = buildSchoolIndex();
    const outSchool = join(KNOWLEDGE_DIR, "school-index.json");
    writeFileSync(outSchool, JSON.stringify(schoolIndex, null, 2), "utf8");
    console.log(`写入 ${outSchool}（${schoolIndex.total.schools} 校 / ${schoolIndex.total.records} 记录 / ${schoolIndex.total.facts} 事实）`);

    const coverage = buildFieldCoverage();
    const outCov = join(KNOWLEDGE_DIR, "field-coverage.json");
    writeFileSync(outCov, JSON.stringify(coverage, null, 2), "utf8");
    const mdPath = "docs/testing/kb-field-coverage.md";
    writeFileSync(mdPath, coverageMarkdown(coverage), "utf8");
    console.log(`写入 ${outCov}`);
    console.log(`写入 ${mdPath}`);
  }
}

main();
