// 一键整合：handoff.json -> manifest -> collect（逐字校验）-> 可导入 SQL
// 用法：npx tsx scripts/knowledge/integrate-handoff.ts <handoff.json> <manifest-name>
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";

const [handoffPath, name] = process.argv.slice(2);
if (!handoffPath || !name) throw new Error("usage: tsx scripts/knowledge/integrate-handoff.ts <handoff.json> <manifest-name>");
if (!existsSync(handoffPath)) throw new Error(`handoff_not_found: ${handoffPath}`);

const run = (label: string, args: string[]) => {
  const result = spawnSync(process.platform === "win32" ? "npx.cmd" : "npx", ["tsx", ...args], { encoding: "utf8", shell: process.platform === "win32" });
  const out = `${result.stdout ?? ""}${result.stderr ?? ""}`.trim();
  console.log(`\n===== ${label} =====\n${out.split("\n").slice(-12).join("\n")}`);
  return { ok: result.status === 0, out };
};

const verify = run("1/4 交接自检", ["scripts/knowledge/verify-handoff.ts", handoffPath]);
if (!verify.ok) {
  console.log("\n自检未通过，已停止（不生成任何 SQL）。请修 handoff.json 后重跑。");
  process.exit(1);
}

const merge = run("2/4 合并为 manifest", ["scripts/knowledge/merge-handoff.ts", handoffPath, name]);
if (!merge.ok) {
  console.log("\n合并报告 problems，已停止。");
  process.exit(1);
}

const collect = run("3/4 采集与逐字校验", ["scripts/knowledge/collect.ts", name]);
if (!collect.ok) {
  console.log("\n采集失败（可能是 literal 空白未折叠 / 日期无原文证据 / source_id 冲突），已停止。");
  process.exit(1);
}

run("4/4 生成可导入 SQL", ["scripts/knowledge/prepare-import.ts", name]);

const summaryPath = "docs/testing/knowledge-expansion-collection.latest.json";
if (existsSync(summaryPath)) {
  const summary = JSON.parse(readFileSync(summaryPath, "utf8")) as {
    sources: number;
    records: number;
    by_category: Record<string, number>;
    attempts: { status: string; source_id: string; reason?: string }[];
  };
  const bad = summary.attempts.filter((attempt) => attempt.status !== "collected");
  console.log(
    `\n结果：${summary.sources} 源 / ${summary.records} 记录 / 分类 ${JSON.stringify(summary.by_category)} / 失败 ${bad.length}`,
  );
  for (const attempt of bad.slice(0, 8)) console.log(`  - ${attempt.source_id}: ${attempt.status} ${attempt.reason ?? ""}`);
}
