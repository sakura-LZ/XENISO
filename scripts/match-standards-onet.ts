// 从 O*NET 31.0 官方数据库文本表生成 LIMEN 岗位数值标准、技能交叉映射与技能量尺。
//
// 数据来源（只读，不联网、不调用大模型）：
//   work/onet-db/{Essential Skills,Transferable Skills,Career Interest Types,Level Scale Anchors,Content Model Reference}.txt
//   这些表由 work/onet-partial-extract.ts 用「ZIP 中央目录 + HTTP Range」从官方包
//   https://www.onetcenter.org/dl_files/database/db_31_0_text.zip 部分解压得到（整包 13MB，本机网络整包下载会超时）。
//
// 产物：
//   data/match/onet-crosswalk.json      9 个 LIMEN 技能 → O*NET Skill 元素（映射或显式 unmapped）
//   data/match/occupations.official.json 三个岗位的兴趣 OI / 技能 IM+LV / 不确定度
//   data/match/skill-rubric.json        9 技能 × 0–4 级可观察锚点（含官方 LV 锚点原文）
//
// 用法：npx tsx scripts/match-standards-onet.ts [--tables work/onet-db] [--at 2026-10-23]
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { areas } from "../src/lib/onet/contracts";
type Area = typeof areas[number];

const args = process.argv.slice(2);
const argOf = (name: string, fallback: string) => { const i = args.indexOf(name); return i >= 0 && args[i + 1] ? args[i + 1] : fallback; };
const TABLES = join(process.cwd(), argOf("--tables", "work/onet-db"));
const AT = argOf("--at", "2026-10-23");
const RETRIEVED_AT = `${AT}T00:00:00Z`;
const DB_URL = "https://www.onetcenter.org/database.html";
const ZIP_URL = "https://www.onetcenter.org/dl_files/database/db_31_0_text.zip";
const STANDARD_VERSION = `onet-31.0+limen-${AT}`;
const CROSSWALK_VERSION = `limen-onet-crosswalk-1+${AT}`;
const RUBRIC_VERSION = "limen-skills-2";

const skillLabels = {
  python: "Python 编程", statistics: "统计分析", machine_learning: "机器学习",
  clinical_reasoning: "临床问题理解", research_design: "研究设计", product_requirements: "产品需求分析",
  communication: "沟通表达", data_management: "数据管理", model_evaluation: "模型评价",
} as const;
type SkillId = keyof typeof skillLabels;

const levelLabels = ["未接触", "在指导下完成", "独立完成基础任务", "独立完成复杂任务", "指导与评审"] as const;

// 编辑性映射判定。direct = 元素语义与该技能基本一致；proxy = 语义更宽或更窄，只作代理；
// unmapped = O*NET 31.0 技能元素里没有对应项，宁可不映射，也不硬凑一个宽泛元素。
type Mapping = { element: { id: string; name: string; table: string } | null; strength: "direct" | "proxy" | "unmapped"; rationale: string };
const MAPPINGS: Record<SkillId, Mapping> = {
  python: { element: { id: "2.B.3.e", name: "Programming", table: "Transferable Skills" }, strength: "direct", rationale: "Writing computer programs for various purposes，与该技能同一含义。" },
  statistics: { element: { id: "2.A.1.e", name: "Mathematics", table: "Essential Skills" }, strength: "proxy", rationale: "O*NET 31.0 没有独立的「统计」技能元素；数学是统计推断的基础技能，故用 Mathematics 作代理，会同时覆盖不涉及统计的数学任务。" },
  machine_learning: { element: null, strength: "unmapped", rationale: "O*NET 31.0 的 35 个技能元素里没有机器学习项（最接近的 Programming 已用于 python，复用会让两项互相污染），因此不映射；该技能不进入岗位标准，也不进准备度分母。" },
  clinical_reasoning: { element: { id: "2.B.4.e", name: "Judgment and Decision Making", table: "Transferable Skills" }, strength: "proxy", rationale: "Considering the relative costs and benefits of potential actions，覆盖临床决策；不包含医学知识本身（那属于 Knowledge 域，不在本次技能标准内）。" },
  research_design: { element: { id: "2.A.1.f", name: "Science", table: "Essential Skills" }, strength: "proxy", rationale: "Using scientific rules and methods to solve problems，覆盖研究设计与科学方法；不区分临床研究与基础研究。" },
  product_requirements: { element: { id: "2.B.4.g", name: "Systems Analysis", table: "Transferable Skills" }, strength: "proxy", rationale: "Determining how a system should work and how changes in conditions will affect outcomes，覆盖需求分析与方案取舍；不等于产品管理全部职能。" },
  communication: { element: { id: "2.A.1.d", name: "Speaking", table: "Essential Skills" }, strength: "proxy", rationale: "只取口语表达这一个元素；写作(Writing)、倾听(Active Listening)是同族元素，若一并计入会让「沟通」在分母里重复占权。" },
  data_management: { element: null, strength: "unmapped", rationale: "O*NET 技能元素没有数据管理/数据治理项（Quality Control Analysis 指产品与服务检验，语义不符），故不映射。" },
  model_evaluation: { element: { id: "2.B.4.h", name: "Systems Evaluation", table: "Transferable Skills" }, strength: "proxy", rationale: "Identifying measures or indicators of system performance and the actions needed to improve or correct performance，覆盖模型评价与指标设计；不专门衡量机器学习模型。" },
};

type Row = { soc: string; element: string; name: string; scale: string; value: number; n: number | null; se: number | null; lower: number | null; upper: number | null; suppress: boolean; date: string | null };

function readTable(file: string): Row[] {
  const path = join(TABLES, file);
  if (!existsSync(path)) throw new Error(`缺少官方表 ${path}（先运行 work/onet-partial-extract.ts）`);
  const lines = readFileSync(path, "utf8").split(/\r?\n/);
  const header = lines[0].split("\t");
  const col = (name: string) => { const i = header.indexOf(name); if (i < 0) throw new Error(`${file} 缺少列 ${name}`); return i; };
  const cSoc = col("O*NET-SOC Code"), cEl = col("Element ID"), cName = col("Element Name"), cScale = col("Scale ID"), cVal = col("Data Value");
  const hasStat = header.includes("N");
  const cN = hasStat ? col("N") : -1, cSe = hasStat ? col("Standard Error") : -1, cLo = hasStat ? col("Lower CI Bound") : -1, cHi = hasStat ? col("Upper CI Bound") : -1, cSup = hasStat ? col("Recommend Suppress") : -1;
  const cDate = header.includes("Date") ? col("Date") : -1;
  const num = (v: string) => { const n = Number(v); return v.trim() === "" || !Number.isFinite(n) ? null : n; };
  const rows: Row[] = [];
  for (const line of lines.slice(1)) {
    if (!line.trim()) continue;
    const cells = line.split("\t");
    rows.push({
      soc: cells[cSoc], element: cells[cEl], name: cells[cName], scale: cells[cScale], value: Number(cells[cVal]),
      n: cN >= 0 ? num(cells[cN]) : null, se: cSe >= 0 ? num(cells[cSe]) : null,
      lower: cLo >= 0 ? num(cells[cLo]) : null, upper: cHi >= 0 ? num(cells[cHi]) : null,
      suppress: cSup >= 0 && cells[cSup].trim().toUpperCase() === "Y",
      date: cDate >= 0 ? (cells[cDate] || null) : null,
    });
  }
  return rows;
}

const skillRows = [...readTable("Essential Skills.txt"), ...readTable("Transferable Skills.txt")];
const interestRows = readTable("Career Interest Types.txt");

// Level Scale Anchors.txt 的列名与其他表不同，单独解析：Element ID / Element Name / Scale ID / Anchor Value / Anchor Description。
type Anchor = { element: string; name: string; scale: string; value: number; text: string };
function readAnchors(): Anchor[] {
  const path = join(TABLES, "Level Scale Anchors.txt");
  if (!existsSync(path)) throw new Error(`缺少官方表 ${path}`);
  const lines = readFileSync(path, "utf8").split(/\r?\n/);
  const header = lines[0].split("\t");
  const col = (name: string) => { const i = header.indexOf(name); if (i < 0) throw new Error(`Level Scale Anchors.txt 缺少列 ${name}`); return i; };
  const cEl = col("Element ID"), cName = col("Element Name"), cScale = col("Scale ID"), cVal = col("Anchor Value"), cText = col("Anchor Description");
  return lines.slice(1).filter(line => line.trim()).map(line => {
    const cells = line.split("\t");
    return { element: cells[cEl], name: cells[cName], scale: cells[cScale], value: Number(cells[cVal]), text: cells[cText] };
  });
}
const anchorRows = readAnchors();

const rowOf = (soc: string, element: string, scale: string) => skillRows.find(r => r.soc === soc && r.element === element && r.scale === scale);

// ---- 岗位 → 方向特化 → SOC（direct 优先，related 兜底）----
type Spec = { id: string; name: string; onet: { code: string; name: string; relationship: string }[]; work_tasks: string[] };
type DirectionGroup = { id: string; name: string; onet: { code: string; name: string; relationship: string }[]; onet_rationale?: string; specializations: Spec[] };
const directionMap = JSON.parse(readFileSync(join(process.cwd(), "data", "occupation_direction_map.json"), "utf8")) as { version: string; directions: DirectionGroup[]; direction_onet_note?: string };
// 临床（继续医学）方向存放在独立文件，由 src/lib/directions.ts 与方向映射合并；这里同样并入，保证「四大方向」口径一致。
const medicineGroup = JSON.parse(readFileSync(join(process.cwd(), "data", "medicine_direction.json"), "utf8")) as DirectionGroup;
const groups: DirectionGroup[] = [...directionMap.directions, medicineGroup];

// 岗位粒度：9 个跨学科特化 + 医学 = 10 个方向（每个特化独立出分）。
// 兴趣画像取该特化自己的候选 SOC（direct 优先，无 direct 时取 related）做等权平均；
// 技能取该特化自己的候选 SOC 中第一个可用分量。组级映射只作为兜底，不再做组内等权加权。
type Target = { id: string; name: string; group_id: string; onet: { code: string; name: string; relationship: string }[]; work_tasks: string[]; rationale: string | null };
const targets: Target[] = groups.flatMap(group => {
  const members = group.specializations.length ? group.specializations : [{ id: group.id, name: group.name, onet: [], work_tasks: [] }];
  return members.map(spec => ({
    id: spec.id, name: spec.name, group_id: group.id,
    onet: spec.onet.length ? spec.onet : group.onet,
    work_tasks: spec.work_tasks ?? [],
    rationale: group.onet_rationale ?? null,
  }));
});

// 每个方向一律尝试全部 9 个技能，未映射的跳过。
// 早期版本为每个岗位手挑 3 个技能，导致「未映射 1 个 → 只剩 2 项」的覆盖缺口，那是人为的，不是数据限制。
const DIRECTION_SKILLS: SkillId[] = Object.keys(skillLabels) as SkillId[];

const editorialEvidence = (locator: string) => ({ ref: `data/occupation_direction_map.json@${directionMap.version}`, source_kind: "editorial" as const, url: null, published_at: null, retrieved_at: RETRIEVED_AT, verification: "verified" as const, locator });
const officialEvidence = (locator: string) => ({ ref: "onet-31.0-database", source_kind: "official" as const, url: DB_URL, published_at: null, retrieved_at: RETRIEVED_AT, verification: "verified" as const, locator });

const round = (x: number) => Math.round(x);
const projectLevel = (lv: number) => Math.min(4, Math.max(0, round(lv / 7 * 4)));
const projectImportance = (im: number) => Math.min(5, Math.max(1, round(im)));

type SkillComponent = { spec_id: string; soc: string; relationship: string; weight: number; im: number; lv: number; n: number | null; se: number | null; suppressed: boolean };
type SkillAudit = { skill_id: SkillId; element: string; aggregation: "weighted-mean" | "single-soc"; components: SkillComponent[]; im: number; lv: number; suppressed: boolean; dropped: { spec_id: string; reason: string }[] };

const occupations: unknown[] = [];
const audits: Record<string, { skills: SkillAudit[]; unmapped: SkillId[]; soc_order: string[]; interest_soc: string; weighted_socs: string[]; interest_rationale: string | null }> = {};

const directOf = (target: Target) => target.onet.find(item => item.relationship === "direct") ?? target.onet[0];

for (const target of targets) {
  if (!target.onet?.length) throw new Error(`方向 ${target.id} 缺少 O*NET 映射`);
  const directionSoc = directOf(target);
  const socs = [...target.onet].sort((a, b) => (a.relationship === "direct" ? -1 : 0) - (b.relationship === "direct" ? -1 : 0)).map(o => o.code);
  const unmapped: SkillId[] = [];

  // 兴趣：该特化自己的候选 SOC（direct 优先、related 兜底）六维 OI 等权平均。
  // 这是编辑性聚合（O*NET 官方只发布单职业 OI），用于让共享同一 direct SOC 的特化（如器械/信号/影像）仍可区分；
  // 证据 locator 逐项写出每个 SOC 的原始 OI，读者可复核或推翻聚合。
  const interestRowsOf = (soc: string) => areas.map((area, index) => {
    const elementId = `1.B.1.${"abcdef"[index]}`;
    const row = interestRows.find(r => r.soc === soc && r.element === elementId && r.scale === "OI");
    if (!row) throw new Error(`${target.id}: ${soc} 缺少 ${area} 的 OI`);
    return row.value;
  });
  const perSoc = target.onet.map(item => ({ item, values: interestRowsOf(item.code) }));
  const scores = Object.fromEntries(areas.map((area, index) => [area, Math.round((perSoc.reduce((sum, entry) => sum + entry.values[index], 0) / perSoc.length) * 100) / 100])) as Record<Area, number>;
  const interestLocator = `O*NET 31.0 · Career Interest Types.txt · 方向特化 ${target.id}（${target.name}）的候选 SOC：${perSoc.map(({ item, values }) => `${item.code}（${item.relationship}）=${values.map((value, index) => `${areas[index]} ${value}`).join("/")}`).join("；")} · 六维在本特化 SOC 间**等权平均**（编辑性聚合，非 O*NET 官方合成）· 官方量尺 1.00–7.00 · 组级选点依据：${target.rationale ?? "由方向映射给出"}`;

  // 技能：取该特化自己的候选 SOC 中第一个可用分量（direct 优先、related 兜底），不再跨特化等权。
  const skillAudits: SkillAudit[] = [];
  const skills: unknown[] = [];
  for (const skillId of DIRECTION_SKILLS) {
    const mapping = MAPPINGS[skillId];
    if (!mapping.element) { unmapped.push(skillId); continue; }
    const components: SkillComponent[] = [];
    const dropped: { spec_id: string; reason: string }[] = [];
    for (const item of [...target.onet].sort((a, b) => (a.relationship === "direct" ? -1 : 0) - (b.relationship === "direct" ? -1 : 0))) {
      const im = rowOf(item.code, mapping.element.id, "IM"), lv = rowOf(item.code, mapping.element.id, "LV");
      if (!im || !lv) { dropped.push({ spec_id: item.code, reason: `${mapping.element.id} 缺 IM/LV` }); continue; }
      components.push({ spec_id: target.id, soc: item.code, relationship: item.relationship, weight: 1, im: im.value, lv: lv.value, n: lv.n, se: lv.se, suppressed: im.suppress || lv.suppress });
      // direct SOC 已拿到可用分量就不再往 related 退；被 Suppress 的保留但继续找下一个干净分量。
      if (!im.suppress && !lv.suppress) break;
    }
    const clean = components.filter(c => !c.suppressed);
    if (!clean.length) { unmapped.push(skillId); continue; }
    components.splice(0, components.length, clean[0]);
    const imRaw = components.reduce((sum, c) => sum + c.weight * c.im, 0);
    const lvRaw = components.reduce((sum, c) => sum + c.weight * c.lv, 0);
    // 加权均值的不确定度：各分量 SE 按权重平方和合成（假设分量独立）。
    const seRaw = Math.sqrt(components.reduce((sum, c) => sum + (c.weight * (c.se ?? 0)) ** 2, 0));
    const nRaw = components.reduce((sum, c) => sum + c.weight * (c.n ?? 0), 0);
    const importance = projectImportance(imRaw);
    const requiredLevel = projectLevel(lvRaw);
    const componentText = components.map(c => `${c.spec_id}→${c.soc}(${c.relationship}, w=${c.weight.toFixed(3)}) IM=${c.im} LV=${c.lv}`).join("；");
    const aggregation = components.length > 1 ? "weighted-mean" as const : "single-soc" as const;
    const aggregateNote = components.length > 1
      ? `按该方向 ${components.length} 个特化等权加权：IM=${Math.round(imRaw * 100) / 100}、LV=${Math.round(lvRaw * 100) / 100}（分量：${componentText}）`
      : `只有一个可用分量（${componentText}），未做跨 SOC 平均`;
    const importanceLocator = `O*NET 31.0 · ${mapping.element.table}.txt · ${mapping.element.id} ${mapping.element.name} · ${aggregateNote} · 合成 SE≈${Math.round(seRaw * 100) / 100}（权重平方和） → LIMEN 重要性 round(IM)=${importance}（1–5，编辑性投影）`;
    const levelLocator = `O*NET 31.0 · ${mapping.element.table}.txt · ${mapping.element.id} ${mapping.element.name} · ${aggregateNote} · 合成 SE≈${Math.round(seRaw * 100) / 100} → LIMEN 等级 round(LV/7×4)=${requiredLevel}（编辑性线性投影，不是 O*NET 官方 0–4 量尺）`;
    skills.push({
      skill_id: skillId,
      importance: { value: importance, status: "known", evidence: [officialEvidence(importanceLocator)] },
      required_level: { value: requiredLevel, status: "known", evidence: [officialEvidence(levelLocator)] },
      // rating 保留 O*NET 原始 0–7 量尺的 N/SE/CI 与抑制标记，仅供展示不确定度，不参与打分。
      // CI 必须钳制在 O*NET 0–7 量尺内：加权合成可能算出越界端点（如 LV 均值 0.38 减去 1.96·SE 为负），
      // 而一个「-0.4 级的技能要求」在 O*NET 量尺上不存在，直接写出会误导读者。
      rating: { n: nRaw ? Math.round(nRaw) : undefined, se: seRaw ? Math.round(seRaw * 100) / 100 : undefined, lower: seRaw ? Math.max(0, Math.round((lvRaw - 1.96 * seRaw) * 100) / 100) : undefined, upper: seRaw ? Math.min(7, Math.round((lvRaw + 1.96 * seRaw) * 100) / 100) : undefined, suppressed: components.some(c => c.suppressed) },
    });
    skillAudits.push({ skill_id: skillId, element: mapping.element.id, aggregation, components, im: Math.round(imRaw * 100) / 100, lv: Math.round(lvRaw * 100) / 100, suppressed: components.some(c => c.suppressed), dropped });
  }

  // must_have：编辑性规则 = 该方向已映射技能中 LIMEN 重要性最高者；若最高值 < 4 则不建议设关键项。
  const projected = skills as { skill_id: SkillId; importance: { value: number | null }; required_level: { value: number | null } }[];
  const maxImportance = Math.max(...projected.map(s => s.importance.value ?? 0));
  const mustHave = maxImportance >= 4 ? projected.filter(s => s.importance.value === maxImportance).sort((a, b) => (b.required_level.value ?? 0) - (a.required_level.value ?? 0))[0]?.skill_id : undefined;
  for (const skill of projected) if (skill.skill_id === mustHave) (skill as unknown as { must_have: boolean }).must_have = true;

  occupations.push({
    schema_version: "match-2", id: target.id, title: target.name, simulation: false,
    direction_ids: [target.id], onet_codes: socs,
    mapping_basis: `LIMEN 编辑性方向映射（data/occupation_direction_map.json@${directionMap.version} + data/medicine_direction.json）：岗位粒度 = 单个特化方向（9 个跨学科特化 + 医学，共 ${targets.length} 个）。兴趣画像 = 该特化候选 SOC 的 OI 等权平均（编辑性聚合）；技能 = 该特化自己候选 SOC 中第一个可用分量（direct 优先）。O*NET-SOC 由方向映射给出，不是 O*NET 官方中国考研专业结论。`,
    tasks: { value: target.work_tasks, status: "known", evidence: [editorialEvidence(`data/occupation_direction_map.json@${directionMap.version} · ${target.id} · work_tasks（LIMEN 编辑性描述，非 O*NET 原文）`)] },
    interests: {
      value: { instrument: "O*NET Career Interest Types (RIASEC OI)", version: "31.0", scores, scale: { min: 1, max: 7 } },
      status: "known", evidence: [officialEvidence(interestLocator)],
    },
    skills,
    // 中国报考资格与工作偏好无法由 O*NET 推出，保持未知。
    professional_background: { value: null, status: "unknown", evidence: [] },
    hard_requirements: { value: null, status: "unknown", evidence: [] },
    preferences: { value: null, status: "unknown", evidence: [] },
    standard_version: STANDARD_VERSION,
  });
  audits[target.id] = {
    skills: skillAudits, unmapped, soc_order: socs, interest_soc: perSoc.map(entry => entry.item.code).join("/"),
    weighted_socs: [...new Set(skillAudits.flatMap(audit => audit.components.map(component => component.soc)))],
    interest_rationale: target.rationale,
  };
}


// ---- skill-rubric.json ----
// 官方只在 LV 2/4/6 给出可观察锚点例句；LIMEN 0–4 级由这些锚点对齐而来，超出 LV6 的第 4 级是编辑性描述。
const ANCHOR_TO_LEVEL: Record<number, { level: number; source: "official-anchor" | "editorial" }> = { 0: { level: 0, source: "editorial" }, 2: { level: 1, source: "official-anchor" }, 4: { level: 2, source: "official-anchor" }, 6: { level: 3, source: "official-anchor" } };
const rubricSkills = Object.fromEntries((Object.keys(skillLabels) as SkillId[]).map(skillId => {
  const mapping = MAPPINGS[skillId];
  const anchors = mapping.element ? anchorRows.filter(r => r.element === mapping.element!.id && r.scale === "LV") : [];
  const levels = levelLabels.map((label, levelValue) => {
    const official = anchors.find(a => ANCHOR_TO_LEVEL[a.value]?.level === levelValue && ANCHOR_TO_LEVEL[a.value].source === "official-anchor");
    return {
      level: levelValue, label,
      observable: official ? official.text : levelValue === 4 ? "能在该技能上指导他人、并评审他人的产出（编辑性描述：O*NET 锚点只到 LV6，此级为 LIMEN 补充）" : "未接触或仅了解概念，没有可展示产出（编辑性描述：O*NET 未提供 LV0–1 锚点）",
      onet_anchor: official ? { scale: "LV", value: official.value, text: official.text, element_name: official.name } : null,
    };
  });
  return [skillId, {
    label: skillLabels[skillId], mapping_strength: mapping.strength,
    onet_element: mapping.element, levels,
  }];
}));

// crosswalk 与 rubric 是两份不同用途的产物：crosswalk 论证「为什么映射到这个元素」，rubric 给 0–4 级锚点。
const crosswalkSkills = Object.fromEntries((Object.keys(skillLabels) as SkillId[]).map(skillId => {
  const mapping = MAPPINGS[skillId];
  return [skillId, {
    label: skillLabels[skillId],
    mapping_strength: mapping.strength,
    onet_element: mapping.element,
    rationale: mapping.rationale,
    // 该元素在 10 个方向里是否真的取到了数值（没取到的技能不会进入岗位标准）。
    used_by: targets.filter(target => audits[target.id].skills.some(s => s.skill_id === skillId)).map(target => target.id),
  }];
}));

const crosswalk = {
  version: CROSSWALK_VERSION, generated_at: RETRIEVED_AT,
  source: { database: "O*NET 31.0 (text)", url: DB_URL, zip_url: ZIP_URL, tables: ["Essential Skills.txt", "Transferable Skills.txt", "Career Interest Types.txt", "Level Scale Anchors.txt"], license: "CC BY 4.0 (O*NET OnLine, U.S. Department of Labor / ETA)", notice: "O*NET® is a trademark of the U.S. Department of Labor, Employment and Training Administration." },
  note: "LIMEN 9 个技能到 O*NET 技能元素的编辑性映射。direct=语义基本一致；proxy=只作代理，语义更宽或更窄；unmapped=O*NET 31.0 无对应元素，宁缺不凑，相关技能不进入岗位标准与准备度分母。",
  skills: crosswalkSkills,
  // 这条规则在同一次迭代里被改过：早期版本「取第一个未被抑制的 SOC、不同 SOC 之间不做平均」；
  // 改成方向级岗位后，一个方向横跨多个特化，必须跨 SOC 合成，于是改为等权加权平均。
  // 两者是不同构念，不能混着说——所以这里把权衡直说，并保留每个分量的原始值供审计。
  composite_rule: "岗位粒度 = 单个特化方向（9 个跨学科特化 + 医学）。兴趣：取该特化候选 SOC（direct 优先、related 兜底）的 OI 六维等权平均——这是编辑性聚合，O*NET 官方只发布单职业 OI，locator 逐项写出每个 SOC 的原始值。技能：取该特化候选 SOC 中第一个未被 O*NET Recommend Suppress 标记、且 IM/LV 齐全的分量；只有一个分量时标为 single-soc，不做跨 SOC 平均。IM/LV 投影、SE、CI 规则同下；每个分量的原始 IM/LV/N/SE/CI 逐字写进证据 locator，读者可复核或推翻。",
  projection_rules: {
    importance: "LIMEN 重要性 = round(O*NET IM)，截断到 1–5。这是编辑性投影：O*NET IM 是 1.00–5.00 的连续量表，LIMEN 用 5 档离散权重。",
    required_level: "LIMEN 要求等级 = round(O*NET LV / 7 × 4)，截断到 0–4。这是编辑性线性投影，O*NET 官方量尺是 0–7；报告中不得把 0–4 说成 O*NET 官方等级。",
    interest: "兴趣六维直接用 Career Interest Types 的 OI 原值（1.00–7.00），不做换算。该表不提供 N/SE/CI，因此不携带 ratings。",
    must_have: "关键项（must_have）= 该岗位已映射技能中 LIMEN 重要性最高者；若最高重要性 < 4（即 O*NET IM < 3.5），则该岗位不设关键项。这是编辑性规则，不是 O*NET 结论。",
  },
  audits,
};

const occupationsFile = {
  standard_version: STANDARD_VERSION, generated_at: RETRIEVED_AT,
  source: crosswalk.source,
  note: "10 个方向（9 个跨学科特化 + 医学）的 O*NET 官方数值标准。兴趣为官方 RIASEC OI（1.00–7.00，特化内各候选 SOC 等权平均，编辑性聚合），技能为官方 IM/LV 经编辑性投影到 LIMEN 1–5 / 0–4。未映射技能不写入 skills[]（见 onet-crosswalk.json 的 unmapped 项）。hard_requirements/preferences/professional_background 一律保持 unknown：O*NET 不包含中国报考规则与雇主偏好。",
  occupations,
  audits,
};

const rubric = {
  version: RUBRIC_VERSION, generated_at: RETRIEVED_AT,
  source: { tables: ["Level Scale Anchors.txt"], url: DB_URL, license: crosswalk.source.license },
  note: "自评量尺。0–4 级的中文标签是 LIMEN 编辑性定义；标注为 official-anchor 的例句是 O*NET Level Scale Anchors 英文原文（LV2/LV4/LV6 对齐到 LIMEN 1/2/3），未逐字翻译以保留可核对的原文。",
  levels: levelLabels,
  skills: rubricSkills,
};

writeFileSync(join(process.cwd(), "data", "match", "onet-crosswalk.json"), JSON.stringify(crosswalk, null, 2) + "\n");
writeFileSync(join(process.cwd(), "data", "match", "occupations.official.json"), JSON.stringify(occupationsFile, null, 2) + "\n");
writeFileSync(join(process.cwd(), "data", "match", "skill-rubric.json"), JSON.stringify(rubric, null, 2) + "\n");

console.log("generated:");
for (const target of targets) {
  const audit = audits[target.id];
  console.log(` ${target.id}（${target.name}）: 兴趣SOC=${audit.interest_soc} 技能SOC=${audit.weighted_socs.join("/")} 已评分技能=${audit.skills.length} 未映射=${audit.unmapped.join(",") || "无"}`);
  for (const skill of audit.skills) console.log(`   ${skill.skill_id.padEnd(20)} ${skill.element} ${skill.aggregation} IM=${skill.im} LV=${skill.lv}${skill.suppressed ? " [suppressed]" : ""} ← ${skill.components.map(c => `${c.soc}×${c.weight.toFixed(2)}`).join(" + ")}`);
}
