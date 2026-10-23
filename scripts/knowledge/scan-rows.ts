// 严格配对扫描：专业代码 + 名称 + 人数 紧接考试科目，保证「专业↔考试科目」归属可核。
import { readFileSync } from "node:fs";

const file = process.argv[2];
if (!file) throw new Error("usage: tsx scripts/knowledge/scan-rows.ts <text-file>");
const text = readFileSync(file, "utf8");

const rowPattern = /(\d{6})\s*([\u4e00-\u9fa5][\u4e00-\u9fa5A-Za-z（）()·\-]{1,24}?)\s*(\d{1,4})\s*(①101.{10,200}?)(?=\s*(?:复试专业课|复试科目|第\s*\d+\s*页|69\s*不分方向|\d{6}\s*[\u4e00-\u9fa5]))/gu;

const rows = [];
for (const match of text.matchAll(rowPattern)) {
  const [full, code, name, count, subjects] = match;
  rows.push({ start: match.index, code, name, count, subjects: subjects.trim(), full: full.replace(/\s+/g, " ") });
}

console.log(`严格配对命中 ${rows.length} 行`);
const keywords = process.argv.slice(3);
const shown = rows.filter((row) => !keywords.length || keywords.some((keyword) => row.full.includes(keyword)));
console.log(`筛选后 ${shown.length} 行\n`);
for (const row of shown.slice(0, 60)) {
  console.log(`[@${row.start}] ${row.code} | ${row.name} | ${row.count} 人 | ${row.subjects}`);
}
