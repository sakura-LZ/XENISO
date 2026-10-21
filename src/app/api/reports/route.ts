import { z } from "zod";
import { AppError } from "@/lib/errors";
import { assessmentSchema } from "@/lib/assessment";
import { experienceSchema } from "@/lib/experience";
import { profileMissing, profileSchema } from "@/lib/profile";
import { actionPlan, initialReport } from "@/lib/reports";
import { requestAiExplanation, type Evidence } from "@/lib/ai";
import { requiredEnv } from "@/lib/server/env";
import { checkOrigin, errorResponse, json, limit, readJson } from "@/lib/server/http";
import { requireSession } from "@/lib/server/supabase";
import { r2PlanningSchema } from "@/lib/planning";

export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  try {
    const kind = z.enum(["R1", "R2"]).safeParse(new URL(request.url).searchParams.get("kind"));
    if (!kind.success) throw new AppError("REPORT_KIND", 400, "请选择 R1 或 R2。");
    const { client, user } = await requireSession();
    const { data, error } = await client.from("reports").select("payload,updated_at").eq("id", user.id).eq("kind", kind.data).maybeSingle();
    if (error) throw new AppError("REPORT_READ", 502, "报告读取失败，请确认报告表迁移。");
    return json({ report: data?.payload ?? null, updated_at: data?.updated_at ?? null });
  } catch (error) { return errorResponse(error); }
}
export async function POST(request: Request) {
  try {
    checkOrigin(request);
    const { client, user } = await requireSession();
    const input = z.discriminatedUnion("kind", [
      z.object({ kind: z.literal("R1") }).strict(),
      z.object({ kind: z.literal("R2"), direction_id: z.string().min(1).max(50), planning: r2PlanningSchema, alternative_ids: z.array(z.string().min(1).max(50)).max(2).default([]) }).strict(),
    ]).safeParse(await readJson(request));
    if (!input.success) throw new AppError("REPORT_INPUT", 400, "报告请求或计划预算无效，请检查本次填写的条件。");
    if (process.env.LIMEN_ENABLE_LLM !== "true") throw new AppError("AI_DISABLED", 503, "AI 解释服务未启用。当前仅可查看规则证据草案。");
    const config = { baseUrl: requiredEnv("LLM_BASE_URL"), key: requiredEnv("LLM_API_KEY"), model: requiredEnv("LLM_MODEL") };
    limit(`ai:${user.id}`, 2); limit("ai:global", 10);
    const [p, a] = await Promise.all([
      client.from("profiles").select("payload").eq("id", user.id).maybeSingle(),
      client.from("assessments").select("payload").eq("id", user.id).maybeSingle(),
    ]);
    if (p.error || a.error) throw new AppError("REPORT_INPUT_READ", 502, "报告依据读取失败，请确认迁移与权限。");
    const profile = profileSchema.safeParse(p.data?.payload), assessment = assessmentSchema.safeParse(a.data?.payload);
    if (!profile.success || profileMissing(profile.data).length) throw new AppError("PROFILE_REQUIRED", 409, "请先保存完整基本学籍，其他资料可留空。");
    if (!assessment.success) throw new AppError("ASSESSMENT_REQUIRED", 409, "尚无有效官方兴趣结果，不能生成正式报告。");
    const r1 = initialReport(profile.data, assessment.data);
    const evidence: Evidence[] = [
      ...assessment.data.scores.map((s) => ({ ref: `onet_mini_ip.scores.${s.code}`, kind: "interest" as const, value: { ...s, source: "onet_live", version: assessment.data.onet_version } })),
      ...r1.evidence.map((e) => ({ ref: e.ref, kind: "transfer" as const, value: e })),
      ...r1.candidates.map((c) => ({ ref: `limen_direction_map:${c.direction.id}`, kind: "direction" as const, value: { name: c.direction.name, occupations: c.occupations, tasks: c.direction.work_tasks, editorial: true } })),
    ];
    let rules: unknown = r1;
    if (input.data.kind === "R2") {
      const [e, previous] = await Promise.all([
        client.from("experiences").select("payload").eq("id", user.id).maybeSingle(),
        client.from("reports").select("payload").eq("id", user.id).eq("kind", "R1").maybeSingle(),
      ]);
      if (e.error || previous.error) throw new AppError("REPORT_INPUT_READ", 502, "体验或 R1 依据读取失败。");
      const experience = experienceSchema.safeParse(e.data?.payload);
      if (!experience.success || !previous.data) throw new AppError("EXPERIENCE_REQUIRED", 409, "请先生成 R1，并将已完成的工作台体验保存到当前访客。");
      let plan;
      try { plan = actionPlan(profile.data, input.data.direction_id, experience.data, new Date(), assessment.data, input.data.planning, input.data.alternative_ids); }
      catch (error) { if (error instanceof AppError) throw error; throw new AppError("DIRECTION_REQUIRED", 400, "请选择目录内目标方向。"); }
      if (!plan.planning_ready) throw new AppError("PLAN_REQUIRED", 409, "请填写有效目标年份、每周时间、升学路径与预算。");
      rules = { ...plan, formal_ready: true };
      evidence.push(
        { ref: "experience_feedback", kind: "experience", value: experience.data.reflection },
        { ref: `limen_direction_map:${plan.direction.id}:selected`, kind: "direction", value: { name: plan.direction.name, tasks: plan.direction.work_tasks, selected_by_user: true } },
        { ref: "competency_gaps", kind: "gap", value: plan.gaps },
        { ref: "report_input.planning", kind: "planning", value: { ...input.data.planning, source: "user_explicit_report_input", admissions: "未核验", effort: "未知" } },
        ...plan.alternative_directions.map((d) => ({ ref: `limen_direction_map:${d.id}:alternative`, kind: "direction" as const, value: { name: d.name, tasks: d.work_tasks, selected_by_user: true, role: "subjective_alternative" } })),
      );
    }
    const ai = await requestAiExplanation(config, evidence);
    const report = { kind: input.data.kind, source: "llm_live", rules, ai, evidence, assessment_returned_at: assessment.data.returned_at, limitations: ["探索辅助，不代表报考资格", "AI 解释须与所列证据对照；引用存在不代表语义已自动核实", "暂无已核验招生项目", "工作台数据为合成教学示例"] };
    const saved = await client.from("reports").upsert({ id: user.id, kind: input.data.kind, payload: report, updated_at: ai.generated_at }, { onConflict: "id,kind" });
    if (saved.error) throw new AppError("REPORT_SAVE", 502, "AI 已返回解释，但私有报告保存失败，未标记成功。");
    return json({ saved: true, report });
  } catch (error) { return errorResponse(error); }
}
