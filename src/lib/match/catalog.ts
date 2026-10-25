import { groups } from "../directions";
import { unknown, known, type Evidence, type Occupation, type skillLabels } from "./contracts";

/**
 * 岗位的静态定义（客户端安全：不读文件系统）。
 *
 * 岗位粒度 = **方向整体**（`data/occupation_direction_map.json` 的三个方向 + `data/medicine_direction.json` 的继续医学），
 * 不是单个特化。原因：把 9 个特化铺开会让共用同一 O*NET SOC 的方向产生完全相同的兴趣分
 * （如智能医疗器械/医学信号处理/医学影像工程同为 17-2031.00），兴趣维度失去区分力；
 * 而只挑 3 个特化又会让候选集挤在数据/工程一侧（两两相关均值 0.78）。按方向取数后均值为 0.56，区分度恢复。
 *
 * 这里只放「方向是什么」——方向 id、SOC 列表、编辑性任务描述与技能清单；所有数值一律 unknown()。
 * 官方数值由 `catalog.official.ts` 在服务端合并进来（它需要读 data/match/occupations.official.json）。
 * 之所以拆开：`simulation.ts` 会被客户端组件引用，若这里 import node:fs，webpack 打包客户端会直接失败。
 */
const editorial: Evidence = { ref: "data/occupation_direction_map.json@1.1", source_kind: "editorial", url: null, published_at: "2026-10-23", retrieved_at: "2026-10-23T00:00:00Z", verification: "verified", locator: "LIMEN 编辑性职业方向映射（方向级 O*NET 代表职业为编辑性选点）；不代表中国岗位统一要求，也不是 O*NET 官方中国考研专业结论" };

// 每个方向一律列出全部 9 个技能：未映射的技能不会出现在官方标准里，因此不进入准备度分母（由数据决定，不在这里手挑）。
const ALL_SKILLS: (keyof typeof skillLabels)[] = ["python", "statistics", "machine_learning", "clinical_reasoning", "research_design", "product_requirements", "communication", "data_management", "model_evaluation"];

export const occupationSeeds: Occupation[] = groups.map(group => {
  const tasks = group.specializations.flatMap(item => item.work_tasks ?? []);
  return {
    schema_version: "match-2" as const, id: group.id, title: group.name, simulation: false,
    direction_ids: [group.id], onet_codes: group.onet.map(item => item.code), mapping_basis: editorial.locator,
    tasks: known(tasks, editorial), interests: unknown(),
    skills: ALL_SKILLS.map(skill => ({ skill_id: skill, importance: unknown(), required_level: unknown() })),
    professional_background: unknown(), hard_requirements: unknown(), preferences: unknown(),
  };
});

/**
 * 用官方标准覆盖静态定义。
 *
 * 有官方标准（`scripts/match-standards-onet.ts` 生成的 O*NET 数据）就用它；没有则保留全 unknown，
 * 让界面显示「标准待审核」而不是用编造数值出分。未映射技能不在官方 skills[] 里，因此不参与准备度分母。
 */
export function applyStandards(seeds: Occupation[], byOccupation: Map<string, Occupation>): Occupation[] {
  return seeds.map(seed => byOccupation.get(seed.id) ?? seed);
}
