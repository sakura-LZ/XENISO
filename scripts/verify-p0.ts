import { loadEnvFile } from "node:process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { AppError } from "../src/lib/errors";
import { OnetClient } from "../src/lib/onet/client";

if (existsSync(".env.local")) loadEnvFile(".env.local");
type Check = { name: string; status: "PASS" | "FAIL" | "BLOCKED"; detail: string };
const checks: Check[] = [];
const observations: { endpoint: string; status: number; keys: string[] }[] = [];
const has = (name: string) => Boolean(process.env[name]?.trim() && !/^(REPLACE|YOUR_|<)/i.test(process.env[name]!.trim()));
const assert: (value: unknown, message: string) => asserts value = (value, message) => { if (!value) throw new Error(message); };

async function checkOnet() {
  if (!has("ONET_API_KEY")) { checks.push({ name: "onet_live", status: "BLOCKED", detail: "ONET_API_KEY not configured; no authenticated request sent" }); return; }
  try {
    const client = new OnetClient(process.env.ONET_API_KEY!, fetch, (value) => observations.push(value));
    const questions = await client.questions();
    // Synthetic answers exercise the real endpoint, never a real personal assessment.
    const result = await client.results(Array.from({ length: 30 }, (_, i) => ({ index: i + 1, answer: 3 })));
    checks.push({ name: "onet_live", status: "PASS", detail: `synthetic_probe=true; questions=${questions.questions.length}; answers=${result.answer_count}; scores=${result.scores.length}; careers_returned=${result.careers.length}; career_total=${result.career_total}; api=${questions.api_version}; database=${questions.onet_version}` });
  } catch (error) {
    checks.push({ name: "onet_live", status: "FAIL", detail: error instanceof AppError ? `${error.code}: ${error.message}` : "Unexpected verification failure; raw errors suppressed" });
  }
}

async function checkSupabase() {
  if (!has("SUPABASE_URL") || !has("SUPABASE_ANON_KEY")) { checks.push({ name: "supabase_live", status: "BLOCKED", detail: "SUPABASE_URL / SUPABASE_ANON_KEY not configured; no users created" }); return; }
  const clients: { client: SupabaseClient; id: string; deleted: boolean }[] = [];
  let cleanupFailed = 0;
  const run = randomUUID();
  const newClient = () => createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: async (input, init) => {
      try { return await fetch(input, { ...init, signal: AbortSignal.timeout(12000), redirect: "error" }); }
      catch { throw new Error("Supabase transport unavailable"); }
    } },
  });
  try {
    const publicClient = newClient();
    const publicRead = await publicClient.from("profiles").select("id");
    assert(publicRead.error?.code === "42501", "public table access must be denied; check migration and grants");
    const publicDelete = await publicClient.rpc("delete_own_account");
    assert(publicDelete.error?.code === "42501", "public RPC execution must be denied; check migration before creating users");
    for (let i = 0; i < 2; i++) {
      const client = newClient();
      const signed = await client.auth.signInAnonymously({ options: { data: { limen_p0_probe: true, run } } });
      assert(!signed.error && signed.data.user?.is_anonymous && signed.data.session, "anonymous Auth failed; enable anonymous sign-ins");
      const id = signed.data.user.id;
      clients.push({ client, id, deleted: false });
      const saved = await client.from("profiles").insert({ id, payload: { nickname: `simulation:P0:${i}` } });
      assert(!saved.error, "own profile insert failed");
      const read = await client.from("profiles").select("payload").eq("id", id).single();
      assert(!read.error && read.data.payload.nickname === `simulation:P0:${i}`, "own read must return saved payload");
      const updated = await client.from("profiles").update({ payload: { nickname: `simulation:P0:${i}:updated` } }).eq("id", id).select("payload");
      assert(!updated.error && updated.data?.[0]?.payload.nickname === `simulation:P0:${i}:updated`, "own update failed");
      const refreshed = await client.auth.refreshSession();
      assert(!refreshed.error && refreshed.data.user?.id === id, "refresh must retain the same identity");
    }
    const [a, b] = clients;
    for (const [actor, target] of [[a, b], [b, a]]) {
      const ownRows = await actor.client.from("profiles").select("id");
      assert(!ownRows.error && ownRows.data?.length === 1 && ownRows.data[0].id === actor.id, "unfiltered reads must expose only own rows");
      const foreignRead = await actor.client.from("profiles").select("id").eq("id", target.id);
      assert(!foreignRead.error && foreignRead.data?.length === 0, "cross-user read leaked a row");
      const foreignWrite = await actor.client.from("profiles").update({ payload: { nickname: "simulation:intrusion" } }).eq("id", target.id).select("id");
      assert(!foreignWrite.error && foreignWrite.data?.length === 0, "cross-user update modified a row");
      const foreignDelete = await actor.client.from("profiles").delete().eq("id", target.id).select("id");
      assert(!foreignDelete.error && foreignDelete.data?.length === 0, "cross-user delete modified a row");
      const forgedInsert = await actor.client.from("profiles").insert({ id: randomUUID(), payload: { nickname: "simulation:forged" } });
      assert(forgedInsert.error?.code === "42501", "insert with a forged owner must be rejected by RLS");
      const stillOwn = await actor.client.from("profiles").select("payload").eq("id", actor.id).single();
      assert(!stillOwn.error && stillOwn.data.payload.nickname.endsWith(":updated"), "owner data changed during cross-user attempts");
    }
    for (const entry of clients) {
      const savedSession = await entry.client.auth.getSession();
      const deleted = await entry.client.rpc("delete_own_account");
      assert(!deleted.error, "self deletion RPC failed");
      entry.deleted = true;
      const user = await entry.client.auth.getUser(savedSession.data.session!.access_token);
      assert(Boolean(user.error) && !user.data.user, "deleted Auth identity remains accessible");
      const rows = await entry.client.from("profiles").select("id").eq("id", entry.id);
      assert(Boolean(rows.error) || rows.data?.length === 0, "deleted user profile still exists");
      const refresh = await entry.client.auth.refreshSession({ refresh_token: savedSession.data.session!.refresh_token });
      assert(Boolean(refresh.error) && !refresh.data.session, "deleted identity can still refresh session");
    }
    checks.push({ name: "supabase_live", status: "PASS", detail: "synthetic_probe=true; 2 anonymous identities; owner CRUD, refresh, cross-user SELECT/UPDATE/DELETE/forged INSERT, public denial, self deletion and token revocation verified" });
  } catch {
    // Do not print SDK error bodies: they may include URLs, auth or payload context.
    checks.push({ name: "supabase_live", status: "FAIL", detail: "Anonymous Auth / schema / RLS / deletion check failed; see setup prerequisites; raw errors suppressed" });
  } finally {
    for (const entry of clients.filter((entry) => !entry.deleted)) {
      try { const { error } = await entry.client.rpc("delete_own_account"); if (error) cleanupFailed++; } catch { cleanupFailed++; }
    }
    if (cleanupFailed) checks.push({ name: "probe_cleanup", status: "FAIL", detail: `${cleanupFailed} synthetic probe identities require owner cleanup; locate metadata limen_p0_probe=true, run=${run}` });
  }
}

await checkOnet();
await checkSupabase();
const report = { checked_at: new Date().toISOString(), mock: false, synthetic_probe: true, checks, onet_requests: observations, accepted: checks.length === 2 && checks.every((item) => item.status === "PASS") };
mkdirSync("docs/testing", { recursive: true });
writeFileSync("docs/testing/P0-live.latest.json", JSON.stringify(report, null, 2) + "\n");
for (const item of checks) console.log(`${item.status} ${item.name}: ${item.detail}`);
console.log(`P0 live acceptance: ${report.accepted ? "PASS" : "NOT ACCEPTED"}`);
process.exitCode = report.accepted ? 0 : 1;
