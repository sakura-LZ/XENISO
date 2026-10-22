# LIMEN 中国职业与医学知识库

## 九方向与医学扩充（当前版本，2026-10-21）

用户已授权从试点扩展至全部九个跨学科方向，并把“医学与医院职业”作为平行路径。全国代表院校按已核实项目逐步收录，不宣称全国院校、医学专业或所有科室的完整覆盖。实际数量、逐方向质量和缺口以 [本轮验收](testing/knowledge-expansion.latest.md) 和 [机器质量统计](testing/knowledge-expansion-quality.latest.json) 为准；下方第一阶段保留为历史记录。

### 数据与证据

沿用 `kb_roles → kb_records → kb_sources/kb_snapshots`。角色包括原医学AI产品经理试点、九个 `guide_*` 索引及独立 `medicine_guide`；医学角色的 `direction_ids=[]`，支持 `direction_id=medicine` 查询，不重写九方向的Match评分。每项官方断言保留 `facts[].quote/value/start/end`、原文版本hash、来源机构、原始链接、发布日期依据、实际采集与核实时间。标题、标签、适用范围和方向关联属于LIMEN编辑索引，不能当作官方结论。

新增 `kb_records.context` JSONB（迁移 `202610220004_knowledge_context.sql` 已dry-run并实际应用）：

| 字段 | 用途 |
|---|---|
| institution / college / program / admission_year / region | 具体院校、学院、培养项目、招生年份与地区 |
| medical_topic / medical_department / department_type | 医学主题、医院科室及该院临床/医技分组 |
| statistic_scope / evidence_locator | 统计年份、人群、定义、单位及PDF物理页/目录行定位 |

五类资料仍是职业、招聘、升学、行业、学习。医学专业培养、医院科室、岗位身份、研究生招生专业和执业范围分别核对；科室介绍不证明准入。工资保留税前年收入、行业、单位性质、人群口径，不换算为医生、具体专业、应届生或月薪。毕业去向落实率含升学等，不能改名为专业就业率。未知值进入 `missing_fields`，发布日期未知保留null。

### 采集、更新与存储

受控官方来源清单为 `data/knowledge/expansion.manifest.json`，生成脚本 `scripts/knowledge/build-expansion-manifest.ts` 固定经过复核的原文范围。静态HTML/PDF保留原始文件与提取文本hash，动态招聘/招生系统使用真实浏览器可见文本捕获；读取固定捕获不冒充新的HTTP访问。PDF额外页定位标记不进入官方引文。`quote_verified` 证明引文与快照一致，不证明全文完整、官网仍有效或个人符合资格。

```text
npx.cmd tsx scripts/knowledge/build-expansion-manifest.ts
npx.cmd tsx scripts/knowledge/collect.ts expansion
npx.cmd tsx scripts/knowledge/prepare-import.ts expansion
npx.cmd tsx scripts/knowledge/import-parts.ts expansion
```

后三步依次校验分类/日期/缺失、原始与文本SHA及精确offset，再通过已登录维护者Supabase CLI导入。原文和SQL保存在Git忽略的 `work/knowledge-expansion/`。首个完整SQL请求曾触发413，现按750KB请求预算分批，先写不可公开的原文快照，数据库验证其raw/text SHA后才发布记录；每批upsert可重试。四表强制RLS保持，anon/auth只读核验资料、不能写记录或读取原文快照。没有客户端服务角色Key。

### 检索与手册

`GET /api/knowledge` 公开只读、无本地假数据回退。参数新增 `domain=all|interdisciplinary|medicine`、`institution`、`admission_year`、`medical_topic`、`medical_department`、`offset`；保留role/direction/category/q/jurisdiction/limit/include_historical。最多20条/页，offset最多10000；返回 `total/has_more/facets/coverage/missing_categories`，覆盖统计针对全部已读资料，不以第一页代替总量。每次选中角色集合最多500条，超限显式报错；不是每个角色各500条。当前词法检索不理解同义词或复杂问句。

```text
/api/knowledge?direction_id=signals&category=admissions&institution=电子科技大学&admission_year=2027
/api/knowledge?domain=medicine&medical_department=心血管内科
/api/knowledge?direction_id=medicine&medical_topic=专业目录
/api/knowledge?domain=interdisciplinary&limit=20&offset=20
```

`/explore` 保留原有方向、比较和体验入口，增加平行医学入口及中国官方资料区。支持五类、学校/年份/关键词、往年开关、分页、原文展开和当前页Markdown导出；编辑性与模拟实践另行标明。科室目录采用北京大学第一医院实际分组，是院方实例，不是全国统一科室标准，未取得详细资料的科室显示空结果。

R1/R2 `reportKnowledge()` 最多读取三个方向，每方向每类一项，去重引用且最多15项；补查排在第一页之后的类别。证据保留上下文和缺失字段，沿用已有报告引用面板与存储契约。不是把全部资料塞进报告。既有AI证据24,000字符保护保持；大画像仍可能触发预算错误。本轮真实模型调用的超时与验收结论见测试记录，不沿用旧试点成功证明新调用通过。既有报告不静默改写。

### 扩展优先级

先补2027当年多校“目录＋校级章程＋院系细则”，补不同企业/城市/资历的岗位，补医学逐科室真实招聘和专业化培训依据；保持历史项目与现行项目区分。之后建立专家审定的职业技能/招生规则和反例评测集，再评估数据库全文索引、混合召回及匹配排序。兴趣、迁移能力、知识缺口和硬资格应独立解释，缺失不记低分；现有小样本不能训练或证明职业匹配准确率。

---

## 第一阶段试点历史

验收日期：2026-10-21（America/Los_Angeles）；机器记录使用 UTC。

本阶段只建设 `medical_ai_pm`（医学 AI 产品经理）试点，默认检索中国资料。新增后台采集、证据、存储及查询能力；未修改产品页面、导航、数字人决策或既有匹配分数，未发布新的生产应用版本。

## 数据结构

沿用三大类、九细分方向；职业角色独立于专业方向。`data/knowledge/roles.json` 将试点编辑性关联到 `health_systems / llm_agent / ml_cv / clinical_data`，不新增第十个专业，不将关联解释为 O*NET 官方中国专业推荐。

| 层 | Supabase 表 / 契约 | 内容 |
|---|---|---|
| 职业 | `kb_roles` | 角色ID、名称、别名、多方向关联、映射依据、适用范围 |
| 来源 | `kb_sources` | 原始URL、机构、标题、地区、来源级别、发布日期（未知为null）、日期说明 |
| 版本 | `kb_snapshots` | 正文hash、原始文件hash/base64、规范化正文、采集时间、内容类型；客户端不可读 |
| 资料 | `kb_records` | 职业、来源、五类分类、标题、编辑摘要、适用范围、关联级别、标签、事实、缺失、核实状态、版本、采集/核实时间、时效 |
| 事实 | `facts[]` | `field/value/quote/start/end`；value必须等于原文quote，offset为规范化正文UTF-16位置 |

统一运行契约在 `src/lib/knowledge.ts`。五类资料均用事实字段承载，保持原文：职业职责/技能/发展路径；招聘企业/岗位/城市/学历/专业限制/技术/薪资；招生院校/专业/考试/跨专业限制；政策/统计/行业需求；课程/实践/科研/先修条件。未取得的字段不生成事实，写入 `missing_fields`；消费者应将其映射为 `value:null,status:unknown`，不能将空值当零或允许报考。

`summary/applicability/tags/relation` 是 LIMEN 人工编辑信息，不能伪装成原文事实。`quote_verified` 仅表示片段和版本匹配，不表示官方对职业映射背书、事实完整、法规仍现行或个人已满足资格。

## 已采集与实际入库

**7 个独立来源、8 条中国资料、23 条原文事实；职业1、招聘1、升学2、行业2、学习2。**同一招聘页拆为职业与招聘两条资料，独立来源仍只计一次。已通过真实 Supabase 导入和重复导入，重复执行后计数不变。

| 官方来源 | 发布日期 | 入库内容与边界 |
|---|---|---|
| [字节跳动小荷健康 A176552](https://jobs.bytedance.com/campus/position/7669685133130221877/detail) | 未列 | 北京、2027届、本科及以上、编程/算法/大模型、医疗背景加分；1个招聘样本和1条职业任务。原文职责含“抖音产品工作”，保留差异，未擅自修正 |
| [交大2027招生目录](https://yzb.sjtu.edu.cn/post/3772) | 2026-09-21 | 082学院083100指定方向及085400医学影像方向，原文关联考试科目；不能把其他表格行的跨考许可移植过来 |
| [交大2027招生章程](https://yzb.sjtu.edu.cn/post/3784) | 2026-10-08 | 同等学力限制、跨学科复试加试规则和当次报名窗口；同等学力限制不能推广到普通本科生 |
| [中国政府网医疗AI实施意见](https://www.gov.cn/zhengce/zhengceku/202511/content_7047018.htm) | 2025-11-04 | 复合人才培训、模型评测、医疗安全/隐私/数据安全；规划目标不等于已实现就业统计，成文日期2025-10-20另行区分 |
| [药监直属中心官方通告页](https://www.ccfdie.org/cn/yjxx/ylqx/webinfo/2022/03/1648289422561065.htm) | 2022-03-14 | 可证实AI医疗器械指导原则发布；原通告2022-03-07；未取得附件全文，未补造具体注册要求 |
| [上海人工智能实验室 InternLM 教程](https://raw.githubusercontent.com/InternLM/Tutorial/main/README.md) | 未列 | 知识库应用与模型评测主题；非学历招生，未推断个人学习时长 |
| [复旦 DISC-MedLLM 官方仓库](https://raw.githubusercontent.com/FudanDISC/DISC-MedLLM/main/README.md) | 未列 | 医疗对话开源项目实践入口；不代表科研招募或临床有效性 |

四个来源有可核对的日级发布日期，三个保持null。8条资料共有21个显式缺失字段项（同名字段在不同资料分别计数）。没有取得可支持行业薪资/就业率、完整晋升路径或普通本科生具体跨专业资格的资料，本轮没有生成这些结论。海外补充清单 `supplementary.manifest.json` 未导入，也不参与默认检索。

## 采集与核验流程

1. 人工核验官方归属及目标页面，将来源、日期依据、预期字段和精确抽取规则写入 `data/knowledge/pilot.manifest.json`。它是受控清单，不接受客户端任意URL，不实施全国招生爬虫。
2. `npm run knowledge:collect` 下载静态页面，限制40秒/5MB、拒绝重定向，处理UTF-8/GBK；移除脚本/样式并抽取规范化文本。提取字段按规则分类，模糊分类进入失败审计。
3. 对每个事实校验原文片段和offset；检查发布日期证据、原始/正文hash；按规范URL+角色+类别及内容去重。没有匹配的字段记录缺失；无事实、日期不匹配、网络失败不能入库。
4. 动态字节招聘页静态请求只返回壳，本轮实际浏览官方页面并保留可见职位区摘录 `data/knowledge/captures/bytedance-a176552.txt`。清单固定采集方法、时间和hash。它是人工浏览取证后自动提取；重新采集动态页面需要更新真实摘录，不能把读取本地摘录说成新的HTTP成功。
5. `work/knowledge-pilot/` 保存完整原文和导入包（Git忽略）；`data/knowledge/pilot.collected.json` 只导出事实/来源/审计，不发布完整网页。`docs/testing/knowledge-collection.history.jsonl` 保留早期海外尝试及历史错误，当前计数及采集方式以latest审计和本阶段验收更正说明为准。
6. `npm run knowledge:prepare-import` 再核对全部hash、来源关系和offset，生成事务SQL。使用已登录维护者CLI执行 `npx supabase db query --linked --file work/knowledge-pilot/import.sql`；不新增客户端服务角色key。数据库触发器再检查来源与quote，四张表启用并强制RLS，anon/auth只有核验资料读取权限。

首次迁移已核对远端历史并dry-run，实际应用 `202610220003_knowledge_base.sql`，只新增知识表。导入是upsert，不删除已有资料；来源正文变化产生新版本，旧快照保留。原文涉及第三方版权，不将快照接口开放给访客。

## 检索与报告调用

`GET /api/knowledge` 为公开只读、不缓存接口，无本地假数据回退：

```text
/api/knowledge?role_id=medical_ai_pm&limit=20
/api/knowledge?direction_id=health_systems&category=admissions&q=408
/api/knowledge?category=recruitment&q=北京%20本科
```

参数：`role_id / direction_id / category / q / jurisdiction / limit / include_historical`。默认地区CN、最多20条、q最多160字；不接受重复或未知参数。有效但未覆盖的方向返回 `not_covered`；无关检索返回空命中；数据库失败返回错误状态，不能声称已检索成功。

响应包含来源、逐条原文、缺失字段、历史标记及稳定引用 `kb:<record-id>:<hash前12位>`。招聘/升学30天、其他资料180天为LIMEN复查周期，不是官网公布的有效期；过复查期或明确有效期的资料默认不参与检索，需 `include_historical=true`。本轮目录仅适用2027周期，空 `valid_through` 不代表永久有效或报名仍开放。

当前为可解释的词法匹配：按空格分词，中文连续短语作为一个token，任意词命中即可，标题/标签加权；不理解同义词或复杂问题，不做用户职业适配评分。每角色最多500条，超过返回显式容量错误；扩量前应改为数据库索引检索、分页和独立召回评测。

`src/lib/server/knowledge-store.ts` 的 `reportKnowledge()` 为相关方向提取五类证据，沿用现有 R1/R2 证据契约；报告API保存 `knowledge_context` 及来源快照。`src/lib/ai.ts` 约束模型保留年份/地区/缺失信息。原有报告证据快照面板可看到来源URL与机构，页面未增加新的排版或操作。职业探索可调用同一API，本轮没有改动探索前端的数据绑定。

每类最多选择一条进入报告，报告不会包含所有库内资料；需要具体招生科目时应通过分类检索取得完整证据。报告输出仍须逐条语义核查，已有保存报告不会被后台静默重写。

## Match 接口边界与后续算法建议

独立适配器读取 `KnowledgeHit` 或采集产物即可；保留角色ID、类别、原文、offset、hash、机构、URL、发布日期、采集/核实时间、适用范围及缺失。`verification=quote_verified` 映射为“原文匹配”，不能映射为“当前资格已核定”。

技能主题与Match技能ID的关联属于编辑性待审映射；职业兴趣、重要性、技能水平在没有独立依据时保持null，不将关键词命中转成数值。招生目录与章程必须联合解释，数据不完整时不进入资格判定。知识库不修改 `src/lib/match/*`、Match接口/UI或其他线程schema草案；集成时仅为其测试样例补齐画像契约要求的空evidence字段。

建议先扩充中国企业不同岗位/城市/资历样本和多院校当年目录+章程+院系细则，再建立专家标注评测集。算法应分别处理兴趣、经历证据、可迁移技能、知识缺口和硬性资格；保留覆盖率、缺失和反例解释，再评估混合检索与排序。不能用现有8条资料训练或宣称可靠职业匹配准确率。数字人下一阶段按真实岗位决策、约束、可交付成果和评价依据分别设计，本阶段不扩展。

## 验收入口

- `npm test`：知识库12项单测，覆盖严格契约、来源规范化、精确证据、缺失、地区、方向、过期、无关检索、引用、分类和HTML抽取。
- `npm run verify:knowledge`：真实Supabase存储/证据/RLS、11个检索回归、R1/R2适配及合成私有报告保存恢复；测试账号删除。
- `npm run verify:knowledge:ai`：只发送公开资料到真实模型，R1/R2适配证据→模型引用→私有保存→恢复；是集成片段，不冒充完整画像/O*NET/体验HTTP主线。
- `npm run verify:knowledge:http`：本机生产API成功、过滤、来源、无关/未覆盖及参数错误检查。
- 机器记录：`docs/testing/knowledge-{collection,live,ai,http}.latest.json`；最终集成结果及已知局限见 `docs/testing/knowledge-pilot.latest.md`。

检索评测8个正例各仅一个相关目标，3个空结果案例，当前11/11通过。它是人工指定小样本回归，不能外推为语义召回率、全国覆盖率或匹配准确率。
