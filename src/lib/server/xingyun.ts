import "server-only";
import { createHash, createHmac } from "node:crypto";
import { AppError } from "../errors";
import type { AvatarStore, OwnedAvatarSession } from "./avatar-store";
import { avatarPresenters, isAvatarPresenter, type AvatarPresenter } from "../avatar-presenters";

const gateway = "https://nebula-agent.xingyun3d.com/user/v1/ttsa_v2/session";
const credentialNames: Record<AvatarPresenter, [string, string]> = {
  medicine: ["XINGYUN_MEDICINE_APP_ID", "XINGYUN_MEDICINE_APP_SECRET"],
  biomed_eng: ["XINGYUN_ENGINEERING_APP_ID", "XINGYUN_ENGINEERING_APP_SECRET"],
  cs_ai: ["XINGYUN_COMPUTING_APP_ID", "XINGYUN_COMPUTING_APP_SECRET"],
  med_informatics: ["XINGYUN_INFORMATICS_APP_ID", "XINGYUN_INFORMATICS_APP_SECRET"],
};
type Credentials = { presenter: AvatarPresenter; appId: string; secret: string };
function credentialsFrom(presenter: AvatarPresenter, [idName, secretName]: [string, string]): Credentials | null {
  const appId = process.env[idName]?.trim();
  const secret = process.env[secretName]?.trim();
  return appId && secret ? { presenter, appId, secret } : null;
}
function originalMedicineCredentials() { return credentialsFrom("medicine", ["XINGYUN_APP_ID", "XINGYUN_APP_SECRET"]); }
function credentials(presenter: AvatarPresenter): Credentials | null {
  const names = credentialNames[presenter];
  // Keep older deployments working until the dedicated medical application is configured.
  if (presenter === "medicine" && names.every(name => !process.env[name]?.trim())) return originalMedicineCredentials();
  return credentialsFrom(presenter, names);
}
export function requestedAvatarPresenter(value: string | null): AvatarPresenter {
  if (value === null) return "medicine";
  if (!isAvatarPresenter(value)) throw new AppError("INVALID_AVATAR", 400, "数字人分组无效。");
  return value;
}
function capability(config: Credentials, owner: string, requestId: string, legacy = false) {
  const scope = legacy ? ["limen-avatar-v1", owner, requestId] : ["limen-avatar-v2", config.presenter, config.appId, owner, requestId];
  return createHmac("sha256", config.secret).update(JSON.stringify(scope)).digest("hex");
}
function claimHash(value: string) { return createHash("sha256").update(value).digest("hex"); }
function verifyOwnership(row: OwnedAvatarSession, owner: string) {
  if (row.owner_id === owner) for (const presenter of avatarPresenters) {
    const config = credentials(presenter);
    if (!config) continue;
    const claim = capability(config, owner, row.request_id);
    if (row.claim_hash === claimHash(claim)) return { config, claim };
  }
  // The original application now serves informatics. Its older medical v1/v2
  // claims must still use that application's credentials when they are released.
  const original = originalMedicineCredentials();
  if (row.owner_id === owner && original) for (const legacy of [false, true]) {
    const claim = capability(original, owner, row.request_id, legacy);
    if (row.claim_hash === claimHash(claim)) return { config: original, claim };
  }
  throw new AppError("AVATAR_OWNERSHIP", 403, "无法操作此会话，请确认原数字人应用配置仍有效。");
}
export async function activeAvatarSession(owner: string, store: AvatarStore) {
  const row = await store.active();
  if (!row) return null;
  verifyOwnership(row, owner);
  return { request_id: row.request_id, ...(row.session_id ? { session_id: row.session_id } : {}) };
}

function comparePoints(a: string, b: string) {
  const left = Array.from(a, c => c.codePointAt(0)!);
  const right = Array.from(b, c => c.codePointAt(0)!);
  for (let i = 0; i < Math.min(left.length, right.length); i++) if (left[i] !== right[i]) return left[i] - right[i];
  return left.length - right.length;
}
function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).sort(([a], [b]) => comparePoints(a, b)).map(([key, item]) => [key, canonical(item)]));
  return value;
}
export function avatarConfigured(presenter: AvatarPresenter = "medicine") { return credentials(presenter) !== null; }

async function providerRequest(method: "POST" | "DELETE", body: Record<string, unknown>, config: Credentials) {
  const encoded = JSON.stringify(canonical(body));
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const signatureBody = encoded.replace(/[^\u0000-\u007e]/g, c => `\\u${c.charCodeAt(0).toString(16).padStart(4, "0")}`).replace(/ /g, "");
  const token = createHash("md5").update(`${new URL(gateway).pathname.toLowerCase()}${method.toLowerCase()}${signatureBody}${config.secret}${timestamp}`).digest("hex");
  const response = await fetch(gateway, { method, redirect: "error", cache: "no-store", signal: AbortSignal.timeout(25000), headers: { "Content-Type": "application/json", "X-APP-ID": config.appId, "X-TOKEN": token, "X-TIMESTAMP": timestamp }, body: encoded });
  if (!response.ok) throw new AppError("AVATAR_UPSTREAM", 502, "数字人服务暂时不可用，请稍后重试。");
  return response.json();
}

export async function avatarSession(method: "POST" | "DELETE", owner: string, input: unknown, store: AvatarStore, presenter: AvatarPresenter = "medicine") {
  if (!isAvatarPresenter(presenter)) throw new AppError("INVALID_AVATAR", 400, "数字人分组无效。");
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new AppError("INVALID_AVATAR", 400, "会话请求无效。");
  let body = { ...input as Record<string, unknown> };
  const requestId = typeof body.request_id === "string" ? body.request_id : "";
  if (requestId.length > 160 || (requestId && !/^[\w.-]+$/.test(requestId))) throw new AppError("INVALID_AVATAR", 400, "会话编号无效。");
  let ownedRequest: string;
  let config: Credentials;
  let claim: string;
  if (method === "POST") {
    const selected = credentials(presenter);
    if (!selected) throw new AppError("AVATAR_NOT_CONFIGURED", 503, "当前方向的数字人暂未配置，请先使用任务工作台。");
    config = selected;
    if (!requestId) throw new AppError("INVALID_AVATAR", 400, "缺少会话编号。");
    const allowed = new Set(["request_id", "tag", "gateway_type", "config", "session_speak_req_id"]);
    if (Object.keys(body).some(key => !allowed.has(key))) throw new AppError("INVALID_AVATAR", 400, "当前数字人配置不受支持。");
    ownedRequest = requestId;
    claim = capability(config, owner, requestId);
    await store.reserve(requestId, claimHash(claim));
  } else {
    const sid = typeof body.session_id === "string" ? body.session_id : "";
    if ((!requestId && !sid) || sid.length > 256) throw new AppError("INVALID_AVATAR", 400, "会话编号无效。");
    const match = await store.find(requestId, sid);
    if (!match || (sid && match.session_id !== sid)) throw new AppError("AVATAR_OWNERSHIP", 403, "无法结束此会话。");
    const owned = verifyOwnership(match, owner);
    config = owned.config;
    claim = owned.claim;
    ownedRequest = match.request_id;
    body = { request_id: ownedRequest, ...(match.session_id ? { session_id: match.session_id } : {}), stop_reason: typeof body.stop_reason === "string" ? body.stop_reason.slice(0, 100) : "user" };
  }
  let upstreamCreated = false;
  try {
    const result = await providerRequest(method, body, config);
    if (method === "POST") {
      const sid = result?.data?.session_id;
      upstreamCreated = true;
      if (typeof sid !== "string" || sid.length > 256 || !result?.data?.resource_pack) throw new AppError("AVATAR_SESSION_FAILED", 502, "数字人未能建立会话，请检查服务配置与额度。");
      if (!await store.bind(ownedRequest, sid, claim)) throw new AppError("AVATAR_CANCELLED", 409, "会话已取消，请重新连接。");
    } else await store.close(ownedRequest, claim);
    return result as unknown;
  } catch (error) {
    // A transport failure may arrive after the provider created the session.
    // Keep ownership so SDK cleanup can DELETE by request_id instead of leaking it.
    if (method === "POST" && upstreamCreated) {
      try {
        await providerRequest("DELETE", { request_id: ownedRequest, stop_reason: "initialization_failed" }, config);
        await store.close(ownedRequest, claim);
      } catch { /* Retain the reservation so reconnect can retry cleanup. */ }
    }
    if (error instanceof AppError) throw error;
    throw new AppError("AVATAR_NETWORK", 502, "数字人连接中断，请稍后重试。");
  }
}
