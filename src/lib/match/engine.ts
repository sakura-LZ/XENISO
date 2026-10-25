import { areas } from "../onet/contracts";
import { matchInputSchema, skillLabels, skillStandard, type Evidence, type Fact, type MatchInput, type MatchUser, type Occupation } from "./contracts";
import { interestMetrics, kendallTau } from "./interest-metrics";

const round = (n: number) => Math.round(n * 100) / 100;

// 自评等级的测量可靠性：没有作品/确定性评价支撑的 0–4 自评默认 0.8。
// 衰减校正把自评等级向中位 2 收缩，等价于承认“自评含测量误差”，避免把自评当成能力认证。
export const SELF_REPORT_RELIABILITY = 0.8;
// 关键（must_have）技能已知不足时的准备度封顶：非补偿项不能被其余低权重项平均掉。
export const MUST_HAVE_CAP = 59;
const LEVEL_MIDPOINT = 2;
// 兴趣量表的可靠性：Mini-IP 每维 5 题，按 Spearman–Brown 推算内部一致性约 .73–.80。
// 用区间下沿做保守的衰减校正；没有更精确的实测信度时不假装精确。
export const INTEREST_RELIABILITY = { point: 0.8, lower: 0.73, upper: 0.8 } as const;
// 排序敏感性网格：兴趣权重相对缺省 0.5 做 ±20% 扰动，准备度权重取补数。
const WEIGHT_GRID = [0.4, 0.45, 0.5, 0.55, 0.6] as const;
// 对外只给“证据完整度档位”，不给综合适合度：A 证据完整、B 资格待核实、C 仅部分依据、D 信息不足。
export type EvidenceTier = "A" | "B" | "C" | "D";
export type Confidence = { level: "high" | "medium" | "low"; coverage: number; notes: string[] };

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
  // 衰减校正：观测相关 = 真相关 × √信度，因此真相关的估计是 r/√ρ。
  // 只用保守下沿 ρ=.73 做上界估计，不替换展示分（避免用校正值冒充更准）。
  const userReliability = typeof u.reliability === "number" ? u.reliability : INTEREST_RELIABILITY.point;
  const corrected = Math.max(-1, Math.min(1, correlation / Math.sqrt(Math.max(userReliability, INTEREST_RELIABILITY.lower))));
  const metrics = interestMetrics(u.value.scores, r.value.scores);
  result.detail = {
    correlation: round(correlation), differentiation: round(differentiation),
    user_reliability: round(userReliability), attenuation_corrected_correlation: round(corrected),
    reliability_basis: `Mini-IP 每维 5 题，内部一致性约 ${INTEREST_RELIABILITY.lower}–${INTEREST_RELIABILITY.upper}；校正值只作上界参考`,
    // 以下三项是补充诊断，不替换展示分、不参与排序：单看相关对“峰在哪、隔几步”不敏感。
    high_point_user: metrics.hex.user_top3.join(""),
    high_point_occupation: metrics.hex.occupation_top3.join(""),
    hex_code_similarity: round(metrics.hex.similarity),
    hex_code_mean_distance: round(metrics.hex.mean_hex_distance),
    emd_similarity: round(metrics.emd.similarity),
    emd_distance: round(metrics.emd.distance),
    interest_metric_note: metrics.note,
  };
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

// 证据完整度档位：只描述“依据够不够”，不描述“适不适合”。
// A 兴趣与准备度完整且硬资格已判定；B 同上但硬资格仍待核实；C 两维都只有部分依据；D 任一维未知。
export function evidenceTierOf(r: { interest: Dimension; readiness: Dimension; eligibility: { status: string } }): EvidenceTier {
  if (r.interest.status === "unknown" || r.readiness.status === "unknown") return "D";
  if (r.interest.status === "complete" && r.readiness.status === "complete") return r.eligibility.status === "unknown" ? "B" : "A";
  return "C";
}

// 置信度：把“覆盖率、资格未知、招生未判定、排序不稳健”四类不确定性显式说出来，
// 而不是给一个看起来精确的总分。level 由结构规则决定，不由分数大小决定。
function confidenceOf(
  r: { interest: Dimension; readiness: Dimension; transition: Dimension; admissions: Dimension; eligibility: { status: string }; programs: unknown[] },
  stability: "stable" | "variable" | "unstable" | "n/a",
): Confidence {
  const coverage = round((r.interest.coverage + r.readiness.coverage + r.transition.coverage + r.admissions.coverage) / 4);
  const notes: string[] = [];
  if (r.interest.status !== "complete") notes.push("兴趣轮廓依据不完整：六维兴趣或岗位 OI 缺失");
  if (r.readiness.status !== "complete") notes.push(`能力准备度覆盖 ${Math.round(r.readiness.coverage * 100)}%：部分技能等级或岗位要求待确认`);
  if (r.eligibility.status === "unknown") notes.push("岗位硬性资格待核实");
  if (r.programs.length === 0) notes.push("尚无已审核的关联招生项目");
  else if (r.admissions.status !== "complete") notes.push("招生项目中仍有待判定条款");
  if (stability === "unstable") notes.push("权重扰动下名次跨度大，顺序不稳健");
  if (stability === "variable") notes.push("权重扰动下个别名次可能互换");
  const complete = r.interest.status === "complete" && r.readiness.status === "complete";
  const level = complete && r.eligibility.status === "met" && (stability === "stable" || stability === "n/a")
    ? "high" as const
    : complete || coverage >= 0.5 ? "medium" as const : "low" as const;
  return { level, coverage, notes: notes.length ? notes : ["四维依据完整、资格已判定且顺序稳定"] };
}

// 数据清单：报告里必须能追溯到“用的是哪一版标准、哪些来源”，否则分数不可复核。
function dataManifest(occupations: Occupation[], admissions: MatchInput["admissions"]) {
  const versions = [
    { id: "algorithm", version: "limen-match-v2.1" },
    { id: "contract", version: "match-2" },
    { id: "skill_standard", version: skillStandard.version },
    ...[...new Set(occupations.map(o => o.standard_version ?? "unreviewed"))].map(version => ({ id: "occupation_standard", version })),
  ];
  const sources = new Map<string, { ref: string; url: string; published_at: string | null; retrieved_at: string }>();
  const all = [...occupations.flatMap(o => [...o.interests.evidence, ...o.skills.flatMap(s => [...s.importance.evidence, ...s.required_level.evidence])]), ...admissions.flatMap(a => a.mapping_evidence)]
    .filter(e => e.source_kind === "official" && e.url);
  for (const e of all) if (e.url && !sources.has(e.url)) sources.set(e.url, { ref: e.ref, url: e.url, published_at: e.published_at, retrieved_at: e.retrieved_at });
  return { versions, sources: [...sources.values()].slice(0, 20) };
}

// 候选岗位之间的兴趣轮廓区分度诊断。
// 三个岗位若兴趣轮廓高度相似，兴趣维度对"谁更靠前"几乎没有信息量：用户六维相同，
// 只是比较谁更像同一张图。这不是分数错，而是候选集本身的可用信息不足，必须显式说出来。
const NEAR_DUPLICATE_R = 0.9;
const LOW_DISCRIMINATION_MEAN_R = 0.7;
function interestDiagnostics(occupations: Occupation[], simulation: boolean, user: MatchUser) {
  const known = occupations.filter(role => usable(role.interests, simulation));
  const pairs: { a: string; b: string; correlation: number }[] = [];
  for (let i = 0; i < known.length; i++) for (let j = i + 1; j < known.length; j++) {
    const av = areas.map(area => known[i].interests.value!.scores[area]);
    const bv = areas.map(area => known[j].interests.value!.scores[area]);
    if (sd(av) < 1e-9 || sd(bv) < 1e-9) continue;
    pairs.push({ a: known[i].id, b: known[j].id, correlation: round(Math.max(-1, Math.min(1, pearson(av, bv)))) });
  }
  const values = pairs.map(pair => pair.correlation);
  const maxCorrelation = values.length ? Math.max(...values) : null;
  const meanCorrelation = values.length ? round(mean(values)) : null;
  const nearDuplicate = pairs.filter(pair => pair.correlation >= NEAR_DUPLICATE_R);
  const discriminative = maxCorrelation === null ? null : !(maxCorrelation >= NEAR_DUPLICATE_R || (meanCorrelation ?? 0) >= LOW_DISCRIMINATION_MEAN_R);
  const note = maxCorrelation === null
    ? "候选岗位不足以比较兴趣轮廓区分度。"
    : nearDuplicate.length
      ? `有 ${nearDuplicate.length} 对岗位的兴趣轮廓接近重复（r ≥ ${NEAR_DUPLICATE_R}），这些岗位之间兴趣几乎不区分，顺序主要由能力准备度与资格决定。`
      : discriminative
        ? "候选岗位兴趣轮廓差异足够，兴趣维度对顺序有实际信息量。"
        : `候选岗位兴趣轮廓整体相似（两两相关均值 ${meanCorrelation}，最高 ${maxCorrelation}），兴趣维度对本组顺序的信息量偏低：顺序主要由能力准备度与资格决定，不要读成“兴趣更匹配所以更靠前”。`;
  // 用户自己的六维是否平坦，决定兴趣分能否解释为形状相似；这里一并返回，界面不必重复判断。
  const flatUser = usable(user.interests, simulation) ? sd(areas.map(area => user.interests.value!.scores[area])) < 1e-9 : null;
  return { candidate_pairs: pairs, max_correlation: maxCorrelation, mean_correlation: meanCorrelation, near_duplicate_pairs: nearDuplicate.map(pair => `${pair.a}~${pair.b}`), discriminative, flat_user_profile: flatUser, thresholds: { near_duplicate: NEAR_DUPLICATE_R, low_discrimination_mean: LOW_DISCRIMINATION_MEAN_R }, note };
}

export function match(input: MatchInput, now = new Date()) {
  const { user, occupations, admissions } = matchInputSchema.parse(input);
  const results = occupations.map(role => {
    const ability = readiness(user, role), hard = eligibility(role.hard_requirements, user);
    const programs = admissions.filter(a => a.occupation_ids.includes(role.id)).map(a => {
      const yearMatch = user.target_year === a.year;
      const pathwayMatch = usable(user.study_intent, user.simulation) && user.study_intent.value === a.pathway;
      const samePlan = yearMatch && pathwayMatch;
      const current = now.toISOString().slice(0, 10) <= a.valid_through;
      const decision = eligibility(a.hard_requirements, user);
      const mappingTrusted = usable({ value: true, status: "known", evidence: a.mapping_evidence }, user.simulation);
      const complete = samePlan && current && mappingTrusted && usable(a.exam_subjects, user.simulation) && usable(a.cross_major, user.simulation) && decision.status !== "unknown";
      return { id: a.id, university: a.university, major: a.major_name, year: a.year, pathway: a.pathway, status: !samePlan ? "plan_mismatch" : !current ? "expired" : !mappingTrusted ? "unknown" : decision.status === "not_met" ? "not_met" : complete ? decision.status : "unknown", decision,
        // 把「计划不符」拆成可解释的两项：年份不符与路径不符的处置完全不同，界面不该合并成一句话。
        plan_mismatch_reason: samePlan ? null : !yearMatch && !pathwayMatch ? "year_and_pathway" : !yearMatch ? "year" : "pathway",
        evidence: [...a.mapping_evidence, ...a.exam_subjects.evidence, ...a.cross_major.evidence], missing: complete ? [] : ["核对目标年份/路径、有效期、考试科目和跨考资格"] };
    });
    const applicable = programs.filter(p => p.status === "met" || p.status === "not_met");
    const admission = dimension(applicable.length ? 100 * applicable.filter(p => p.status === "met").length / applicable.length : null,
      programs.length ? applicable.length / programs.length : 0,
      "符合所选年份/路径且关联已核实的项目中，已判定资格的满足比例。确认不满足任一硬条件即可否决；满足结论还需科目与跨考条件完整。不是录取概率；未知项目不进入分母。项目之间不等权、不可比，因此该比例只说明“已判定项目里满足了多少”，不是适配度。",
      programs.flatMap(p => p.evidence), programs.length ? programs.flatMap(p => p.missing) : ["尚无结构化关联招生项目"]);
    return { occupation_id: role.id, title: role.title, simulation: role.simulation, rank: null as number | null, rank_range: null as [number, number] | null,
      ordering_utility: null as number | null, dominated: null as boolean | null,
      evidence_tier: null as EvidenceTier | null, confidence: null as Confidence | null,
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
  const baseline = rankable.map(r => r.occupation_id);
  const ranks = new Map<string, number[]>();
  let flips = 0;
  const jaccards: number[] = [];
  const top = Math.min(3, rankable.length);
  const overlaps = (a: string[], b: string[]) => {
    const setB = new Set(b); const inter = a.filter(id => setB.has(id)).length;
    return a.length + b.length - inter === 0 ? 1 : inter / (a.length + b.length - inter);
  };
  for (const w of WEIGHT_GRID) {
    const order = [...rankable].sort((a, b) => utility(b, w) - utility(a, w) || a.occupation_id.localeCompare(b.occupation_id));
    order.forEach((r, i) => ranks.set(r.occupation_id, [...(ranks.get(r.occupation_id) ?? []), i + 1]));
    if (w !== 0.5 && order.map(r => r.occupation_id).join("|") !== baseline.join("|")) flips++;
    if (top > 0) jaccards.push(overlaps(baseline.slice(0, top), order.slice(0, top).map(r => r.occupation_id)));
  }
  for (const r of rankable) {
    const values = ranks.get(r.occupation_id) ?? [];
    r.rank_range = values.length ? [Math.min(...values), Math.max(...values)] : null;
  }
  const width = (r: typeof results[number]) => r.rank_range ? r.rank_range[1] - r.rank_range[0] : 0;
  const stability = rankable.length < 2 ? "n/a" as const : flips === 0 ? "stable" as const : rankable.some(r => width(r) >= 2) ? "unstable" as const : "variable" as const;
  // 名次真正发生变化的岗位：用于对外解释“哪几个岗位的顺序只是权重的产物”。
  const flipped = rankable
    .filter(r => (ranks.get(r.occupation_id) ?? []).some((value, i) => value !== baseline.indexOf(r.occupation_id) + 1 && WEIGHT_GRID[i] !== 0.5))
    .map(r => r.occupation_id);
  for (const r of results) {
    r.evidence_tier = evidenceTierOf(r);
    r.confidence = confidenceOf(r, stability);
  }
  const interest_diagnostics = interestDiagnostics(occupations, user.simulation, user);
  // 三种兴趣度量对同一组岗位的顺序是否一致：没有人工标签时也能做的收敛效度检查。
  // 顺序一致 → 形状结论更稳；分歧 → 说明候选轮廓接近或量尺假设敏感，名次更不能当结论。
  const rankableResults = ordered.filter(canRank);
  const orderBy = (value: (r: typeof results[number]) => number) => [...rankableResults]
    .sort((a, b) => value(b) - value(a) || a.occupation_id.localeCompare(b.occupation_id))
    .map((r) => r.occupation_id);
  const interest_metric_agreement = {
    metrics: { shape: "轮廓相关", hex: "六边形码", emd: "环形 EMD" },
    shape_vs_hex: kendallTau(orderBy((r) => r.interest.score ?? Number.NEGATIVE_INFINITY), orderBy((r) => Number(r.interest.detail?.hex_code_similarity ?? -1))),
    shape_vs_emd: kendallTau(orderBy((r) => r.interest.score ?? Number.NEGATIVE_INFINITY), orderBy((r) => Number(r.interest.detail?.emd_similarity ?? -1))),
    hex_vs_emd: kendallTau(orderBy((r) => Number(r.interest.detail?.hex_code_similarity ?? -1)), orderBy((r) => Number(r.interest.detail?.emd_similarity ?? -1))),
    note: "只作收敛效度诊断，不进入打分与排序：三种兴趣度量顺序一致时“轮廓形状”结论更稳；τ 偏低说明候选轮廓接近或量尺假设敏感，兴趣分应读作探索提示，不应读成匹配度。",
  };
  const agreementValues = [interest_metric_agreement.shape_vs_hex, interest_metric_agreement.shape_vs_emd, interest_metric_agreement.hex_vs_emd]
    .filter((value): value is number => value !== null);
  if (agreementValues.length && Math.min(...agreementValues) < 0.34) {
    interest_diagnostics.note += ` 另外，兴趣度量之间的顺序一致性偏低（Kendall τ 最小 ${Math.min(...agreementValues).toFixed(2)}），说明不同兴趣指标给出的顺序本身就分歧，名次更不应被当作结论。`;
  }
  return { algorithm_version: "limen-match-v2.1", skill_standard_version: skillStandard.version, schema_version: "match-2", generated_at: now.toISOString(), simulation: user.simulation,
    ranking_basis: "仅完整兴趣与能力数据、且资格未被否决的岗位参与排序：先按资格与完整性分层，再用几何加权（缺省兴趣 0.5 / 准备度 0.5）生成顺序，并给出权重 ±20% 扰动下的名次区间。四维分别呈现，不提供综合适合度百分比；`evidence_tier` 只描述证据完整度（A 完整且资格已判定 / B 完整但资格待核实 / C 仅部分依据 / D 信息不足），`confidence` 只描述不确定性来源，两者都不是适合度；硬资格不满足者不推荐；资格未知仍须核实。",
    sensitivity: { interest_weight_grid: [...WEIGHT_GRID], ordering_flips: flips, top_k_jaccard: round(jaccards.length ? mean(jaccards) : 1), flipped_occupation_ids: flipped, stability },
    interest_diagnostics,
    interest_metric_agreement,
    data_manifest: dataManifest(occupations, admissions),
    limitations: ["LIMEN 编辑性探索规则，尚未做预测效度验证", "排序口径未经独立专家共识验证（离线两轮编辑标注 α≈0.24 未达标），名次只能当探索顺序", "未知不等于零；局部分数不能与完整分数直接比较", "兴趣分是轮廓形状相似度，不衡量水平高低，也不是成功率", "自评技能等级已按可靠性衰减，仍不等于能力认证", "招生事实和数值评分标准仍需人工核实", "候选数很少时名次区间可能重叠，档位不等于预测", "证据档位与置信度只描述依据完整性，不是录取或成功的可能性", "P4 的大模型/关键词评价不直接进入能力分数", ...(agreementValues.length && Math.min(...agreementValues) < 0.34 ? ["三种兴趣度量（轮廓相关/六边形码/EMD）顺序分歧，兴趣分只作探索提示"] : []), ...(interest_diagnostics.discriminative === false ? ["本组候选岗位兴趣轮廓相似，兴趣维度区分度有限，顺序主要由能力准备度与资格决定"] : [])],
    results: ordered };
}
export type MatchReport = ReturnType<typeof match>;
