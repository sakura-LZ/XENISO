import { profileSchema } from "@/lib/profile";
import { assessmentSchema } from "@/lib/assessment";
import { experienceSchema } from "@/lib/experience";
import { AppError } from "@/lib/errors";
import { adaptProfile } from "@/lib/match/adapters";
import { matchAdmissions } from "@/lib/match/admissions-catalog";
import { matchOccupations } from "@/lib/match/catalog.official";
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
    // 招生标准由生成脚本落盘，读取失败会显式抛错；缺失时返回空数组而不是编造条目。
    const admissions = matchAdmissions();
    const input = { user: adaptProfile(profile.data, assessment?.success ? assessment.data : null, experience?.success ? experience.data : null, p.data!.updated_at), occupations: matchOccupations, admissions };
    const report = match(input);
    // 把「标准是否真的可用」如实告诉客户端：兴趣或岗位要求仍未知的岗位不能出分，界面必须显示未知。
    const standards = matchOccupations.map(occupation => ({
      id: occupation.id, standard_version: occupation.standard_version ?? null,
      interest: occupation.interests.status,
      rated_skills: occupation.skills.filter(skill => skill.required_level.status === "known").length,
      mapped_skills: occupation.skills.length,
    }));
    return json({ input, report, admissions_count: admissions.length, standards, storage: "read_only" });
  } catch (error) { return errorResponse(error); }
}
