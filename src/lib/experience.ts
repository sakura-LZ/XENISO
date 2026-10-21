import { z } from "zod";

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
export const experienceSchema = z.object({
  simulation: z.literal(true), scenario_id: z.literal("wearable_ecg_alert_demo"), role: z.literal("ml_engineer"), seed: z.literal(20261020),
  threshold: z.number().min(.1).max(.9), device: z.enum(["all", "A", "B"]),
  tradeoff: z.enum(["sensitivity", "false_alerts", "balance"]),
  operations: z.object({ threshold_changed: z.literal(true), devices_compared: z.literal(true), tradeoff_chosen: z.literal(true) }).strict(),
  reflection: reflectionSchema, completed_at: z.iso.datetime(),
}).strict();
export type Experience = z.infer<typeof experienceSchema>;
export function evaluationCard(experience: Experience) {
  const parsed = experienceSchema.parse(experience);
  return { ...parsed, generator_version: "limen-teaching-lcg-v1", source: "independently generated pedagogical sample, not patient records or paper measurements", metrics: evaluate(generateSamples(parsed.seed), parsed.threshold, parsed.device), competencies: ["模型评价", "泛化验证", "工程取舍"], limitation: "合成教学数据，不用于诊疗；反思是兴趣自述，不是能力得分。" };
}
