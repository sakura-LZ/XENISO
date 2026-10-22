import { readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

const name = process.argv[2];
if (!["pilot", "expansion"].includes(name)) throw new Error("Expected pilot or expansion bundle");
const root = `work/knowledge-${name}/import-parts`;
const parts: string[] = JSON.parse(readFileSync(`${root}/files.json`, "utf8"));
const batches: string[] = [];
let body = "";
function flush() {
  if (!body) return;
  const path = `${root}/batch-${batches.length}.sql`;
  writeFileSync(path, body); batches.push(path); body = "";
}
for (const path of parts) {
  const sql = readFileSync(path, "utf8");
  if (Buffer.byteLength(sql) > 750000) throw new Error("Import part exceeds management API request budget");
  if (Buffer.byteLength(body + sql) > 750000) flush();
  body += sql + "\n";
}
flush();
const completed: string[] = [];
for (const file of batches) {
  const result = spawnSync(process.platform === "win32" ? "cmd.exe" : "npx", process.platform === "win32" ? ["/d", "/s", "/c", `npx.cmd supabase db query --linked --file ${file}`] : ["supabase", "db", "query", "--linked", "--file", file], { encoding: "utf8", windowsHide: true });
  if (result.status !== 0) {
    // CLI output may contain connection metadata; keep diagnostics local.
    writeFileSync(`${root}/failed.latest.txt`, (result.stderr ?? "") + (result.stdout ?? ""));
    console.error(JSON.stringify({ failed_batch: file, exit_code: result.status, completed: completed.length }));
    process.exit(1);
  }
  completed.push(file);
  console.log(JSON.stringify({ completed: completed.length, batches: batches.length }));
}
writeFileSync(`${root}/import.latest.json`, JSON.stringify({ at: new Date().toISOString(), completed, passed: true }, null, 2));
