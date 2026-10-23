import { areas } from "../onet/contracts";
import { matchInputSchema, skillLabels, skillStandard, type Evidence, type Fact, type MatchInput, type MatchUser, type Occupation } from "./contracts";

const round = (n: number) => Math.round(n * 100) / 100;

// 自评等级的测量可靠性：没有作品/确定性评价支撑的 0–4 自评默认 0.8。
// 衰减校正把自评等级向中位 2 收缩，等价于承认“自评含测量误差”，避免把自评当成能力认证。
export const SELF_REPORT_RELIABILITY = 0.8;
// 关键（must_have）技能已知不足时的准备度封顶：非补偿项不能被其余低权重项平均掉。
export const MUST_HAVE_CAP = 59;
const LEVEL_MIDPOINT = 2;
// 排序敏感性网格：兴趣权重相对缺省 0.5 做 ±20% 扰动，准备度权重取补数。
const WEIGHT_GRID = [0.4, 0.45, 0.5, 0.55, 0.6] as const;

export function usable<T>(fact: Fact<T>, simulation: boolean): fact is Fact<T> & { value: T } {
  return fact.status === "known" && fact.value !== null && fact.evidence.length > 0 && fact.evidence.every(e =>
    e.verification === "verified" || (e.source_kind === "self_report" && e.verification === "self_reported") || (simulation && e.verification === "simulation"));
}

export type Dimension = {
  score: number | null; coverage: number; status: "complete" | "partial" | "unknown";
  basis: string; evidence: Evidence[]; missing: string[];
  detail?: Record<string, number | string | null>;
};

function dimension(score: number | null, coverage: number, basis: string, evidence: Evidence[], missing: string[]): Dimension {
  return { score: score === null ? null : round(score), coverage: round(coverage), status: score === null ? "unknown" : coverage === 1 ? "complete" : "partial", basis, evidence, missing };
}

const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
const sd = (xs: number[]) => { const m = mean(xs); return Math.sqrt(xs.reduce((s, x) => s + (x - m) ** 2, 0) / xs.length); };
const pearson = (a: number[], b: number[]) => {
  const ma = mean(a), mb = mean(b);
  let num = 0, va = 0, vb = 0;
  for (let i = 0; i < a.length; i++) { const x = a[i] - ma, y = b[i] - mb; num += x * y; va += x * x; vb += y * y; }
  return num / Math.sqrt(va * vb);
};

// 兴趣：轮廓相关（形状），不是水平，也不是适合度。
// 相关对线性变换不变，因此 30 题自评原始分与 O*NET OI(1–7) 的量尺差异不会污染结果；
// 这正是 V1「各自 min-max 后算平均绝对差」被替换的原因：那个做法隐含“六维正交等权”，与实证不符。
function interest(user: MatchUser, role: Occupation): Dimension {
  const basis = "兴趣轮廓相似度：六维各自中心化后计算 Pearson 相关，再映射为 100×(r+1)/2。只衡量轮廓“形状”的相似，不衡量水平高低，也不是适合度、天赋或成功率；兴趣量表对职业选择的命中率约五成，六维也不正交。相关对线性量尺变换不变，因此不比较绝对分数。";
  const u = user.interests, r = role.interests;
  const evidence = [...u.evidence, ...r.evidence];
  if (!usable(u, user.simulation) || !usable(r, user.simulation)) return dimension(null, 0, basis, evidence, ["缺少可核实的完整六维职业兴趣数值"]);
  const uv = areas.map(area => u.value.scores[area]), rv = areas.map(area => r.value.scores[area]);
  const differentiation = sd(uv);
  if (differentiation < 1e-9 || sd(rv) < 1e-9) {
    const flat = dimension(null, 0, basis, evidence, ["六维兴趣剖面过于平坦（差异化低），无法判断轮廓形状；请看原始六维分数，而不是相似度"]);
    flat.detail = { differentiation: round(differentiation) };
    return flat;
  }
  const correlation = Math.max(-1, Math.min(1, pearson(uv, rv)));
  const result = dimension(100 * (correlation + 1) / 2, 1, basis, evidence, []);
  result.detail = { correlation: round(correlation), differentiation: round(differentiation) };
  return result;
}

function reliabilityOf(fact: Fact<unknown> | undefined) {
  if (!fact) return 1;
  if (typeof fact.reliability === "number") return fact.reliability;
  return fact.evidence.some(e => e.verification === "self_reported") ? SELF_REPORT_RELIABILITY : 1;
}
const attenuate = (level: number, reliability: number) => LEVEL_MIDPOINT + reliability * (level - LEVEL_MIDPOINT);

// 能力准备度：两层结构。
// Layer 1 关键项非补偿：任一 must_have 已知不足 → 封顶 MUST_HAVE_CAP。
// Layer 2 其余项按重要性加权（超额被 min(...,1) 截断，不奖励过度准备）。
// 自评等级先衰减；缺失不进分母，覆盖率单列。
function readiness(user: MatchUser, role: Occupation) {
  let weighted = 0, weight = 0, observed = 0;
  const evidence: Evidence[] = [], missing: string[] = [];
  const mustGaps: string[] = [];
  let mustUnknown = 0;
  const gaps = role.skills.map(requirement => {
    const self = user.skills.find(s => s.skill_id === requirement.skill_id)?.level;
    const current = self && usable(self, user.simulation) ? round(attenuate(self.value, reliabilityOf(self))) : null;
    const target = usable(requirement.required_level, user.simulation) ? requirement.required_level.value : null;
    const importance = usable(requirement.importance, user.simulation) ? requirement.importance.value : null;
    const refs = [...(self?.evidence ?? []), ...requirement.required_level.evidence, ...requirement.importance.evidence];
    evidence.push(...refs);
    if (requirement.must_have) {
      if (current === null || target === null) mustUnknown++;
      else if (current < target) mustGaps.push(`${skillLabels[requirement.skill_id]}（当前 ${current} / 要求 ${target}）`);
    }
    if (current !== null && target !== null && importance !== null) {
      weighted += importance * (target === 0 ? 1 : Math.min(current / target, 1)); weight += importance; observed++;
    } else missing.push(`${skillLabels[requirement.skill_id]}：${current === null ? "用户水平待确认；" : ""}${target === null ? "目标等级待确认；" : ""}${importance === null ? "重要性待确认" : ""}`);
    return {
      skill_id: requirement.skill_id, label: skillLabels[requirement.skill_id], current, target,
      gap: current === null || target === null ? null : round(Math.max(0, target - current)),
      must_have: requirement.must_have === true, evidence: refs,
      action: current === null || target === null ? "补充该技能的作品与评分依据，核实岗位要求。" : current < target ? "完成一项可展示的小任务，并按同一等级标准复核。" : "保留已有作品，结合目标岗位验证迁移性。",
    };
  });
  const raw = weight ? 100 * weighted / weight : null;
  const score = raw === null ? null : Math.min(raw, mustGaps.length ? MUST_HAVE_CAP : 100);
  const result = dimension(score, role.skills.length ? observed / role.skills.length : 0,
    "已知技能按重要性加权：100 × Σ重要性 × min(当前等级/要求等级,1) / Σ重要性，其中自评等级按可靠性衰减、超额不额外加分。关键项（must_have）已知不足时准备度封顶 59，不允许被其余项平均掉。缺失项不进分母，覆盖率单列；自评不等于能力认证。",
    evidence, missing.length ? missing : role.skills.length ? [] : ["岗位技能尚未结构化"]);
  result.detail = { must_have_gap: mustGaps.length ? mustGaps.join("；") : null, must_have_unknown: mustUnknown, self_report_reliability: SELF_REPORT_RELIABILITY };
  return { dimension: result, gaps, mustGaps };
}

export function eligibility(requirements: Occupation["hard_requirements"], user: MatchUser) {
  if (!usable(requirements, user.simulation)) return { status: "unknown" as const, checks: [], evidence: requirements.evidence };
  const checks = requirements.value.map(rule => {
    const value = user.qualifications[rule.field];
    const ruleTrusted = usable({ value: true, status: "known", evidence: rule.evidence }, user.simulation);
    const status = !ruleTrusted || !usable(value, user.simulation) ? "unknown" : rule.allowed.includes(value.value) ? "met" : "not_met";
    return { id: rule.id, field: rule.field, status, allowed: rule.allowed, actual: usable(value, user.simulation) ? value.value : null, evidence: [...value.evidence, ...rule.evidence] };
  });
  return { status: checks.some(c => c.status === "not_met") ? "not_met" as const : checks.some(c => c.status === "unknown") ? "unknown" as const : "met" as const, checks, evidence: requirements.evidence };
}

function transition(user: MatchUser, role: Occupation, now: Date) {
  const values: number[] = [], evidence: Evidence[] = [], missing: string[] = [];
  if (usable(user.preferences, user.simulation) && usable(role.preferences, user.simulation) && role.preferences.value.length) {
    values.push(role.preferences.value.filter(p => user.preferences.value!.includes(p)).length / role.preferences.value.length);
    evidence.push(...user.preferences.evidence, ...role.preferences.evidence);
  } else missing.push("职业偏好/工作条件未完整确认");
  const latest = [...user.experiences].filter(e => e.occupation_id === role.id && Date.parse(e.completed_at) <= now.getTime()).sort((a, b) => Date.parse(b.completed_at) - Date.parse(a.completed_at) || a.id.localeCompare(b.id))[0];
  if (latest && usable(latest.willingness, user.simulation)) { values.push((latest.willingness.value - 1) / 4); evidence.push(...latest.willingness.evidence); }
  else missing.push("缺少此岗位体验后的明确投入意愿");
  const result = dimension(values.length ? 100 * values.reduce((a, b) => a + b, 0) / values.length : null, values.length / 2,
    "V1–V2 转型可行性线索：工作偏好重合比例与最近一次同岗位体验投入意愿(1–5→0–1)等权。仅反映偏好与投入；时间、经济成本、实际机会未知，不预测能否转型。模拟体验评分不计入能力准备度，本维度也不参与职业排序。", evidence, missing);
  result.detail = { cost_model: "unknown", note: "补齐所需学时没有可核实参数，因此不对时间与经济成本给分" };
  return result;
}

// 排序用标量化：几何平均（维度不可完全替代时比算术平均更敏感于短板）。
// 仅用于生成顺序，不是“综合适合度”，不对外展示为百分比。
const scaled = (score: number) => 0.05 + 0.95 * score / 100;
const utility = (r: { interest: Dimension; readiness: Dimension }, interestWeight: number) =>
  Math.pow(scaled(r.interest.score!), interestWeight) * Math.pow(scaled(r.readiness.score!), 1 - interestWeight);

export function match(input: MatchInput, now = new Date()) {
  const { user, occupations, admissions } = matchInputSchema.parse(input);
  const results = occupations.map(role => {
    const ability = readiness(user, role), hard = eligibility(role.hard_requirements, user);
    const programs = admissions.filter(a => a.occupation_ids.includes(role.id)).map(a => {
      const samePlan = user.target_year === a.year && usable(user.study_intent, user.simulation) && user.study_intent.value === a.pathway;
      const current = now.toISOString().slice(0, 10) <= a.valid_through;
      const decision = eligibility(a.hard_requirements, user);
      const mappingTrusted = usable({ value: true, status: "known", evidence: a.mapping_evidence }, user.simulation);
      const complete = samePlan && current && mappingTrusted && usable(a.exam_subjects, user.simulation) && usable(a.cross_major, user.simulation) && decision.status !== "unknown";
      return { id: a.id, university: a.university, major: a.major_name, year: a.year, pathway: a.pathway, status: !samePlan ? "plan_mismatch" : !current ? "expired" : !mappingTrusted ? "unknown" : decision.status === "not_met" ? "not_met" : complete ? decision.status : "unknown", decision,
        evidence: [...a.mapping_evidence, ...a.exam_subjects.evidence, ...a.cross_major.evidence], missing: complete ? [] : ["核对目标年份/路径、有效期、考试科目和跨考资格"] };
    });
    const applicable = programs.filter(p => p.status === "met" || p.status === "not_met");
    const admission = dimension(applicable.length ? 100 * applicable.filter(p => p.status === "met").length / applicable.length : null,
      programs.length ? applicable.length / programs.length : 0,
      "符合所选年份/路径且关联已核实的项目中，已判定资格的满足比例。确认不满足任一硬条件即可否决；满足结论还需科目与跨考条件完整。不是录取概率；未知项目不进入分母。项目之间不等权、不可比，因此该比例只说明“已判定项目里满足了多少”，不是适配度。",
      programs.flatMap(p => p.evidence), programs.length ? programs.flatMap(p => p.missing) : ["尚无结构化关联招生项目"]);
    return { occupation_id: role.id, title: role.title, simulation: role.simulation, rank: null as number | null, rank_range: null as [number, number] | null,
      ordering_utility: null as number | null, dominated: null as boolean | null,
      interest: interest(user, role), readiness: ability.dimension, transition: transition(user, role, now), admissions: admission,
      eligibility: hard, gaps: ability.gaps, programs,
      actions: [...ability.gaps.map(g => ({ action: `${g.label}：${g.action}`, evidence: g.evidence })), ...(hard.status !== "met" ? [{ action: "先核实岗位硬性资格，分数不能抵消资格限制。", evidence: hard.evidence }] : []),
        ...(admission.status !== "complete" ? [{ action: "查阅目标年份的官方招生目录与跨考规定，补齐科目和资格证据。", evidence: admission.evidence }] : [])],
    };
  });
  // 只在“资格未被否决 + 兴趣与准备度都完整”的岗位之间排序；分维度呈现，不合成适合度。
  const canRank = (r: typeof results[number]) => r.eligibility.status !== "not_met" && r.interest.status === "complete" && r.readiness.status === "complete";
  for (const r of results) if (canRank(r)) r.ordering_utility = round(utility(r, 0.5) * 100);
  const ordered = [...results].sort((a, b) =>
    Number(b.eligibility.status !== "not_met") - Number(a.eligibility.status !== "not_met")
    || Number(canRank(b)) - Number(canRank(a))
    || (canRank(a) && canRank(b) ? utility(b, 0.5) - utility(a, 0.5) || b.interest.score! - a.interest.score! || b.readiness.score! - a.readiness.score! : 0)
    || a.occupation_id.localeCompare(b.occupation_id));
  let rank = 0;
  for (const r of ordered) if (canRank(r)) r.rank = ++rank;
  const rankable = ordered.filter(canRank);
  // 帕累托支配只作标注：候选只有三个时用它淘汰会丢掉有用的探索选项。
  for (const r of rankable) r.dominated = rankable.some(o => o.occupation_id !== r.occupation_id
    && o.interest.score! >= r.interest.score! && o.readiness.score! >= r.readiness.score!
    && (o.interest.score! > r.interest.score! || o.readiness.score! > r.readiness.score!));
  // 权重扰动下的名次区间：区间跨度过大说明顺序不稳健，应降级为“并列探索项”。
  const baseline = rankable.map(r => r.occupation_id).join("|");
  const ranks = new Map<string, number[]>();
  let flips = 0;
  for (const w of WEIGHT_GRID) {
    const order = [...rankable].sort((a, b) => utility(b, w) - utility(a, w) || a.occupation_id.localeCompare(b.occupation_id));
    order.forEach((r, i) => ranks.set(r.occupation_id, [...(ranks.get(r.occupation_id) ?? []), i + 1]));
    if (w !== 0.5 && order.map(r => r.occupation_id).join("|") !== baseline) flips++;
  }
  for (const r of rankable) {
    const values = ranks.get(r.occupation_id) ?? [];
    r.rank_range = values.length ? [Math.min(...values), Math.max(...values)] : null;
  }
  const width = (r: typeof results[number]) => r.rank_range ? r.rank_range[1] - r.rank_range[0] : 0;
  const stability = rankable.length < 2 ? "n/a" as const : flips === 0 ? "stable" as const : rankable.some(r => width(r) >= 2) ? "unstable" as const : "variable" as const;
  return { algorithm_version: "limen-match-v2.0", skill_standard_version: skillStandard.version, schema_version: "match-2", generated_at: now.toISOString(), simulation: user.simulation,
    ranking_basis: "仅完整兴趣与能力数据、且资格未被否决的岗位参与排序：先按资格与完整性分层，再用几何加权（缺省兴趣 0.5 / 准备度 0.5）生成顺序，并给出权重 ±20% 扰动下的名次区间。四维分别呈现，不提供综合适合度百分比；硬资格不满足者不推荐；资格未知仍须核实。",
    sensitivity: { interest_weight_grid: [...WEIGHT_GRID], ordering_flips: flips, stability },
    limitations: ["LIMEN 编辑性探索规则，尚未做预测效度验证", "未知不等于零；局部分数不能与完整分数直接比较", "兴趣分是轮廓形状相似度，不衡量水平高低，也不是成功率", "自评技能等级已按可靠性衰减，仍不等于能力认证", "招生事实和数值评分标准仍需人工核实", "候选数很少时名次区间可能重叠，档位不等于预测", "P4 的大模型/关键词评价不直接进入能力分数"],
    results: ordered };
}
export type MatchReport = ReturnType<typeof match>;
