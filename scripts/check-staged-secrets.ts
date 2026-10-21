import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { loadEnvFile } from "node:process";
if (existsSync(".env.local")) loadEnvFile(".env.local");
const names = execFileSync("git", ["diff", "--cached", "--name-only", "--diff-filter=ACMR", "-z"]).toString("utf8").split("\0").filter(Boolean);
const secrets = ["ONET_API_KEY", "SUPABASE_ANON_KEY", "LLM_API_KEY"].map((name) => process.env[name]?.trim()).filter((value): value is string => !!value && !/^(REPLACE|YOUR_|<)/i.test(value));
for (const path of names) {
  if (/(^|\/)\.env($|\.)/.test(path) && path !== ".env.example") throw new Error("FAIL: environment file staged");
  const blob = execFileSync("git", ["show", `:${path}`], { maxBuffer: 10 * 1024 * 1024 });
  if (secrets.some((secret) => blob.includes(Buffer.from(secret)))) throw new Error("FAIL: configured secret found in staged blob; values suppressed");
}
console.log(`PASS staged secret scan: ${names.length} files; values suppressed.`);
