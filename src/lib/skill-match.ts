import type { Profile } from "./profile";
import {
  findSkillRequirement,
  type DirectionSkillRequirement,
  type RequiredSkill,
  type SkillEvidence,
  type SkillKind,
  type SkillRequirementLevel,
} from "./skill-requirements";

/**
 * R1「职业技能匹配」：把知识库里职业原文要求的技能，逐项对照用户画像里已有的记录。
 *
 * 三条硬规则（来自 AGENTS.md 与报告契约）：
 * 1. 不评分、不排序、不给综合适合度——只给「有记录 / 仅自述 / 信息不足」三种证据状态。
 * 2. 名称匹配只用于整理证据，不代表已掌握；信息不足也不等于不具备。
 * 3. 岗位侧要求必须是知识库原文（带 record_id 与 quote），不可用本文件的别名反推「官方要求」。
 */
export type SkillMatchStatus = "recorded" | "self_reported" | "unknown";
export const skillMatchStatusLabels: Record<SkillMatchStatus, string> = { recorded: "有记录", self_reported: "仅自述", unknown: "信息不足" };
export const skillMatchStatusNotes: Record<SkillMatchStatus, string> = {
  recorded: "画像里有课程/项目/成果记录，未独立核验。",
  self_reported: "只有技能自评、自学或英语自填，尚无成果证据。",
  unknown: "画像里没有找到对应记录；未记录不等于不具备。",
};

export type UserSkillEvidenceKind = "course" | "tech_skill" | "wetlab_skill" | "research_project" | "paper" | "competition" | "self_study" | "english" | "research_field";
export type UserSkillEvidence = { ref: string; text: string; kind: UserSkillEvidenceKind };
export type SkillMatchRow = {
  id: string;
  name: string;
  kind: SkillKind;
  requirement: SkillRequirementLevel;
  status: SkillMatchStatus;
  status_label: string;
  note: string;
  evidence: UserSkillEvidence[];
  kb: SkillEvidence[];
};
export type OccupationSkillMatch = {
  direction_id: string;
  direction_name: string;
  occupation_label: string;
  coverage_note: string;
  skills: SkillMatchRow[];
  summary: { total: number; recorded: number; self_reported: number; unknown: number };
  note: string;
};

const recordedKinds = new Set<UserSkillEvidenceKind>(["course", "research_project", "paper", "competition", "research_field"]);

export function profileSkillEvidence(profile: Profile): UserSkillEvidence[] {
  const rows: UserSkillEvidence[] = [];
  profile.courses.forEach((course, index) => rows.push({ ref: `user_profile.courses[${index}]`, text: course.course_name, kind: "course" }));
  profile.tech_skills.forEach((skill, index) => rows.push({ ref: `user_profile.tech_skills[${index}]`, text: `${skill.skill} ${skill.evidence}`.trim(), kind: "tech_skill" }));
  profile.wetlab_skills.forEach((skill, index) => rows.push({ ref: `user_profile.wetlab_skills[${index}]`, text: `${skill.skill} ${skill.experience_evidence}`.trim(), kind: "wetlab_skill" }));
  profile.research_projects.forEach((project, index) => rows.push({
    ref: `user_profile.research_projects[${index}]`,
    text: [project.title, project.topic, project.methods, project.outcomes, project.responsibility].filter(Boolean).join(" "),
    kind: "research_project",
  }));
  profile.papers.forEach((paper, index) => rows.push({ ref: `user_profile.papers[${index}]`, text: [paper.title, paper.venue, paper.type].filter(Boolean).join(" "), kind: "paper" }));
  profile.competitions.forEach((competition, index) => rows.push({ ref: `user_profile.competitions[${index}]`, text: competition, kind: "competition" }));
  profile.self_study.forEach((item, index) => rows.push({ ref: `user_profile.self_study[${index}]`, text: item, kind: "self_study" }));
  profile.research_fields.forEach((field, index) => rows.push({ ref: `user_profile.research_fields[${index}]`, text: field, kind: "research_field" }));
  if (profile.english) {
    const text = [profile.english.description, profile.english.cet4 && `CET4 ${profile.english.cet4}`, profile.english.cet6 && `CET6 ${profile.english.cet6}`, profile.english.other].filter(Boolean).join(" ");
    if (text.trim()) rows.push({ ref: "user_profile.english", text, kind: "english" });
  }
  return rows.filter((row) => row.text.trim().length > 0);
}

const latin = /^[a-z0-9+#./ -]+$/;
function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
export function aliasMatches(text: string, alias: string) {
  const needle = alias.trim().toLocaleLowerCase();
  if (!needle) return false;
  const haystack = text.toLocaleLowerCase();
  if (!latin.test(needle)) return haystack.includes(needle);
  // 短英文缩写（sql/his/ct…）必须整词命中，否则 "ct" 会命中 "project"。
  if (needle.length <= 3) return new RegExp(`(^|[^a-z0-9])${escapeRegExp(needle)}(?=[^a-z0-9]|$)`, "i").test(haystack);
  return haystack.includes(needle);
}

function matchRow(skill: RequiredSkill, evidence: UserSkillEvidence[]): SkillMatchRow {
  const matched = evidence.filter((row) => skill.aliases.some((alias) => aliasMatches(row.text, alias)));
  const unique = [...new Map(matched.map((row) => [row.ref, row])).values()];
  const status: SkillMatchStatus = unique.some((row) => recordedKinds.has(row.kind)) ? "recorded" : unique.length ? "self_reported" : "unknown";
  return {
    id: skill.id,
    name: skill.name,
    kind: skill.kind,
    requirement: skill.requirement,
    status,
    status_label: skillMatchStatusLabels[status],
    note: skillMatchStatusNotes[status],
    evidence: unique.slice(0, 4),
    kb: skill.evidence,
  };
}

export function occupationSkillMatch(profile: Profile, directionId: string): OccupationSkillMatch | null {
  const requirement: DirectionSkillRequirement | null = findSkillRequirement(directionId);
  if (!requirement) return null;
  const evidence = profileSkillEvidence(profile);
  const skills = requirement.skills.map((skill) => matchRow(skill, evidence));
  const summary = {
    total: skills.length,
    recorded: skills.filter((skill) => skill.status === "recorded").length,
    self_reported: skills.filter((skill) => skill.status === "self_reported").length,
    unknown: skills.filter((skill) => skill.status === "unknown").length,
  };
  const quoteCount = requirement.skills.reduce((sum, skill) => sum + skill.evidence.length, 0);
  return {
    direction_id: requirement.direction_id,
    direction_name: requirement.direction_name,
    occupation_label: requirement.occupation_label,
    coverage_note: requirement.coverage_note,
    skills,
    summary,
    note: `要求来自知识库原文（${quoteCount} 条引用）。这里只按名称/别名对照画像记录，不代表已掌握或未掌握，也不合成适合度分数。`,
  };
}

export function occupationSkillMatches(profile: Profile, directionIds: string[]): OccupationSkillMatch[] {
  return [...new Set(directionIds)].map((directionId) => occupationSkillMatch(profile, directionId)).filter((match): match is OccupationSkillMatch => Boolean(match));
}
