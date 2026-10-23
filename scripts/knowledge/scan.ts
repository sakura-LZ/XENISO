// 扫描已抽取文本中的「考试科目」片段，打印偏移与上下文，供人工挑选并编写 manifest 正则。
import { readFileSync } from "node:fs";

const [file, ...filters] = process.argv.slice(2);
if (!file) throw new Error("usage: tsx scripts/knowledge/scan.ts <text-file> [关键词...]");
const text = readFileSync(file, "utf8");

const anchors = ["①101", "①199"];
const windows = [];
for (const anchor of anchors) {
  let index = text.indexOf(anchor);
  while (index >= 0) {
    const start = Math.max(0, index - 130);
    const chunk = text.slice(start, Math.min(text.length, index + 330)).replace(/\s+/g, " ");
    windows.push({ anchorIndex: index, chunk });
    index = text.indexOf(anchor, index + 1);
  }
}

const filtered = filters.length
  ? windows.filter((window) => filters.some((keyword) => window.chunk.includes(keyword)))
  : windows;

const seen = new Set();
console.log(`锚点命中 ${windows.length}，筛选后 ${filtered.length}，去重后输出：`);
for (const window of filtered) {
  const key = window.chunk.slice(0, 70);
  if (seen.has(key)) continue;
  seen.add(key);
  console.log(`\n[@${window.anchorIndex}] ${window.chunk}`);
  if (seen.size >= 50) break;
}
