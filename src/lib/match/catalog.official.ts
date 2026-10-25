import { occupationSeeds } from "./catalog";
import { officialStandards } from "./standards";

/**
 * 服务端使用的岗位目录：官方数值标准优先。
 *
 * 官方标准已扩到 10 个方向（9 个跨学科特化 + 医学），每个方向独立一条 Occupation。
 * 文件不存在或为空时退回旧的四方向 seeds（兴趣/技能全 unknown），绝不补零或伪造标准。
 *
 * 只在服务端（Route Handler / Server Component / 脚本 / 测试）导入；客户端组件请用 `catalog.ts`
 * 的 `occupationSeeds`，否则 webpack 会尝试把 node:fs 打进浏览器包并失败。
 */
const standards = officialStandards();
export const matchOccupations = standards.occupations.length ? standards.occupations : occupationSeeds;
export { occupationSeeds };
