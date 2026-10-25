import { known, type Evidence, type MatchInput } from "./contracts";
import { adaptProfile } from "./adapters";
import { emptyProfile } from "../profile";
import { directions } from "../directions";

const evidence: Evidence = { ref: "simulation:match-v2", source_kind: "simulation", url: null, published_at: null, retrieved_at: "2026-10-21T00:00:00Z", verification: "simulation", locator: "独立合成演示数据，不代表任何真实岗位标准或官方 O*NET 结果" };
const vector = (scores: number[]) => ({ instrument: "simulation-RIASEC", version: "2", scores: { realistic: scores[0], investigative: scores[1], artistic: scores[2], social: scores[3], enterprising: scores[4], conventional: scores[5] }, scale: { min: 0, max: 10 } });
const SKILLS = ["python", "statistics", "machine_learning", "clinical_reasoning", "research_design", "product_requirements", "communication", "data_management", "model_evaluation"] as const;

/** 10 个方向（9 个跨学科特化 + 医学）各给一条彼此不同的合成兴趣轮廓，仅用于演示“每方向一条”，不是真实岗位画像。 */
const SYNTHETIC_INTERESTS = [
  [4, 9, 3, 7, 8, 5], // ml_cv：偏研究与企业
  [5, 8, 2, 4, 6, 8], // software：偏研究、常规
  [3, 9, 4, 5, 7, 6], // llm_agent：偏研究
  [8, 7, 3, 4, 5, 7], // devices：偏现实
  [7, 8, 2, 3, 4, 6], // signals：偏现实与研究
  [6, 9, 4, 3, 4, 8], // imaging_eng：偏研究
  [3, 8, 2, 5, 4, 9], // clinical_data：偏常规与分析
  [4, 7, 2, 6, 5, 8], // health_systems：偏社会与常规
  [2, 9, 5, 6, 4, 7], // med_nlp_kg：偏研究
  [2, 5, 3, 10, 4, 6], // medicine：偏社会与助人
];

export function simulationInput(): MatchInput {
  const user = adaptProfile(emptyProfile, null, null, evidence.retrieved_at);
  user.simulation = true;
  user.medical_background = known("simulation 临床医学", evidence);
  user.interests = known(vector([4, 9, 3, 7, 8, 5]), evidence);
  user.preferences = known(["协作", "研究"], evidence);
  user.study_intent = known("统考", evidence); user.target_year = 2028;
  user.weekly_hours = known(4, evidence);
  user.qualifications.major = known("临床医学", evidence);
  user.skills = SKILLS.map((skill, i) => ({ skill_id: skill, level: known([1, 2, 1, 3, 2, 1, 3, 2, 1][i], evidence) }));
  // 合成演示必须与真实标准彻底隔离：连标准版本号都不能沿用官方值，否则报告会误导读者。
  const occupations = directions.map((direction, i) => ({
    schema_version: "match-2" as const, id: direction.id, title: direction.name, simulation: true,
    direction_ids: [direction.id], onet_codes: direction.onet.map(o => o.code), mapping_basis: "simulation: 10 方向合成演示，不是 O*NET 或任何真实标准",
    standard_version: "simulation-not-an-official-standard",
    tasks: known(direction.work_tasks, evidence),
    interests: known(vector(SYNTHETIC_INTERESTS[i]), evidence),
    skills: SKILLS.map(skill => ({ skill_id: skill, importance: known(3, evidence), required_level: known(3, evidence) })),
    preferences: known(i === 0 ? ["协作"] : ["研究"], evidence),
    professional_background: known("simulation 医学或相关背景", evidence),
    hard_requirements: known([] as { id: string; field: "major"; allowed: string[]; evidence: Evidence[] }[], evidence),
  }));
  user.experiences = occupations.map(o => ({ id: `simulation:${o.id}`, occupation_id: o.id, scenario_id: `simulation-${o.id}`, mode: "project", simulation: true, completed_at: evidence.retrieved_at, artifacts: ["simulation 任务成果"], willingness: known(4, evidence), evaluations: [] }));
  return { user, occupations, admissions: [] };
}
