import { areas } from "../onet/contracts";
import { matchInputSchema, skillLabels, skillStandard, type Evidence, type Fact, type MatchInput, type MatchUser, type Occupation } from "./contracts";

const round = (n: number) => Math.round(n * 100) / 100;
export function usable<T>(fact: Fact<T>, simulation: boolean): fact is Fact<T> & { value: T } {
  return fact.status === "known" && fact.value !== null && fact.evidence.length > 0 && fact.evidence.every(e =>
    e.verification === "verified" || (e.source_kind === "self_report" && e.verification === "self_reported") || (simulation && e.verification === "simulation"));
}
export type Dimension = { score: number | null; coverage: number; status: "complete" | "partial" | "unknown"; basis: string; evidence: Evidence[]; missing: string[] };
function dimension(score: number | null, coverage: number, basis: string, evidence: Evidence[], missing: string[]): Dimension {
  return { score: score === null ? null : round(score), coverage: round(coverage), status: score === null ? "unknown" : coverage === 1 ? "complete" : "partial", basis, evidence, missing };
}
function interest(user: MatchUser, role: Occupation) {
  const u = user.interests, r = role.interests;
  const basis = "六维分别按已声明量尺归一化；100 × (1 − 六维绝对差的平均值)。是轮廓接近度，不是天赋或职业成功率。";
  if (!usable(u, user.simulation) || !usable(r, user.simulation) || !u.value.scale || !r.value.scale) return dimension(null, 0, basis, [...u.evidence, ...r.evidence], ["缺少可核实的完整六维职业兴趣数值或量尺"]);
  const normalize = (v: number, s: { min: number; max: number }) => (v - s.min) / (s.max - s.min);
  const distance = areas.reduce((sum, a) => sum + Math.abs(normalize(u.value.scores[a], u.value.scale!) - normalize(r.value.scores[a], r.value.scale!)), 0) / 6;
  return dimension(100 * (1 - distance), 1, basis, [...u.evidence, ...r.evidence], []);
}
function readiness(user: MatchUser, role: Occupation) {
  let weighted = 0, weight = 0, observed = 0;
  const evidence: Evidence[] = [], missing: string[] = [];
  const gaps = role.skills.map(requirement => {
    const self = user.skills.find(s => s.skill_id === requirement.skill_id)?.level;
    const current = self && usable(self, user.simulation) ? self.value : null;
    const target = usable(requirement.required_level, user.simulation) ? requirement.required_level.value : null;
    const importance = usable(requirement.importance, user.simulation) ? requirement.importance.value : null;
    const refs = [...(self?.evidence ?? []), ...requirement.required_level.evidence, ...requirement.importance.evidence];
    evidence.push(...refs);
    if (current !== null && target !== null && importance !== null) {
      weighted += importance * (target === 0 ? 1 : Math.min(current / target, 1)); weight += importance; observed++;
    } else missing.push(`${skillLabels[requirement.skill_id]}：${current === null ? "用户水平待确认；" : ""}${target === null ? "目标等级待确认；" : ""}${importance === null ? "重要性待确认" : ""}`);
    return { skill_id: requirement.skill_id, label: skillLabels[requirement.skill_id], current, target, gap: current === null || target === null ? null : Math.max(0, target - current), evidence: refs,
      action: current === null || target === null ? "补充该技能的作品与评分依据，核实岗位要求。" : current < target ? "完成一项可展示的小任务，并按同一等级标准复核。" : "保留已有作品，结合目标岗位验证迁移性。" };
  });
  return { dimension: dimension(weight ? 100 * weighted / weight : null, role.skills.length ? observed / role.skills.length : 0,
    "已知技能按重要性加权：100 × Σ重要性 × min(当前等级/要求等级,1) / Σ重要性。0–4 是 LIMEN 等级；自评不等于能力认证。缺失项不进入分母，覆盖率单列。", evidence, missing.length ? missing : role.skills.length ? [] : ["岗位技能尚未结构化"]), gaps };
}
export function eligibility(requirements: Occupation["hard_requirements"], user: MatchUser) {
  if (!usable(requirements, user.simulation)) return { status: "unknown" as const, checks: [], evidence: requirements.evidence };
  const checks = requirements.value.map(rule => {
    const value = user.qualifications[rule.field];
    const ruleTrusted = usable({ value: true, status: "known", evidence: rule.evidence }, user.simulation);
    const status = !ruleTrusted || !usable(value, user.simulation) ? "unknown" : rule.allowed.includes(value.value) ? "met" : "not_met";
    return { id: rule.id, field: rule.field, status, allowed: rule.allowed, actual: usable(value, user.simulation) ? value.value : null, evidence: [...rule.evidence, ...value.evidence] };
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
  return dimension(values.length ? 100 * values.reduce((a, b) => a + b, 0) / values.length : null, values.length / 2,
    "V1 转型可行性线索：工作偏好重合比例与最近一次同岗位体验投入意愿(1–5→0–1)等权。仅反映偏好与投入；时间、经济成本、实际机会未知，不预测能否转型。模拟体验评分不计入能力准备度。", evidence, missing);
}
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
      "符合所选年份/路径且关联已核实的项目中，已判定资格的满足比例。确认不满足任一硬条件即可否决；满足结论还需科目与跨考条件完整。不是录取概率；未知项目不进入分母。",
      programs.flatMap(p => p.evidence), programs.length ? programs.flatMap(p => p.missing) : ["尚无结构化关联招生项目"]);
    return { occupation_id: role.id, title: role.title, simulation: role.simulation, rank: null as number | null,
      interest: interest(user, role), readiness: ability.dimension, transition: transition(user, role, now), admissions: admission,
      eligibility: hard, gaps: ability.gaps, programs,
      actions: [...ability.gaps.map(g => ({ action: `${g.label}：${g.action}`, evidence: g.evidence })), ...(hard.status !== "met" ? [{ action: "先核实岗位硬性资格，分数不能抵消资格限制。", evidence: hard.evidence }] : []),
        ...(admission.status !== "complete" ? [{ action: "查阅目标年份的官方招生目录与跨考规定，补齐科目和资格证据。", evidence: admission.evidence }] : [])],
    };
  });
  // No composite suitability percentage. Only comparable, complete interest + readiness can rank.
  const canRank = (r: typeof results[number]) => r.eligibility.status !== "not_met" && r.interest.status === "complete" && r.readiness.status === "complete";
  const ordered = results.sort((a, b) => Number(b.eligibility.status !== "not_met") - Number(a.eligibility.status !== "not_met") || Number(canRank(b)) - Number(canRank(a)) || (canRank(a) && canRank(b) ? b.interest.score! - a.interest.score! || b.readiness.score! - a.readiness.score! : 0) || a.occupation_id.localeCompare(b.occupation_id));
  let rank = 0;
  for (const r of ordered) if (canRank(r)) r.rank = ++rank;
  return { algorithm_version: "limen-match-v1.0", skill_standard_version: skillStandard.version, schema_version: "match-1", generated_at: now.toISOString(), simulation: user.simulation,
    ranking_basis: "仅完整兴趣和能力数据参与排序；按兴趣接近度、能力准备度降序，ID 稳定打破同分。硬资格不满足者不推荐；资格未知仍须核实。无综合适合度。",
    limitations: ["LIMEN 编辑性探索规则，尚未做预测效度验证", "未知不等于零；局部分数不能与完整分数直接比较", "招生事实和数值评分标准仍需人工核实", "P4 的大模型/关键词评价不直接进入能力分数"], results };
}
export type MatchReport = ReturnType<typeof match>;
