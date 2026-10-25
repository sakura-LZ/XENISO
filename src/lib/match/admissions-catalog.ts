import { readFileSync } from "node:fs";
import { join } from "node:path";
import { admissionSchema, type Admission } from "./contracts";

/**
 * 结构化招生标准的加载器。
 *
 * 数据由 `scripts/match-admissions.ts` 从 `data/knowledge/*.collected.json` 生成到
 * `data/match/admissions.structured.json`，**不要手改产物**；改数据源后重跑脚本。
 *
 * 语义（不造假优先）：
 * - 文件不存在或内容为空 → 返回 `[]`。这与 V1 的「真实模式招生恒为空」语义一致，
 *   页面应显示「尚无结构化关联招生项目」，而不是编造条目。
 * - 文件存在但内容损坏（非法 JSON / 不符合 match-2 admissionSchema）→ 抛错。
 *   静默丢弃坏数据会让「数据缺失」伪装成「没有符合条件的项目」，因此这里宁可显式失败。
 * - 只在服务端（Server Component / Route Handler / 脚本）调用；不要把整份数据塞进客户端 bundle。
 */
const DEFAULT_PATH = join(process.cwd(), "data", "match", "admissions.structured.json");

let defaultCache: Admission[] | null = null;

function parseAdmissions(raw: string, file: string): Admission[] {
  if (raw.trim() === "") return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(`招生数据不是合法 JSON：${file}`);
  }
  const list = Array.isArray(parsed) ? parsed : (parsed as { admissions?: unknown } | null)?.admissions;
  if (!Array.isArray(list)) throw new Error(`招生数据缺少 admissions 数组：${file}`);
  return list.map((entry, index) => {
    const result = admissionSchema.safeParse(entry);
    if (!result.success) {
      const issues = result.error.issues.slice(0, 3).map(issue => `${issue.path.join(".") || "(root)"} ${issue.message}`).join("; ");
      throw new Error(`招生数据第 ${index} 条不符合 match-2 契约（${file}）：${issues}`);
    }
    return result.data;
  });
}

/**
 * 读取结构化招生标准。传入 `path` 仅用于测试与离线核对；正常调用不传参。
 */
export function matchAdmissions(options: { path?: string } = {}): Admission[] {
  if (options.path) {
    let raw: string;
    try {
      raw = readFileSync(options.path, "utf8");
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
      throw error;
    }
    return parseAdmissions(raw, options.path);
  }
  if (defaultCache) return defaultCache;
  let raw: string;
  try {
    raw = readFileSync(DEFAULT_PATH, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      defaultCache = [];
      return defaultCache;
    }
    throw error;
  }
  defaultCache = parseAdmissions(raw, DEFAULT_PATH);
  return defaultCache;
}

/** 测试用：清空模块级缓存。 */
export function resetMatchAdmissionsCache() {
  defaultCache = null;
}

export const MATCH_ADMISSIONS_PATH = DEFAULT_PATH;
