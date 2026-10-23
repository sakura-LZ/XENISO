// 只读抓取探针：下载官方页面 -> 存 raw/txt -> 打印哈希与关键词上下文，供人工编写抽取正则。
// 不写入任何数据库，不改动已有 manifest。
import { writeFileSync, mkdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { htmlText } from "./html";

const [url, id] = process.argv.slice(2);
if (!url || !id) throw new Error("usage: tsx scripts/knowledge/probe.ts <url> <id>");
const dir = process.env.PROBE_OUT_DIR ?? "work/knowledge-admissions";
mkdirSync(dir, { recursive: true });

const response = await fetch(url, {
  redirect: "error",
  signal: AbortSignal.timeout(45000),
  headers: {
    "User-Agent": "LIMEN-Research/1.0 (official public reference; admission catalog)",
    Accept: "text/html,text/plain",
  },
});
if (!response.ok) throw new Error(`http_${response.status}`);
const contentType = response.headers.get("content-type") ?? "";
if (!/text\/(html|plain)|application\/xhtml\+xml/i.test(contentType)) {
  throw new Error(`unsupported_content_type: ${contentType}`);
}
const raw = Buffer.from(await response.arrayBuffer());
const head = raw.subarray(0, 4000).toString("ascii");
const charset = /charset\s*=\s*["']?([\w-]+)/i.exec(contentType)?.[1] ?? /charset\s*=\s*["']?([\w-]+)/i.exec(head)?.[1] ?? "utf-8";
const decoded = new TextDecoder(charset).decode(raw);
const text = /html/i.test(contentType) ? htmlText(decoded) : decoded.replace(/\s+/g, " ").trim();
writeFileSync(`${dir}/${id}.raw`, raw);
writeFileSync(`${dir}/${id}.txt`, text);

console.log(JSON.stringify({
  id,
  url,
  sha256: createHash("sha256").update(raw).digest("hex"),
  bytes: raw.length,
  charset,
  contentType,
  textLength: text.length,
}, null, 2));

const keywords = ["专业代码", "考试科目", "报考条件", "跨专业", "加试", "招生计划", "学位类型", "临床医学", "推荐免试", "复试"];
for (const keyword of keywords) {
  const index = text.indexOf(keyword);
  if (index < 0) {
    console.log(`--- ${keyword}: 未出现`);
    continue;
  }
  const snippet = text.slice(Math.max(0, index - 60), Math.min(text.length, index + 260)).replace(/\s+/g, " ");
  console.log(`--- ${keyword} @${index}: ${snippet}`);
}
