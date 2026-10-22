import { known, type Evidence, type MatchInput } from "./contracts";
import { matchOccupations } from "./catalog";
import { adaptProfile } from "./adapters";
import { emptyProfile } from "../profile";

const evidence: Evidence = { ref: "simulation:match-v1", source_kind: "simulation", url: null, published_at: null, retrieved_at: "2026-10-21T00:00:00Z", verification: "simulation", locator: "独立合成演示数据，不代表任何真实岗位标准或官方 O*NET 结果" };
const vector = (scores: number[]) => ({ instrument: "simulation-RIASEC", version: "1", scores: { realistic: scores[0], investigative: scores[1], artistic: scores[2], social: scores[3], enterprising: scores[4], conventional: scores[5] }, scale: { min: 0, max: 10 } });
export function simulationInput(): MatchInput {
  const user = adaptProfile(emptyProfile, null, null, evidence.retrieved_at);
  user.simulation = true;
  user.medical_background = known("simulation 临床医学", evidence);
  user.interests = known(vector([4, 9, 3, 7, 8, 5]), evidence);
  user.preferences = known(["协作", "研究"], evidence);
  user.study_intent = known("统考", evidence); user.target_year = 2028;
  user.weekly_hours = known(4, evidence);
  user.qualifications.major = known("临床医学", evidence);
  user.skills = ["python", "statistics", "machine_learning", "clinical_reasoning", "research_design", "product_requirements", "communication", "data_management", "model_evaluation"].map((skill, i) => ({ skill_id: skill as MatchInput["user"]["skills"][number]["skill_id"], level: known([1, 2, 1, 3, 2, 1, 3, 2, 1][i], evidence) }));
  const occupations = matchOccupations.map((o, i) => ({ ...o, simulation: true,
    tasks: known([`simulation ${o.title}任务`], evidence), interests: known(vector([[4, 8, 3, 8, 9, 5], [3, 9, 2, 4, 3, 8], [7, 10, 2, 3, 3, 5]][i]), evidence),
    skills: o.skills.map(s => ({ skill_id: s.skill_id, importance: known(3, evidence), required_level: known(3, evidence) })),
    preferences: known(i === 0 ? ["协作"] : ["研究"], evidence), professional_background: known("simulation 医学或相关背景", evidence),
    hard_requirements: known([], evidence),
  }));
  user.experiences = occupations.map(o => ({ id: `simulation:${o.id}`, occupation_id: o.id, scenario_id: `simulation-${o.id}`, mode: "project", simulation: true, completed_at: evidence.retrieved_at, artifacts: ["simulation 任务成果"], willingness: known(4, evidence), evaluations: [] }));
  return { user, occupations, admissions: [] };
}
