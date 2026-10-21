import { AppError } from "@/lib/errors";
import { assessmentSchema } from "@/lib/assessment";
import { errorResponse, json } from "@/lib/server/http";
import { requireSession } from "@/lib/server/supabase";
export const dynamic = "force-dynamic";
export async function GET() {
  try {
    const { client, user } = await requireSession();
    const { data, error } = await client.from("assessments").select("payload").eq("id", user.id).maybeSingle();
    if (error) throw new AppError("ASSESSMENT_READ_FAILED", 502, "测评记录读取失败，请确认数据库迁移。");
    if (!data) return json({ assessment: null });
    const parsed = assessmentSchema.safeParse(data.payload);
    if (!parsed.success) throw new AppError("ASSESSMENT_INVALID", 502, "已有测评记录不符合当前契约，未生成报告。");
    return json({ assessment: parsed.data });
  } catch (error) { return errorResponse(error); }
}
