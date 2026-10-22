import { z } from "zod";
import { getTemplate, experienceTemplates } from "./templates";
import { operationResult, validChoice, type ChoiceState } from "./operations";

export const choiceSchema = z.tuple([z.string().nullable(), z.string().nullable(), z.string().nullable()]);
export const workbenchCoreSchema = z.object({
  version: z.literal("3.0"), simulation: z.literal(true), scenario_id: z.literal("direction_workbench"),
  template_id: z.string().refine(id => experienceTemplates.some(template => template.id === id)),
  template_version: z.literal("e1-1"), source: z.literal("curated_template"),
  direction_id: z.string(), role: z.string(), mode: z.enum(["project", "interview"]),
  choices: choiceSchema, outputs: z.tuple([z.string().trim().min(10).max(3000), z.string().trim().min(10).max(3000), z.string().trim().min(10).max(3000)]),
}).strict().superRefine((value, ctx) => {
  try {
    const template = getTemplate(value.direction_id, value.template_id);
    if (template.role !== value.role) throw new Error();
    for (let i = 0; i < 3; i++) if (!validChoice(template.id, i, value.choices[i])) throw new Error();
  } catch { ctx.addIssue({ code: "custom", message: "场景、方向、身份或操作不符。" }); }
});
export function calculateWorkbench(templateId: string, choices: ChoiceState) {
  return [0, 1, 2].map(stage => operationResult(templateId, choices, stage));
}
