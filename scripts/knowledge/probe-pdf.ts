// PDF 探针：下载官方 PDF -> 保存 raw -> 用 pypdf 抽取文本 -> 打印哈希与关键词上下文。
// 只读，不写数据库；输出可直接填入 manifest 的 artifact_capture 字段。
import { writeFileSync, mkdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";

const [url, id] = process.argv.slice(2);
if (!url || !id) throw new Error("usage: tsx scripts/knowledge/probe-pdf.ts <url> <id>");
const dir = process.env.PROBE_OUT_DIR ?? "work/knowledge-admissions";
mkdirSync(dir, { recursive: true });

const response = await fetch(url, {
  redirect: "error",
  signal: AbortSignal.timeout(120000),
  headers: {
    "User-Agent": "LIMEN-Research/1.0 (official public reference; admission catalog)",
    Accept: "application/pdf",
  },
});
if (!response.ok) throw new Error(`http_${response.status}`);
const raw = Buffer.from(await response.arrayBuffer());
if (!raw.subarray(0, 5).equals(Buffer.from("%PDF-"))) throw new Error("not_a_pdf");
const rawPath = `${dir}/${id}.pdf`;
writeFileSync(rawPath, raw);

const textPath = `${dir}/${id}.txt`;
const python = String.raw`
import sys
from pypdf import PdfReader
reader = PdfReader(sys.argv[1])
parts = []
for page in reader.pages:
    try:
        parts.append(page.extract_text() or "")
    except Exception:
        parts.append("")
open(sys.argv[2], "w", encoding="utf-8").write("\n".join(parts))
print(len(reader.pages))
`;
execFileSync("python", ["-c", python, rawPath, textPath], { stdio: ["ignore", "pipe", "pipe"] });
const text = (await import("node:fs")).readFileSync(textPath, "utf8");
const normalized = text.replace(/\s+/g, " ").trim();
writeFileSync(textPath, normalized);

console.log(JSON.stringify({
  id,
  url,
  raw: { path: rawPath, sha256: createHash("sha256").update(raw).digest("hex"), bytes: raw.length },
  text: { path: textPath, sha256: createHash("sha256").update(normalized).digest("hex"), length: normalized.length },
}, null, 2));

const keywords = process.argv.slice(4);
for (const keyword of keywords) {
  let index = normalized.indexOf(keyword);
  if (index < 0) {
    console.log(`--- ${keyword}: 未出现`);
    continue;
  }
  let shown = 0;
  while (index >= 0 && shown < 3) {
    const snippet = normalized.slice(Math.max(0, index - 50), Math.min(normalized.length, index + 220));
    console.log(`--- ${keyword} @${index}: ${snippet}`);
    index = normalized.indexOf(keyword, index + 1);
    shown += 1;
  }
}
