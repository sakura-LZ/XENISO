import { profileSchema } from "@/lib/profile";
import { AppError } from "@/lib/errors";
import { checkOrigin, errorResponse, json, limit, readJson } from "@/lib/server/http";
import { requireSession } from "@/lib/server/supabase";

export const dynamic = "force-dynamic";
export async function GET() {
  try {
    const { client, user } = await requireSession();
    const { data, error } = await client.from("profiles").select("payload,updated_at").eq("id", user.id).maybeSingle();
    if (error) throw new AppError("PROFILE_READ_FAILED", 502, "资料读取失败，请确认数据库迁移已执行。");
    return json({ profile: data?.payload ?? null });
  } catch (error) { return errorResponse(error); }
}
export async function PUT(request: Request) {
  try {
    checkOrigin(request);
    const { client, user } = await requireSession();
    limit(`profile:${user.id}`);
    const parsed = profileSchema.safeParse(await readJson(request, 256 * 1024));
    if (!parsed.success) throw new AppError("INVALID_PROFILE", 400, parsed.error.issues[0].message);
    const { error } = await client.from("profiles").upsert({ id: user.id, payload: parsed.data, updated_at: new Date().toISOString() });
    if (error) throw new AppError("PROFILE_SAVE_FAILED", 502, "资料保存失败，请确认数据库迁移和行级权限。");
    return json({ saved: true });
  } catch (error) { return errorResponse(error); }
}
