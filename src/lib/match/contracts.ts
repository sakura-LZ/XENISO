import { z } from "zod";
import { areas } from "../onet/contracts";

export const skillLabels = {
  python: "Python 编程", statistics: "统计分析", machine_learning: "机器学习",
  clinical_reasoning: "临床问题理解", research_design: "研究设计", product_requirements: "产品需求分析",
  communication: "沟通表达", data_management: "数据管理", model_evaluation: "模型评价",
} as const;
export const skillStandard = {
  version: "limen-skills-1",
  levels: ["未接触", "在指导下完成", "独立完成基础任务", "独立完成复杂任务", "指导与评审"],
  importance: "1 辅助 / 2 常用 / 3 核心 / 4 关键 / 5 必备；LIMEN 编辑性权重，必须单独审核，不由招聘措辞或模型推断",
} as const;
export const skillIdSchema = z.enum(Object.keys(skillLabels) as [keyof typeof skillLabels, ...(keyof typeof skillLabels)[]]);
const id = z.string().min(1).max(120);
export const evidenceSchema = z.object({
  ref: id, source_kind: z.enum(["official", "self_report", "editorial", "simulation"]),
  url: z.url().refine(s => { const u = new URL(s); return u.protocol === "https:" && !u.username && !u.password; }).nullable(),
  published_at: z.iso.date().nullable(), retrieved_at: z.iso.datetime({ offset: true }),
  verification: z.enum(["verified", "self_reported", "unverified", "simulation"]),
  locator: z.string().min(1).max(2000),
}).strict().superRefine((v, c) => {
  if (v.source_kind === "official" && !v.url) c.addIssue({ code: "custom", message: "Official evidence requires URL" });
  if ((v.source_kind === "simulation") !== (v.verification === "simulation")) c.addIssue({ code: "custom", message: "Simulation evidence must be explicit" });
});
export type Evidence = z.infer<typeof evidenceSchema>;
export function factSchema<T extends z.ZodType>(value: T) {
  return z.object({ value: value.nullable(), status: z.enum(["known", "unknown", "unverified", "not_applicable"]), evidence: z.array(evidenceSchema).max(30), reliability: z.number().min(0).max(1).optional() }).strict().superRefine((v, c) => {
    const rawValue = (v as { value?: unknown }).value;
    if (v.status === "known" && (rawValue == null || !v.evidence.length)) c.addIssue({ code: "custom", message: "Known facts require value and evidence" });
    if (v.status !== "known" && rawValue !== null) c.addIssue({ code: "custom", message: "Unconfirmed values belong in source evidence, not computation" });
  });
}
// reliability 是测量可靠性(0–1)：用于对自评等级做衰减校正，不用于改变岗位标准本身。
export type Fact<T> = { value: T | null; status: "known" | "unknown" | "unverified" | "not_applicable"; evidence: Evidence[]; reliability?: number };
export const unknown = <T>(): Fact<T> => ({ value: null, status: "unknown", evidence: [] });
export const known = <T>(value: T, evidence: Evidence): Fact<T> => ({ value, status: "known", evidence: [evidence] });
const text = z.string().min(1).max(2000);
const level = z.number().int().min(0).max(4);
const vectorSchema = z.object(Object.fromEntries(areas.map(a => [a, z.number().finite()])) as Record<typeof areas[number], z.ZodNumber>).strict();
const interestSchema = z.object({
  instrument: text, version: text, scores: vectorSchema,
  scale: z.object({ min: z.number().finite(), max: z.number().finite() }).strict().nullable(),
}).strict().superRefine((v, c) => {
  if (v.scale && (v.scale.min >= v.scale.max || Object.values(v.scores).some(n => n < v.scale!.min || n > v.scale!.max))) c.addIssue({ code: "custom", message: "Invalid interest scale or score" });
});
export const requirementSchema = z.object({
  id, field: z.enum(["major", "degree", "graduation_year", "pathway", "recommendation_eligible"]),
  allowed: z.array(z.string().min(1)).min(1), evidence: z.array(evidenceSchema).min(1),
}).strict();
export const occupationSchema = z.object({
  schema_version: z.literal("match-2"), id, title: text, simulation: z.boolean(),
  direction_ids: z.array(id), onet_codes: z.array(z.string().regex(/^\d{2}-\d{4}\.\d{2}$/)),
  mapping_basis: text, tasks: factSchema(z.array(text).min(1)),
  interests: factSchema(interestSchema),
  // must_have：非补偿项。任一已知不足即封顶准备度，不允许被其余加权项平均掉。
  skills: z.array(z.object({ skill_id: skillIdSchema, importance: factSchema(z.number().int().min(1).max(5)), required_level: factSchema(level), must_have: z.boolean().optional() }).strict()).max(50),
  professional_background: factSchema(text), hard_requirements: factSchema(z.array(requirementSchema)),
  preferences: factSchema(z.array(text)),
}).strict();
export const admissionSchema = z.object({
  schema_version: z.literal("match-2"), id, simulation: z.boolean(), university: text, major_code: text, major_name: text,
  year: z.number().int().min(2026).max(2100), pathway: z.enum(["统考", "推免", "申请制"]),
  occupation_ids: z.array(id).min(1), mapping_evidence: z.array(evidenceSchema).min(1),
  valid_through: z.iso.date(), exam_subjects: factSchema(z.array(text)),
  research_directions: factSchema(z.array(text)), cross_major: factSchema(text),
  hard_requirements: factSchema(z.array(requirementSchema)),
}).strict();
export const experienceSignalSchema = z.object({
  id, occupation_id: id, scenario_id: id, mode: z.enum(["project", "interview"]), simulation: z.literal(true),
  completed_at: z.iso.datetime({ offset: true }), artifacts: z.array(text).max(10),
  willingness: factSchema(z.number().int().min(1).max(5)),
  evaluations: z.array(z.object({ skill_id: skillIdSchema, level: factSchema(level), rubric_version: text, evaluator: z.enum(["human", "deterministic", "llm"]) }).strict()).max(50),
}).strict();
export const userSchema = z.object({
  schema_version: z.literal("match-2"), simulation: z.boolean(),
  medical_background: factSchema(text), research_projects: z.array(z.object({ title: text, evidence: z.array(evidenceSchema).min(1) }).strict()),
  interests: factSchema(interestSchema), skills: z.array(z.object({ skill_id: skillIdSchema, level: factSchema(level) }).strict()).max(50),
  qualifications: z.object({ major: factSchema(text), degree: factSchema(text), graduation_year: factSchema(text), pathway: factSchema(text), recommendation_eligible: factSchema(text) }).strict(),
  preferences: factSchema(z.array(text)), target_year: z.number().int().min(2026).max(2100).nullable(),
  study_intent: factSchema(z.enum(["统考", "推免", "申请制", "未决定"])), weekly_hours: factSchema(z.number().finite().min(0).max(168)),
  experiences: z.array(experienceSignalSchema).max(100), unmapped_skills: z.array(text),
}).strict();
export const matchInputSchema = z.object({
  user: userSchema, occupations: z.array(occupationSchema).min(1).max(50), admissions: z.array(admissionSchema).max(100),
}).strict().superRefine((v, c) => {
  const unique = (values: string[], label: string) => { if (new Set(values).size !== values.length) c.addIssue({ code: "custom", message: `Duplicate ${label}` }); };
  unique(v.occupations.map(o => o.id), "occupation"); unique(v.admissions.map(a => a.id), "admission");
  unique(v.user.skills.map(s => s.skill_id), "user skill"); unique(v.user.experiences.map(e => e.id), "experience");
  for (const o of v.occupations) unique(o.skills.map(s => s.skill_id), "occupation skill");
  for (const e of v.user.experiences) {
    unique(e.evaluations.map(s => s.skill_id), "experience skill");
    if (!v.occupations.some(o => o.id === e.occupation_id)) c.addIssue({ code: "custom", message: "Dangling experience occupation" });
  }
  for (const a of v.admissions) if (a.occupation_ids.some(id => !v.occupations.some(o => o.id === id))) c.addIssue({ code: "custom", message: "Dangling occupation reference" });
  if ([...v.occupations, ...v.admissions].some(o => o.simulation !== v.user.simulation)) c.addIssue({ code: "custom", message: "Do not mix synthetic and personal records" });
  if (!v.user.simulation && JSON.stringify([v.user.interests, v.user.skills, v.occupations, v.admissions]).includes('"source_kind":"simulation"')) c.addIssue({ code: "custom", message: "Synthetic scoring evidence in personal records" });
  // Job standards and institutional rules cannot be established by a user's self assessment.
  for (const entity of [...v.occupations, ...v.admissions]) {
    if (JSON.stringify(entity).includes('"source_kind":"self_report"')) c.addIssue({ code: "custom", message: "Self reports cannot establish external standards" });
  }
});
export type MatchInput = z.infer<typeof matchInputSchema>;
export type MatchUser = z.infer<typeof userSchema>;
export type Occupation = z.infer<typeof occupationSchema>;
export type Admission = z.infer<typeof admissionSchema>;
