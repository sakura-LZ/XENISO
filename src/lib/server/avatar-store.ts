import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { AppError } from "../errors";

export type OwnedAvatarSession = { request_id: string; owner_id: string; session_id: string | null; claim_hash: string };
export type AvatarStore = {
  reserve(requestId: string, claimHash: string): Promise<void>;
  find(requestId: string, sessionId: string): Promise<OwnedAvatarSession | null>;
  active(): Promise<OwnedAvatarSession | null>;
  bind(requestId: string, sessionId: string, capability: string): Promise<boolean>;
  close(requestId: string, capability: string): Promise<void>;
};
const fields = "request_id,owner_id,session_id,claim_hash";
function unavailable(): never { throw new AppError("AVATAR_STORAGE", 503, "数字人会话存储暂不可用，请确认数据库迁移后重试。"); }

export function avatarStore(client: SupabaseClient): AvatarStore {
  return {
    async reserve(requestId, claimHash) {
      const { error } = await client.rpc("avatar_reserve", { target_request: requestId, target_claim_hash: claimHash });
      if (!error) return;
      if (error.code === "23505" || error.message === "AVATAR_ACTIVE") throw new AppError("AVATAR_ACTIVE", 409, "请先结束当前数字人会话。");
      if (error.message === "AVATAR_RATE_LIMITED") throw new AppError("RATE_LIMITED", 429, "连接过于频繁，请一分钟后重试。");
      if (error.message === "AVATAR_BUSY") throw new AppError("AVATAR_BUSY", 429, "数字人正在忙，请稍后重试。");
      unavailable();
    },
    async find(requestId, sessionId) {
      let query = client.from("avatar_sessions").select(fields).is("closed_at", null);
      query = requestId ? query.eq("request_id", requestId) : query.eq("session_id", sessionId);
      const { data, error } = await query.maybeSingle();
      if (error) unavailable();
      return data;
    },
    async active() {
      const { data, error } = await client.from("avatar_sessions").select(fields).is("closed_at", null).maybeSingle();
      if (error) unavailable();
      return data;
    },
    async bind(requestId, sessionId, capability) {
      const { data, error } = await client.rpc("avatar_bind", { target_request: requestId, target_session: sessionId, capability });
      if (error) unavailable();
      return data === true;
    },
    async close(requestId, capability) {
      const { data, error } = await client.rpc("avatar_close", { target_request: requestId, capability });
      if (error || data !== true) unavailable();
    },
  };
}
