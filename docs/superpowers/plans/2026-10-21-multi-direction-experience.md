# 多专业数字人体验 Implementation Plan

> **For agentic workers:** 使用本机 `executing-plans` skill 按阶段实施。用户已授权E1并补充医学四学科；不需重复询问架构选择，E2/E3以用户后续指示为准。默认当前聊天内完成，不主动派生代理或新聊天。

**E1实施补充（2026-10-21）：** 当前为10方向、14模板、28条路径；医学按内科学、外科学、妇产科学、儿科学，另保留产品经理模板。采用 `getTemplate(direction, templateId?)`、`operationResult(templateId, choices, stage)` 和 `workbenchExperienceSchema`，固定fixture与计算绑定 `e1-1`。统一展示函数位于 `src/lib/experience.ts`，未为少量函数拆空模块；未实施独立生成器、run接口或历史表。当前交付见[验收](../../testing/multi-experience-E1.latest.md)与[契约](../../EXPERIENCE_E1_CONTRACT.md)。下方E2/E3保持未来设计。

**Goal:** 将单一产品经理场景扩展为九方向双模式工作台，支持受控生成新案例、经许可的数据联动、星云对话及 R2 成果引用。

**Architecture:** 模板限定任务与计算，已有 LLM 只生成允许变化的案例内容，Supabase 保存不可变场景快照和可修改进度。星云继续端到端 ask，任务状态由 LIMEN 控制，旧 experiences 表作为所选成果的报告桥接。

**Tech Stack:** Next.js App Router / React / TypeScript strict / Tailwind / zod / Supabase Postgres + Auth + RLS / 现有 LLM 与星云 SDK。

## Global Constraints

- 实现依据：[产品与技术设计](../../MULTI_DIRECTION_EXPERIENCE_DESIGN.md)。下文路径均相对项目根目录。
- 阶段式交付；先 E1，再由用户指示推进 E2、E3；每阶段提供运行代码、实际测试记录与局限。
- 不新增外部 API 供应商、付费依赖、多 Agent、向量数据库或执行用户/AI代码的服务。
- Key 只从 server-side env 读取，不输出环境值，不在浏览器透传 brain_config 密钥。
- 保留九方向 ID、O*NET 映射、旧 ECG/V2 读取、官方计分和 R1/R2 新鲜度。
- 数据一律 simulation；无来源内容标记编辑性教学设计，知识未覆盖/读取失败分别显示。
- 不将兴趣当能力，不伪造职业/招生事实、学习时长、性能、录取率。
- 不重置现有未提交改动、不停止未知服务；构建使用独立 distDir/隔离副本。
- 复选状态仅代表其明确范围；预期结果不能计为通过证据。E2/E3均未实施。

## 文件职责

| 文件 | 责任 |
|---|---|
| 新增 `src/lib/experience/templates.ts` | 九方向/角色/模式模板及白名单，引用既有方向目录 |
| 新增 `src/lib/experience/fixtures.ts`、`operations.ts` | 固定合成数据、已实现操作与纯计算；模型不得注入代码 |
| 新增 `src/lib/experience/scenario.ts`、`run.ts` | scenario-1、V3成果、状态转换与服务端复算规则 |
| 新增 `src/lib/experience/presentation.ts` | legacy/V2/V3阶段名、角色名、导出结构统一展示 |
| 新增 `src/app/experience/task-workbench.tsx` | 参数/分类/排序/结构操作渲染及即时反馈 |
| 修改 `src/lib/experience.ts` | 兼容出口、成果卡和证据适配；保留现有公开函数 |
| 修改 `src/app/experience/studio.tsx` | 选择、预览、任务、暂停/恢复、成果与私有历史 |
| 新增 `src/lib/server/experience-context.ts` | 白名单摘要、许可验证和星云同步内容构建 |
| 新增 `src/lib/server/scenario-generator.ts` | 独立模型生成schema与响应限制，不更改报告提示词 |
| 新增 `src/lib/server/experience-store.ts` | runs/幂等/乐观锁/限额/签名/选择桥接 |
| 新增 `src/app/api/experience/context/route.ts`、`runs/**/route.ts` | 设计约定的本人API；逐路径实现，不保留通配空文件 |
| 新增 `supabase/migrations/<当时下一个唯一版本>_experience_runs.sql` | 真实迁移前检查历史，创建私有表/RPC/索引/删除级联 |
| 修改 `src/components/avatar-panel.tsx` | 版本同步、同意范围、换场景销毁，保留既有生命周期 |
| 修改 `src/lib/reports.ts`、`report-freshness.ts`、`src/app/report/plan/report.tsx` | 动态职业文案、阶段展示及规范化成果指纹 |
| 修改 `src/app/api/reports/route.ts`、`src/app/api/experience/route.ts` | 兼容V3且按所选成果读取/保存；保持旧消费接口 |
| 修改 `src/app/account/page.tsx`、`.env.example` | 更新两类外发说明、内部签名变量名称；不写真实值 |
| 新增/修改 `tests/experience*.test.ts`、`tests/reports.test.ts`、`tests/ai.test.ts` | 计算、状态、兼容、隐私和故障回归 |
| 新增 `scripts/verify-experience-runs.ts` | 独立合成身份的持久存储/RLS/CAS/清理验证 |

## E1：十方向基础模板与可操作成果

### Task 1：契约、模板与可复现计算

**Consumes:** `directions`、`findDirection()`、现有 legacy/V2 schema。

**Produces:** `experienceTemplates`；`scenarioSchema`；`getTemplate(directionId, mode)`；`makeTemplateScenario(templateId, variantId)`；`applyOperation(scenario, operationState, input)`；`DynamicExperience`。

接口形状：

```ts
type ExperienceMode = "project" | "interview";
type OperationInput = {
  stage_id: string;
  operation_id: string;
  value: number | string | string[] | Record<string, string>;
};
// 具体值由模板对应的 zod schema 校验，不接受任意 operation_id。
// applyOperation 返回 { operationState, result, completedStageIds }。
```

- [x] 为14模板定义固定合成fixture、受限操作、阶段完成规则及结果单位；模板/fixture/计算统一绑定e1-1版本。
- [x] 实现strict schema，拒绝不存在方向、错误角色关联、未知参数、错误操作、额外指标与虚假来源；只运行程序内置计算，不执行文本中的代码或URL。
- [x] 实现28条项目/面试路径的纯计算与结构操作；面试须三次操作及文本，复用基础计算，独立面试案例待扩充。
- [x] 扩展现有 union 为 legacy/V2/V3，`experienceEvidence()` 继续排除 transcript 与个人摘要；不能只改方向下拉框。
- [x] 运行体验单测，涵盖无效阶段/未完成选择、确定性fixture、旧schema、阈值和零分母边界。

核心测试形状（fixture均须在测试中明确为simulation）：

```ts
test("simulation: all nine directions have two distinct operation paths", () => {
  for (const direction of directions) {
    for (const mode of ["project", "interview"] as const) {
      const template = getTemplate(direction.id, mode);
      assert.equal(template.direction_id, direction.id);
      assert.equal(template.stages.length, 3);
      assert.equal(new Set(template.stages.map(s => s.id)).size, 3);
    }
  }
});
// 另为每个方向给出操作前后具体预期值，不能只断言“对象不同”。
// 信号/影像选择固定尺寸教学数据，直接运行已实现算法，不请求模型计算。
```

### Task 2：工作台和动态成果展示

**Consumes:** Task 1 模板、操作输入及结果；`download()`；现有暂停/保存并发保护。

**Produces:** 九方向双模式工作台、`experiencePresentation(experience)`、JSON/Markdown成果导出。

- [x] 改造入口，方向与职业分开，保留产品经理可选模板，方向变化后显示对应任务而非同一分诊案例。
- [x] 新建任务组件，用受限选项配置参数/规则/流程，呈现指标、波形、像素与结构反馈；文本是补充成果。自由标注、拖拽排序等复杂控件待扩充。
- [x] 支持V3本机草稿和既有私有接口保存；保存失败不显示成功。V3真实云保存另列未验收，不将代码兼容计为外部集成通过。
- [x] 统一体验页和R2阶段标题/角色文案，不能继续把所有 outputs 标为PRD。
- [x] 修改前步清空依赖后续操作、撤下旧保存反馈并保留文本；保留保存锁及在途对话快照提示。
- [x] 完成医学/信号三尺寸巡检和28条路径本地逻辑集成；浏览器核对算法、信号、信息系统操作界面，另完成妇产科学与内科学项目、外科学面试入口和实际导出。全路径浏览器及真实云端检查不计入通过。
- [x] 执行E1门禁并记录 `docs/testing/multi-experience-E1.latest.md`；113项测试、lint、TypeScript、隔离build、51文件扫描、5组smoke通过。局限明确，E2/E3待用户下一阶段指示。

## E2：动态生成、许可与实例历史

### Task 3：摘要预览与受控模型生成

**Consumes:** Task 1模板、现有 profile/assessment/R1、`requiredEnv()`、知识库检索。

**Produces:** `buildGenerationContext()`、`preview_hash`、`requestScenario(config, input)`、`validateScenario(input, template, evidence)`。

- [ ] 实现默认无个人资料的预览；仅包含用户选定类别。预览后源字段改变须返回409，不能发送未预览的新内容。
- [ ] 新建生成器，复用现有LLM配置与开关，但独立提示和schema；限制输入24000字符、响应128KB、请求60秒。
- [ ] 输出只覆盖白名单文本与变体ID；方向/fixture/操作/指标定义均由模板恢复。验证只允许本次证据引用。
- [ ] 将 knowledge 的 available/not_covered/empty/unavailable 原样区分；无资料允许教学案例，不伪装检索成功。
- [ ] 复用 mock fetch 方式验证超时、非2xx、拒绝、截断、无效JSON、超大响应、错误引用、方向错配与提示注入；断言均不产生 llm_live 成果。
- [ ] 验证每次生成不传昵称、学校、成绩、完整问卷、完整R1、历史对话；用户资料变更不自动重生成已有场景。

隐私用例形状：

```ts
test("simulation: generation input excludes identity and unselected fields", () => {
  const context = buildGenerationContext({
    profile: { ...simulationProfile, nickname: "simulation identity",
      school: "simulation school", gpa: 3.9 },
    selection: { education: false, skills: false, interests: false, help: false },
  });
  const serialized = JSON.stringify(context);
  for (const excluded of ["simulation identity", "simulation school", "gpa", "research_projects"])
    assert.equal(serialized.includes(excluded), false);
});
```

### Task 4：Supabase实例、状态接口与历史

**Consumes:** scenario-1、生成输入哈希、当前匿名身份、既有会话删除链路。

**Produces:** 设计第7节全部runs接口与 context 接口、`experience_runs`表、原子保留/CAS/选择与删除RPC。

- [ ] 实施时确认迁移版本唯一；本地SQL审阅、dry-run后仅应用本阶段迁移，记录真实执行结果，不复制执行旧迁移。
- [ ] 创建实例表、owner RLS、账号删除级联、`(owner_id, request_id)`唯一键及有界分页；禁止越权更改owner与生成元数据。
- [ ] 在数据库事务中实现同用户1次/分钟和5次/小时、全局10次/分钟/并发5；来源计数和完成操作均原子，不能多实例各自放行。
- [ ] 用内部专用服务端签名密钥、场景哈希和受限RPC绑定不可变成果。capability原文不得存表、日志或返回客户端；签名验证失败拒绝读成真实生成成果。
- [ ] 创建接口状态为generating时返回202；同键同输入读取原实例，同键异输入409；超时失败必须由用户新键重试，不自动重发提供方请求。
- [ ] CAS更新后递增revision，冲突返回409；已删除/取消/租约到期实例拒绝迟到结果。PATCH不接受客户端计算出的metrics或completed状态。
- [ ] 串接暂停/恢复/历史/本人删除；恢复不重新调用LLM，基础模板与模型实例来源分别显示；本机失败草稿仍可导出。
- [ ] 使用两个全新合成身份验证本人CRUD、跨用户隔离、额度竞争、同键竞争、旧revision、签名篡改、迟到结果与账号级联清理；`finally`清理探针身份且记录是否成功。
- [ ] 三大类各生成一个真实合成案例，实际保存/刷新恢复，记录响应状态和非敏感元数据；外部失败照实记录。
- [ ] 执行E2门禁并记录 `docs/testing/multi-experience-E2.latest.md`；只记录通过范围，等待下一阶段指示。

## E3：数字人上下文与R2闭环

### Task 5：经许可的角色和成果同步

**Consumes:** 当前run/scene/stage/revision、星云专属许可、既有AvatarPanel生命周期。

**Produces:** `buildAvatarContext()`、`sync_key`、按提交同步的新角色体验。

- [ ] 增加星云独立共享选择与预览；生成用个人资料许可不自动转为星云许可，保存对话许可也保持独立。
- [ ] 从服务端返回有效的任务摘要；用户输入标为不可信数据，提示角色只能引用实际提交的操作结果。
- [ ] 同步键含run、scene hash、stage、revision、consent hash。等待回复结束只发最新版；未提交输入不发，离开页面仍销毁。
- [ ] 方向/模式/实例改变或撤销已发送个人摘要许可时结束旧会话；新会话从新许可范围重新开始，旧generation回调不得写入新字幕。
- [ ] 保留现有代理签名/会话归属/取消/打断/异常清理，不向浏览器开放密钥和brain_config。启动失败不阻止完成任务。
- [ ] 用mock事件核对回复中换步、连续提交、录音中换步、结束后迟到回调、关闭共享、重新连接等情况。
- [ ] 三大类各一个角色真实文字验收：不仅有回复，还需人工核对专业角色、当前阶段与实际操作引用；记录九角色未测项。麦克风/ASR/播报另记结果，不从文字测试推断。

### Task 6：选用成果、R2指纹和删除

**Consumes:** 完成的V3 outcome、既有experiences/reports、`experiencePresentation()`与证据适配。

**Produces:** selected completed run→experiences桥接、规范化成果指纹与R2导出。

- [ ] 实现“用于行动规划”动作，服务端校验本人且completed，同事务更新所选标记与experiences桥接；失败不能显示选用成功。
- [ ] 新run草稿与生成失败不覆盖旧桥接。修改已选成果撤下该选择的旧完成状态并使R2过期；编辑其他run不影响已选成果。
- [ ] 统一V3规范化指纹，只纳入方向、角色、场景、已提交操作、程序结果、成果与反思；查看时间、聊天和许可开关不改变指纹。legacy/V2沿用原指纹兼容策略。
- [ ] R2使用实际阶段名称，区分体验岗位与目标方向，保留原R1新鲜度检查；不传数字人对话/许可记录/摘要副本给报告模型。
- [ ] 删除选中run同事务清除桥接和对应R2；删除其他run不影响当前报告。账号删除先清理星云后级联所有个人记录。
- [ ] 验证两次不同方向成果选用、旧R2过期、删除、旧V2/ECG读取、新R2实际生成/导出与来源追溯；外部AI/星云测试使用隔离合成访客。
- [ ] 执行E3最终门禁，记录 `docs/testing/multi-experience-E3.latest.md`，更新CURRENT_STATUS/HANDOFF；部署与语音验收另列实际状态。

## 各阶段统一门禁

依赖本机现状确定独立构建目录；不得直接删除共享 `.next` 或停3001。实际命令及退出码写入阶段记录：

```text
npm run lint
npm test
npm run build                 # 在独立distDir或隔离副本中执行
npm run check:client-secrets
当前阶段专属HTTP/UI/存储集成检查
git diff --check -- <本阶段文件>
```

通过mock测试只证明本地逻辑；真实LLM、Supabase、星云与UI分别保留证据。不为文档设计重跑构建，不将预期命令写为执行成功。

## 原设计交付自审（历史范围）

- 九方向ID与现有目录一致，九方向双模式、三次操作及成果均有明确交付任务。
- 画像默认不外发、两提供方分别授权、撤回后清理会话和历史数据删除均有任务。
- 知识缺口、星云普通消息限制、语音未验收、收费调用失败边界已明确。
- 生成幂等/限流/CAS、刷新恢复、晚到响应、旧成果与R2兼容均有验收。
- 原设计交付时E1/E2/E3未执行；当前E1状态以上方实施补充和实际验收为准，E2/E3仍不提前勾选。

### 原设计轮实际检查（2026-10-21，保留追溯）

- PowerShell文档校验退出0：设计矩阵9个方向ID与现有目录完全一致；5个相对文档链接存在；E1/E2/E3齐全；42个实施检查项全部未勾选；无替换字符或占位标记。
- 定向 `git diff --check` 退出0；新增未跟踪文档另外检查尾随空白，不能只依赖Git差异检查。
- 仅设计文件和入口索引变化，未运行lint、单测、build、数据库迁移、外部模型或星云真实会话；这些不能记为本轮通过。
