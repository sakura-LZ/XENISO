// Uses isolated synthetic Auth users and database RPCs; never starts a provider session.
import { loadEnvFile } from "node:process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { avatarStore } from "../src/lib/server/avatar-store";

if (existsSync(".env.local")) loadEnvFile(".env.local");
const checks: { name: string; passed: boolean }[] = [];
function expect(name: string, value: unknown) { checks.push({ name, passed: Boolean(value) }); if (!value) throw new Error(name); }
const options = { auth: { persistSession: false, autoRefreshToken: false }, global: { fetch: (input: RequestInfo | URL, init?: RequestInit) => fetch(input, { ...init, signal: AbortSignal.timeout(20000), redirect: "error" as const }) } };
const freshClient = () => createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!, options);
const clients: SupabaseClient[] = [];
const run = `simulation-${randomUUID()}`;
const capability = randomBytes(32).toString("hex");
const claimHash = createHash("sha256").update(capability).digest("hex");
let failure: string | null = null;
let cleanupFailures = 0;
try {
  const guest = freshClient();
  const denied = await guest.rpc("avatar_reserve", { target_request: run, target_claim_hash: claimHash });
  expect("unauthenticated_reservation_denied", Boolean(denied.error));
  for (let index = 0; index < 2; index++) {
    const client = freshClient();
    const signed = await client.auth.signInAnonymously({ options: { data: { simulation: true, avatar_storage_probe: run } } });
    if (signed.data.user) clients.push(client);
    expect(`synthetic_identity_${index}_created`, !signed.error && signed.data.user?.is_anonymous);
  }
  const [a, b] = clients;
  const store = avatarStore(a);
  await store.reserve(run, claimHash);
  expect("server_adapter_reservation", (await store.active())?.request_id === run);
  const other = avatarStore(b);
  expect("other_user_cannot_read", await other.find(run, "") === null);
  expect("other_user_cannot_bind_even_with_capability", await other.bind(run, "simulation-session", capability) === false);
  const wrong = await a.rpc("avatar_bind", { target_request: run, target_session: "forged", capability: "incorrect-capability" });
  expect("wrong_capability_cannot_bind", !wrong.error && wrong.data === false);
  const direct = await a.from("avatar_sessions").update({ session_id: "forged" }).eq("request_id", run);
  expect("direct_update_denied", direct.error?.code === "42501");
  const insert = await a.from("avatar_sessions").insert({ request_id: `${run}-direct`, claim_hash: claimHash });
  expect("direct_insert_denied", insert.error?.code === "42501");
  const duplicate = await a.rpc("avatar_reserve", { target_request: `${run}-parallel`, target_claim_hash: claimHash });
  expect("same_owner_parallel_reservation_denied", duplicate.error?.message === "AVATAR_ACTIVE");
  expect("owner_can_bind", await store.bind(run, "simulation-session", capability));
  const session = await a.auth.getSession();
  const secondInstance = freshClient();
  await secondInstance.auth.setSession({ access_token: session.data.session!.access_token, refresh_token: session.data.session!.refresh_token });
  const restored = avatarStore(secondInstance);
  expect("new_instance_recovers_session", (await restored.find("", "simulation-session"))?.request_id === run);
  const otherClose = await b.rpc("avatar_close", { target_request: run, capability });
  expect("cross_user_close_denied", !otherClose.error && otherClose.data === false);
  const wrongClose = await a.rpc("avatar_close", { target_request: run, capability: "incorrect-capability" });
  expect("wrong_capability_cannot_close", !wrongClose.error && wrongClose.data === false);
  await restored.close(run, capability);
  expect("new_instance_closes_owned_session", await store.active() === null);
  for (let index = 1; index < 5; index++) {
    await store.reserve(`${run}-${index}`, claimHash);
    await store.close(`${run}-${index}`, capability);
  }
  const limited = await a.rpc("avatar_reserve", { target_request: `${run}-limited`, target_claim_hash: claimHash });
  expect("shared_per_user_rate_limit", limited.error?.message === "AVATAR_RATE_LIMITED");
  await other.reserve(`${run}-cascade`, claimHash);
  const blockedDelete = await b.rpc("delete_own_account");
  expect("account_deletion_blocked_until_session_closed", Boolean(blockedDelete.error));
  await other.close(`${run}-cascade`, capability);
  const deleted = await b.rpc("delete_own_account");
  expect("synthetic_owner_deletion", !deleted.error);
  const orphan = await b.from("avatar_sessions").select("request_id").eq("request_id", `${run}-cascade`);
  expect("deleted_identity_has_no_visible_session", !orphan.data?.length);
  clients.pop();
} catch { failure = checks.find(check => !check.passed)?.name ?? "Live storage check failed; raw output suppressed"; }
finally {
  for (const client of clients) {
    const result = await client.rpc("delete_own_account");
    if (result.error) cleanupFailures++;
  }
}
const report = { at: new Date().toISOString(), simulation: true, scope: "Real Supabase synthetic identities/RLS/RPC; no provider sessions", passed: !failure && cleanupFailures === 0, checks, failure, cleanupFailures };
mkdirSync("docs/testing", { recursive: true });
writeFileSync("docs/testing/avatar-storage.latest.json", JSON.stringify(report, null, 2) + "\n");
console.log(JSON.stringify(report, null, 2));
if (!report.passed) process.exitCode = 1;
