// 字段 → 类目 的唯一定义处。
// 历史坑：这段规则曾在 verify-handoff.ts 与 classify.ts 各存一份，
// 新增字段只改一处会导致 classifyFacts 得 0 分、采集报 classification_review_required。
// 现在两处都从这里导入，改字段只改这一份。
export const fieldRules: Record<string, string[]> = {
  occupation: ["interests", "responsibilities", "privacy_requirements", "skills", "career_path", "occupation_definition", "program_definition", "employment_directions", "departments", "work_tasks", "abilities", "education", "related_occupations", "standard_status"],
  recruitment: ["employer", "city", "education", "major_restrictions", "technical_requirements", "salary", "job_title", "experience", "job_type"],
  admissions: ["institution", "program", "admission_year", "exam_subjects", "cross_major_restrictions", "training_direction", "admission_requirements", "degree_type"],
  industry: ["scope", "coverage_limit", "design_constraints", "governance_scope", "china_legal_requirement", "talent_demand", "policy_requirement", "policy_goals", "employment_statistics", "salary_statistics", "statistical_definition", "major_catalog", "industry_distribution", "further_study_rate"],
  learning: ["topics", "materials", "prerequisites", "access_requirement", "training", "regional_limit", "learning_hours", "research_project", "resource_title", "curriculum", "credit_requirement", "course_prerequisites", "practice_hours"],
};
