> 本文只写本次复核实际执行过的命令与真实输出；未执行或无法执行的项目集中在文末「未做与未验证」一节，不写成通过。复核人 verifier 不继承实现者结论，以下判断均来自本机代码、数据与命令输出。

# R1「职业技能匹配」独立复核（2026-10-24 / 2026-10-25 UTC）

- 复核对象：初步评价 R1 新增第 05 块「职业技能匹配」（岗位侧 = 知识库 `kb_records` 采集原文；用户侧 = 画像记录；状态 = 有记录 / 仅自述 / 信息不足；不评分、不排序、不合成适合度）。
- 工作目录：`D:\医学生跨考平台\limen_project_files`
- 复核时间：2026-10-24T21:18:41-07:00（America/Los_Angeles）= 2026-10-25T04:18:41Z
- 整体结论：**PASS**（6 项断言全部通过；另有 3 条轻微发现，见「风险与文档不一致」，均不影响引用真实性与红线）。

## 一、结论摘要

| # | 目标 | 状态 | 依据 |
| --- | --- | --- | --- |
| 1 | 62 条技能 evidence 的 quote 能从 `*.collected.json` 原文逐字回查 | **PASS** | 自写 `tmp/verify-skill-quotes.cjs`：10 方向 / 61 项 / 62 条，`matched=62`，`failure_count=0`，`warning_count=0` |
| 2 | 无评分 / 排名 / 百分比 / 适合度字段与文案；`unknown` 不参与排序 | **PASS** | 数据集全量 key 扫描 + zod `.strict()`；匹配模块无 `sort`；UI 只有「不评分、不排序」的否定表述 |
| 3 | 覆盖诚实性：薄弱方向如实标注、无编造岗位要求 | **PASS（有 2 处 coverage_note 措辞不准确，轻微）** | 62 条 quote 全部命中原文；`signals`/`med_nlp_kg`/`medicine` 均在 coverage_note 说明覆盖边界；详见第四节 |
| 4 | 真实空态与「信息不足 ≠ 不具备」文案 | **PASS** | 3000 SSR 含「职业技能匹配」与空态原文各 1 次；截图 `empty-3000-1440.png`；文案见 `report.tsx` L210/L211 |
| 5 | `npx tsc --noEmit` | **PASS** | 退出码 0，无输出（`tmp/tsc.log` 为空） |
| 6 | 目标文件 eslint `--max-warnings=0` | **PASS** | 退出码 0，无输出（`tmp/eslint.log` 为空） |
| 7 | `npm test` 与基线一致 | **PASS** | 206 项 / 205 通过 / 1 失败；唯一失败仍是既有 `tests/knowledge.test.ts` 的 `normalizeSourceUrl` 用例（`src/lib/knowledge.ts` 本轮未改） |
| 8 | 构建脚本可重复、失败 0 | **PASS** | `npx tsx scripts/knowledge/build-skill-requirements.ts` 输出 10 方向 / 61 项 / 62 条；重新生成内容与复核前一致（仅 `generated_at` 变），已恢复原文件 |
| 9 | 浏览器渲染（1440 / 390 / 空态） | **PASS（限定条件：3011 为预览副本 + 硬编码演示画像）** | 4 张截图；工具报告均「无控制台错误、无横向溢出、无加载失败图片」；详见第六节 |
| 10 | 代码与契约 | **PASS（1 处措辞需注意）** | `reports.ts` 仅在候选方向存在时产出非空 `occupation_skills`（空态为 `[]`）；契约补 4 个字段；API 证据只来自知识库 record/quote |

## 二、独立原文回查（最重要）

### 方法

复核员自写脚本 `tmp/verify-skill-quotes.cjs`，**不复用** `build-skill-requirements.ts` 的校验逻辑：

1. 读取 `data/knowledge/skill-requirements.json`（10 方向 / 61 技能 / 62 条 evidence）。
2. 自行遍历 `data/knowledge/*.collected.json`（96 个文件，索引 1040 个 record id），按 `record_id` 找 record、按 `field` 找 fact（同一 field 多条时要求 slice 相等的那条）。
3. 每条断言：`fact.value.slice(quote_start, quote_end) === quote` **且** `quote.includes(needle)`。
4. 附加检查：`quote_end === quote_start + quote.length`、端点不越界、quote 无首尾空白、quote 不含 `…` / `...` / `⋯`、`category` / `role_id` / `source_id` / `source_url` / `organization` / `jurisdiction` 与 record、source 行一致、`collected_file` 可定位。
5. 交叉核对 spec：spec 中每个技能的 `record` / `field` / `needle` 与产物逐项一致；spec evidence 只允许 `record` / `field` / `needle` / `max_length` 四个指针键（不含 `quote`，即不存在「手写 quote」）。
6. 全量递归扫描数据 key，禁止 `score|rating|percentage|percent|weight|rank|ranking|fit|fitness`。

### 实际输出（原文）

```
扫描 96 个 *.collected.json，索引 1040 个 record id。
{
  "directions": 10,
  "skills": 61,
  "evidence": 62,
  "matched": 62,
  "unique_records": 22,
  "unique_sources": 15,
  "categories": {
    "recruitment": 51,
    "occupation": 9,
    "learning": 2
  },
  "collected_files": 7,
  "failure_count": 0,
  "warning_count": 0
}

PASS: 所有 evidence 的 quote 都能以 fact.value.slice(quote_start, quote_end) 逐字回查，且包含 needle。
```

**失败条数：0**（失败明细为空）。完整日志：`tmp/verify-skill-quotes.log`、`tmp/verify-skill-quotes-v2.log`。

### 手写 / 改写嫌疑检查结论

- **无**：62/62 均满足 slice 逐字相等，quote 物理上不可能是拼接或改写文本（比「子串存在」更强）。
- **无省略号字符**：62 条 quote 内部均不含 `…`/`...`/`⋯`；UI 的省略号来自 `ellipsis_start/ellipsis_end` 标记，不是 quote 内容。
- **统一元数据一致**：62 条 `category`（51 recruitment + 9 occupation + 2 learning）、`role_id`、`source_id`、`source_url`、`organization`、`jurisdiction`（全部 CN）与采集 record/source 一致；15 个 `source_url` 全部为 https。
- **来源复核**：22 个唯一 record、15 个唯一来源机构/页面，来源类别为招聘原文 51 条、国家职业标准 9 条、培养/规培原文 2 条，无「凭空补一条岗位要求」。
- **省略号标记的轻微显示问题**（不影响引用真实性）：`ellipsis_start=true` 41 条中有 32 条的 quote 起点其实紧跟在「；」或「。」之后（是子句边界，不是截断）；`ellipsis_end=true` 13 条中有 1 条（`health_systems/virtualization_ops`）quote 后紧跟的只是空格 + 「；」。UI 会因此多显示一个「…」。这是显示层 cosmetics，quote 本体仍是连续原文。

## 三、红线审计

| 检查 | 结论 | 证据 |
| --- | --- | --- |
| 数据/代码无评分字段 | PASS | 递归扫描 `skill-requirements.json` 全部 key，无 `score/rating/percentage/percent/weight/rank/fit`；`src/lib/skill-requirements.ts` 的 evidence/skill/direction/dataset 均 `.strict()`，新增未知字段会校验失败 |
| 无评分/排名/百分比/适合度的正向文案 | PASS | `src` 全仓 grep `适合度|匹配度|百分比|推荐排序`：本次相关文件只有否定句（`skill-match.ts:15` 注释、`skill-match.ts:123` note、`report.tsx:183` lede、`report.tsx:210` 脚注）。其余命中属于既有 Match V2 / 使用指南页面，与本 05 块无关 |
| 「信息不足 ≠ 不具备」说明存在 | PASS | `src/lib/skill-match.ts:24`「未记录不等于不具备」；`src/app/report/initial/report.tsx:210`「『信息不足』也不等于不具备」；`src/lib/reports.ts:26` unknowns「没有记录不等于不具备」 |
| `unknown` 不参与任何排序 | PASS | `src/lib/skill-match.ts` / `report.tsx` 的 05 块内无 `sort`；技能顺序 = 数据集编辑顺序；方向顺序 = O*NET 职业命中顺序（与状态无关）；UI 汇总只是 `total/recorded/self_reported/unknown` 计数 |
| 报告空态 | PASS | 3000 SSR：`职业技能匹配 -> True`、空态原文出现 1 次；截图见 `tmp/skill-match-shots-verify/empty-3000-1440.png` |
| AI 只能引用知识库已有 record/quote | PASS（静态审阅） | `src/app/api/reports/route.ts:69-77` 的 `knowledge_quotes` 只来自 `skill.kb`（即已回查的 62 条 evidence），未生成新岗位要求；`ai.ts` 的 `validateAiExplanation` 仍校验 evidence_refs 存在与类型；系统提示词要求「不新增方向/课程/院校/考试事实」 |
| 不评分/不排序的契约层禁止项 | PASS | `data/report_contract.json` 的 `prohibited` 保留「无依据的录取概率」「专业天赋百分数」；`shared.unknown_label = 信息不足` |

## 四、覆盖诚实性

### 数据来源分布（实测）

| 方向 | 技能数 | 引用数 | 唯一 record | 引用类别 | coverage_note 覆盖说明 |
| --- | --- | --- | --- | --- | --- |
| ml_cv | 7 | 8 | 2 | recruitment 4 + occupation 4 | 迈瑞招聘 + 国家 AI 职业标准；注明「相关项目经验」在原文为优先项 |
| software | 7 | 7 | 2 | recruitment 6 + occupation 1 | 迈瑞 + 职业标准；注明 GPU/图形学来自原文「优选条件」 |
| llm_agent | 6 | 6 | 2 | recruitment 5 + occupation 1 | 泰格「前沿部署工程师」+ 职业标准；注明方向新、岗位样本少 |
| devices | 6 | 6 | 2 | recruitment 6 | 迈瑞 + 华西医学工程科；注明「全生命周期管理」是医院岗位职责、不是研发岗统一要求 |
| signals | 5 | 5 | 1 | recruitment 5 | **明确写「只此一组招聘原文，覆盖最窄，没有额外编造条目」** |
| imaging_eng | 6 | 6 | 2 | recruitment 6 | 联影「临床应用专家」+ 迈瑞；注明成像物理条目来源 |
| clinical_data | 7 | 7 | 3 | recruitment 7 | 泰格统计、瑞金数据治理、浙大一院数据工程师；注明数据治理/ETL 不适用于所有统计岗 |
| health_systems | 6 | 6 | 3 | recruitment 6 | 浙大一院数据工程师、华西信息中心、华西信息运维；注明标准/集成条目来自数据工程师职责 |
| med_nlp_kg | 5 | 5 | 1 | recruitment 5 | **明确写「只有药物警戒 AI 产品岗位一组，NLP/知识图谱缺少直接岗位原文，未强行补条目」** |
| medicine | 6 | 6 | 4 | occupation 3 + learning 2 + recruitment 1 | **明确写「没有临床医师招聘技能清单，只能反映培养/规培要求，不能当医院招聘统一门槛」** |

- **无编造岗位要求**：62 条引用全部逐字回查通过；每条 quote 都同时包含 spec 的 needle。技能名/分类/aliases 是编辑信息，已与原文分离，并在 data note、`coverage_note`、UI 脚注三处注明。
- **薄弱方向如实写出**：`signals`、`med_nlp_kg` 均明确「单组招聘原文 / 覆盖最窄 / 未强行补条目」；`medicine` 明确「只有培养/规培原文」。这些说法与实测 record 集合一致（见上表）。

### 轻微发现（不影响引用真实性）

1. **`clinical_data.coverage_note` 来源列举不准确**：note 写「来自医药企业统计岗、医院数据治理岗与科研助理招聘原文」，但该方向 3 个 evidence record 实际是泰格「统计分析员」、瑞金「数据治理工程师」、浙大一院「数据工程师」；没有任何一条 evidence 来自「科研助理」。知识库里确实存在 2 条 `guide_clinical_data` 的科研助理 record（`recruitment-huaxi-rwe-99045`、`recruitment-huaxi-bigdata-99044`），但没有进入本方向清单。
2. **`medicine.coverage_note` 与 evidence 不完全一致**：note 写「只有培养目标与规培制度原文」，但 6 条引用中有 1 条来自北京协和医院《2026 年科研博士后招收简章》（`category=recruitment`），且该条被标为「加分 / plus」，而原文是博士后入站的硬性条件（中科院二区及以上 SCI 论著 ≥1 篇）。`docs/KNOWLEDGE_BASE.md` 写的是「培养目标与规培/博士后原文」，与 data 里的 coverage_note 措辞不一致。
3. **`imaging_eng.coverage_note` 的「同一岗位」措辞有歧义**：note 同时提到迈瑞与联影两个岗位，随后说「成像物理条目来自同一岗位对光学成像系统/影像处理经验的要求」；实测该条来自迈瑞记录，而「超声图像算法」相关引用来自联影记录。

> 以上 3 条均未自行修复（任务禁止修改 data/docs），交由 lead 决定是否单独修文案。

## 五、代码与契约

| 检查项 | 结论 | 证据 |
| --- | --- | --- |
| `initialReport` 是否只在有测评候选方向时输出 `occupation_skills` | **符合预期（注意措辞）** | `src/lib/reports.ts:24` 始终输出该 key：无候选方向时为 `[]`，有候选方向时才是非空数组；内容由 `occupationSkillMatches(profile, candidates.map(...))` 产生，candidates 最多 3 个。`tests/reports.test.ts:83-87` 断言无测评为 `[]`；`report.tsx:182` 用 `.length` 判定空态。即「技能内容只在有候选方向时输出」，字段本身不省略 |
| `data/report_contract.json` 是否补字段 | PASS | `sources += knowledge_base_occupation_skills`；`evidence_types += occupation_skill_requirement`；`report_1.fields += occupation_skills_with_knowledge_source`、`skill_evidence_status_against_occupation_requirements`；`unknown_label = 信息不足` 保持 |
| API 的 AI 证据是否只引用知识库已有 record/quote | PASS | 见第三节；`route.ts:70-77` 的每个 `occupation_skill.*` 证据携带 `record_id` + `quote` + `organization`，quote 即本次回查通过的 62 条 |
| 新增 AI evidence 类型在读写两侧一致 | PASS | `src/lib/ai.ts`：`Evidence.kind`、`aiExplanationSchema`、`readSavedExplanation` 的 enum 均加入 `skill`；`src/app/profile/profile-report.tsx` 的 `kindLabels` 与 `src/components/ai-report.tsx` 的 `evidenceLabel` 均处理 `skill`/`occupation_skill.*` |
| 报告版本与未知说明 | PASS | `initialReport.version` 提升为 `limen-r1-rules-v2`；无测评时 unknowns 增补「无法列出对应职业的技能要求」；新增「职业技能要求按知识库原文整理，不是统一招聘标准；没有记录不等于不具备」 |
| 测试覆盖 | PASS | `tests/skill-requirements.test.ts` 4 项（方向/技能数、逐字回查、无评分字段、别名整词匹配）；`tests/reports.test.ts` 3 项 R1 技能匹配测试全部通过 |

## 六、实际命令与输出

### 1) `npx tsc --noEmit`

```
=== 1) npx tsc --noEmit ===
TSC_EXIT=0
```

输出为空（无类型错误）。日志：`tmp/tsc.log`。

### 2) 目标文件 eslint `--max-warnings=0`

命令组（任务指定原样）：

```
npx eslint src/lib/skill-requirements.ts src/lib/skill-match.ts src/lib/reports.ts src/lib/ai.ts src/app/report/initial/report.tsx src/app/api/reports/route.ts src/app/profile/profile-report.tsx src/components/ai-report.tsx tests/skill-requirements.test.ts tests/reports.test.ts scripts/knowledge/build-skill-requirements.ts --max-warnings=0
```

```
=== 2) npx eslint (targeted) ===
ESLINT_EXIT=0
```

输出为空（无错误、无警告）。日志：`tmp/eslint.log`。

### 3) `npm test`

```
> limen@0.0.1 test
> tsx --test tests/*.test.ts
...
✔ skill requirements: every direction in the catalog is covered once, 4–7 skills each (2.7852ms)
✔ skill requirements: every generated quote is a verbatim substring of the knowledge base record (314.281ms)
✔ skill requirements: no score, rating or percentage fields leak into the matching dimension (0.4796ms)
✔ skill matching: short latin aliases must match whole tokens, Chinese aliases match by substring (0.528ms)
...
ℹ tests 206
ℹ suites 0
ℹ pass 205
ℹ fail 1
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 6189.541

✖ failing tests:

test at tests\knowledge.test.ts:23:1
✖ source canonicalization removes tracking but preserves meaningful admissions parameters (6.4006ms)
  AssertionError [ERR_ASSERTION]: Missing expected exception.
      at TestContext.<anonymous> (D:\医学生跨考平台\limen_project_files\tests\knowledge.test.ts:25:131)
      at Test.runInAsyncScope (node:async_hooks:226:14)
      at Test.run (node:internal/test_runner/test:1201:28)
      ...
  operator: 'throws',
TEST_EXIT=1
```

- **与基线一致：206 项 / 205 通过 / 1 失败。**
- 唯一失败 = 既有 `tests/knowledge.test.ts` 的 `normalizeSourceUrl` 用例（`src/lib/knowledge.ts` 未在本次改动范围内，`git status` 无该文件修改记录），**不是本次引入**。
- 复核员进一步实测失败点：`normalizeSourceUrl("http://example.edu.cn/")` 未抛错（返回原 URL），而用例期望它抛错；`https://key@...`、`https://127.0.0.1/`、`https://localhost/` 三个用例均正常抛错。
- 完整日志：`tmp/npm-test.log`。

### 4) `npx tsx scripts/knowledge/build-skill-requirements.ts`

```
BEFORE_SHA256=633BC2F26D951A935D0B7AE0C2141E492C87F084F7F01655FB5584F68850034D
=== 4) npx tsx scripts/knowledge/build-skill-requirements.ts ===
已写出 D:\医学生跨考平台\limen_project_files\data\knowledge\skill-requirements.json
ml_cv           7 项 / 2 个来源 record
software        7 项 / 2 个来源 record
llm_agent       6 项 / 2 个来源 record
devices         6 项 / 2 个来源 record
signals         5 项 / 1 个来源 record
imaging_eng     6 项 / 2 个来源 record
clinical_data   7 项 / 3 个来源 record
health_systems  6 项 / 3 个来源 record
med_nlp_kg      5 项 / 1 个来源 record
medicine        6 项 / 4 个来源 record
共 10 个方向、61 项技能、62 条原文引用。所有 needle 均已在原文命中。
BUILD_EXIT=0
AFTER_SHA256=5C944D68A8256CE00AF153D13750982737DD5D95A4E379CD8DE6A2437E9754DE
```

- 可重复生成：**10 方向 / 61 项 / 62 条，失败 0**。
- 内容一致性：去掉 `generated_at` 后，重新生成结果与复核前**完全一致**（`content_equal_excluding_generated_at: true`）；`generated_at` 由 `2026-10-25T03:35:13.415Z` 变为 `2026-10-25T04:15:06.042Z`。
- 未改写交付数据：复核结束后从 `tmp/skill-requirements.before.json` 恢复，SHA256 还原为 `633BC2F26D951A935D0B7AE0C2141E492C87F084F7F01655FB5584F68850034D`。日志：`tmp/build-skill-requirements.log`。

### 5) 独立回查脚本

见第二节；脚本路径 `tmp/verify-skill-quotes.cjs`，日志 `tmp/verify-skill-quotes.log`、`tmp/verify-skill-quotes-v2.log`。

## 七、浏览器渲染

> 说明：3011 是**预览副本** `work/skill-match-preview`（dev server），页面内硬编码演示画像 `previewProfile` + `previewAssessment`；3000 是主仓库 dev server，无登录会话所以只呈现空态。两者都是 `next dev`，不是生产构建。

### 3011 演示数据版 · 1440×900

- 命令：`oil_ui_shoot` → target `http://127.0.0.1:3011/report/initial`，selector `#initial-skill-match`，size `1440x900`。
- 工具结果：`"domHints":["检查通过：没有控制台错误、横向溢出或加载失败的图片"]`，`selectorMode: crop`。
- 截图：`tmp/skill-match-shots-verify/desktop-section.png`（1226×2250）。
- 读图判断：05「职业技能匹配」标题 + 「知识库原文 · 未核验」chip；说明文字「只标证据状态，不评分、不排序」；两个候选方向组（机器学习与计算机视觉 7 项、医学影像工程 6 项）；每行 = 状态 chip + 技能名 + 右侧「必备/加分 · 分类」+「原文与记录」折叠；组尾汇总「7 项要求：2 项有记录 / 1 项仅自述 / 4 项信息不足」；末尾脚注含「『信息不足』也不等于不具备」。

### 3011 演示数据版 · 390×844

- 工具结果：`"domHints":["检查通过：没有控制台错误、横向溢出或加载失败的图片"]`。
- 截图：`tmp/skill-match-shots-verify/mobile-section.png`（324×3241）。
- 读图判断：单列；状态 chip 与技能名第一行，必备/加分与分类换到第二行；折叠仍在技能名下方；无横向溢出。

### 3011 · 原文折叠展开（可交互）

- 命令：target 带 `#initial-skill-match`，steps `wait 3000; click text=原文与记录; wait 800`，size 1440×900。
- 工具结果：`"domHints":["检查通过：没有控制台错误、横向溢出或加载失败的图片"]`。
- 截图：`tmp/skill-match-shots-verify/desktop-fold-open6.png`。
- 读图判断：折叠可展开，显示 `…3、熟悉Matlab/Python/Tensorflow/PyTorch/C/C++中至少一项开发工具的使用（深圳迈瑞生物医疗电子股份有限公司）`、record id `ml-cv-mindray-recruitment`、画像记录 `user_profile.courses[0]`/`user_profile.tech_skills[0]`。
- 失败尝试如实记录：直接 `click .rp-skillmatch-kb summary` 被入场动效/遮挡拦截，`nth=2` 时报 opacity:0；改 URL hash + wait 后成功。判断为自动化时序问题，未在真实手机复测。

### 3000 主仓库 · 真实空态 · 1440×900

- SSR 探针：`职业技能匹配 -> True`；空态原文「暂无：先完成职业兴趣问卷，才会出现候选职业。」出现 **1** 次；`initial-skill-match -> True`；「信息不足」不出现（符合无候选方向）。
- 截图：`tmp/skill-match-shots-verify/empty-3000-1440.png`（1226×167），可见 05 标题 + 「候选职业技能 · 暂无：先完成职业兴趣问卷，才会出现候选职业。」
- 工具结果：`"domHints":["检查通过：没有控制台错误、横向溢出或加载失败的图片"]`。
- 探针原文：`tmp/render-ssr-probes.txt`；工具返回原文摘录：`tmp/rendering-probes.md`。

### 渲染证据与主仓库的一致性

- `work/skill-match-preview/src/app/report/initial/report.tsx` 与主仓库同文件的 05 块 JSX 逐字一致（各 2974 字符，`identical: true`）。
- 预览副本与主仓库的 `src/lib/skill-match.ts`、`src/lib/skill-requirements.ts`、`src/app/report/report.css` 哈希完全一致。
- 预览副本的 `data/knowledge/skill-requirements.json` 与主仓库数据内容一致（仅 `generated_at` 不同）。
- 因此，**填充态渲染使用演示画像，但渲染的组件、样式与数据与主仓库当前版本一致**；未验证的是「真实访客从问卷到 R1 的数据链路」。

## 八、未做与未验证（单列，不写成通过）

1. **未执行 `npm run build`**：任务明确禁止（会抢 `.next`）。因此没有生产构建/生产包渲染证据，只有 `next dev` 证据。
2. **未做真实登录访客端到端**：Supabase 会话/环境与真实用户数据不在本次授权范围；3000 只验证空态，3011 只验证硬编码演示画像。「用户完成 Mini-IP → 保存画像 → R1 05 块」的真实链路未端到端验证。
3. **未调用真实 LLM 生成报告**：`LIMEN_ENABLE_LLM` 未开、无真实 Key；`src/app/api/reports/route.ts` 的 AI 证据构造只做静态审阅 + tsc 校验，没有发出真实 POST/LLM 请求。
4. **未在非 Chromium 浏览器验证**（Safari/Firefox/真实手机）。
5. **未做移动端折叠点击实测**（只在桌面 Chromium 验证折叠可展开）。
6. **未做读屏/键盘可达性专项测试**（`<details>/<summary>` 为原生可访问元素，但未实测）。
7. **未验证 R2 页面上的 `skill` 证据标签运行时表现**（只确认 `profile-report.tsx` / `ai-report.tsx` 有对应 label）。
8. **未验证真实数据规模下的性能**（当前数据 10 方向 / 61 项 / 62 条，渲染无性能问题迹象，但未做大列表压测）。
9. **`npm test` 的 1 项失败为既有问题**（`normalizeSourceUrl` 允许 http 公网 URL），按任务要求不修复、不作为本次回归项。
10. **coverage_note 的 3 条轻微发现未修复**（任务禁止修改 data/docs），仅报告。

## 九、风险与文档不一致（未修复，供 lead 判断）

1. `clinical_data.coverage_note` 提到「科研助理招聘原文」，但本方向 evidence 没有任何科研助理 record；第三条来源实为浙大一院数据工程师（第四节）。
2. `medicine.coverage_note` 称「只有培养目标与规培制度原文」，实际含 1 条北京协和医院科研博士后招收简章（recruitment，且该条 requirement 标 `plus`，原文为硬性入站条件）；`docs/KNOWLEDGE_BASE.md` 已写「培养目标与规培/博士后原文」，与 data 的 coverage_note 不一致。
3. 别名匹配较粗：中文别名（如「影像」「统计」「研究」「文献」）会命中课程名/自由文本，preview 中「医学影像学」课程使「成像与影像物理背景」判为「有记录」。这与「名称匹配只整理证据、不代表掌握」的声明一致，但「有记录」偏宽，建议后续人工复核或收窄别名。
4. 省略号标记误标（第二节末）：32/41 条 `ellipsis_start`、1/13 条 `ellipsis_end` 在子句边界仍显示「…」，属显示层 cosmetics。
5. `occupation_skills` 字段始终存在、无候选时为 `[]`，与「只在有候选方向时输出」的字面表述不同；实际行为、UI 空态与契约测试一致，无功能影响。
6. 3011 预览副本不是主仓库运行时；虽然组件/样式/数据已比对一致，但演示画像为硬编码，不能替代真实端到端验收。

## 十、交付物与证据文件

| 文件 | 说明 |
| --- | --- |
| `docs/testing/skill-match-20261024.md` | 本文 |
| `docs/testing/skill-match-20261024.json` | 机读复核记录（三态/PASS） |
| `tmp/verify-skill-quotes.cjs` | 复核员自写的独立原文回查脚本 |
| `tmp/verify-skill-quotes.log` / `tmp/verify-skill-quotes-v2.log` | 回查日志（62/62，失败 0） |
| `tmp/tsc.log` / `tmp/eslint.log` / `tmp/npm-test.log` | 命令日志（tsc/eslint 为空，test 见失败明细） |
| `tmp/build-skill-requirements.log` | 构建脚本输出 |
| `tmp/skill-requirements.before.json` / `.after.json` | 构建前后数据快照（用于证明仅 `generated_at` 变化并恢复） |
| `tmp/skill-quotes-readable.txt` | 62 条 quote 的人读清单（含状态、分类、来源机构） |
| `tmp/evidence-records.txt` | 每条 evidence 对应的 record 标题 / 类别 / 来源标题 |
| `tmp/render-ssr-probes.txt` / `tmp/rendering-probes.md` | 渲染与 SSR 探针原始记录 |
| `tmp/skill-match-shots-verify/*.png` | 4 张实测截图（桌面/移动/空态/折叠展开） |

## 十一、复核环境

- 时间：2026-10-24T21:18:41-07:00（America/Los_Angeles）= 2026-10-25T04:18:41Z
- Node：v25.9.0；项目：`limen`（Next.js 16.4.2、TypeScript strict、zod 4）
- dev server（复核期间未重启/关闭）：`http://127.0.0.1:3011`（预览副本，演示数据）、`http://127.0.0.1:3000`（主仓库，空态）
- 数据文件最终状态：`data/knowledge/skill-requirements.json` SHA256 = `633BC2F26D951A935D0B7AE0C2141E492C87F084F7F01655FB5584F68850034D`（与复核前一致）
- 复核期间未修改 `src/`、`data/`（除构建脚本运行后被还原）、`tests/`、`scripts/`、`docs/` 其他文件；未执行 git checkout/restore 他人改动；未 build。

## 十二、修复后复验（2026-10-24）

> 触发：lead 通知已修复上一轮报告的 3 条 coverage_note 措辞问题与省略号误标。本节只记录修复后的实际复验命令与输出；第一至十一节保留为修复前记录，不覆盖、不追改。
> 复验时间：2026-10-24T21:28:15-07:00（America/Los_Angeles）= 2026-10-25T04:28:15Z。

### 12.1 实际改了什么（复核员独立 diff，非复述 lead 说法）

用 `tmp/diff-skill-requirements-after-fix.cjs` 对比修复前快照 `tmp/skill-requirements.before.json` 与当前数据，共 **38 处结构差异**，全部为预期改动：

| 类别 | 数量 | 说明 |
| --- | --- | --- |
| `generated_at` | 1 | 2026-10-25T03:35:13.415Z → 2026-10-25T04:22:24.742Z |
| `ellipsis_start` true→false | 32 | 41 → 9（与 lead 说明一致） |
| `ellipsis_end` true→false | 1 | `health_systems/virtualization_ops`；13 → 12 |
| `coverage_note` | 3 | `clinical_data` / `medicine` / `imaging_eng` |
| 技能名 | 1 | `medicine/research_output`：「论文与科研成果要求」→「论文与科研成果（博士后等科研路径）」 |
| **quote / needle / quote_start / quote_end / record 等** | **0** | 引用本体未被修复动作改动（本次复验最关键） |

修复后文本（当前数据实测）：

- `clinical_data`：`来自泰格统计岗、瑞金医院与浙大一院数据治理岗的招聘原文；数据治理与 ETL 条目来自医院数据工程师岗位，不是所有统计岗都要求。`
- `medicine`：`知识库里没有临床医师的招聘技能清单：技能条目来自石河子大学临床医学培养目标、住院医师规范化培训原文，以及北京协和医院 2026 年科研博士后招收简章（论文要求只对博士后等科研路径成立，不是所有临床岗位的统一门槛）。覆盖偏弱。`
- `imaging_eng`：`来自迈瑞医学影像算法岗位与联影超声图像算法岗的招聘原文；成像物理条目来自迈瑞岗位对光学成像系统等经验的要求，不是所有影像岗位统一要求。`
- spec 与生成数据一致：上述 3 条 coverage_note 与 medicine 技能名在 `data/knowledge/skill-requirements.spec.json` 中已同步；spec 仍只写 `record/field/needle`，10 方向 / 61 项 / 62 条。

### 12.2 命令与输出（修复后）

1. `node tmp/verify-skill-quotes.cjs`（自写独立回查，`VERIFY_EXIT=0`）：

```
扫描 96 个 *.collected.json，索引 1040 个 record id。
{ "directions": 10, "skills": 61, "evidence": 62, "matched": 62, ... "failure_count": 0, "warning_count": 0 }
PASS: 所有 evidence 的 quote 都能以 fact.value.slice(quote_start, quote_end) 逐字回查，且包含 needle。
```

仍是 **62/62、失败 0、警告 0**；修复后数据文件 SHA256 = `A816A3FABABCC2D1F398F03F8CC9ADD0D38FCB50BABFB8F53A9B1713A60AFB05`（修复前 `633BC2F2…`）。日志：`tmp/verify-skill-quotes-after-fix.log`。

2. `node tmp/audit-ellipsis.cjs`（自写省略号标记独立审计，`AUDIT_EXIT=0`）：

```
证据总数 62
ellipsis_start=true: 9
ellipsis_end=true: 12
独立判定不一致（应为 0）: 0
```

9 条 `ellipsis_start` 全部是真正的句中截断（例如 `模式识|别、数据挖掘…`、`政治立|场坚定…`），不再有「；」「。」后误标；12 条 `ellipsis_end` 也都在句中被窗口截断（后文非句末标点）。日志：`tmp/audit-ellipsis-after-fix.log`。

3. `npx tsc --noEmit`：**首次复跑 exit 2，重跑 exit 0**，如实记录两次：

```
第一次（tmp/tsc-after-fix.log）：
src/lib/community.ts(60,38): error TS2345: Argument of type 'string' is not assignable to parameter of type '"数学基础" | ... | "选择与心态"'.
TSC_EXIT=2
重跑（tmp/tsc-after-fix-retry.log）：TSC_RETRY_EXIT=0（空输出）
```

`src/lib/community.ts` 不在本任务文件清单内，`git status` 显示 `M`，mtime 为 2026-10-24 21:26:51（另一线程正在编辑），判断为并发写入导致的瞬时错误；技能匹配相关文件无类型错误，重跑通过。

4. 目标 11 文件 eslint `--max-warnings=0`：`ESLINT_EXIT=0`，输出为空（`tmp/eslint-after-fix.log`，0 字节）。

5. `npm test`（`TEST_EXIT=1`）：`ℹ tests 206 / pass 205 / fail 1`，唯一失败仍是既有 `tests/knowledge.test.ts:23` 的 `normalizeSourceUrl` 用例（`AssertionError: Missing expected exception`），与本次修复无关。日志：`tmp/npm-test-after-fix.log`。

### 12.3 结论

**PASS。** 上一轮报告的 4 个相关发现（`clinical_data` 来源含「科研助理」、`medicine` 称「只有培养/规培」却含博士后招收简章且技能名过宽、`imaging_eng`「同一岗位」歧义、省略号误标）均已修复并复验：

- 引用真实性：62/62 逐字回查、失败 0（quote/offset/record 未被修复动作改动）。
- 覆盖文案：3 条 coverage_note 与 evidence 来源一致；`medicine` 明确「论文要求只对博士后等科研路径成立」；`signals`/`med_nlp_kg` 的薄弱说明未变。
- 省略号：41→9、13→12，独立审计 0 处误标。
- 红线与契约行为未受修复影响（无评分/排序字段、空态、`unknown` 语义、契约字段均未改动）。
- 遗留极轻微措辞（不影响来源真实性）：`clinical_data` 新文案把「浙大一院」与「数据治理岗」连读时，浙大一院实际是数据工程师岗（瑞金才是数据治理工程师）；后半句已说明「数据治理与 ETL 条目来自医院数据工程师岗位」。未修复，记录备查。
- 复验期间仍未执行 `npm run build`、未调用真实 LLM、未做真实登录访客端到端（原因同第八节）。
