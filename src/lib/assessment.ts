import { z } from "zod";
import { answerSchema, areaSchema, areas, resultsSchema, careersSchema } from "./onet/contracts";
export const assessmentSchema = z.object({
  source: z.literal("onet_live"), instrument: z.literal("Mini-IP-30"),
  onet_version: z.string().min(1), api_version: z.string().min(1), returned_at: z.iso.datetime(),
  answers: answerSchema, scores: resultsSchema.shape.result, careers: careersSchema.shape.career, career_total: z.number().int().nonnegative(),
  question_snapshot: z.array(z.object({
    index: z.number().int().min(1).max(30),
    // Validate without trimming or rewriting the official text.
    original_en: z.string().refine((text) => text.trim().length > 0),
    area: areaSchema, onet_version: z.string().min(1),
  })).length(30),
}).superRefine((value, ctx) => {
  if (new Set(value.answers.map((a) => a.index)).size !== 30 || new Set(value.scores.map((s) => s.code)).size !== 6 || new Set(value.question_snapshot.map((q) => q.index)).size !== 30) ctx.addIssue({ code: "custom", message: "测评索引或六维结果重复。" });
  if (areas.some((area) => value.question_snapshot.filter((q) => q.area === area).length !== 5)) ctx.addIssue({ code: "custom", message: "测评题目维度结构与 Mini-IP 30 题不符。" });
  if (value.question_snapshot.some((q) => q.onet_version !== value.onet_version)) ctx.addIssue({ code: "custom", message: "测评题目快照与保存的版本不一致。" });
  if (value.careers.length > value.career_total || (value.career_total > 0 && value.careers.length === 0)) ctx.addIssue({ code: "custom", message: "测评职业列表与返回总数不一致。" });
});
export type AssessmentResult = z.infer<typeof assessmentSchema>;
