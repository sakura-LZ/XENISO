// Run with: node --conditions=react-server --import tsx scripts/verify-xingyun-proxy.ts
// This uses fixed test credentials and a mocked fetch. It never starts a provider session.
import assert from "node:assert/strict";
import { createHash, createHmac } from "node:crypto";
import { activeAvatarSession, avatarSession as runAvatarSession, avatarConfigured, requestedAvatarPresenter } from "../src/lib/server/xingyun";
import type { AvatarPresenter } from "../src/lib/avatar-presenters";
import { AppError } from "../src/lib/errors";
import type { AvatarStore, OwnedAvatarSession } from "../src/lib/server/avatar-store";

// Separate repository clients share a mocked durable database, not module state.
const rows = new Map<string, OwnedAvatarSession & { closed: boolean }>();
let failBind = false;
function database(owner: string): AvatarStore {
  const hash = (value: string) => createHash("sha256").update(value).digest("hex");
  return {
    async reserve(requestId, claimHash) {
      if (rows.has(requestId) || [...rows.values()].some(row => row.owner_id === owner && !row.closed)) throw new AppError("AVATAR_ACTIVE", 409, "Active");
      rows.set(requestId, { request_id: requestId, owner_id: owner, session_id: null, claim_hash: claimHash, closed: false });
    },
    async find(requestId, sessionId) {
      return [...rows.values()].find(row => row.owner_id === owner && !row.closed && (requestId ? row.request_id === requestId : row.session_id === sessionId)) ?? null;
    },
    async active() { return [...rows.values()].find(row => row.owner_id === owner && !row.closed) ?? null; },
    async bind(requestId, sessionId, capability) {
      if (failBind) throw new AppError("AVATAR_STORAGE", 503, "Storage unavailable");
      const row = rows.get(requestId);
      if (!row || row.owner_id !== owner || row.closed || hash(capability) !== row.claim_hash) return false;
      row.session_id = sessionId;
      return true;
    },
    async close(requestId, capability) {
      const row = rows.get(requestId);
      assert.ok(row && row.owner_id === owner && hash(capability) === row.claim_hash);
      row.closed = true;
    },
  };
}
function avatarSession(method: "POST" | "DELETE", owner: string, input: unknown, presenter: AvatarPresenter = "medicine") {
  return runAvatarSession(method, owner, input, database(owner), presenter);
}

process.env.XINGYUN_APP_ID = "fixed-test-id";
process.env.XINGYUN_APP_SECRET = "fixed-test-secret";
delete process.env.XINGYUN_MEDICINE_APP_ID;
delete process.env.XINGYUN_MEDICINE_APP_SECRET;
process.env.XINGYUN_ENGINEERING_APP_ID = "fixed-engineering-id";
process.env.XINGYUN_ENGINEERING_APP_SECRET = "fixed-engineering-secret";
process.env.XINGYUN_COMPUTING_APP_ID = "fixed-computing-id";
process.env.XINGYUN_COMPUTING_APP_SECRET = "fixed-computing-secret";
delete process.env.XINGYUN_INFORMATICS_APP_ID;
delete process.env.XINGYUN_INFORMATICS_APP_SECRET;
const originalFetch = globalThis.fetch;
const requests: { url: string; init: RequestInit }[] = [];
let mode: "success" | "http-error" | "transport" = "success";
let checkCount = 0;
globalThis.fetch = async (input, init) => {
  requests.push({ url: String(input), init: init! });
  if (mode === "transport") throw new Error("sensitive-provider-internal-error");
  if (mode === "http-error") return new Response("sensitive-provider-internal-error", { status: 403 });
  const data = JSON.parse(init?.body as string);
  return Response.json({ data: init?.method === "POST" ? { session_id: `session-${data.request_id}`, resource_pack: {} } : { stopped: true } });
};
async function rejected(action: Promise<unknown>, code: string) {
  await assert.rejects(action, (error: unknown) => error instanceof Error && "code" in error && error.code === code && !error.message.includes("sensitive-provider"));
  checkCount++;
}
try {
  await avatarSession("POST", "owner-a", { request_id: "case-a", config: { z: "中文 with space", a: { y: 2, x: 1 } }, session_speak_req_id: 1 });
  const sent = requests.at(-1)!;
  assert.equal(sent.url, "https://nebula-agent.xingyun3d.com/user/v1/ttsa_v2/session");
  const headers = sent.init.headers as Record<string, string>;
  const canonical = JSON.stringify({ config: { a: { x: 1, y: 2 }, z: "中文 with space" }, request_id: "case-a", session_speak_req_id: 1 });
  assert.equal(sent.init.body, canonical);
  const escaped = canonical.replace(/[^\u0000-\u007e]/g, c => `\\u${c.charCodeAt(0).toString(16).padStart(4, "0")}`).replace(/ /g, "");
  const expected = createHash("md5").update(`/user/v1/ttsa_v2/sessionpost${escaped}fixed-test-secret${headers["X-TIMESTAMP"]}`).digest("hex");
  assert.equal(headers["X-TOKEN"], expected); checkCount++;
  assert.deepEqual(await activeAvatarSession("owner-a", database("owner-a")), { request_id: "case-a", session_id: "session-case-a" }); checkCount++;
  await rejected(avatarSession("DELETE", "owner-b", { request_id: "case-a", session_id: "session-case-a" }), "AVATAR_OWNERSHIP");
  await rejected(avatarSession("POST", "owner-b", { request_id: "case-a" }), "AVATAR_ACTIVE");
  await rejected(avatarSession("POST", "owner-a", { request_id: "case-a-two" }), "AVATAR_ACTIVE");
  await rejected(avatarSession("DELETE", "owner-a", { request_id: "case-a", session_id: "other-session" }), "AVATAR_OWNERSHIP");
  await avatarSession("DELETE", "owner-a", { request_id: "case-a", session_id: "session-case-a", stop_reason: "user" });
  assert.equal(requests.at(-1)?.init.method, "DELETE"); checkCount++;
  await rejected(avatarSession("POST", "owner-c", { request_id: "case-c", brain_config: { api_key: "not-allowed" } }), "INVALID_AVATAR");
  rows.set("forged", { request_id: "forged", owner_id: "owner-forged", session_id: "someone-elses-session", claim_hash: "0".repeat(64), closed: false });
  const beforeForged = requests.length;
  await rejected(avatarSession("DELETE", "owner-forged", { request_id: "forged" }), "AVATAR_OWNERSHIP");
  assert.equal(requests.length, beforeForged); checkCount++;
  await rejected(activeAvatarSession("owner-forged", database("owner-forged")), "AVATAR_OWNERSHIP");
  mode = "http-error";
  await rejected(avatarSession("POST", "owner-d", { request_id: "case-d" }), "AVATAR_UPSTREAM");
  mode = "transport";
  await rejected(avatarSession("POST", "owner-e", { request_id: "case-e" }), "AVATAR_NETWORK");
  mode = "success";
  await avatarSession("DELETE", "owner-e", { request_id: "case-e" }); checkCount++;
  await avatarSession("DELETE", "owner-d", { request_id: "case-d" }); checkCount++;
  failBind = true;
  await rejected(avatarSession("POST", "owner-f", { request_id: "case-f" }), "AVATAR_STORAGE");
  assert.equal(requests.at(-1)?.init.method, "DELETE");
  assert.equal(rows.get("case-f")?.closed, true); checkCount++;
  failBind = false;
  await avatarSession("POST", "owner-g", { request_id: "case-g" });
  await avatarSession("DELETE", "owner-g", { session_id: "session-case-g" });
  assert.equal(rows.get("case-g")?.closed, true); checkCount++;
  assert.equal(await activeAvatarSession("owner-g", database("owner-g")), null); checkCount++;
  assert.equal(avatarConfigured("medicine"), true);
  assert.equal(avatarConfigured("biomed_eng"), true);
  assert.equal(avatarConfigured("cs_ai"), true);
  assert.equal(avatarConfigured("med_informatics"), false); checkCount++;
  assert.equal(requestedAvatarPresenter(null), "medicine");
  assert.equal(requestedAvatarPresenter("biomed_eng"), "biomed_eng");
  for (const alias of ["", "__proto__", "unknown", "medicine?app=other"]) assert.throws(() => requestedAvatarPresenter(alias)); checkCount++;
  const beforeUnconfigured = requests.length;
  await rejected(avatarSession("POST", "owner-h", { request_id: "not-configured" }, "med_informatics"), "AVATAR_NOT_CONFIGURED");
  assert.equal(requests.length, beforeUnconfigured);
  assert.equal(rows.has("not-configured"), false); checkCount++;

  await avatarSession("POST", "owner-h", { request_id: "engineering-case" }, "biomed_eng");
  const engineeringRequest = requests.at(-1)!;
  const engineeringHeaders = engineeringRequest.init.headers as Record<string, string>;
  assert.equal(engineeringHeaders["X-APP-ID"], "fixed-engineering-id");
  const engineeringExpected = createHash("md5").update(`/user/v1/ttsa_v2/sessionpost${engineeringRequest.init.body}fixed-engineering-secret${engineeringHeaders["X-TIMESTAMP"]}`).digest("hex");
  assert.equal(engineeringHeaders["X-TOKEN"], engineeringExpected); checkCount++;
  assert.deepEqual(await activeAvatarSession("owner-h", database("owner-h")), { request_id: "engineering-case", session_id: "session-engineering-case" }); checkCount++;
  await rejected(avatarSession("POST", "owner-h", { request_id: "medical-while-engineering" }), "AVATAR_ACTIVE");
  await rejected(avatarSession("DELETE", "owner-other", { request_id: "engineering-case" }, "biomed_eng"), "AVATAR_OWNERSHIP");
  // Cleanup follows durable ownership even if the new page uses an unconfigured alias.
  await avatarSession("DELETE", "owner-h", { request_id: "engineering-case" }, "med_informatics");
  assert.equal((requests.at(-1)!.init.headers as Record<string, string>)["X-APP-ID"], "fixed-engineering-id");
  assert.equal(rows.get("engineering-case")?.closed, true); checkCount++;
  await avatarSession("POST", "owner-h", { request_id: "medical-after-engineering" });
  await avatarSession("DELETE", "owner-h", { request_id: "medical-after-engineering" }, "biomed_eng");
  assert.equal((requests.at(-1)!.init.headers as Record<string, string>)["X-APP-ID"], "fixed-test-id"); checkCount++;

  const legacyClaim = createHmac("sha256", "fixed-test-secret").update(JSON.stringify(["limen-avatar-v1", "owner-legacy", "legacy-case"])).digest("hex");
  rows.set("legacy-case", { request_id: "legacy-case", owner_id: "owner-legacy", session_id: "legacy-session", claim_hash: createHash("sha256").update(legacyClaim).digest("hex"), closed: false });
  await activeAvatarSession("owner-legacy", database("owner-legacy"));
  await avatarSession("DELETE", "owner-legacy", { request_id: "legacy-case" }, "biomed_eng");
  assert.equal((requests.at(-1)!.init.headers as Record<string, string>)["X-APP-ID"], "fixed-test-id");
  assert.equal(rows.get("legacy-case")?.closed, true); checkCount++;

  failBind = true;
  await rejected(avatarSession("POST", "owner-compensate", { request_id: "engineering-bind-failure" }, "biomed_eng"), "AVATAR_STORAGE");
  assert.equal(requests.at(-1)!.init.method, "DELETE");
  assert.equal((requests.at(-1)!.init.headers as Record<string, string>)["X-APP-ID"], "fixed-engineering-id");
  assert.equal(rows.get("engineering-bind-failure")?.closed, true); checkCount++;
  failBind = false;

  await avatarSession("POST", "owner-removed", { request_id: "engineering-removed-config" }, "biomed_eng");
  delete process.env.XINGYUN_ENGINEERING_APP_SECRET;
  const beforeRemoved = requests.length;
  await rejected(avatarSession("DELETE", "owner-removed", { request_id: "engineering-removed-config" }), "AVATAR_OWNERSHIP");
  assert.equal(requests.length, beforeRemoved); checkCount++;
  process.env.XINGYUN_ENGINEERING_APP_SECRET = "fixed-engineering-secret";
  await avatarSession("DELETE", "owner-removed", { request_id: "engineering-removed-config" });
  assert.equal(rows.get("engineering-removed-config")?.closed, true); checkCount++;
  await avatarSession("POST", "owner-computing", { request_id: "computing-case" }, "cs_ai");
  const computingRequest = requests.at(-1)!;
  const computingHeaders = computingRequest.init.headers as Record<string, string>;
  const computingExpected = createHash("md5").update(`/user/v1/ttsa_v2/sessionpost${computingRequest.init.body}fixed-computing-secret${computingHeaders["X-TIMESTAMP"]}`).digest("hex");
  assert.equal(computingHeaders["X-APP-ID"], "fixed-computing-id");
  assert.equal(computingHeaders["X-TOKEN"], computingExpected); checkCount++;
  await avatarSession("DELETE", "owner-computing", { request_id: "computing-case" }, "biomed_eng");
  assert.equal((requests.at(-1)!.init.headers as Record<string, string>)["X-APP-ID"], "fixed-computing-id");
  assert.equal(await activeAvatarSession("owner-computing", database("owner-computing")), null); checkCount++;
  // Reassign the original male application to informatics while a new doctor
  // application takes medical teaching. Old medical claims must remain usable.
  process.env.XINGYUN_MEDICINE_APP_ID = "fixed-doctor-id";
  process.env.XINGYUN_MEDICINE_APP_SECRET = "fixed-doctor-secret";
  process.env.XINGYUN_INFORMATICS_APP_ID = "fixed-test-id";
  process.env.XINGYUN_INFORMATICS_APP_SECRET = "fixed-test-secret";
  for (const legacy of [false, true]) {
    const owner = `owner-reassigned-${legacy}`;
    const requestId = `reassigned-${legacy}`;
    const scope = legacy ? ["limen-avatar-v1", owner, requestId] : ["limen-avatar-v2", "medicine", "fixed-test-id", owner, requestId];
    const claim = createHmac("sha256", "fixed-test-secret").update(JSON.stringify(scope)).digest("hex");
    rows.set(requestId, { request_id: requestId, owner_id: owner, session_id: `session-${requestId}`, claim_hash: createHash("sha256").update(claim).digest("hex"), closed: false });
    assert.ok(await activeAvatarSession(owner, database(owner)));
    await avatarSession("DELETE", owner, { request_id: requestId }, "medicine");
    assert.equal((requests.at(-1)!.init.headers as Record<string, string>)["X-APP-ID"], "fixed-test-id");
    assert.equal(rows.get(requestId)?.closed, true); checkCount++;
  }
  for (const [presenter, appId, secret] of [["medicine", "fixed-doctor-id", "fixed-doctor-secret"], ["med_informatics", "fixed-test-id", "fixed-test-secret"]] as const) {
    assert.equal(avatarConfigured(presenter), true);
    await avatarSession("POST", "owner-four-groups", { request_id: `four-${presenter}` }, presenter);
    const created = requests.at(-1)!;
    const headers = created.init.headers as Record<string, string>;
    assert.equal(headers["X-APP-ID"], appId);
    assert.equal(headers["X-TOKEN"], createHash("md5").update(`/user/v1/ttsa_v2/sessionpost${created.init.body}${secret}${headers["X-TIMESTAMP"]}`).digest("hex"));
    await avatarSession("DELETE", "owner-four-groups", { request_id: `four-${presenter}` }, "cs_ai");
    assert.equal((requests.at(-1)!.init.headers as Record<string, string>)["X-APP-ID"], appId);
    assert.equal(await activeAvatarSession("owner-four-groups", database("owner-four-groups")), null); checkCount++;
  }
  delete process.env.XINGYUN_MEDICINE_APP_SECRET;
  assert.equal(avatarConfigured("medicine"), false);
  const beforePartial = requests.length;
  await rejected(avatarSession("POST", "owner-partial", { request_id: "partial-doctor" }), "AVATAR_NOT_CONFIGURED");
  assert.equal(requests.length, beforePartial); checkCount++;
  console.log(`PASS ${checkCount} avatar proxy checks: signing, cross-instance repositories, ownership, reassignment/legacy cleanup, concurrency, error redaction and cleanup. Mocked database/provider only.`);
} finally { globalThis.fetch = originalFetch; }
