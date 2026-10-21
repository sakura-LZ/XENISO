import { z } from "zod";
import { answerSchema, resultsSchema, careersSchema } from "./onet/contracts";
export const assessmentSchema = z.object({
  source: z.literal("onet_live"), instrument: z.literal("Mini-IP-30"),
  onet_version: z.string().min(1), api_version: z.string().min(1), returned_at: z.iso.datetime(),
  answers: answerSchema, scores: resultsSchema.shape.result, careers: careersSchema.shape.career, career_total: z.number().int().nonnegative(),
  question_snapshot: z.array(z.object({ index: z.number().int().min(1).max(30), original_en: z.string(), area: z.string(), onet_version: z.string() })).length(30),
}).superRefine((value, ctx) => {
  if (new Set(value.answers.map((a) => a.index)).size !== 30 || new Set(value.scores.map((s) => s.code)).size !== 6 || new Set(value.question_snapshot.map((q) => q.index)).size !== 30) ctx.addIssue({ code: "custom", message: "测评索引或六维结果重复。" });
});
export type AssessmentResult = z.infer<typeof assessmentSchema>;
