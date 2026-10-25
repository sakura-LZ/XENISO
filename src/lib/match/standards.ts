import { readFileSync } from "node:fs";
import { join } from "node:path";
import { occupationSchema, type Occupation } from "./contracts";

/**
 * 官方岗位数值标准的加载器。
 *
 * 数据由 `scripts/match-standards-onet.ts` 从 O*NET 31.0 官方数据库表生成到
 * `data/match/occupations.official.json`，**不要手改产物**；改生成规则后重跑脚本。
 *
 * 语义（不造假优先）：
 * - 文件不存在 → 返回空表，`catalog.ts` 保持「岗位标准待审核」的旧行为（兴趣/要求全为 unknown）。
 * - 文件存在但某条不符合 `match-2` occupationSchema → 抛错。静默丢弃会让「标准缺失」伪装成「已审核」。
 * - 官方数值只代表 O*NET 美国职业数据经 LIMEN 编辑性投影后的量尺，不是中国考研专业结论。
 */
export const OFFICIAL_STANDARDS_PATH = join(process.cwd(), "data", "match", "occupations.official.json");

export type OfficialStandards = {
  standardVersion: string | null;
  occupations: Occupation[];
  byOccupation: Map<string, Occupation>;
  audits: unknown[];
};

const EMPTY: OfficialStandards = { standardVersion: null, occupations: [], byOccupation: new Map(), audits: [] };

let cache: OfficialStandards | null = null;

function parse(raw: string, file: string): OfficialStandards {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(`岗位标准不是合法 JSON：${file}`);
  }
  const container = parsed as { standard_version?: unknown; occupations?: unknown; audits?: unknown };
  if (!Array.isArray(container.occupations)) throw new Error(`岗位标准缺少 occupations 数组：${file}`);
  const byOccupation = new Map<string, Occupation>();
  container.occupations.forEach((entry, index) => {
    const result = occupationSchema.safeParse(entry);
    if (!result.success) {
      const issues = result.error.issues.slice(0, 3).map(issue => `${issue.path.join(".") || "(root)"} ${issue.message}`).join("; ");
      throw new Error(`岗位标准第 ${index} 条不符合 match-2 契约（${file}）：${issues}`);
    }
    if (byOccupation.has(result.data.id)) throw new Error(`岗位标准存在重复岗位 ${result.data.id}（${file}）`);
    byOccupation.set(result.data.id, result.data);
  });
  return { standardVersion: typeof container.standard_version === "string" ? container.standard_version : null, occupations: [...byOccupation.values()], byOccupation, audits: Array.isArray(container.audits) ? container.audits : [] };
}

/** 读取官方岗位标准。传入 `path` 仅用于测试与离线核对。 */
export function officialStandards(options: { path?: string } = {}): OfficialStandards {
  if (options.path) {
    try {
      return parse(readFileSync(options.path, "utf8"), options.path);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return EMPTY;
      throw error;
    }
  }
  if (cache) return cache;
  try {
    cache = parse(readFileSync(OFFICIAL_STANDARDS_PATH, "utf8"), OFFICIAL_STANDARDS_PATH);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") { cache = EMPTY; return cache; }
    throw error;
  }
  return cache;
}

/** 技能量尺版本（`data/match/skill-rubric.json` 的 version，缺失时为 null）。 */
export function rubricVersion(options: { path?: string } = {}): string | null {
  const path = options.path ?? join(process.cwd(), "data", "match", "skill-rubric.json");
  try {
    const parsed = JSON.parse(readFileSync(path, "utf8")) as { version?: unknown };
    return typeof parsed.version === "string" ? parsed.version : null;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}

/** 测试用：清空模块级缓存。 */
export function resetOfficialStandardsCache() {
  cache = null;
}
