import { z } from "zod";
import { AppError } from "../errors";

export const areas = ["realistic", "investigative", "artistic", "social", "enterprising", "conventional"] as const;
export const areaSchema = z.enum(areas);
export const aboutSchema = z.object({
  api_version: z.string().min(1),
  database: z.object({ name: z.string().min(1), url: z.url() }),
  taxonomy: z.object({ name: z.string().min(1), url: z.url() }),
});
export const questionPageSchema = z.object({
  total: z.literal(30), start: z.number().int(), end: z.number().int(),
  next: z.url().optional(),
  answer_option: z.array(z.object({ value: z.number().int().min(1).max(5), name: z.string().min(1) })).length(5),
  question: z.array(z.object({ index: z.number().int().min(1).max(30), area: areaSchema, text: z.string().min(1) })).min(1),
});
export const resultsSchema = z.object({
  result: z.array(z.object({ code: areaSchema, title: z.string(), score: z.number().finite().nonnegative() })).length(6),
});
export const careersSchema = z.object({
  total: z.number().int().nonnegative(),
  career: z.array(z.object({ code: z.string().regex(/^\d{2}-\d{4}\.\d{2}$/), title: z.string().min(1), href: z.url() })),
});
export const answerSchema = z.array(z.object({ index: z.number().int().min(1).max(30), answer: z.number().int().min(1).max(5) }).strict()).length(30);

export function encodeAnswers(input: unknown): string {
  const parsed = answerSchema.safeParse(input);
  if (!parsed.success || new Set(parsed.data.map((a) => a.index)).size !== 30) {
    throw new AppError("INVALID_ANSWERS", 400, "请按原题号完整回答 30 道题，每题答案须为 1–5。");
  }
  return [...parsed.data].sort((a, b) => a.index - b.index).map((a) => a.answer).join("");
}

export function validateQuestions(pages: z.infer<typeof questionPageSchema>[]) {
  const questions = pages.flatMap((page) => page.question).sort((a, b) => a.index - b.index);
  if (questions.length !== 30 || questions.some((q, i) => q.index !== i + 1) || areas.some((area) => questions.filter((q) => q.area === area).length !== 5)) {
    throw new AppError("ONET_CONTRACT", 502, "官方题目数量、顺序或维度结构与 Mini-IP 30 题不符，已停止测评。");
  }
  for (const page of pages) {
    const options = [...page.answer_option].sort((a, b) => a.value - b.value);
    if (options.some((option, i) => option.value !== i + 1)) {
      throw new AppError("ONET_CONTRACT", 502, "官方答案编码与预期不符，已停止测评。");
    }
  }
  return questions;
}
