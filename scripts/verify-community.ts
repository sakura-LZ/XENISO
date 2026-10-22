import { loadEnvFile } from "node:process";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { randomBytes, randomUUID } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

if (existsSync(".env.local")) loadEnvFile(".env.local");
const checks: { name: string; passed: boolean }[] = [];
function expect(name: string, passed: unknown) { checks.push({ name, passed: Boolean(passed) }); if (!passed) throw new Error(name); }
const url = process.env.SUPABASE_URL!;
const anonKey = process.env.SUPABASE_ANON_KEY!;
if (!url || !anonKey) throw new Error("Supabase configuration missing");
const options = { auth: { persistSession: false, autoRefreshToken: false }, global: { fetch: (input: RequestInfo | URL, init?: RequestInit) => fetch(input, { ...init, signal: AbortSignal.timeout(20000), redirect: "error" as const }) } };
const newClient = () => createClient(url, anonKey, options);
// CLI credentials stay in its configured credential store. Captured API keys are
// used in memory only; never print subprocess output or raw Supabase errors.
const projectRef = new URL(url).hostname.split(".")[0];
if (!/^[a-z0-9]+$/.test(projectRef)) throw new Error("Invalid linked project reference");
let parsed: unknown;
try {
  const raw = execFileSync(process.platform === "win32" ? "cmd.exe" : "npx", process.platform === "win32" ? ["/d", "/s", "/c", `npx supabase projects api-keys --project-ref ${projectRef} --output json`] : ["supabase", "projects", "api-keys", "--project-ref", projectRef, "--output", "json"], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  parsed = JSON.parse(raw);
} catch { throw new Error("CLI credentials unavailable; raw output suppressed"); }
const envelope = parsed as { api_keys?: unknown[]; keys?: unknown[] };
const keys = (Array.isArray(parsed) ? parsed : envelope.api_keys ?? envelope.keys ?? []) as { name?: string; api_key?: string }[];
const service = keys.find((entry) => entry.name === "service_role")?.api_key;
if (!service) throw new Error("CLI service key unavailable");
const admin = createClient(url, service, options);
const accounts: { id: string; client: SupabaseClient; adminCreated: boolean }[] = [];
const run = randomUUID();
let failure: string | null = null;
let cleanupFailures = 0;
try {
  const guest = newClient();
  const publicRead = await guest.rpc("community_list");
  expect("unauthenticated_list_denied", publicRead.error?.code === "42501");
  const signed = await guest.auth.signInAnonymously({ options: { data: { simulation: true, community_probe: run } } });
  if (signed.data.user) accounts.push({ id: signed.data.user.id, client: guest, adminCreated: false });
  expect("synthetic_anonymous_created", !signed.error && signed.data.user?.is_anonymous);
  const anonList = await guest.rpc("community_list");
  expect("anonymous_auth_list_denied", anonList.error?.code === "42501");
  const anonPost = await guest.rpc("community_publish", { post_kind: "help", post_title: "simulation probe", post_body: "simulation only community permission probe" });
  expect("anonymous_auth_publish_denied", anonPost.error?.code === "42501");
  for (let index = 0; index < 2; index++) {
    const email = `limen-community-${run}-${index}@example.invalid`;
    const password = randomBytes(30).toString("base64url");
    const created = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { simulation: true, community_probe: run } });
    const client = newClient();
    if (created.data.user) accounts.push({ id: created.data.user.id, client, adminCreated: true });
    expect(`verified_synthetic_account_${index}_created`, !created.error && created.data.user?.email_confirmed_at);
    const session = await client.auth.signInWithPassword({ email, password });
    expect(`verified_account_${index}_signed_in`, !session.error && session.data.session && !session.data.user?.is_anonymous);
  }
  const [, a, b] = accounts;
  for (const table of ["community_posts", "community_flags"]) {
    const direct = await a.client.from(table).select("*").limit(1);
    expect(`${table}_direct_read_denied`, direct.error?.code === "42501");
  }
  const published = await a.client.rpc("community_publish", { post_kind: "help", post_title: "simulation 权限验收", post_body: "simulation 合成内容，仅用于社区权限验收，验收结束立即删除。" });
  expect("verified_member_publish", !published.error && typeof published.data === "string");
  const id = published.data;
  const own = await a.client.rpc("community_list");
  const ownRow = own.data?.find((row: { id: string }) => row.id === id);
  expect("author_sees_own_post", !own.error && ownRow?.mine === true);
  const other = await b.client.rpc("community_list");
  const otherRow = other.data?.find((row: { id: string }) => row.id === id);
  expect("other_member_sees_anonymous_post", !other.error && otherRow?.mine === false);
  expect("public_rpc_excludes_identity", otherRow && Object.keys(otherRow).sort().join(",") === "body,created_at,id,kind,mine,title");
  const deniedDelete = await b.client.rpc("community_delete", { post_id: id });
  expect("cross_user_delete_rejected", !deniedDelete.error && deniedDelete.data === false);
  const flag = await b.client.rpc("community_report", { target_id: id, flag_reason: "other" });
  expect("member_report_allowed", !flag.error);
  const flagAgain = await b.client.rpc("community_report", { target_id: id, flag_reason: "privacy" });
  expect("report_update_idempotent", !flagAgain.error);
  const anonFlag = await guest.rpc("community_report", { target_id: id, flag_reason: "other" });
  expect("anonymous_report_denied", anonFlag.error?.code === "42501");
  const rate = await a.client.rpc("community_publish", { post_kind: "experience", post_title: "simulation 再次发布", post_body: "simulation 合成内容用于校验发布限流，不应成功。" });
  expect("rapid_repeat_publish_denied", Boolean(rate.error));
  const deleted = await a.client.rpc("community_delete", { post_id: id });
  expect("author_delete_allowed", !deleted.error && deleted.data === true);
  const after = await b.client.rpc("community_list");
  expect("deleted_post_no_longer_listed", !after.error && !after.data?.some((row: { id: string }) => row.id === id));
  const missingFlag = await b.client.rpc("community_report", { target_id: id, flag_reason: "other" });
  expect("deleted_post_report_rejected", Boolean(missingFlag.error));
} catch (error) {
  failure = error instanceof Error && checks.some((check) => check.name === error.message) ? error.message : "unexpected_verification_error_raw_suppressed";
} finally {
  for (const account of accounts.reverse()) {
    try {
      const result = account.adminCreated ? await admin.auth.admin.deleteUser(account.id) : await account.client.rpc("delete_own_account");
      if (result.error) {
        const fallback = await admin.auth.admin.deleteUser(account.id);
        if (fallback.error) cleanupFailures++;
      }
      const verify = await admin.auth.admin.getUserById(account.id);
      if (verify.data.user || (verify.error && verify.error.status !== 404)) cleanupFailures++;
    } catch { cleanupFailures++; }
  }
}
const report = { checked_at: new Date().toISOString(), mock: false, synthetic_probe: true, emails_sent: false, privileged_access: "synthetic account provisioning and cleanup only; assertions use anon/user JWT", checks, failure, cleanup: { accounts_created: accounts.length, failures: cleanupFailures }, passed: !failure && cleanupFailures === 0 };
mkdirSync("docs/testing", { recursive: true });
writeFileSync("docs/testing/community-live.latest.json", JSON.stringify(report, null, 2) + "\n");
console.log(JSON.stringify(report));
if (!report.passed) process.exitCode = 1;
