import { z } from "zod";
import { AppError } from "./errors";

const hours = z.number().finite().min(0).max(168);
export const r2PlanningSchema = z.object({
  transition_year: z.number().int().min(2026).max(2100),
  weekly_hours: z.number().finite().positive().max(168),
  pathway: z.enum(["统考", "推免", "申请制"]),
  weekly_allocation: z.object({ foundation: hours, practice: hours, review: hours }).strict(),
}).strict().superRefine((value, ctx) => {
  const total = value.weekly_allocation.foundation + value.weekly_allocation.practice + value.weekly_allocation.review;
  if (total <= 0 || total > value.weekly_hours) ctx.addIssue({ code: "custom", path: ["weekly_allocation"], message: "分配总时间必须为正，且不得超过每周可用时间。" });
});
export type R2PlanningInput = z.infer<typeof r2PlanningSchema>;
export function parseR2Planning(input: unknown, now = new Date()): R2PlanningInput {
  const parsed = r2PlanningSchema.safeParse(input);
  if (!parsed.success || parsed.data.transition_year < now.getUTCFullYear()) throw new AppError("PLAN_INPUT", 400, "计划条件或预算无效。年份不得已过期，分配总时间需为正且不超过每周可用时间。");
  return parsed.data;
}
