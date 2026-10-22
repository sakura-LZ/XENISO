import { profileSchema } from "@/lib/profile";
import { assessmentSchema } from "@/lib/assessment";
import { experienceSchema } from "@/lib/experience";
import { AppError } from "@/lib/errors";
import { adaptProfile } from "@/lib/match/adapters";
import { matchOccupations } from "@/lib/match/catalog";
import { match } from "@/lib/match/engine";
import { errorResponse, json } from "@/lib/server/http";
import { requireSession } from "@/lib/server/supabase";

export const dynamic = "force-dynamic";
export async function GET() {
  try {
    const { client, user } = await requireSession();
    const [p, a, e] = await Promise.all([
      client.from("profiles").select("payload,updated_at").eq("id", user.id).maybeSingle(),
      client.from("assessments").select("payload").eq("id", user.id).maybeSingle(),
      client.from("experiences").select("payload").eq("id", user.id).maybeSingle(),
    ]);
    if (p.error || a.error || e.error) throw new AppError("MATCH_READ", 502, "匹配依据读取失败，未使用合成资料替代。");
    const profile = profileSchema.safeParse(p.data?.payload);
    if (!profile.success) throw new AppError("MATCH_PROFILE", 409, "请先保存个人画像。");
    const assessment = a.data ? assessmentSchema.safeParse(a.data.payload) : null;
    const experience = e.data ? experienceSchema.safeParse(e.data.payload) : null;
    if ((assessment && !assessment.success) || (experience && !experience.success)) throw new AppError("MATCH_CONTRACT", 422, "已保存的测评或体验未通过校验，请更新资料。");
    const input = { user: adaptProfile(profile.data, assessment?.success ? assessment.data : null, experience?.success ? experience.data : null, p.data!.updated_at), occupations: matchOccupations, admissions: [] };
    return json({ input, report: match(input), data_status: "scoring_standards_pending", storage: "read_only" });
  } catch (error) { return errorResponse(error); }
}
