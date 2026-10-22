import { communityAuthSchema } from "@/lib/community";
import { AppError } from "@/lib/errors";
import { checkOrigin, errorResponse, json, limit, readJson } from "@/lib/server/http";
import { requireSession, storeSession, supabase } from "@/lib/server/supabase";
export async function POST(request: Request) {
  try {
    checkOrigin(request); const { client, user } = await requireSession(); limit(`community-auth:${user.id}`, 4); limit("community-auth-global", 12);
    const parsed = communityAuthSchema.safeParse(await readJson(request)); if (!parsed.success) throw new AppError("AUTH_INPUT", 400, "请检查邮箱与验证码。");
    const { email, token, mode } = parsed.data;
    if (token) {
      const { data, error } = await supabase().auth.verifyOtp({ email, token, type: mode === "link" ? "email_change" : "email" });
      if (error || !data.session) throw new AppError("OTP_FAILED", 400, "验证码无效或已过期，请重新发送。");
      if (mode === "link" && data.user?.id !== user.id) throw new AppError("ACCOUNT_MISMATCH", 409, "账号验证不一致，请重新登录。");
      await storeSession(data.session); return json({ verified: true });
    }
    const result = mode === "link" ? await client.auth.updateUser({ email }) : await supabase().auth.signInWithOtp({ email, options: { shouldCreateUser: false } });
    if (result.error) throw new AppError("EMAIL_FAILED", 502, "验证码发送未完成，请稍后重试或选择已有账号登录。");
    return json({ sent: true });
  } catch (error) { return errorResponse(error); }
}
