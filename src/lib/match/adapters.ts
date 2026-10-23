import type { Profile } from "../profile";
import type { AssessmentResult } from "../assessment";
import type { Experience } from "../experience";
import { areas } from "../onet/contracts";
import { known, unknown, userSchema, skillLabels, type Evidence, type MatchUser } from "./contracts";

// Exact aliases only: free-text extraction can propose a tag but cannot establish a numeric level.
export const skillAliases = { python: "python", Python: "python", 统计分析: "statistics", 概率统计: "statistics", 研究设计: "research_design", 机器学习: "machine_learning", 模型评估: "model_evaluation", 数据管理: "data_management", 沟通表达: "communication", 产品需求分析: "product_requirements", 临床问题理解: "clinical_reasoning" } as const;
export function resolveSkill(name: string) {
  if (Object.hasOwn(skillLabels, name)) return name as keyof typeof skillLabels;
  const label = Object.entries(skillLabels).find(([, value]) => value === name);
  if (label) return label[0] as keyof typeof skillLabels;
  return Object.hasOwn(skillAliases, name) ? skillAliases[name as keyof typeof skillAliases] : null;
}
export function adaptProfile(profile: Profile, assessment: AssessmentResult | null, experience: Experience | null, updatedAt: string): MatchUser {
  const evidence = (field: string): Evidence => ({ ref: `profiles.payload.${field}`, source_kind: "self_report", url: null, published_at: null, retrieved_at: updatedAt, verification: "self_reported", locator: field });
  const fact = (v: string, field: string) => v.trim() ? known(v, evidence(field)) : unknown<string>();
  const skills = [...profile.tech_skills.map(s => ({ name: s.skill, raw: s.self_reported_level })), ...profile.wetlab_skills.map(s => ({ name: s.skill, raw: s.level }))];
  const mapped = skills.flatMap(s => { const id = resolveSkill(s.name); return id ? [{ skill_id: id, level: { ...unknown<number>(), evidence: [{ ...evidence("skills"), locator: `${s.name}；原自评：${s.raw || "未填"}；尚未映射 LIMEN 等级` }] } }] : []; });
  const result: MatchUser = {
    schema_version: "match-2", simulation: false, medical_background: fact(profile.major, "major"),
    research_projects: profile.research_projects.filter(p => p.title.trim()).map((p, i) => ({ title: p.title, evidence: [{ ...evidence(`research_projects[${i}]`), locator: JSON.stringify(p) }] })),
    interests: assessment ? known({ instrument: assessment.instrument, version: assessment.onet_version,
      scores: Object.fromEntries(areas.map(area => [area, assessment.scores.find(s => s.code === area)!.score])) as Record<typeof areas[number], number>,
      scale: null }, { ref: "assessments.payload.scores", source_kind: "official", url: "https://services.onetcenter.org/", published_at: null, retrieved_at: assessment.returned_at, verification: "verified", locator: `原始六维/版本保留；量尺待核验；原题号和答案码留在 assessments.payload；API ${assessment.api_version}` }) : unknown(),
    skills: mapped.filter((s, i) => mapped.findIndex(m => m.skill_id === s.skill_id) === i),
    qualifications: { major: fact(profile.major, "major"), degree: unknown(), graduation_year: unknown(), pathway: profile.pathway === "未决定" ? unknown() : fact(profile.pathway, "pathway"), recommendation_eligible: unknown() },
    preferences: profile.work_preferences.length ? known(profile.work_preferences, evidence("work_preferences")) : unknown(),
    target_year: profile.transition_year, study_intent: known(profile.pathway, evidence("pathway")),
    weekly_hours: profile.weekly_hours === null ? unknown() : known(profile.weekly_hours, evidence("weekly_hours")),
    experiences: [], unmapped_skills: skills.filter(s => !resolveSkill(s.name)).map(s => `${s.name || "未命名"}：${s.raw || "未填"}`),
  };
  // Current simulated task feedback supplies willingness only. It never grants a skill level.
  if (experience?.scenario_id === "hospital_ai_triage") result.experiences.push({
    id: `experience:${experience.completed_at}`, occupation_id: "medical_ai_pm", scenario_id: experience.scenario_id, mode: experience.mode, simulation: true,
    completed_at: experience.completed_at, artifacts: experience.outputs,
    willingness: known(experience.reflection.willingness_for_3_hours, { ...evidence("experience.reflection.willingness_for_3_hours"), ref: "experiences.payload.reflection.willingness_for_3_hours", locator: "simulation 职业任务后的自述投入意愿" }), evaluations: [],
  });
  return userSchema.parse(result);
}
