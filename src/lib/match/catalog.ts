import { findDirection } from "../directions";
import { unknown, known, type Evidence, type Occupation } from "./contracts";

const editorial: Evidence = { ref: "data/occupation_direction_map.json@1.0", source_kind: "editorial", url: null, published_at: "2026-10-20", retrieved_at: "2026-10-21T00:00:00Z", verification: "verified", locator: "LIMEN 编辑性职业方向映射；不代表中国岗位统一要求" };
export const matchOccupations: Occupation[] = [
  { id: "medical_ai_pm", title: "医学 AI 产品经理", direction: "health_systems", skills: ["clinical_reasoning", "product_requirements", "communication"] },
  { id: "clinical_data_analyst", title: "临床数据分析师", direction: "clinical_data", skills: ["statistics", "research_design", "data_management"] },
  { id: "medical_ml_engineer", title: "医学机器学习工程师", direction: "ml_cv", skills: ["python", "machine_learning", "model_evaluation"] },
].map(spec => {
  const direction = findDirection(spec.direction);
  if (!direction) throw new Error(`Missing direction ${spec.direction}`);
  return {
    schema_version: "match-2", id: spec.id, title: spec.title, simulation: false,
    direction_ids: [direction.id], onet_codes: direction.onet.map(o => o.code), mapping_basis: editorial.locator,
    tasks: known(direction.work_tasks, editorial), interests: unknown(),
    skills: spec.skills.map(skill => ({ skill_id: skill as keyof typeof import("./contracts").skillLabels, importance: unknown(), required_level: unknown() })),
    professional_background: unknown(), hard_requirements: unknown(), preferences: unknown(),
  };
});
