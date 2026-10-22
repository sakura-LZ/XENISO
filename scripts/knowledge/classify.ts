import type { KnowledgeRecord } from "../../src/lib/knowledge";

const fieldRules = {
  occupation: ["responsibilities", "privacy_requirements", "skills", "career_path", "occupation_definition", "program_definition", "employment_directions", "departments"],
  recruitment: ["employer", "city", "education", "major_restrictions", "technical_requirements", "salary", "job_title", "experience", "job_type"],
  admissions: ["institution", "program", "admission_year", "exam_subjects", "cross_major_restrictions", "training_direction", "admission_requirements", "degree_type"],
  industry: ["scope", "coverage_limit", "design_constraints", "governance_scope", "china_legal_requirement", "talent_demand", "policy_requirement", "policy_goals", "employment_statistics", "salary_statistics", "statistical_definition", "major_catalog"],
  learning: ["topics", "materials", "prerequisites", "access_requirement", "training", "regional_limit", "learning_hours", "research_project", "resource_title"],
};
export function classifyFacts(facts: Pick<KnowledgeRecord["facts"][number], "field">[]) {
  const ranked = Object.entries(fieldRules).map(([category, fields]) => ({ category, score: facts.filter(fact => fields.includes(fact.field)).length })).sort((a, b) => b.score - a.score);
  return ranked[0].score > 0 && ranked[0].score > ranked[1].score ? ranked[0].category : null;
}
