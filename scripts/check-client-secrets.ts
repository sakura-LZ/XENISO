import { loadEnvFile } from "node:process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

if (existsSync(".env.local")) loadEnvFile(".env.local");
const secretNames = ["ONET_API_KEY", "SUPABASE_ANON_KEY", "LLM_API_KEY", ...Object.keys(process.env).filter(name => /^XINGYUN_(?:[A-Z]+_)?APP_(?:ID|SECRET)$/.test(name))];
const secrets = secretNames.map((name) => process.env[name]).filter((value): value is string => Boolean(value && !value.startsWith("REPLACE")));
if (!existsSync(".next/static")) throw new Error("Build first; no client bundle available to inspect");
function inspect(root: string): number {
  let count = 0;
  for (const file of readdirSync(root, { withFileTypes: true })) {
    const path = join(root, file.name);
    if (file.isDirectory()) { count += inspect(path); continue; }
    const data = readFileSync(path);
    if (secrets.some((secret) => data.includes(Buffer.from(secret)))) throw new Error(`Credential detected in client output file: ${file.name}`);
    count++;
  }
  return count;
}
console.log(`PASS client secret scan: ${inspect(".next/static")} files; secret values suppressed.`);
