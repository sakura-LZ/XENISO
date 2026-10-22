# LIMEN-Match V1 · 2026-10-21

## 本轮范围与现状

目标是医学生画像 → 三个岗位 → 四维解释 → 技能差距与可导出行动清单。独立 `/match` 入口，不替换 P0–P5、R1/R2 或职业体验。不调用大模型评分、不写远端数据库、不重启现有服务。

实际审查：`profiles.payload` 已保存医学背景、科研项目、自由文本技能与规划；`assessments.payload` 保存官方题目、答案码、版本与六维原始分；`experiences.payload` 保存 simulation 项目/面试产物，现有关键词反馈不是能力量表。职业方向源为编辑性 `occupation_direction_map.json`；知识库提取器 `src/lib/knowledge.ts` 保存 source、quote、offset、hash 与核实日期，尚不具有数值技能标准。`admissions.sample.json` 为空；正在采集的招生摘录不能直接作为个人资格规则。

## 契约与实现顺序

1. `src/lib/match/contracts.ts` 是统一运行时契约；所有计算入口先校验。技能词表固定版本，未知标签拒绝，不做模糊自动归并。
2. 每个事实保存 value/status/evidence。未知必须为 null，不能传 0；已知零是有效值。证据包括来源地址/记录引用、发布日（可 null）、采集日、核实状态、原文/字段定位。原文核实不等于推导评分核实。
3. 职业、招生与画像采用独立 ID；occupation_ids 显式一对多。O*NET code/version/scale 独立保留，不修改原答案与题目。兴趣量尺上下限缺失时不计算；禁止猜测官方范围。
4. 来源提取 → 人工确认字段/评分尺度 → 契约验证 → 匹配。既有 knowledge 提取流程只读对接；不从“熟悉/优先”等文本自动生成数值重要性或能力水平。
5. 先完成 simulation 全链及独立边界测试，再验证真实画像读取、缺失显示和隔离 HTTP 路由。生产迁移和真实评分标准审定留待后续阶段。

## 验收

要求 lint、build、全量现有单测与 Match 测试；独立测试验证手算值、排序、未知/零区别、资格否决、未核实来源拒绝计分、跨岗位体验隔离、年份/路径与过期边界。实际命令与限制记录在 `docs/testing/LIMEN-Match.latest.md`。

## 统一数据字段与关联

运行时权威：`src/lib/match/contracts.ts`；供提取器读取：`data/match/{occupation,admission,user,input}.schema.json`。生成命令 `npx tsx scripts/match-contract.ts`。JSON Schema 不包含所有跨字段业务约束，送入算法前还必须执行 `matchInputSchema.parse`。

| 对象 | 字段 | 关联与存储 |
|---|---|---|
| 职业 Occupation | id/title/direction_ids/onet_codes/mapping_basis、tasks、六维 interests、skills[].skill_id/importance/required_level、professional_background、hard_requirements、preferences | 三个独立岗位 ID；direction_ids 是 LIMEN 编辑映射，不是 O*NET 官方中国升学结论 |
| 招生 Admission | id/university/major_code/major_name/year/pathway/valid_through、exam_subjects、cross_major、research_directions、hard_requirements | occupation_ids 一对多，mapping_evidence 单独审核；空数组表示尚无项目，不表示无跨考限制 |
| 画像 MatchUser | medical_background、research_projects、interests、skills、qualifications、preferences、target_year、study_intent、weekly_hours、experiences、unmapped_skills | 从当前访客自己的 profiles/assessments/experiences 只读构造；不新增用户标识到导出文件 |
| 来源 Fact | value/status/evidence[] | unknown/unverified/not_applicable 必须 value=null；known 必须有值与证据；已知 0 保留 |
| 证据 Evidence | ref/source_kind/url/published_at/retrieved_at/verification/locator | official 要求 HTTPS 来源；缺发布日期为 null；提取器定位含 quote、offset、内容 hash，不能把“原文已核对”当成数值标准已核对 |

岗位 ID：`medical_ai_pm` 医学 AI 产品经理；`clinical_data_analyst` 临床数据分析师；`medical_ml_engineer` 医学机器学习工程师。后两者数值要求暂无审核来源，真实模式不展示伪造分数。

技能固定为 `limen-skills-1` 的九个标签，见 `data/match/skill-standard.json`。等级 0 未接触、1 指导下完成、2 独立基础任务、3 独立复杂任务、4 指导与评审；重要性 1 辅助、2 常用、3 核心、4 关键、5 必备。都是 LIMEN 编辑性标准，不是 O*NET 原始能力量尺。只接受整数；自由文本“熟悉/精通”仅保留原文，不自动换算。调整标准须升级版本并重算，不能沿用旧分数。

## 确定性算法 v1.0

- **兴趣接近度**：两边完整 RIASEC 各按自己的已声明 min/max 归一化，`100 × (1 − 六维绝对差的平均值)`。任一六维或量尺缺失则未知。现有官方测评原始分、版本、题号/答案码保留在 assessment，适配器没有猜测量尺，因此个人模式暂不计兴趣分。跨量表比较只是编辑性探索规则，尚无效度验证。
- **能力准备度**：`100 × Σ importance × min(current/required,1) / Σ importance`；要求为 0 且当前已知时该项为满足。只用当前/要求/重要性均可用的项；缺失不进入分母，覆盖率为可算技能项数/岗位技能项数。没有可算项则未知。自评必须展示为自评，不是能力认证。
- **转型可行性线索**：岗位工作偏好的重合比例，以及最近一次同岗位体验的投入意愿 `(1–5→0–1)`，按已知项等权平均；覆盖率最多两项。未来时间体验忽略，按实际时间戳选择最近记录。周时间预算、财务成本与机会没有可信模型，暂不编造可行性结论。
- **升学条件适配度**：先筛年份、路径、有效期和已审核岗位关联。明确违反一条硬条件即 not_met；认定 met 还需完整科目、跨考与全部已列资格。可判定项目中 met 的比例为该维度分数；不可判定项目不进入分母，覆盖率单列。不存在录取概率。过期与不符合计划单独显示。
- **硬资格**：每条规则对照 major/degree/graduation_year/pathway/recommendation_eligible 精确值；任一不满足则否决，有未知则整体未知。研究经历不自动证明学位，医学专业不自动证明推免资格。V1 只支持枚举允许值，不从复杂招生段落猜测规则。
- **排序**：只给兴趣和准备度都完整、岗位资格没有明确否决的岗位排序；兴趣分降序、准备度降序、ID 稳定打破同分。资格未知仍显示待核实；partial 不与完整分数混排。四维不合成为一个“适合度”，转型线索与招生分不参与职业排序。

报告每维包含 score、coverage、status、basis、evidence、missing；另有逐技能 current/target/gap、资格 checks、招生 programs 与行动建议。修改技能后旧报告撤下；导出附 schema/algorithm/skill_standard 版本与 simulation 标记，不写 Supabase。

## 提取器协同与接入流程

1. 原采集流程继续使用 `src/lib/knowledge.ts`；本轮未修改采集、入库脚本或远端表。
2. `npx tsx scripts/match-handoff.ts` 只读 `data/knowledge/pilot.collected.json`，写 `work/match/extraction-handoff.json`；包含输入 SHA256、来源 URL、发布日期说明、采集/核实时间、摘录定位、历史状态与缺失项。
3. 所有候选均 `review_required`，技能重要性/等级均 null。过期原文标 unverified；缺 source、重复 identity 拒绝交接。不再次下载，也不声称本步骤重新核验过网页。
4. 审核者将原文要求和数值标准分开审定，再按 occupation/admission schema 生成正式记录；未知仍为 null，绝不为通过校验而补 0。输入程序集再次验证引用关系、来源、模拟与真实隔离。
5. V1 的真实 `/api/match` 尚未读取这些待审候选作为职业标准或招生资格。后续正式连接须增加审核产物存储和读取接口，而不是绕过审核直接使用摘录。

## 数据库结构交付与权限

当前运行**不新增数据库表**：复用已有 `profiles.payload`、`assessments.payload`、`experiences.payload`，请求经 requireSession、按本人 id 查询并由原 RLS 约束。公开方向映射只含编辑性岗位框架。`/api/match` 仅 GET，出错不回退合成资料。

后续结构草案为 `docs/sql/limen-match-v1.proposed.sql`，放在文档目录而非 migrations，**未执行**：

- `match_occupations`、`match_admissions` 保存版本化结构 payload 及审核状态；公开只读已审真实记录，客户端无写权限。
- `match_admission_occupations` 是有证据的一对多连接表；两端外键、复合主键；导入事务须核对 payload.occupation_ids 与关联表一致。
- `match_user_profiles` 是可选匹配画像快照，以 auth.users 外键级联删除；authenticated（包括匿名 Auth）只读写/删除本人记录。继续复用原账号删除路径，且提供本人直接 DELETE 权限。
- SQL 只有基础 JSON 形状检查，不能代替应用契约；需要隔离数据库建表、两个合成身份 RLS/删除测试后才可考虑迁移。草案没有经过 Postgres 执行验收，不用于证明远端安全。

## P4 接口与第二次匹配

`experiences[]` 预留 occupation_id/scenario_id/mode/completed_at/artifacts/willingness/evaluations[]；评价保留 skill_id/level/rubric_version/evaluator（human/deterministic/llm）。现有 `hospital_ai_triage` 只绑定医学 AI 产品经理；旧 ECG 不自动转成其他岗位能力。当前体验只将用户自述意愿用于第二次转型线索匹配，大模型/关键词评价全部不进入准备度。未来要让评价影响能力分，必须先确定岗位任务、同版本评分规则、可复核证据与人工审核。

## 未完成事项

真实三岗位 RIASEC、技能重要性/等级与硬资格标准；官方量尺核验及跨量表有效性；已审核招生规则的结构化导入；复杂资格表达式；Match 云存储迁移与权限测试；三个岗位各自的数字人场景及能力评价规则；真实个人完整匹配与生产部署。本次不以合成测试代替这些验收。
