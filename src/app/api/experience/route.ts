import { AppError } from "@/lib/errors";
import { experienceSchema, evaluationCard } from "@/lib/experience";
import { checkOrigin, errorResponse, json, limit, readJson } from "@/lib/server/http";
import { requireSession } from "@/lib/server/supabase";
export const dynamic = "force-dynamic";
export async function GET() {
  try {
    const { client, user } = await requireSession();
    const { data, error } = await client.from("experiences").select("payload").eq("id", user.id).maybeSingle();
    if (error) throw new AppError("EXPERIENCE_READ", 502, "体验读取失败，请确认体验表迁移。");
    if (!data) return json({ experience: null });
    const parsed = experienceSchema.safeParse(data.payload);
    if (!parsed.success) throw new AppError("EXPERIENCE_CONTRACT", 502, "体验记录结构不符。");
    return json({ experience: parsed.data, card: evaluationCard(parsed.data) });
  } catch (error) { return errorResponse(error); }
}
export async function PUT(request: Request) {
  try {
    checkOrigin(request); const { client, user } = await requireSession(); limit(`experience:${user.id}`);
    const parsed = experienceSchema.safeParse(await readJson(request));
    if (!parsed.success) throw new AppError("INVALID_EXPERIENCE", 400, "请完成三项操作与必要反思后保存。");
    const { error } = await client.from("experiences").upsert({ id: user.id, payload: parsed.data, updated_at: new Date().toISOString() });
    if (error) throw new AppError("EXPERIENCE_SAVE", 502, "体验私有保存失败，请确认迁移与行级权限。");
    return json({ saved: true, card: evaluationCard(parsed.data) });
  } catch (error) { return errorResponse(error); }
}
