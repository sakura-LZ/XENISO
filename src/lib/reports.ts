import { directions, findDirection, type Direction } from "./directions";
import { profileSchema, type Profile } from "./profile";
import { assessmentSchema, type AssessmentResult } from "./assessment";
import { experiencePresentation, type Experience } from "./experience";
import { parseR2Planning } from "./planning";
import { buildPathwayPlan } from "./planning-stages";
import { occupationSkillMatches } from "./skill-match";

export function skillEvidence(profile: Profile) {
  return [
    ...profile.tech_skills.map((s, i) => ({ skill: s.skill, evidence: s.evidence || "仅提供自评，尚无成果证据", status: "主观自评，未独立验证", ref: `user_profile.tech_skills[${i}]` })).filter((s) => s.skill.trim()),
    ...profile.wetlab_skills.map((s, i) => ({ skill: s.skill, evidence: s.experience_evidence || "尚无成果证据", status: "实验经历自述，未独立验证", ref: `user_profile.wetlab_skills[${i}]` })).filter((s) => s.skill.trim()),
    ...profile.research_projects.map((s, i) => ({ skill: s.title.trim() ? s.methods || "研究项目经历（待确认具体技能）" : "", evidence: `${s.title}；职责：${s.responsibility || "未填写"}；成果：${s.outcomes || "未填写"}`, status: "项目自述，未独立验证", ref: `user_profile.research_projects[${i}]` })).filter((s) => s.skill.trim()),
    ...profile.courses.map((s, i) => ({ skill: s.course_name, evidence: s.score === null ? "填写过该课程，成绩未知" : `自填成绩 ${s.score}/${s.score_scale ?? "满分未填写"}`, status: "课程记录自填，未核验", ref: `user_profile.courses[${i}]` })),
  ];
}
export function initialReport(profile: Profile, assessment: AssessmentResult | null) {
  const matches = assessment ? directions.map((direction) => ({ direction, occupations: direction.onet.filter((o) => assessment.careers.some((c) => c.code === o.code)) })).filter((m) => m.occupations.length > 0).sort((a, b) => Math.min(...a.occupations.map((o) => assessment.careers.findIndex((c) => c.code === o.code))) - Math.min(...b.occupations.map((o) => assessment.careers.findIndex((c) => c.code === o.code)))) : [];
  const candidates = matches.slice(0, 3);
  return {
    version: "limen-r1-rules-v2", status: assessment ? "official_interest_with_rule_based_explanation" : "draft_missing_official_interest", ai_status: "not_generated",
    scores: assessment?.scores ?? [], evidence: skillEvidence(profile), candidates,
    // 职业技能匹配：岗位侧要求来自知识库原文（见 lib/skill-requirements），只对照画像记录，不评分。
    occupation_skills: occupationSkillMatches(profile, candidates.map((candidate) => candidate.direction.id)),
    outside_directory: assessment?.careers.filter((career) => !directions.some((d) => d.onet.some((o) => o.code === career.code))) ?? [],
    unknowns: ["编程、数学与研究技能尚未经独立任务验证", "未填写不等于没有能力；无技术课程也不代表不适合探索", ...(!assessment ? ["缺少 O*NET 官方计分与职业匹配，不能推荐兴趣方向，也无法列出对应职业的技能要求"] : []), "职业技能要求按知识库原文整理，不是统一招聘标准；没有记录不等于不具备", "招生资格与具体考试要求未核实"],
  };
}
export function competencyGaps(profile: Profile, direction: Direction) {
  const evidence = skillEvidence(profile);
  return direction.skills.map((skill) => {
    const matches = evidence.filter((e) => e.skill.toLocaleLowerCase().includes(skill.toLocaleLowerCase()) || skill.toLocaleLowerCase().includes(e.skill.toLocaleLowerCase()));
    return { skill, status: matches.length ? "已自述/待核实" : "信息不足/待了解", evidence_refs: matches.map((m) => m.ref), note: matches.length ? "名称匹配仅用于整理证据，不代表已掌握。" : "尚未获得相关证据，不推断学习潜力。" };
  });
}
/** 升学路径还没定时用的旧版任务：只做探索，不排时间表。 */
function legacyTasks(direction: Direction, source: string) {
  const courses = direction.courses.map((course, i) => ({ id: `course-${i + 1}`, title: `了解与练习：${course}`, why: `对应 ${direction.name} 的编辑性课程路径，具体先修要求需核验。`, source, deliverable: `${course} 的概念笔记与一个可复现练习`, dependencies: i === 0 ? [] as string[] : [`course-${i}`], priority: "基础准备", estimated_effort_range: null, stage: `学习阶段 ${i + 1}` }));
  return [...courses,
    { id: "research", title: "设计一个小型研究复现", why: `通过实际活动了解“${direction.work_tasks[0]}”是否愿意继续做。`, source, deliverable: "研究问题、公开或合成数据来源、方法、局限与可复现结果", dependencies: courses.length ? [courses[courses.length - 1].id] : [], priority: "实践探索", estimated_effort_range: null, stage: "项目阶段" },
    { id: "admissions", title: "核验目标年份与路径的官方招生条件", why: "当前没有已核验招生条目，不能确认报考资格或统一考试科目。", source: "verifiedAdmissions:empty", deliverable: "官方 URL、招生年份、专业代码、资格要求、考试科目与核验日期", dependencies: [] as string[], priority: "并行核验", estimated_effort_range: null, stage: "现在开始" },
  ];
}
export function actionPlan(profile: Profile, directionId: string, experience: Experience | null, now = new Date(), assessment: AssessmentResult | null = null, planningInput?: unknown, alternativeIds: string[] = []) {
  const submittedPlanning = planningInput === undefined ? null : parseR2Planning(planningInput, now);
  if (submittedPlanning) profile = { ...profile, transition_year: submittedPlanning.transition_year, weekly_hours: submittedPlanning.weekly_hours, pathway: submittedPlanning.pathway };
  const direction = findDirection(directionId);
  if (!direction) throw new Error("请选择目录内的目标方向。");
  if (alternativeIds.length > 2 || new Set(alternativeIds).size !== alternativeIds.length || alternativeIds.includes(directionId)) throw new Error("请选择最多两个不同于主目标的备选方向。");
  const alternatives = alternativeIds.map((id) => { const alternative = findDirection(id); if (!alternative) throw new Error("备选方向不在目录内。"); return alternative; });
  const source = `limen_direction_map:${direction.id}`;
  const currentYear = now.getUTCFullYear();
  const hasParameters = profileSchema.safeParse(profile).success && profile.weekly_hours !== null && profile.weekly_hours > 0 && profile.transition_year !== null && profile.transition_year >= currentYear && profile.pathway !== "未决定";
  const official = assessment === null ? null : assessmentSchema.parse(assessment);
  // 跨考指离开临床去别的学科；留在临床不算跨考，也就不需要补先修。
  const crossMajor = direction.id !== "medicine";
  const pathwayPlan = hasParameters && profile.transition_year !== null
    ? buildPathwayPlan({ pathway: profile.pathway, direction, transitionYear: profile.transition_year, now, crossMajor })
    : null;
  const tasks = pathwayPlan ? pathwayPlan.tasks : legacyTasks(direction, source);
  return { version: submittedPlanning ? "limen-r2-rules-v3" : "limen-r2-rules-v2", direction, gaps: competencyGaps(profile, direction), tasks, experience: experience?.reflection ?? null,
    planning_input: submittedPlanning,
    alternative_directions: alternatives,
    interest: official ? { source: official.source, scores: official.scores, onet_version: official.onet_version, api_version: official.api_version, returned_at: official.returned_at } : null,
    experience_relevance: experience ? `本次为${experiencePresentation(experience).role}的${"mode" in experience && experience.mode === "interview" ? "模拟面试" : "项目练习"}，仅覆盖部分教学活动；不能据此判断整个方向的适配性或执业资格。` : "尚未完成职业体验。",
    planning_ready: hasParameters, formal_ready: false,
    planning: pathwayPlan ? { target_year: profile.transition_year, weekly_hours: profile.weekly_hours, pathway: profile.pathway, official_deadlines_verified: false,
      stages: pathwayPlan.stages, position: pathwayPlan.position, horizon: pathwayPlan.horizon, weekly_budget: pathwayPlan.weekly_budget } : null,
    risks: ["课程缺少经验证的工作量范围，无法判断是否能在目标年份前完成；不承诺进度", ...(!hasParameters ? ["缺少目标年份、正数每周时间或已选升学路径，未生成时间计划"] : []), ...(!experience ? ["尚未完成体验与明确反馈，仅能浏览规划结构"] : []), ...(profile.transition_year !== null && profile.transition_year < currentYear ? ["目标年份已经过去，请更新计划条件"] : [])],
  };
}
