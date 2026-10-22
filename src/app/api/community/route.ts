import { communityActionSchema } from "@/lib/community";
import { AppError } from "@/lib/errors";
import { checkOrigin, errorResponse, json, limit, readJson } from "@/lib/server/http";
import { requireSession } from "@/lib/server/supabase";
export const dynamic = "force-dynamic";
async function member() { const session = await requireSession(); if (session.user.is_anonymous || !session.user.email_confirmed_at) throw new AppError("LOGIN_REQUIRED", 401, "请验证邮箱后参与交流。"); return session; }
export async function GET() {
  try { const { client } = await member(); const { data, error } = await client.rpc("community_list"); if (error) throw new AppError("COMMUNITY_UNAVAILABLE", 503, "交流社区暂未开放，请稍后再来。"); return json({ posts: data }); }
  catch (error) { return errorResponse(error); }
}
export async function POST(request: Request) {
  try {
    checkOrigin(request); const { client, user } = await member(); limit(`community:${user.id}`, 6);
    const parsed = communityActionSchema.safeParse(await readJson(request)); if (!parsed.success) throw new AppError("INVALID_POST", 400, "请检查标题、正文与公开发布确认。");
    const input = parsed.data;
    const result = input.action === "publish" ? await client.rpc("community_publish", { post_kind: input.post.kind, post_title: input.post.title, post_body: input.post.body }) : input.action === "delete" ? await client.rpc("community_delete", { post_id: input.id }) : await client.rpc("community_report", { target_id: input.id, flag_reason: input.reason });
    if (result.error) throw new AppError("COMMUNITY_ACTION_FAILED", 503, "操作未完成。请稍后重试；社区可能尚未开放或发布过于频繁。");
    if (input.action === "delete" && !result.data) throw new AppError("POST_NOT_OWNED", 403, "只能删除自己发布的内容。");
    return json({ ok: true });
  } catch (error) { return errorResponse(error); }
}
