import "server-only";
import { createClient, type Session } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { AppError } from "../errors";
import { supabaseConfig } from "./env";

const accessCookie = "limen-access";
const refreshCookie = "limen-refresh";
export function supabase(accessToken?: string) {
  const { url, key } = supabaseConfig();
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: {
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
      fetch: async (input, init) => {
        try { return await fetch(input, { ...init, cache: "no-store", signal: AbortSignal.timeout(12000), redirect: "error" }); }
        catch { throw new Error("Supabase network request failed"); }
      },
    },
  });
}
export async function storeSession(session: Session) {
  const jar = await cookies();
  const options = { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax" as const, path: "/" };
  // Keep the expired access token long enough to refresh on a later visit.
  jar.set(accessCookie, session.access_token, { ...options, maxAge: 60 * 60 * 24 * 30 });
  jar.set(refreshCookie, session.refresh_token, { ...options, maxAge: 60 * 60 * 24 * 30 });
}
export async function clearSession() {
  const jar = await cookies();
  jar.delete(accessCookie);
  jar.delete(refreshCookie);
}
export async function currentSession() {
  const jar = await cookies();
  const access = jar.get(accessCookie)?.value;
  const refresh = jar.get(refreshCookie)?.value;
  if (!access && !refresh) return null;
  const auth = supabase();
  if (access) {
    const { data, error } = await auth.auth.getUser(access);
    if (!error && data.user) return { client: supabase(access), user: data.user };
    if (error && (error.status ?? 500) >= 500) throw new AppError("AUTH_UNAVAILABLE", 502, "访客服务暂时不可用，请稍后重试。");
  }
  if (refresh) {
    const { data, error } = await auth.auth.refreshSession({ refresh_token: refresh });
    if (!error && data.session && data.user) {
      await storeSession(data.session);
      return { client: supabase(data.session.access_token), user: data.user };
    }
    if (error && (error.status ?? 500) >= 500) throw new AppError("AUTH_UNAVAILABLE", 502, "访客服务暂时不可用，请稍后重试。");
  }
  await clearSession();
  return null;
}
export async function requireSession() {
  const session = await currentSession();
  if (!session) throw new AppError("SESSION_REQUIRED", 401, "请先创建匿名访客会话。");
  return session;
}
