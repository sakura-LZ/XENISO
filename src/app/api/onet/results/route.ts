import { OnetClient } from "@/lib/onet/client";
import { requiredEnv } from "@/lib/server/env";
import { checkOrigin, errorResponse, json, limit, readJson } from "@/lib/server/http";
import { requireSession } from "@/lib/server/supabase";
import { z } from "zod";
import { answerSchema } from "@/lib/onet/contracts";
import { assessmentSchema } from "@/lib/assessment";
import { profileMissing, profileSchema } from "@/lib/profile";
import { AppError } from "@/lib/errors";

export const dynamic = "force-dynamic";
export async function POST(request: Request) {
  try {
    checkOrigin(request);
    const { client, user } = await requireSession();
    limit(`onet-results:${user.id}`, 5);
    const input = z.object({ answers: answerSchema, onet_version: z.string(), api_version: z.string() }).strict().safeParse(await readJson(request));
    if (!input.success) throw new AppError("INVALID_ANSWERS", 400, "请完整回答并使用当前版本问卷。");
    const profile = await client.from("profiles").select("payload").eq("id", user.id).maybeSingle();
    const parsedProfile = profileSchema.safeParse(profile.data?.payload);
    if (profile.error || !parsedProfile.success || profileMissing(parsedProfile.data).length) throw new AppError("PROFILE_REQUIRED", 409, "请先保存完整的基本学籍资料；GPA、论文等为选填项。");
    const onet = new OnetClient(requiredEnv("ONET_API_KEY"));
    const questions = await onet.questions();
    if (questions.onet_version !== input.data.onet_version || questions.api_version !== input.data.api_version) throw new AppError("VERSION_CHANGED", 409, "官方问卷版本已改变，请重新加载题目。");
    const result = await onet.results(input.data.answers);
    const assessment = assessmentSchema.parse({ ...result, answers: input.data.answers, onet_version: questions.onet_version, api_version: questions.api_version, question_snapshot: questions.questions, returned_at: new Date().toISOString() });
    const saved = await client.from("assessments").upsert({ id: user.id, payload: assessment, updated_at: assessment.returned_at });
    if (saved.error) throw new AppError("ASSESSMENT_SAVE_FAILED", 502, "官方已返回结果，但私有保存失败；请检查测评表迁移，未将本次结果标为保存成功。");
    return json({ saved: true, assessment });
  } catch (error) { return errorResponse(error); }
}
