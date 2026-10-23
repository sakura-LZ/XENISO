# 知识库字段完整度矩阵

> 生成时间：2026-10-23T07:22:06.122Z。机器可读版本：`data/knowledge/field-coverage.json`。
>
> 说明：`✓ n` 表示该职业在该类别下有 n 条该字段事实；`—` 表示缺值。缺值分两种：
> 1) **应有但未采到**：来自各记录的 `expected_fields`（例如 `tuition`、`college_retest_rules`）；
> 2) **本类目本就不适用**：该类别本来不会出现的字段（例如招聘类不产 `exam_subjects`），按缺值显示但不算采集失败。

## 总览

| 职业 id | 名称 | 映射到 App 职业 | 事实总数 | 职业 | 招生 | 招聘 | 行业 | 学习 | 字段有值/总数 | 缺失字段数 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `medical_ai_pm` | 医学 AI 产品经理 | 是 | 158 | 31 | 16 | 52 | 47 | 12 | 37/96 | 59 |
| `clinical_data_analyst` | 临床数据分析师 | 是 | 109 | 35 | 16 | 30 | 22 | 6 | 27/96 | 69 |
| `medical_ml_engineer` | 医学机器学习工程师 | 是 | 99 | 41 | 11 | 6 | 30 | 11 | 17/96 | 79 |
| `guide_devices` | guide_devices | 否（未映射） | 98 | 16 | 22 | 25 | 12 | 23 | 26/96 | 70 |
| `guide_signals` | guide_signals | 否（未映射） | 34 | 4 | 17 | 2 | 9 | 2 | 15/96 | 81 |
| `guide_imaging_eng` | guide_imaging_eng | 否（未映射） | 59 | 7 | 18 | 21 | 9 | 4 | 22/96 | 74 |
| `medicine_guide` | medicine_guide | 否（未映射） | 188 | 40 | 59 | 26 | 32 | 31 | 31/96 | 65 |

## 医学 AI 产品经理（`medical_ai_pm`）

事实总数 158；字段有值 37/96，缺失 59。

| 字段 | 中文名 | 职业 | 招生 | 招聘 | 行业 | 学习 |
| --- | --- | --- | --- | --- | --- | --- |
| `access_requirement` | 准入要求 | — | — | — | — | ✓ 1 |
| `admission_requirements` | 报考条件 | — | ✓ 4 | — | — | — |
| `application_deadline` | （未登记） | — | — | — | — | — |
| `average_salary` | （未登记） | — | — | — | — | — |
| `career_path` | 职业路径 | ✓ 5 | — | — | — | — |
| `career_promotion_path` | （未登记） | — | — | — | — | — |
| `certificate` | （未登记） | — | — | — | — | — |
| `china_degree_requirement` | （未登记） | — | — | — | — | — |
| `china_legal_requirement` | 中国法规要求 | — | — | — | — | — |
| `china_talent_demand` | （未登记） | — | — | — | — | — |
| `city` | 城市 | — | — | ✓ 1 | — | — |
| `clinical_data_role_requirements` | （未登记） | — | — | — | — | — |
| `clinical_validation` | （未登记） | — | — | — | — | — |
| `college_retest_rules` | 复试规则 | — | — | — | — | — |
| `course_enrollment` | （未登记） | — | — | — | — | — |
| `course_hours` | （未登记） | — | — | — | — | — |
| `coverage_limit` | 覆盖范围 | — | — | — | ✓ 6 | — |
| `cross_major_restrictions` | 跨专业限制 | — | ✓ 3 | — | — | — |
| `current_course_access` | （未登记） | — | — | — | — | — |
| `current_enrollment` | （未登记） | — | — | — | — | — |
| `current_product_classification` | （未登记） | — | — | — | — | — |
| `current_program_capacity` | （未登记） | — | — | — | — | — |
| `current_year_requirements` | （未登记） | — | — | — | — | — |
| `deadline` | （未登记） | — | — | — | — | — |
| `department_salary` | （未登记） | — | — | — | — | — |
| `department_training_path` | （未登记） | — | — | — | — | — |
| `departments` | 科室/院系 | — | — | — | — | — |
| `design_constraints` | 设计约束 | — | — | — | ✓ 2 | — |
| `direction_employment_rate` | （未登记） | — | — | — | — | — |
| `doctor_salary` | （未登记） | — | — | — | — | — |
| `education` | 学历要求 | — | — | ✓ 10 | — | — |
| `employer` | 雇主/去向 | — | — | ✓ 4 | — | — |
| `employment_directions` | 就业去向 | — | — | — | — | — |
| `employment_rate` | （未登记） | — | — | — | — | — |
| `employment_statistics` | 就业统计 | — | — | — | ✓ 1 | — |
| `engineering_prerequisites` | （未登记） | — | — | — | — | — |
| `exam_subjects` | 初试科目 | — | ✓ 5 | — | — | — |
| `experience` | 经验要求 | — | — | ✓ 8 | — | — |
| `full_guideline` | （未登记） | — | — | — | — | — |
| `governance_scope` | 治理范围 | — | — | — | ✓ 1 | — |
| `graduate_salary` | （未登记） | — | — | — | — | — |
| `hard_requirements` | （未登记） | — | — | — | — | — |
| `industry_universal_requirements` | （未登记） | — | — | — | — | — |
| `institution` | 院校 | — | ✓ 2 | — | — | — |
| `interests` | 兴趣 | ✓ 6 | — | — | — | — |
| `job_title` | 岗位名称 | — | — | ✓ 11 | — | — |
| `job_type` | 岗位类型 | — | — | ✓ 2 | — | — |
| `knowledge_graph_requirements` | （未登记） | — | — | — | — | — |
| `learning_hours` | 学分/学时 | — | — | — | — | — |
| `license_eligibility` | （未登记） | — | — | — | — | — |
| `major_average_salary` | （未登记） | — | — | — | — | — |
| `major_catalog` | 专业目录 | — | — | — | — | — |
| `major_employment_rate` | （未登记） | — | — | — | — | — |
| `major_graduate_salary` | （未登记） | — | — | — | — | — |
| `major_restrictions` | 专业限制 | — | — | ✓ 5 | — | — |
| `materials` | 材料 | — | — | — | — | ✓ 3 |
| `medical_major_salary` | （未登记） | — | — | — | — | — |
| `medical_specific_standard` | （未登记） | — | — | — | — | — |
| `medicine_major_eligibility` | （未登记） | — | — | — | — | — |
| `national_department_standard` | （未登记） | — | — | — | — | — |
| `observed_talent_demand` | （未登记） | — | — | — | — | — |
| `occupation_definition` | 职业定义 | ✓ 5 | — | — | — | — |
| `ordinary_bachelor_program_eligibility` | （未登记） | — | — | — | — | — |
| `personal_eligibility` | 个人报考资格 | — | — | — | — | — |
| `personal_learning_hours` | （未登记） | — | — | — | — | — |
| `policy_goals` | 政策目标 | — | — | — | ✓ 3 | — |
| `policy_requirement` | 政策要求 | — | — | — | ✓ 3 | — |
| `preferred_background` | 优先背景 | — | — | ✓ 1 | — | — |
| `prerequisites` | 先修要求 | — | — | — | — | — |
| `privacy_requirements` | 隐私要求 | ✓ 1 | — | — | — | — |
| `program` | 专业/项目 | — | ✓ 1 | — | — | — |
| `program_definition` | 项目/专业定义 | — | — | — | — | — |
| `published_at` | （未登记） | — | — | — | — | — |
| `recruitment_eligibility` | （未登记） | — | — | — | — | — |
| `regional_limit` | 地域限制 | — | — | — | — | ✓ 1 |
| `registration_window` | 报名时间 | — | ✓ 1 | — | — | — |
| `regulatory_basis` | （未登记） | — | — | — | — | — |
| `research_project` | 研究项目 | — | — | — | — | ✓ 1 |
| `research_vacancy` | （未登记） | — | — | — | — | — |
| `resource_title` | 资源标题 | — | — | — | — | — |
| `responsibilities` | 岗位职责 | ✓ 5 | — | — | — | — |
| `role_average_salary` | （未登记） | — | — | — | — | — |
| `role_specific_career_path` | （未登记） | — | — | — | — | — |
| `salary` | 薪资 | — | — | ✓ 1 | — | — |
| `salary_statistics` | 薪资统计 | — | — | — | ✓ 19 | — |
| `school_specific_admissions` | （未登记） | — | — | — | — | — |
| `scope` | 适用范围 | — | — | — | ✓ 2 | — |
| `skills` | 技能 | ✓ 9 | — | — | — | — |
| `statistical_definition` | 统计口径 | — | — | — | ✓ 10 | — |
| `talent_demand` | （未登记） | — | — | — | — | — |
| `technical_requirements` | 技术要求 | — | — | ✓ 9 | — | — |
| `topics` | 课程主题 | — | — | — | — | ✓ 4 |
| `total_graduates` | （未登记） | — | — | — | — | — |
| `training` | 培养目标 | — | — | — | — | ✓ 2 |
| `training_direction` | （未登记） | — | — | — | — | — |
| `tuition` | 学费 | — | — | — | — | — |

<details><summary>缺值清单（13）</summary>

- `occupation.departments`
- `occupation.employment_directions`
- `occupation.program_definition`
- `admissions.college_retest_rules`
- `admissions.personal_eligibility`
- `admissions.tuition`
- `recruitment.access_requirement`
- `industry.china_legal_requirement`
- `industry.major_catalog`
- `learning.learning_hours`
- `learning.occupation_definition`
- `learning.prerequisites`
- `learning.resource_title`

</details>

## 临床数据分析师（`clinical_data_analyst`）

事实总数 109；字段有值 27/96，缺失 69。

| 字段 | 中文名 | 职业 | 招生 | 招聘 | 行业 | 学习 |
| --- | --- | --- | --- | --- | --- | --- |
| `access_requirement` | 准入要求 | — | — | — | — | ✓ 1 |
| `admission_requirements` | 报考条件 | — | ✓ 2 | — | — | — |
| `application_deadline` | （未登记） | — | — | — | — | — |
| `average_salary` | （未登记） | — | — | — | — | — |
| `career_path` | 职业路径 | ✓ 3 | — | — | — | — |
| `career_promotion_path` | （未登记） | — | — | — | — | — |
| `certificate` | （未登记） | — | — | — | — | — |
| `china_degree_requirement` | （未登记） | — | — | — | — | — |
| `china_legal_requirement` | 中国法规要求 | — | — | — | — | — |
| `china_talent_demand` | （未登记） | — | — | — | — | — |
| `city` | 城市 | — | — | — | — | — |
| `clinical_data_role_requirements` | （未登记） | — | — | — | — | — |
| `clinical_validation` | （未登记） | — | — | — | — | — |
| `college_retest_rules` | 复试规则 | — | — | — | — | — |
| `course_enrollment` | （未登记） | — | — | — | — | — |
| `course_hours` | （未登记） | — | — | — | — | — |
| `coverage_limit` | 覆盖范围 | — | — | — | — | — |
| `cross_major_restrictions` | 跨专业限制 | — | ✓ 7 | — | — | — |
| `current_course_access` | （未登记） | — | — | — | — | — |
| `current_enrollment` | （未登记） | — | — | — | — | — |
| `current_product_classification` | （未登记） | — | — | — | — | — |
| `current_program_capacity` | （未登记） | — | — | — | — | — |
| `current_year_requirements` | （未登记） | — | — | — | — | — |
| `deadline` | （未登记） | — | — | — | — | — |
| `department_salary` | （未登记） | — | — | — | — | — |
| `department_training_path` | （未登记） | — | — | — | — | — |
| `departments` | 科室/院系 | — | — | — | — | — |
| `design_constraints` | 设计约束 | — | — | — | — | — |
| `direction_employment_rate` | （未登记） | — | — | — | — | — |
| `doctor_salary` | （未登记） | — | — | — | — | — |
| `education` | 学历要求 | — | — | ✓ 4 | — | — |
| `employer` | 雇主/去向 | — | — | ✓ 1 | — | — |
| `employment_directions` | 就业去向 | ✓ 2 | — | — | — | — |
| `employment_rate` | （未登记） | — | — | — | — | — |
| `employment_statistics` | 就业统计 | — | — | — | ✓ 2 | — |
| `engineering_prerequisites` | （未登记） | — | — | — | — | — |
| `exam_subjects` | 初试科目 | — | ✓ 5 | — | — | — |
| `experience` | 经验要求 | — | — | ✓ 3 | — | — |
| `full_guideline` | （未登记） | — | — | — | — | — |
| `governance_scope` | 治理范围 | — | — | — | — | — |
| `graduate_salary` | （未登记） | — | — | — | — | — |
| `hard_requirements` | （未登记） | — | — | — | — | — |
| `industry_universal_requirements` | （未登记） | — | — | — | — | — |
| `institution` | 院校 | — | — | — | — | — |
| `interests` | 兴趣 | ✓ 6 | — | — | — | — |
| `job_title` | 岗位名称 | — | — | ✓ 9 | — | — |
| `job_type` | 岗位类型 | — | — | ✓ 1 | — | — |
| `knowledge_graph_requirements` | （未登记） | — | — | — | — | — |
| `learning_hours` | 学分/学时 | — | — | — | — | ✓ 1 |
| `license_eligibility` | （未登记） | — | — | — | — | — |
| `major_average_salary` | （未登记） | — | — | — | — | — |
| `major_catalog` | 专业目录 | — | — | — | — | — |
| `major_employment_rate` | （未登记） | — | — | — | — | — |
| `major_graduate_salary` | （未登记） | — | — | — | — | — |
| `major_restrictions` | 专业限制 | — | — | ✓ 5 | — | — |
| `materials` | 材料 | — | — | — | — | — |
| `medical_major_salary` | （未登记） | — | — | — | — | — |
| `medical_specific_standard` | （未登记） | — | — | — | — | — |
| `medicine_major_eligibility` | （未登记） | — | — | — | — | — |
| `national_department_standard` | （未登记） | — | — | — | — | — |
| `observed_talent_demand` | （未登记） | — | — | — | — | — |
| `occupation_definition` | 职业定义 | ✓ 6 | — | — | — | — |
| `ordinary_bachelor_program_eligibility` | （未登记） | — | — | — | — | — |
| `personal_eligibility` | 个人报考资格 | — | — | — | — | — |
| `personal_learning_hours` | （未登记） | — | — | — | — | — |
| `policy_goals` | 政策目标 | — | — | — | ✓ 1 | — |
| `policy_requirement` | 政策要求 | — | — | — | ✓ 2 | — |
| `preferred_background` | 优先背景 | — | — | — | — | — |
| `prerequisites` | 先修要求 | — | — | — | — | — |
| `privacy_requirements` | 隐私要求 | — | — | — | — | — |
| `program` | 专业/项目 | — | ✓ 2 | — | — | — |
| `program_definition` | 项目/专业定义 | ✓ 2 | — | — | — | — |
| `published_at` | （未登记） | — | — | — | — | — |
| `recruitment_eligibility` | （未登记） | — | — | — | — | — |
| `regional_limit` | 地域限制 | — | — | — | — | — |
| `registration_window` | 报名时间 | — | — | — | — | — |
| `regulatory_basis` | （未登记） | — | — | — | — | — |
| `research_project` | 研究项目 | — | — | — | — | — |
| `research_vacancy` | （未登记） | — | — | — | — | — |
| `resource_title` | 资源标题 | — | — | — | — | — |
| `responsibilities` | 岗位职责 | ✓ 7 | — | — | — | — |
| `role_average_salary` | （未登记） | — | — | — | — | — |
| `role_specific_career_path` | （未登记） | — | — | — | — | — |
| `salary` | 薪资 | — | — | ✓ 1 | — | — |
| `salary_statistics` | 薪资统计 | — | — | — | ✓ 11 | — |
| `school_specific_admissions` | （未登记） | — | — | — | — | — |
| `scope` | 适用范围 | — | — | — | — | — |
| `skills` | 技能 | ✓ 9 | — | — | — | — |
| `statistical_definition` | 统计口径 | — | — | — | ✓ 6 | — |
| `talent_demand` | （未登记） | — | — | — | — | — |
| `technical_requirements` | 技术要求 | — | — | ✓ 6 | — | — |
| `topics` | 课程主题 | — | — | — | — | ✓ 4 |
| `total_graduates` | （未登记） | — | — | — | — | — |
| `training` | 培养目标 | — | — | — | — | — |
| `training_direction` | （未登记） | — | — | — | — | — |
| `tuition` | 学费 | — | — | — | — | — |

<details><summary>缺值清单（23）</summary>

- `occupation.departments`
- `occupation.privacy_requirements`
- `admissions.college_retest_rules`
- `admissions.institution`
- `admissions.personal_eligibility`
- `admissions.registration_window`
- `admissions.tuition`
- `recruitment.access_requirement`
- `recruitment.city`
- `recruitment.preferred_background`
- `industry.china_legal_requirement`
- `industry.coverage_limit`
- `industry.design_constraints`
- `industry.governance_scope`
- `industry.major_catalog`
- `industry.scope`
- `learning.materials`
- `learning.occupation_definition`
- `learning.prerequisites`
- `learning.regional_limit`
- `learning.research_project`
- `learning.resource_title`
- `learning.training`

</details>

## 医学机器学习工程师（`medical_ml_engineer`）

事实总数 99；字段有值 17/96，缺失 79。

| 字段 | 中文名 | 职业 | 招生 | 招聘 | 行业 | 学习 |
| --- | --- | --- | --- | --- | --- | --- |
| `access_requirement` | 准入要求 | — | — | — | — | — |
| `admission_requirements` | 报考条件 | — | ✓ 3 | — | — | — |
| `application_deadline` | （未登记） | — | — | — | — | — |
| `average_salary` | （未登记） | — | — | — | — | — |
| `career_path` | 职业路径 | ✓ 4 | — | — | — | — |
| `career_promotion_path` | （未登记） | — | — | — | — | — |
| `certificate` | （未登记） | — | — | — | — | — |
| `china_degree_requirement` | （未登记） | — | — | — | — | — |
| `china_legal_requirement` | 中国法规要求 | — | — | — | — | — |
| `china_talent_demand` | （未登记） | — | — | — | — | — |
| `city` | 城市 | — | — | — | — | — |
| `clinical_data_role_requirements` | （未登记） | — | — | — | — | — |
| `clinical_validation` | （未登记） | — | — | — | — | — |
| `college_retest_rules` | 复试规则 | — | — | — | — | — |
| `course_enrollment` | （未登记） | — | — | — | — | — |
| `course_hours` | （未登记） | — | — | — | — | — |
| `coverage_limit` | 覆盖范围 | — | — | — | — | — |
| `cross_major_restrictions` | 跨专业限制 | — | ✓ 3 | — | — | — |
| `current_course_access` | （未登记） | — | — | — | — | — |
| `current_enrollment` | （未登记） | — | — | — | — | — |
| `current_product_classification` | （未登记） | — | — | — | — | — |
| `current_program_capacity` | （未登记） | — | — | — | — | — |
| `current_year_requirements` | （未登记） | — | — | — | — | — |
| `deadline` | （未登记） | — | — | — | — | — |
| `department_salary` | （未登记） | — | — | — | — | — |
| `department_training_path` | （未登记） | — | — | — | — | — |
| `departments` | 科室/院系 | — | — | — | — | — |
| `design_constraints` | 设计约束 | — | — | — | — | — |
| `direction_employment_rate` | （未登记） | — | — | — | — | — |
| `doctor_salary` | （未登记） | — | — | — | — | — |
| `education` | 学历要求 | — | — | — | — | — |
| `employer` | 雇主/去向 | — | — | — | — | — |
| `employment_directions` | 就业去向 | — | — | — | — | — |
| `employment_rate` | （未登记） | — | — | — | — | — |
| `employment_statistics` | 就业统计 | — | — | — | ✓ 3 | — |
| `engineering_prerequisites` | （未登记） | — | — | — | — | — |
| `exam_subjects` | 初试科目 | — | ✓ 5 | — | — | — |
| `experience` | 经验要求 | — | — | — | — | — |
| `full_guideline` | （未登记） | — | — | — | — | — |
| `governance_scope` | 治理范围 | — | — | — | — | — |
| `graduate_salary` | （未登记） | — | — | — | — | — |
| `hard_requirements` | （未登记） | — | — | — | — | — |
| `industry_universal_requirements` | （未登记） | — | — | — | — | — |
| `institution` | 院校 | — | — | — | — | — |
| `interests` | 兴趣 | ✓ 6 | — | — | — | — |
| `job_title` | 岗位名称 | — | — | ✓ 3 | — | — |
| `job_type` | 岗位类型 | — | — | — | — | — |
| `knowledge_graph_requirements` | （未登记） | — | — | — | — | — |
| `learning_hours` | 学分/学时 | — | — | — | — | ✓ 1 |
| `license_eligibility` | （未登记） | — | — | — | — | — |
| `major_average_salary` | （未登记） | — | — | — | — | — |
| `major_catalog` | 专业目录 | — | — | — | — | — |
| `major_employment_rate` | （未登记） | — | — | — | — | — |
| `major_graduate_salary` | （未登记） | — | — | — | — | — |
| `major_restrictions` | 专业限制 | — | — | — | — | — |
| `materials` | 材料 | — | — | — | — | — |
| `medical_major_salary` | （未登记） | — | — | — | — | — |
| `medical_specific_standard` | （未登记） | — | — | — | — | — |
| `medicine_major_eligibility` | （未登记） | — | — | — | — | — |
| `national_department_standard` | （未登记） | — | — | — | — | — |
| `observed_talent_demand` | （未登记） | — | — | — | — | — |
| `occupation_definition` | 职业定义 | ✓ 10 | — | — | — | — |
| `ordinary_bachelor_program_eligibility` | （未登记） | — | — | — | — | — |
| `personal_eligibility` | 个人报考资格 | — | — | — | — | — |
| `personal_learning_hours` | （未登记） | — | — | — | — | — |
| `policy_goals` | 政策目标 | — | — | — | — | — |
| `policy_requirement` | 政策要求 | — | — | — | — | — |
| `preferred_background` | 优先背景 | — | — | — | — | — |
| `prerequisites` | 先修要求 | — | — | — | — | — |
| `privacy_requirements` | 隐私要求 | — | — | — | — | — |
| `program` | 专业/项目 | — | — | — | — | — |
| `program_definition` | 项目/专业定义 | — | — | — | — | — |
| `published_at` | （未登记） | — | — | — | — | — |
| `recruitment_eligibility` | （未登记） | — | — | — | — | — |
| `regional_limit` | 地域限制 | — | — | — | — | — |
| `registration_window` | 报名时间 | — | — | — | — | — |
| `regulatory_basis` | （未登记） | — | — | — | — | — |
| `research_project` | 研究项目 | — | — | — | — | ✓ 1 |
| `research_vacancy` | （未登记） | — | — | — | — | — |
| `resource_title` | 资源标题 | — | — | — | — | — |
| `responsibilities` | 岗位职责 | ✓ 6 | — | — | — | — |
| `role_average_salary` | （未登记） | — | — | — | — | — |
| `role_specific_career_path` | （未登记） | — | — | — | — | — |
| `salary` | 薪资 | — | — | — | — | — |
| `salary_statistics` | 薪资统计 | — | — | — | ✓ 18 | — |
| `school_specific_admissions` | （未登记） | — | — | — | — | — |
| `scope` | 适用范围 | — | — | — | — | — |
| `skills` | 技能 | ✓ 15 | — | — | — | — |
| `statistical_definition` | 统计口径 | — | — | — | ✓ 9 | — |
| `talent_demand` | （未登记） | — | — | — | — | — |
| `technical_requirements` | 技术要求 | — | — | ✓ 3 | — | — |
| `topics` | 课程主题 | — | — | — | — | ✓ 6 |
| `total_graduates` | （未登记） | — | — | — | — | — |
| `training` | 培养目标 | — | — | — | — | ✓ 3 |
| `training_direction` | （未登记） | — | — | — | — | — |
| `tuition` | 学费 | — | — | — | — | — |

<details><summary>缺值清单（33）</summary>

- `occupation.departments`
- `occupation.employment_directions`
- `occupation.privacy_requirements`
- `occupation.program_definition`
- `admissions.college_retest_rules`
- `admissions.institution`
- `admissions.personal_eligibility`
- `admissions.program`
- `admissions.registration_window`
- `admissions.tuition`
- `recruitment.access_requirement`
- `recruitment.city`
- `recruitment.education`
- `recruitment.employer`
- `recruitment.experience`
- `recruitment.job_type`
- `recruitment.major_restrictions`
- `recruitment.preferred_background`
- `recruitment.salary`
- `industry.china_legal_requirement`
- `industry.coverage_limit`
- `industry.design_constraints`
- `industry.governance_scope`
- `industry.major_catalog`
- `industry.policy_goals`
- `industry.policy_requirement`
- `industry.scope`
- `learning.access_requirement`
- `learning.materials`
- `learning.occupation_definition`
- `learning.prerequisites`
- `learning.regional_limit`
- `learning.resource_title`

</details>

## guide_devices（`guide_devices`）

事实总数 98；字段有值 26/96，缺失 70。

| 字段 | 中文名 | 职业 | 招生 | 招聘 | 行业 | 学习 |
| --- | --- | --- | --- | --- | --- | --- |
| `access_requirement` | 准入要求 | — | — | — | — | ✓ 1 |
| `admission_requirements` | 报考条件 | — | ✓ 6 | — | — | — |
| `application_deadline` | （未登记） | — | — | — | — | — |
| `average_salary` | （未登记） | — | — | — | — | — |
| `career_path` | 职业路径 | ✓ 4 | — | — | — | — |
| `career_promotion_path` | （未登记） | — | — | — | — | — |
| `certificate` | （未登记） | — | — | — | — | — |
| `china_degree_requirement` | （未登记） | — | — | — | — | — |
| `china_legal_requirement` | 中国法规要求 | — | — | — | — | — |
| `china_talent_demand` | （未登记） | — | — | — | — | — |
| `city` | 城市 | — | — | — | — | — |
| `clinical_data_role_requirements` | （未登记） | — | — | — | — | — |
| `clinical_validation` | （未登记） | — | — | — | — | — |
| `college_retest_rules` | 复试规则 | — | — | — | — | — |
| `course_enrollment` | （未登记） | — | — | — | — | — |
| `course_hours` | （未登记） | — | — | — | — | — |
| `coverage_limit` | 覆盖范围 | — | — | — | — | — |
| `cross_major_restrictions` | 跨专业限制 | — | ✓ 3 | — | — | — |
| `current_course_access` | （未登记） | — | — | — | — | — |
| `current_enrollment` | （未登记） | — | — | — | — | — |
| `current_product_classification` | （未登记） | — | — | — | — | — |
| `current_program_capacity` | （未登记） | — | — | — | — | — |
| `current_year_requirements` | （未登记） | — | — | — | — | — |
| `deadline` | （未登记） | — | — | — | — | — |
| `department_salary` | （未登记） | — | — | — | — | — |
| `department_training_path` | （未登记） | — | — | — | — | — |
| `departments` | 科室/院系 | — | — | — | — | — |
| `design_constraints` | 设计约束 | — | — | — | ✓ 1 | — |
| `direction_employment_rate` | （未登记） | — | — | — | — | — |
| `doctor_salary` | （未登记） | — | — | — | — | — |
| `education` | 学历要求 | — | — | ✓ 5 | — | — |
| `employer` | 雇主/去向 | — | — | — | — | — |
| `employment_directions` | 就业去向 | ✓ 1 | — | — | — | — |
| `employment_rate` | （未登记） | — | — | — | — | — |
| `employment_statistics` | 就业统计 | — | — | — | ✓ 1 | — |
| `engineering_prerequisites` | （未登记） | — | — | — | — | — |
| `exam_subjects` | 初试科目 | — | ✓ 10 | — | — | — |
| `experience` | 经验要求 | — | — | ✓ 4 | — | — |
| `full_guideline` | （未登记） | — | — | — | — | — |
| `governance_scope` | 治理范围 | — | — | — | — | — |
| `graduate_salary` | （未登记） | — | — | — | — | — |
| `hard_requirements` | （未登记） | — | — | — | — | — |
| `industry_universal_requirements` | （未登记） | — | — | — | — | — |
| `institution` | 院校 | — | — | — | — | — |
| `interests` | 兴趣 | — | — | — | — | — |
| `job_title` | 岗位名称 | — | — | ✓ 7 | — | — |
| `job_type` | 岗位类型 | — | — | ✓ 1 | — | — |
| `knowledge_graph_requirements` | （未登记） | — | — | — | — | — |
| `learning_hours` | 学分/学时 | — | — | — | — | ✓ 3 |
| `license_eligibility` | （未登记） | — | — | — | — | — |
| `major_average_salary` | （未登记） | — | — | — | — | — |
| `major_catalog` | 专业目录 | — | — | — | — | — |
| `major_employment_rate` | （未登记） | — | — | — | — | — |
| `major_graduate_salary` | （未登记） | — | — | — | — | — |
| `major_restrictions` | 专业限制 | — | — | ✓ 3 | — | — |
| `materials` | 材料 | — | — | — | — | — |
| `medical_major_salary` | （未登记） | — | — | — | — | — |
| `medical_specific_standard` | （未登记） | — | — | — | — | — |
| `medicine_major_eligibility` | （未登记） | — | — | — | — | — |
| `national_department_standard` | （未登记） | — | — | — | — | — |
| `observed_talent_demand` | （未登记） | — | — | — | — | — |
| `occupation_definition` | 职业定义 | ✓ 4 | — | — | — | — |
| `ordinary_bachelor_program_eligibility` | （未登记） | — | — | — | — | — |
| `personal_eligibility` | 个人报考资格 | — | — | — | — | — |
| `personal_learning_hours` | （未登记） | — | — | — | — | — |
| `policy_goals` | 政策目标 | — | — | — | — | — |
| `policy_requirement` | 政策要求 | — | — | — | — | — |
| `preferred_background` | 优先背景 | — | — | — | — | — |
| `prerequisites` | 先修要求 | — | — | — | — | ✓ 1 |
| `privacy_requirements` | 隐私要求 | — | — | — | — | — |
| `program` | 专业/项目 | — | ✓ 3 | — | — | — |
| `program_definition` | 项目/专业定义 | ✓ 1 | — | — | — | — |
| `published_at` | （未登记） | — | — | — | — | — |
| `recruitment_eligibility` | （未登记） | — | — | — | — | — |
| `regional_limit` | 地域限制 | — | — | — | — | — |
| `registration_window` | 报名时间 | — | — | — | — | — |
| `regulatory_basis` | （未登记） | — | — | — | — | — |
| `research_project` | 研究项目 | — | — | — | — | — |
| `research_vacancy` | （未登记） | — | — | — | — | — |
| `resource_title` | 资源标题 | — | — | — | — | ✓ 1 |
| `responsibilities` | 岗位职责 | ✓ 1 | — | — | — | — |
| `role_average_salary` | （未登记） | — | — | — | — | — |
| `role_specific_career_path` | （未登记） | — | — | — | — | — |
| `salary` | 薪资 | — | — | — | — | — |
| `salary_statistics` | 薪资统计 | — | — | — | ✓ 7 | — |
| `school_specific_admissions` | （未登记） | — | — | — | — | — |
| `scope` | 适用范围 | — | — | — | — | — |
| `skills` | 技能 | ✓ 5 | — | — | — | — |
| `statistical_definition` | 统计口径 | — | — | — | ✓ 3 | — |
| `talent_demand` | （未登记） | — | — | — | — | — |
| `technical_requirements` | 技术要求 | — | — | ✓ 5 | — | — |
| `topics` | 课程主题 | — | — | — | — | ✓ 10 |
| `total_graduates` | （未登记） | — | — | — | — | — |
| `training` | 培养目标 | — | — | — | — | ✓ 7 |
| `training_direction` | （未登记） | — | — | — | — | — |
| `tuition` | 学费 | — | — | — | — | — |

<details><summary>缺值清单（24）</summary>

- `occupation.departments`
- `occupation.interests`
- `occupation.privacy_requirements`
- `admissions.college_retest_rules`
- `admissions.institution`
- `admissions.personal_eligibility`
- `admissions.registration_window`
- `admissions.tuition`
- `recruitment.access_requirement`
- `recruitment.city`
- `recruitment.employer`
- `recruitment.preferred_background`
- `recruitment.salary`
- `industry.china_legal_requirement`
- `industry.coverage_limit`
- `industry.governance_scope`
- `industry.major_catalog`
- `industry.policy_goals`
- `industry.policy_requirement`
- `industry.scope`
- `learning.materials`
- `learning.occupation_definition`
- `learning.regional_limit`
- `learning.research_project`

</details>

## guide_signals（`guide_signals`）

事实总数 34；字段有值 15/96，缺失 81。

| 字段 | 中文名 | 职业 | 招生 | 招聘 | 行业 | 学习 |
| --- | --- | --- | --- | --- | --- | --- |
| `access_requirement` | 准入要求 | — | — | — | — | — |
| `admission_requirements` | 报考条件 | — | ✓ 4 | — | — | — |
| `application_deadline` | （未登记） | — | — | — | — | — |
| `average_salary` | （未登记） | — | — | — | — | — |
| `career_path` | 职业路径 | — | — | — | — | — |
| `career_promotion_path` | （未登记） | — | — | — | — | — |
| `certificate` | （未登记） | — | — | — | — | — |
| `china_degree_requirement` | （未登记） | — | — | — | — | — |
| `china_legal_requirement` | 中国法规要求 | — | — | — | — | — |
| `china_talent_demand` | （未登记） | — | — | — | — | — |
| `city` | 城市 | — | — | — | — | — |
| `clinical_data_role_requirements` | （未登记） | — | — | — | — | — |
| `clinical_validation` | （未登记） | — | — | — | — | — |
| `college_retest_rules` | 复试规则 | — | — | — | — | — |
| `course_enrollment` | （未登记） | — | — | — | — | — |
| `course_hours` | （未登记） | — | — | — | — | — |
| `coverage_limit` | 覆盖范围 | — | — | — | — | — |
| `cross_major_restrictions` | 跨专业限制 | — | ✓ 2 | — | — | — |
| `current_course_access` | （未登记） | — | — | — | — | — |
| `current_enrollment` | （未登记） | — | — | — | — | — |
| `current_product_classification` | （未登记） | — | — | — | — | — |
| `current_program_capacity` | （未登记） | — | — | — | — | — |
| `current_year_requirements` | （未登记） | — | — | — | — | — |
| `deadline` | （未登记） | — | — | — | — | — |
| `department_salary` | （未登记） | — | — | — | — | — |
| `department_training_path` | （未登记） | — | — | — | — | — |
| `departments` | 科室/院系 | — | — | — | — | — |
| `design_constraints` | 设计约束 | — | — | — | — | — |
| `direction_employment_rate` | （未登记） | — | — | — | — | — |
| `doctor_salary` | （未登记） | — | — | — | — | — |
| `education` | 学历要求 | — | — | — | — | — |
| `employer` | 雇主/去向 | — | — | — | — | — |
| `employment_directions` | 就业去向 | ✓ 1 | — | — | — | — |
| `employment_rate` | （未登记） | — | — | — | — | — |
| `employment_statistics` | 就业统计 | — | — | — | ✓ 1 | — |
| `engineering_prerequisites` | （未登记） | — | — | — | — | — |
| `exam_subjects` | 初试科目 | — | ✓ 8 | — | — | — |
| `experience` | 经验要求 | — | — | — | — | — |
| `full_guideline` | （未登记） | — | — | — | — | — |
| `governance_scope` | 治理范围 | — | — | — | — | — |
| `graduate_salary` | （未登记） | — | — | — | — | — |
| `hard_requirements` | （未登记） | — | — | — | — | — |
| `industry_universal_requirements` | （未登记） | — | — | — | — | — |
| `institution` | 院校 | — | — | — | — | — |
| `interests` | 兴趣 | — | — | — | — | — |
| `job_title` | 岗位名称 | — | — | ✓ 1 | — | — |
| `job_type` | 岗位类型 | — | — | — | — | — |
| `knowledge_graph_requirements` | （未登记） | — | — | — | — | — |
| `learning_hours` | 学分/学时 | — | — | — | — | — |
| `license_eligibility` | （未登记） | — | — | — | — | — |
| `major_average_salary` | （未登记） | — | — | — | — | — |
| `major_catalog` | 专业目录 | — | — | — | — | — |
| `major_employment_rate` | （未登记） | — | — | — | — | — |
| `major_graduate_salary` | （未登记） | — | — | — | — | — |
| `major_restrictions` | 专业限制 | — | — | — | — | — |
| `materials` | 材料 | — | — | — | — | — |
| `medical_major_salary` | （未登记） | — | — | — | — | — |
| `medical_specific_standard` | （未登记） | — | — | — | — | — |
| `medicine_major_eligibility` | （未登记） | — | — | — | — | — |
| `national_department_standard` | （未登记） | — | — | — | — | — |
| `observed_talent_demand` | （未登记） | — | — | — | — | — |
| `occupation_definition` | 职业定义 | — | — | — | — | — |
| `ordinary_bachelor_program_eligibility` | （未登记） | — | — | — | — | — |
| `personal_eligibility` | 个人报考资格 | — | — | — | — | — |
| `personal_learning_hours` | （未登记） | — | — | — | — | — |
| `policy_goals` | 政策目标 | — | — | — | ✓ 1 | — |
| `policy_requirement` | 政策要求 | — | — | — | — | — |
| `preferred_background` | 优先背景 | — | — | — | — | — |
| `prerequisites` | 先修要求 | — | — | — | — | — |
| `privacy_requirements` | 隐私要求 | — | — | — | — | — |
| `program` | 专业/项目 | — | ✓ 3 | — | — | — |
| `program_definition` | 项目/专业定义 | ✓ 1 | — | — | — | — |
| `published_at` | （未登记） | — | — | — | — | — |
| `recruitment_eligibility` | （未登记） | — | — | — | — | — |
| `regional_limit` | 地域限制 | — | — | — | — | — |
| `registration_window` | 报名时间 | — | — | — | — | — |
| `regulatory_basis` | （未登记） | — | — | — | — | — |
| `research_project` | 研究项目 | — | — | — | — | — |
| `research_vacancy` | （未登记） | — | — | — | — | — |
| `resource_title` | 资源标题 | — | — | — | — | — |
| `responsibilities` | 岗位职责 | ✓ 1 | — | — | — | — |
| `role_average_salary` | （未登记） | — | — | — | — | — |
| `role_specific_career_path` | （未登记） | — | — | — | — | — |
| `salary` | 薪资 | — | — | — | — | — |
| `salary_statistics` | 薪资统计 | — | — | — | ✓ 4 | — |
| `school_specific_admissions` | （未登记） | — | — | — | — | — |
| `scope` | 适用范围 | — | — | — | — | — |
| `skills` | 技能 | ✓ 1 | — | — | — | — |
| `statistical_definition` | 统计口径 | — | — | — | ✓ 3 | — |
| `talent_demand` | （未登记） | — | — | — | — | — |
| `technical_requirements` | 技术要求 | — | — | ✓ 1 | — | — |
| `topics` | 课程主题 | — | — | — | — | ✓ 2 |
| `total_graduates` | （未登记） | — | — | — | — | — |
| `training` | 培养目标 | — | — | — | — | — |
| `training_direction` | （未登记） | — | — | — | — | — |
| `tuition` | 学费 | — | — | — | — | — |

<details><summary>缺值清单（35）</summary>

- `occupation.career_path`
- `occupation.departments`
- `occupation.interests`
- `occupation.occupation_definition`
- `occupation.privacy_requirements`
- `admissions.college_retest_rules`
- `admissions.institution`
- `admissions.personal_eligibility`
- `admissions.registration_window`
- `admissions.tuition`
- `recruitment.access_requirement`
- `recruitment.city`
- `recruitment.education`
- `recruitment.employer`
- `recruitment.experience`
- `recruitment.job_type`
- `recruitment.major_restrictions`
- `recruitment.preferred_background`
- `recruitment.salary`
- `industry.china_legal_requirement`
- `industry.coverage_limit`
- `industry.design_constraints`
- `industry.governance_scope`
- `industry.major_catalog`
- `industry.policy_requirement`
- `industry.scope`
- `learning.access_requirement`
- `learning.learning_hours`
- `learning.materials`
- `learning.occupation_definition`
- `learning.prerequisites`
- `learning.regional_limit`
- `learning.research_project`
- `learning.resource_title`
- `learning.training`

</details>

## guide_imaging_eng（`guide_imaging_eng`）

事实总数 59；字段有值 22/96，缺失 74。

| 字段 | 中文名 | 职业 | 招生 | 招聘 | 行业 | 学习 |
| --- | --- | --- | --- | --- | --- | --- |
| `access_requirement` | 准入要求 | — | — | — | — | — |
| `admission_requirements` | 报考条件 | — | ✓ 5 | — | — | — |
| `application_deadline` | （未登记） | — | — | — | — | — |
| `average_salary` | （未登记） | — | — | — | — | — |
| `career_path` | 职业路径 | ✓ 1 | — | — | — | — |
| `career_promotion_path` | （未登记） | — | — | — | — | — |
| `certificate` | （未登记） | — | — | — | — | — |
| `china_degree_requirement` | （未登记） | — | — | — | — | — |
| `china_legal_requirement` | 中国法规要求 | — | — | — | — | — |
| `china_talent_demand` | （未登记） | — | — | — | — | — |
| `city` | 城市 | — | — | ✓ 1 | — | — |
| `clinical_data_role_requirements` | （未登记） | — | — | — | — | — |
| `clinical_validation` | （未登记） | — | — | — | — | — |
| `college_retest_rules` | 复试规则 | — | — | — | — | — |
| `course_enrollment` | （未登记） | — | — | — | — | — |
| `course_hours` | （未登记） | — | — | — | — | — |
| `coverage_limit` | 覆盖范围 | — | — | — | — | — |
| `cross_major_restrictions` | 跨专业限制 | — | ✓ 3 | — | — | — |
| `current_course_access` | （未登记） | — | — | — | — | — |
| `current_enrollment` | （未登记） | — | — | — | — | — |
| `current_product_classification` | （未登记） | — | — | — | — | — |
| `current_program_capacity` | （未登记） | — | — | — | — | — |
| `current_year_requirements` | （未登记） | — | — | — | — | — |
| `deadline` | （未登记） | — | — | — | — | — |
| `department_salary` | （未登记） | — | — | — | — | — |
| `department_training_path` | （未登记） | — | — | — | — | — |
| `departments` | 科室/院系 | — | — | — | — | — |
| `design_constraints` | 设计约束 | — | — | — | — | — |
| `direction_employment_rate` | （未登记） | — | — | — | — | — |
| `doctor_salary` | （未登记） | — | — | — | — | — |
| `education` | 学历要求 | — | — | ✓ 3 | — | — |
| `employer` | 雇主/去向 | — | — | — | — | — |
| `employment_directions` | 就业去向 | ✓ 1 | — | — | — | — |
| `employment_rate` | （未登记） | — | — | — | — | — |
| `employment_statistics` | 就业统计 | — | — | — | ✓ 1 | — |
| `engineering_prerequisites` | （未登记） | — | — | — | — | — |
| `exam_subjects` | 初试科目 | — | ✓ 7 | — | — | — |
| `experience` | 经验要求 | — | — | ✓ 2 | — | — |
| `full_guideline` | （未登记） | — | — | — | — | — |
| `governance_scope` | 治理范围 | — | — | — | — | — |
| `graduate_salary` | （未登记） | — | — | — | — | — |
| `hard_requirements` | （未登记） | — | — | — | — | — |
| `industry_universal_requirements` | （未登记） | — | — | — | — | — |
| `institution` | 院校 | — | — | — | — | — |
| `interests` | 兴趣 | — | — | — | — | — |
| `job_title` | 岗位名称 | — | — | ✓ 5 | — | — |
| `job_type` | 岗位类型 | — | — | — | — | — |
| `knowledge_graph_requirements` | （未登记） | — | — | — | — | — |
| `learning_hours` | 学分/学时 | — | — | — | — | — |
| `license_eligibility` | （未登记） | — | — | — | — | — |
| `major_average_salary` | （未登记） | — | — | — | — | — |
| `major_catalog` | 专业目录 | — | — | — | — | — |
| `major_employment_rate` | （未登记） | — | — | — | — | — |
| `major_graduate_salary` | （未登记） | — | — | — | — | — |
| `major_restrictions` | 专业限制 | — | — | ✓ 4 | — | — |
| `materials` | 材料 | — | — | — | — | — |
| `medical_major_salary` | （未登记） | — | — | — | — | — |
| `medical_specific_standard` | （未登记） | — | — | — | — | — |
| `medicine_major_eligibility` | （未登记） | — | — | — | — | — |
| `national_department_standard` | （未登记） | — | — | — | — | — |
| `observed_talent_demand` | （未登记） | — | — | — | — | — |
| `occupation_definition` | 职业定义 | ✓ 1 | — | — | — | — |
| `ordinary_bachelor_program_eligibility` | （未登记） | — | — | — | — | — |
| `personal_eligibility` | 个人报考资格 | — | — | — | — | — |
| `personal_learning_hours` | （未登记） | — | — | — | — | — |
| `policy_goals` | 政策目标 | — | — | — | ✓ 1 | — |
| `policy_requirement` | 政策要求 | — | — | — | — | — |
| `preferred_background` | 优先背景 | — | — | — | — | — |
| `prerequisites` | 先修要求 | — | — | — | — | — |
| `privacy_requirements` | 隐私要求 | — | — | — | — | — |
| `program` | 专业/项目 | — | ✓ 3 | — | — | — |
| `program_definition` | 项目/专业定义 | ✓ 1 | — | — | — | — |
| `published_at` | （未登记） | — | — | — | — | — |
| `recruitment_eligibility` | （未登记） | — | — | — | — | — |
| `regional_limit` | 地域限制 | — | — | — | — | — |
| `registration_window` | 报名时间 | — | — | — | — | — |
| `regulatory_basis` | （未登记） | — | — | — | — | — |
| `research_project` | 研究项目 | — | — | — | — | — |
| `research_vacancy` | （未登记） | — | — | — | — | — |
| `resource_title` | 资源标题 | — | — | — | — | — |
| `responsibilities` | 岗位职责 | ✓ 1 | — | — | — | — |
| `role_average_salary` | （未登记） | — | — | — | — | — |
| `role_specific_career_path` | （未登记） | — | — | — | — | — |
| `salary` | 薪资 | — | — | — | — | — |
| `salary_statistics` | 薪资统计 | — | — | — | ✓ 4 | — |
| `school_specific_admissions` | （未登记） | — | — | — | — | — |
| `scope` | 适用范围 | — | — | — | — | — |
| `skills` | 技能 | ✓ 2 | — | — | — | — |
| `statistical_definition` | 统计口径 | — | — | — | ✓ 3 | — |
| `talent_demand` | （未登记） | — | — | — | — | — |
| `technical_requirements` | 技术要求 | — | — | ✓ 6 | — | — |
| `topics` | 课程主题 | — | — | — | — | ✓ 3 |
| `total_graduates` | （未登记） | — | — | — | — | — |
| `training` | 培养目标 | — | — | — | — | ✓ 1 |
| `training_direction` | （未登记） | — | — | — | — | — |
| `tuition` | 学费 | — | — | — | — | — |

<details><summary>缺值清单（28）</summary>

- `occupation.departments`
- `occupation.interests`
- `occupation.privacy_requirements`
- `admissions.college_retest_rules`
- `admissions.institution`
- `admissions.personal_eligibility`
- `admissions.registration_window`
- `admissions.tuition`
- `recruitment.access_requirement`
- `recruitment.employer`
- `recruitment.job_type`
- `recruitment.preferred_background`
- `recruitment.salary`
- `industry.china_legal_requirement`
- `industry.coverage_limit`
- `industry.design_constraints`
- `industry.governance_scope`
- `industry.major_catalog`
- `industry.policy_requirement`
- `industry.scope`
- `learning.access_requirement`
- `learning.learning_hours`
- `learning.materials`
- `learning.occupation_definition`
- `learning.prerequisites`
- `learning.regional_limit`
- `learning.research_project`
- `learning.resource_title`

</details>

## medicine_guide（`medicine_guide`）

事实总数 188；字段有值 31/96，缺失 65。

| 字段 | 中文名 | 职业 | 招生 | 招聘 | 行业 | 学习 |
| --- | --- | --- | --- | --- | --- | --- |
| `access_requirement` | 准入要求 | — | — | — | — | ✓ 7 |
| `admission_requirements` | 报考条件 | — | ✓ 26 | — | — | — |
| `application_deadline` | （未登记） | — | — | — | — | — |
| `average_salary` | （未登记） | — | — | — | — | — |
| `career_path` | 职业路径 | ✓ 1 | — | — | — | — |
| `career_promotion_path` | （未登记） | — | — | — | — | — |
| `certificate` | （未登记） | — | — | — | — | — |
| `china_degree_requirement` | （未登记） | — | — | — | — | — |
| `china_legal_requirement` | 中国法规要求 | — | — | — | ✓ 3 | — |
| `china_talent_demand` | （未登记） | — | — | — | — | — |
| `city` | 城市 | — | — | ✓ 3 | — | — |
| `clinical_data_role_requirements` | （未登记） | — | — | — | — | — |
| `clinical_validation` | （未登记） | — | — | — | — | — |
| `college_retest_rules` | 复试规则 | — | — | — | — | — |
| `course_enrollment` | （未登记） | — | — | — | — | — |
| `course_hours` | （未登记） | — | — | — | — | — |
| `coverage_limit` | 覆盖范围 | — | — | — | — | — |
| `cross_major_restrictions` | 跨专业限制 | — | ✓ 24 | — | — | — |
| `current_course_access` | （未登记） | — | — | — | — | — |
| `current_enrollment` | （未登记） | — | — | — | — | — |
| `current_product_classification` | （未登记） | — | — | — | — | — |
| `current_program_capacity` | （未登记） | — | — | — | — | — |
| `current_year_requirements` | （未登记） | — | — | — | — | — |
| `deadline` | （未登记） | — | — | — | — | — |
| `department_salary` | （未登记） | — | — | — | — | — |
| `department_training_path` | （未登记） | — | — | — | — | — |
| `departments` | 科室/院系 | ✓ 10 | — | — | — | — |
| `design_constraints` | 设计约束 | — | — | — | — | — |
| `direction_employment_rate` | （未登记） | — | — | — | — | — |
| `doctor_salary` | （未登记） | — | — | — | — | — |
| `education` | 学历要求 | — | — | ✓ 5 | — | — |
| `employer` | 雇主/去向 | — | — | — | — | — |
| `employment_directions` | 就业去向 | ✓ 8 | — | — | — | — |
| `employment_rate` | （未登记） | — | — | — | — | — |
| `employment_statistics` | 就业统计 | — | — | — | ✓ 1 | — |
| `engineering_prerequisites` | （未登记） | — | — | — | — | — |
| `exam_subjects` | 初试科目 | — | ✓ 9 | — | — | — |
| `experience` | 经验要求 | — | — | ✓ 2 | — | — |
| `full_guideline` | （未登记） | — | — | — | — | — |
| `governance_scope` | 治理范围 | — | — | — | — | — |
| `graduate_salary` | （未登记） | — | — | — | — | — |
| `hard_requirements` | （未登记） | — | — | — | — | — |
| `industry_universal_requirements` | （未登记） | — | — | — | — | — |
| `institution` | 院校 | — | — | — | — | — |
| `interests` | 兴趣 | — | — | — | — | — |
| `job_title` | 岗位名称 | — | — | ✓ 5 | — | — |
| `job_type` | 岗位类型 | — | — | ✓ 1 | — | — |
| `knowledge_graph_requirements` | （未登记） | — | — | — | — | — |
| `learning_hours` | 学分/学时 | — | — | — | — | ✓ 2 |
| `license_eligibility` | （未登记） | — | — | — | — | — |
| `major_average_salary` | （未登记） | — | — | — | — | — |
| `major_catalog` | 专业目录 | — | — | — | ✓ 5 | — |
| `major_employment_rate` | （未登记） | — | — | — | — | — |
| `major_graduate_salary` | （未登记） | — | — | — | — | — |
| `major_restrictions` | 专业限制 | — | — | ✓ 3 | — | — |
| `materials` | 材料 | — | — | — | — | — |
| `medical_major_salary` | （未登记） | — | — | — | — | — |
| `medical_specific_standard` | （未登记） | — | — | — | — | — |
| `medicine_major_eligibility` | （未登记） | — | — | — | — | — |
| `national_department_standard` | （未登记） | — | — | — | — | — |
| `observed_talent_demand` | （未登记） | — | — | — | — | — |
| `occupation_definition` | 职业定义 | ✓ 2 | — | — | — | — |
| `ordinary_bachelor_program_eligibility` | （未登记） | — | — | — | — | — |
| `personal_eligibility` | 个人报考资格 | — | — | — | — | — |
| `personal_learning_hours` | （未登记） | — | — | — | — | — |
| `policy_goals` | 政策目标 | — | — | — | — | — |
| `policy_requirement` | 政策要求 | — | — | — | ✓ 4 | — |
| `preferred_background` | 优先背景 | — | — | — | — | — |
| `prerequisites` | 先修要求 | — | — | — | — | ✓ 1 |
| `privacy_requirements` | 隐私要求 | — | — | — | — | — |
| `program` | 专业/项目 | — | — | — | — | — |
| `program_definition` | 项目/专业定义 | ✓ 8 | — | — | — | — |
| `published_at` | （未登记） | — | — | — | — | — |
| `recruitment_eligibility` | （未登记） | — | — | — | — | — |
| `regional_limit` | 地域限制 | — | — | — | — | ✓ 1 |
| `registration_window` | 报名时间 | — | — | — | — | — |
| `regulatory_basis` | （未登记） | — | — | — | — | — |
| `research_project` | 研究项目 | — | — | — | — | — |
| `research_vacancy` | （未登记） | — | — | — | — | — |
| `resource_title` | 资源标题 | — | — | — | — | — |
| `responsibilities` | 岗位职责 | ✓ 8 | — | — | — | — |
| `role_average_salary` | （未登记） | — | — | — | — | — |
| `role_specific_career_path` | （未登记） | — | — | — | — | — |
| `salary` | 薪资 | — | — | ✓ 4 | — | — |
| `salary_statistics` | 薪资统计 | — | — | — | ✓ 14 | — |
| `school_specific_admissions` | （未登记） | — | — | — | — | — |
| `scope` | 适用范围 | — | — | — | ✓ 1 | — |
| `skills` | 技能 | ✓ 3 | — | — | — | — |
| `statistical_definition` | 统计口径 | — | — | — | ✓ 4 | — |
| `talent_demand` | （未登记） | — | — | — | — | — |
| `technical_requirements` | 技术要求 | — | — | ✓ 3 | — | — |
| `topics` | 课程主题 | — | — | — | — | ✓ 7 |
| `total_graduates` | （未登记） | — | — | — | — | — |
| `training` | 培养目标 | — | — | — | — | ✓ 13 |
| `training_direction` | （未登记） | — | — | — | — | — |
| `tuition` | 学费 | — | — | — | — | — |

<details><summary>缺值清单（19）</summary>

- `occupation.interests`
- `occupation.privacy_requirements`
- `admissions.college_retest_rules`
- `admissions.institution`
- `admissions.personal_eligibility`
- `admissions.program`
- `admissions.registration_window`
- `admissions.tuition`
- `recruitment.access_requirement`
- `recruitment.employer`
- `recruitment.preferred_background`
- `industry.coverage_limit`
- `industry.design_constraints`
- `industry.governance_scope`
- `industry.policy_goals`
- `learning.materials`
- `learning.occupation_definition`
- `learning.research_project`
- `learning.resource_title`

</details>

## 采集器字段名问题（已剔除，不进入矩阵）

以下 `field` 值不是 snake_case 字段名，而是采集器把「缺口说明」写进了字段位（或中文标签）。已归一为对应的基础字段或剔除；建议在下次采集时修正来源。

| 原始 field 值 | 出现次数 |
| --- | --- |
| `薪资` | 15 |
| `岗位招聘要求` | 15 |
| `学历与职称门槛（部分标准另列）` | 15 |
| `具体技能等级考核标准` | 15 |
| `薪酬` | 15 |
| `各等级对应薪酬` | 15 |
| `各等级对应职称` | 15 |
| `先修课程要求（原文未列）` | 11 |
| `其他城市` | 8 |
| `中国官方对应职业定义` | 6 |
| `中国岗位职责官方原文` | 6 |
| `required_level（技能等级要求）` | 6 |
| `中国技能等级认定` | 6 |
| `中国 RIASEC 职业常模` | 6 |
| `课程学分/学时（介绍页未列）` | 5 |
| `salary（未给薪资）` | 5 |
| `月薪` | 5 |
| `月薪口径` | 4 |
| `平均值` | 4 |
| `具体岗位薪资` | 3 |
| `分职业数据` | 3 |
| `职业口径` | 3 |
| `分专业本科专业限制（见招生专业目录）` | 2 |
| `课程学分/学时（本段未列）` | 2 |
| `major_restrictions（未逐岗列专业限制）` | 2 |
| `city（原文未逐字写城市）` | 2 |
| `city（页面正文未直接标注城市）` | 2 |
| `机关事业单位工资` | 2 |
| `具体公司薪资` | 2 |
| `税后收入` | 2 |
| `年薪口径` | 2 |
| `医院编制工资制度` | 2 |
| `元/年 口径` | 2 |
| `逐项工作内容（原文为表格，未逐条摘录）` | 2 |
| `分专业报考限制（见专业目录，简章未列）` | 1 |
| `医工交叉专业（0831/085409/1010/1405）的本科专业限制（本段未涉及）` | 1 |
| `分专业本科专业限制（见专业目录）` | 1 |
| `各专业自命题科目代码与参考书（简章未列，见专业目录）` | 1 |
| `0831/085409/1010 等医工交叉专业的本科限制（本章程未涉及）` | 1 |
| `分专业本科专业限制（见各学院招生目录）` | 1 |
| `各专业自命题科目代码与参考书（见学院招生目录）` | 1 |
| `各专业自命题科目代码（见招生目录）` | 1 |
| `各专业具体科目名称与代码（见招生专业目录）` | 1 |
| `各培养单位具体加试科目（在招生专业目录备注中，本章程未列）` | 1 |
| `分专业拟招人数（见招生专业目录）` | 1 |
| `890 普通物理参考书目/大纲（目录未列）` | 1 |
| `是否限制本科专业（备注未提，即未设本科专业白名单）` | 1 |
| `实际统考名额（目录未给，需查研招网）` | 1 |
| `学时明细（见课程体系表）` | 1 |
| `各专业本科专业白名单（需查2027专业目录，该系统为JS查询应用未抓取）` | 1 |
| `具体哪些专业不接收应届生（需查章程原文）` | 1 |
| `各门课程学分（分散在附表课程设置一览表中，本段未列）` | 1 |
| `上述特色课程的学分/学时（本段未列）` | 1 |
| `考研报考前置课程要求（本页不涉及）` | 1 |
| `学分换算（原文按学时计，未给学分）` | 1 |
| `先修课程要求（原文明确学科专业不限，未列先修课程）` | 1 |
| `中国官方统一课程目录` | 1 |
| `学时（原文按学分计）` | 1 |
| `教育部国标原文（本页仅引用名称，未附全文）` | 1 |
| `课程与毕业要求的支撑矩阵（原文未列）` | 1 |
| `job_title（未逐岗列名，明细在附件招聘计划表）` | 1 |
| `salary（官网未给任何金额/区间，仅给制度性表述）` | 1 |
| `salary（仅制度性表述，未给金额）` | 1 |
| `salary（薪酬按医院规定执行，未给金额）` | 1 |
| `salary（简章未列薪酬数字）` | 1 |
| `salary（仅博士后岗位，未覆盖医师/技术岗）` | 1 |
| `education（本段岗位表未含学历列）` | 1 |
| `salary（仅职称待遇表述，无金额）` | 1 |
| `career_path（未给具体岗位晋升路径）` | 1 |
| `salary_statistics（职业大类口径，非医院具体岗位）` | 1 |
| `salary_statistics（企业口径，不含事业单位/公立医院）` | 1 |
| `salary_statistics（企业口径，不含公立医院）` | 1 |
| `salary_statistics（企业口径，不含公立医院药剂科）` | 1 |
| `salary_statistics（企业口径，不含公立医院医技科）` | 1 |
| `education（本页未列学历要求）` | 1 |
| `valid_through（原文只给月份节点，未给具体截止日）` | 1 |
| `departments（未逐科列名医技科室）` | 1 |
| `salary（仅定性条款，无金额）` | 1 |
| `salary_amount（原文无金额）` | 1 |
| `access_requirement（未列各专业考核大纲差异）` | 1 |
| `training（未列各专业轮转细则内容）` | 1 |
| `training（未列各专业考核分值）` | 1 |
| `training（未给病种数具体下限）` | 1 |
| `training（未列政策依据文号）` | 1 |
| `training（未写学位申请年限与名额）` | 1 |
| `learning_hours（未给学时数，仅给3年与月数安排）` | 1 |
| `learning_hours（未给全科以外专业轮转月数）` | 1 |
| `policy_requirement（本页仅为印发通知，标准正文为附件）` | 1 |
| `departments（未列医技科室完整清单与人员数量下限）` | 1 |
| `departments（未给各科室单独配比）` | 1 |
| `departments（未给精神科床位数与医师配比下限）` | 1 |
| `policy_requirement（发布会实录未列409组明细，明细在通知附件）` | 1 |
| `policy_requirement（未列2025年后接续政策）` | 1 |
| `policy_goals（未给标准发布的具体时间表）` | 1 |
| `policy_goals（未列具体量化指标）` | 1 |
| `job_title（未在正文逐岗列名称，明细在附件岗位计划表）` | 1 |
| `job_type（未用全职/兼职等表述）` | 1 |
| `learning_hours（原文只给年限，未给学时或月度折算）` | 1 |
| `access_requirement（未列具体专业代码与外语要求）` | 1 |
| `training（未写结业考核具体分值或合格线）` | 1 |
| `prerequisites（未列基地数量与名单）` | 1 |
| `learning_hours（未给其他省份口径）` | 1 |
| `training（未给各专业细则内容）` | 1 |
| `training（未给各院校具体学制安排）` | 1 |
| `training（未写具体轮转科室与时长）` | 1 |
| `access_requirement（未列各专业基地名额与分数线）` | 1 |
| `access_requirement（未说明其他4年制理学专业的处理方式）` | 1 |
| `access_requirement（未给出退培认定的具体流程）` | 1 |
| `regional_limit（未列可送培单位名单）` | 1 |
| `access_requirement（未在本页列出各专业招收人数）` | 1 |
| `training（未写学位申请的具体年限与名额）` | 1 |
| `salary（未给出基本工资数额与月度总收入）` | 1 |
| `education（未按专业基地细分学历要求）` | 1 |
| `departments（未给每个专业基地的招收人数与人员配置）` | 1 |
| `salary（简章未给博士后具体薪资数额）` | 1 |
| `major_restrictions（未给各学科的具体招收名额）` | 1 |
| `technical_requirements（未写其他等效成果的认定口径）` | 1 |
| `departments（未规定信息科/数据中心等信息化科室）` | 1 |
| `departments（未单独规定信息/病案岗位人数）` | 1 |
| `departments（未规定人员数量分科细则）` | 1 |
| `china_legal_requirement（未列各省调整后的地方标准）` | 1 |
| `scope（未列各类机构完整标准表）` | 1 |
| `salary_statistics（无分岗位、分职称、分医院等级的细分值）` | 1 |
| `salary_statistics（无民营医院分岗位细分值）` | 1 |
| `salary_statistics（无医院等级或科室细分）` | 1 |
| `statistical_definition（未给中位数或分位数口径）` | 1 |
| `statistical_definition（未给税后折算方法）` | 1 |
| `salary（全文未给薪资数额）` | 1 |
| `job_type（未写全职/合同类型）` | 1 |
| `technical_requirements（未给技能考核方式）` | 1 |
| `technical_requirements（未给认证类硬性要求）` | 1 |
| `salary（公告未给薪资）` | 1 |
| `city（正文未直接标注城市）` | 1 |
| `experience（未写工作年限要求）` | 1 |
| `technical_requirements（未要求ICD编码证书）` | 1 |
| `training（未在本页给出补招的完整报考条件，需另看招收简章）` | 1 |
| `access_requirement（本页未列具体报考条件）` | 1 |
| `salary（原文未写薪资）` | 1 |
| `平均值/算术平均工资` | 1 |
| `分岗位到手收入` | 1 |
| `税后到手收入` | 1 |
| `单位人工成本分摊` | 1 |
| `个体经营者收入` | 1 |
| `2025年当年数据` | 1 |
| `医疗AI专属薪资` | 1 |
| `单纯职业口径` | 1 |
| `未达标职业的薪资数字` | 1 |
| `其他城市对比` | 1 |
| `其他城市卫生行业` | 1 |
| `公立医院薪酬制度` | 1 |
| `医疗行业内该职业的单独数字` | 1 |
| `公立医院编制内工资` | 1 |
| `绩效奖金单列口径` | 1 |
| `医院等级差异` | 1 |
| `分岗位个体offer` | 1 |
| `10%与90%分位` | 1 |
| `医疗AI专属产业分类` | 1 |
| `全量普查数据` | 1 |
| `企业级数据` | 1 |
| `分地区分位值` | 1 |
| `具体医院薪资` | 1 |
| `分城市分位值` | 1 |
| `医疗AI岗位专属数据` | 1 |
| `分职业细类工资` | 1 |
| `到手收入` | 1 |
| `私营单位同行业数据` | 1 |
| `私营单位同行业数据引用` | 1 |
| `个体工商户收入` | 1 |
| `自由职业者收入` | 1 |
| `灵活就业收入` | 1 |
| `全国数据` | 1 |
| `分位数全区间` | 1 |
| `年度总包` | 1 |
| `年终奖与股权` | 1 |
| `精确均值` | 1 |
| `医疗AI岗位单独数据` | 1 |
| `全部就业人员年薪` | 1 |
| `均值` | 1 |
| `中位数` | 1 |
| `个人到手收入` | 1 |
| `企业实际薪酬` | 1 |
| `编制内工资制度` | 1 |
| `数据分析处理工程技术人员单列数据` | 1 |
| `医疗行业口径` | 1 |
| `2025年度数据` | 1 |
| `计算机软件工程技术人员细类` | 1 |
| `医疗场景专项要求` | 1 |
| `required_level（分值/等级化技能要求）` | 1 |
| `临床数据专项要求` | 1 |
| `非临床技术岗位的执业门槛（通常无此类门槛）` | 1 |
