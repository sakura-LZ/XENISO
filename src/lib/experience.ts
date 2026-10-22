import { z } from "zod";
import type { Evidence } from "./ai";
import { workbenchCoreSchema, calculateWorkbench } from "./experience/scenario";
import { getTemplate, stageTitles } from "./experience/templates";

export type Sample = { id: string; score: number; true_label: 0 | 1; device_group: "A" | "B" };
export type Device = "all" | "A" | "B";
export function generateSamples(seed = 20261020): Sample[] {
  let state = seed >>> 0;
  const random = () => { state = (Math.imul(state, 1664525) + 1013904223) >>> 0; return state / 4294967296; };
  return Array.from({ length: 100 }, (_, i) => {
    const device_group = i < 50 ? "A" : "B";
    const true_label = random() < .34 ? 1 : 0;
    // Independent teaching generator; B deliberately has more overlap.
    const score = device_group === "A" ? (true_label ? .4 : .05) + random() * .55 : (true_label ? .2 : .1) + random() * .75;
    return { id: `simulation-${i + 1}`, score: Math.round(Math.min(.99, score) * 1000) / 1000, true_label, device_group };
  });
}
export function evaluate(samples: Sample[], threshold: number, device: Device) {
  if (!Number.isFinite(threshold) || threshold < .1 || threshold > .9) throw new Error("阈值必须为 0.1–0.9。");
  const subset = samples.filter((s) => device === "all" || s.device_group === device);
  let tp = 0, fp = 0, tn = 0, fn = 0;
  for (const sample of subset) {
    const positive = sample.score >= threshold;
    if (positive && sample.true_label) tp++;
    else if (positive) fp++;
    else if (sample.true_label) fn++;
    else tn++;
  }
  const ratio = (a: number, b: number) => b === 0 ? null : a / b;
  return { n: subset.length, tp, fp, tn, fn, sensitivity: ratio(tp, tp + fn), specificity: ratio(tn, tn + fp), precision: ratio(tp, tp + fp), false_alerts: fp };
}
export const reflectionSchema = z.object({
  favorite_operation: z.string().trim().min(1).max(240), least_favorite_operation: z.string().trim().min(1).max(240),
  willingness_for_3_hours: z.number().int().min(1).max(5), followup_question: z.string().max(1000),
}).strict();
export const legacyExperienceSchema = z.object({
  simulation: z.literal(true), scenario_id: z.literal("wearable_ecg_alert_demo"), role: z.literal("ml_engineer"), seed: z.literal(20261020),
  threshold: z.number().min(.1).max(.9), device: z.enum(["all", "A", "B"]),
  tradeoff: z.enum(["sensitivity", "false_alerts", "balance"]),
  operations: z.object({ threshold_changed: z.literal(true), devices_compared: z.literal(true), tradeoff_chosen: z.literal(true) }).strict(),
  reflection: reflectionSchema, completed_at: z.iso.datetime(),
}).strict();
const answer = z.string().trim().min(10, "请写下具体内容（至少10字）。").max(3000);
export const careerExperienceSchema = z.object({
  version: z.literal("2.0"), simulation: z.literal(true),
  scenario_id: z.literal("hospital_ai_triage"), role: z.literal("medical_ai_product_manager"),
  direction_id: z.string().min(1).max(50), mode: z.enum(["project", "interview"]),
  outputs: z.tuple([answer, answer, answer]),
  reflection: reflectionSchema, completed_at: z.iso.datetime(),
  transcript: z.array(z.object({ speaker: z.enum(["user", "assistant"]), text: z.string().max(6000) }).strict()).max(60).default([]),
}).strict();
export const workbenchExperienceSchema = workbenchCoreSchema.safeExtend({
  reflection: reflectionSchema, completed_at: z.iso.datetime(),
  transcript: z.array(z.object({ speaker: z.enum(["user", "assistant"]), text: z.string().max(6000) }).strict()).max(60).default([]),
});
export type WorkbenchExperience = z.infer<typeof workbenchExperienceSchema>;
export const experienceSchema = z.union([careerExperienceSchema, legacyExperienceSchema, workbenchExperienceSchema]);
export type CareerExperience = z.infer<typeof careerExperienceSchema>;
export type Experience = z.infer<typeof experienceSchema>;
export function experienceEvidence(experience: Experience): Evidence[] {
  const context = { simulation: true, scenario_id: experience.scenario_id, role: experience.role, completed_at: experience.completed_at, ...("mode" in experience ? { mode: experience.mode, direction_id: experience.direction_id } : {}) };
  return [
    { ref: "experience_context", kind: "experience", value: context },
    { ref: "experience_feedback", kind: "experience", value: experience.reflection },
    ...("outputs" in experience ? experience.outputs.map((value, index) => ({ ref: `experience.outputs[${index}]`, kind: "experience" as const, value })) : []),
    ...(experience.scenario_id === "direction_workbench" ? [{ ref: "experience.operations", kind: "experience" as const, value: { template_id: experience.template_id, template_version: experience.template_version, source: experience.source, choices: experience.choices, results: calculateWorkbench(experience.template_id, experience.choices) } }] : []),
  ];
}
export function careerFeedback(experience: CareerExperience) {
  const rubric = experience.mode === "project" ? [
    { label: "需求分析", terms: ["患者", "医生", "护士", "分诊"], suggestion: "区分患者、分诊护士与医生的需求，并给出问题证据。" },
    { label: "优先级与取舍", terms: ["优先", "风险", "人工", "安全"], suggestion: "说明先做什么、暂缓什么，以及高风险情况如何交还人工。" },
    { label: "PRD与验证", terms: ["用户", "功能", "指标", "验证"], suggestion: "补齐目标用户、核心功能、验收指标与验证方法。" },
  ] : [
    { label: "经历表达", terms: ["我", "负责", "成果", "项目"], suggestion: "用具体经历交代本人职责和结果，避免只讲团队工作。" },
    { label: "案例推理", terms: ["风险", "人工", "验证", "患者"], suggestion: "补充临床风险、人工兜底和上线前验证。" },
    { label: "行动与复盘", terms: ["学习", "项目", "验证", "反馈"], suggestion: "把下一步落到可交付成果和获取反馈的方法。" },
  ];
  return rubric.map((item, i) => ({ stage: item.label, evidence: experience.outputs[i], mentioned: item.terms.filter(term => experience.outputs[i].includes(term)), suggestion: item.suggestion, basis: "文本线索与编辑性检查项，不评定能力高低" }));
}
export function evaluationCard(experience: Experience) {
  const parsed = experienceSchema.parse(experience);
  if (parsed.scenario_id === "direction_workbench") return { ...parsed, results: calculateWorkbench(parsed.template_id, parsed.choices), feedback: experiencePresentation(parsed).stage_names.map((stage, i) => ({ stage, evidence: parsed.outputs[i], suggestion: "对照操作结果核查解释，说明哪些内容仍需验证。" })), limitation: "simulation教学操作，不评定专业能力或临床资格。" };
  if (parsed.scenario_id === "hospital_ai_triage") return { ...parsed, feedback: careerFeedback(parsed), competencies: ["需求分析", "沟通表达", "产品取舍"], limitation: "simulation职业练习；文本检查和自述意愿不是能力评分。" };
  return { ...parsed, generator_version: "limen-teaching-lcg-v1", source: "independently generated pedagogical sample, not patient records or paper measurements", metrics: evaluate(generateSamples(parsed.seed), parsed.threshold, parsed.device), competencies: ["模型评价", "泛化验证", "工程取舍"], limitation: "合成教学数据，不用于诊疗；反思是兴趣自述，不是能力得分。" };
}
export function experiencePresentation(experience: Experience) {
  if (experience.scenario_id === "direction_workbench") {
    const template = getTemplate(experience.direction_id, experience.template_id);
    return { role: template.role, title: template.title, stage_names: stageTitles(template, experience.mode), deliverable: template.deliverable };
  }
  if (experience.scenario_id === "hospital_ai_triage") return { role: "医学 AI 产品经理", title: "医院辅助分诊", stage_names: experience.mode === "project" ? ["需求分析", "优先级与取舍", "PRD与验证"] : ["经历表达", "案例推理", "行动与复盘"], deliverable: "项目与面试成果" };
  return { role: "算法探索者", title: "历史模型评价体验", stage_names: ["阈值选择", "设备比较", "取舍"], deliverable: "模型评价卡" };
}
