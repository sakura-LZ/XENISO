import { z } from "zod";
import data from "../../data/knowledge/skill-requirements.json";
import { directions } from "./directions";

/**
 * 知识库职业技能要求（R1「职业技能匹配」维度的岗位侧依据）。
 *
 * 数据由 scripts/knowledge/build-skill-requirements.ts 生成：每条 evidence 的 quote 都是
 * data/knowledge/*.collected.json 里 kb_records 原文的连续子串（record_id + quote_start/quote_end
 * 可回查）。这里只做结构校验与索引；编辑信息（技能名、分类、aliases）与官方原文分开放。
 */
export const skillKinds = ["tool", "method", "domain", "engineering", "communication"] as const;
export const skillRequirementLevels = ["must", "plus"] as const;
export const skillKindLabels: Record<(typeof skillKinds)[number], string> = {
  tool: "工具/语言",
  method: "方法/能力",
  domain: "领域知识",
  engineering: "工程实践",
  communication: "沟通表达",
};
export const skillRequirementLabels: Record<(typeof skillRequirementLevels)[number], string> = { must: "必备", plus: "加分" };

const evidenceSchema = z.object({
  record_id: z.string().min(3).max(120),
  role_id: z.string().min(1).max(50),
  category: z.enum(["occupation", "recruitment", "admissions", "industry", "learning"]),
  field: z.string().min(1).max(80),
  needle: z.string().min(2).max(200),
  quote: z.string().min(8).max(400),
  quote_start: z.number().int().nonnegative(),
  quote_end: z.number().int().positive(),
  ellipsis_start: z.boolean(),
  ellipsis_end: z.boolean(),
  source_id: z.string().nullable(),
  source_url: z.string().nullable(),
  organization: z.string().nullable(),
  jurisdiction: z.enum(["CN", "US", "global"]).nullable(),
  published_at: z.string().nullable(),
  collected_file: z.string().min(1).max(160),
}).strict();
const skillSchema = z.object({
  id: z.string().regex(/^[a-z][a-z0-9_]{1,39}$/),
  name: z.string().min(1).max(80),
  kind: z.enum(skillKinds),
  requirement: z.enum(skillRequirementLevels),
  aliases: z.array(z.string().min(1).max(60)).min(1).max(10),
  evidence: z.array(evidenceSchema).min(1).max(3),
}).strict();
const directionSchema = z.object({
  direction_id: z.string().min(1).max(50),
  direction_name: z.string().min(1).max(80),
  role_id: z.string().min(1).max(50),
  occupation_label: z.string().min(1).max(160),
  coverage_note: z.string().min(1).max(400),
  skills: z.array(skillSchema).min(4).max(7),
}).strict();
const datasetSchema = z.object({
  schema_version: z.literal("skill-requirements-1"),
  generated_at: z.iso.datetime({ offset: true }),
  note: z.string().min(1),
  method: z.string().min(1),
  source: z.object({ kb_records: z.string().min(1), edited_by: z.string().min(1), extraction: z.literal("verbatim_quote_verified") }).strict(),
  directions: z.array(directionSchema).min(1),
  limitations: z.array(z.string().min(1)).min(1),
}).strict();

export type SkillKind = (typeof skillKinds)[number];
export type SkillRequirementLevel = (typeof skillRequirementLevels)[number];
export type SkillEvidence = z.infer<typeof evidenceSchema>;
export type RequiredSkill = z.infer<typeof skillSchema>;
export type DirectionSkillRequirement = z.infer<typeof directionSchema>;
export type SkillRequirementDataset = z.infer<typeof datasetSchema>;

function load(): SkillRequirementDataset {
  const parsed = datasetSchema.parse(data);
  const known = new Set(directions.map((direction) => direction.id));
  const seen = new Set<string>();
  for (const direction of parsed.directions) {
    if (!known.has(direction.direction_id)) throw new Error(`技能要求数据含未知方向：${direction.direction_id}`);
    if (seen.has(direction.direction_id)) throw new Error(`技能要求数据方向重复：${direction.direction_id}`);
    seen.add(direction.direction_id);
    const expectedName = directions.find((item) => item.id === direction.direction_id)?.name;
    if (expectedName && expectedName !== direction.direction_name) throw new Error(`技能要求数据方向名称与方向目录不一致：${direction.direction_id}`);
    const skillIds = new Set<string>();
    for (const skill of direction.skills) {
      if (skillIds.has(skill.id)) throw new Error(`技能要求数据技能 id 重复：${direction.direction_id}/${skill.id}`);
      skillIds.add(skill.id);
    }
  }
  return parsed;
}

export const skillRequirementDataset: SkillRequirementDataset = load();
export const skillRequirements: DirectionSkillRequirement[] = skillRequirementDataset.directions;
export const skillRequirementByDirection: Record<string, DirectionSkillRequirement> = Object.fromEntries(skillRequirements.map((direction) => [direction.direction_id, direction]));
export function findSkillRequirement(directionId: string) {
  return skillRequirementByDirection[directionId] ?? null;
}
