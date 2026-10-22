import { AppError } from "@/lib/errors";
import { checkOrigin, errorResponse, json, limit } from "@/lib/server/http";
import { clearSession, currentSession, storeSession, supabase, requireSession } from "@/lib/server/supabase";
import { avatarStore } from "@/lib/server/avatar-store";
import { activeAvatarSession, avatarSession } from "@/lib/server/xingyun";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function GET() {
  try {
    const session = await currentSession();
    return json({ user: session ? { id: session.user.id, anonymous: session.user.is_anonymous } : null });
  } catch (error) { return errorResponse(error); }
}
export async function POST(request: Request) {
  try {
    checkOrigin(request);
    const existing = await currentSession();
    if (existing) return json({ user: { id: existing.user.id, anonymous: existing.user.is_anonymous } });
    limit("anonymous-sign-in", 10);
    const { data, error } = await supabase().auth.signInAnonymously();
    if (error || !data.session || !data.user) throw new AppError("ANONYMOUS_AUTH_FAILED", 502, "匿名登录失败，请确认项目已启用匿名 Auth，或稍后重试。");
    await storeSession(data.session);
    return json({ user: { id: data.user.id, anonymous: data.user.is_anonymous } }, 201);
  } catch (error) { return errorResponse(error); }
}
export async function DELETE(request: Request) {
  try {
    checkOrigin(request);
    const { client, user } = await requireSession();
    limit(`delete:${user.id}`, 5);
    const store = avatarStore(client);
    const active = await activeAvatarSession(user.id, store);
    if (active) await avatarSession("DELETE", user.id, { ...active, stop_reason: "account_deletion" }, store);
    const { error } = await client.rpc("delete_own_account");
    if (error) throw new AppError("DELETE_FAILED", 502, "删除未完成，访客会话仍保留，请稍后重试或联系维护者。");
    await clearSession();
    return json({ deleted: true });
  } catch (error) { return errorResponse(error); }
}
