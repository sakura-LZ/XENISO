# LIMEN 续建交接（2026-10-21，优先于旧进度历史）

## 新版正式发布覆盖（2026-10-22）

GitHub `main` 应用提交 `49910b7`；Vercel `xeniso` 部署 `dpl_9VpCUquLMayc2to4JERQjkyhybPm` 已 promote，https://xeniso-platform.vercel.app 已切换并核验 READY。Production 四组人物配置已同步。下文旧“仅Preview/未部署/正式域名旧版”均为历史。测试、原网络失败与合成账号清理见 [发布记录](testing/xeniso-release-20261022.md)。未重迁移数据库，音视频/OTP仍未验收。

## 最新部署交接（2026-10-22）

功能已发独立Preview：https://limen-br99jfa0q-sakura-lzs-projects.vercel.app ，READY；四组数字人配置只补Preview，原正式域名/Production配置保持原版。知识库/E1/Match不再仅本机，尚未推广Production。绿色HTML未发布或整合；UI后续在同项目接已有API。共享Supabase，无新迁移/导入。lint、130单测、云端build、30项线上检查通过，合成访客已删除；未重测LLM/O*NET真实生成、供应商音视频或OTP。见[验收](testing/backend-preview.latest.md)与[后续接入](BACKEND_PREVIEW_HANDOFF.md)。

## 最新数字人交接（2026-10-22）

用户最新分配覆盖旧记录：新医生用MEDICINE→医学带教；原医学男性应用复制至INFORMATICS→医学信息学；器械/产品用ENGINEERING；AI/计算机用COMPUTING。四组本机均已配置，医学AI产品经理模板仍特例走器械/产品。原APP对保留做医学v1/v2历史claim清理，无迁移；未释放会话时不可删除对应配置。密钥只在server-side env。

用户明确要求自我介绍使用相应场景职业，不再自称豆包。`src/lib/avatar-dialogue.ts`统一开场/任务切换/每次文字问答；不得改回仅一次性弱人设，也不虚构真人执业身份。通过普通ask增强，系统人设接口尚未核实。此要求已写入源码、部署说明和协作记录；本轮验收 [testing/avatar-identities.latest.md](testing/avatar-identities.latest.md)，新预览3196（`work/avatar-identities/build-app`），不动旧预览。

最新130/130顺序单测、43 mock、lint/当前源码strict tsc/隔离build/51客户端扫描/5 smoke通过。医生及信息学开场/身份追问真实通过，无豆包自称，结束后active_session为空。根tsc扫入另一任务work旧副本失败已在验收记录区分。上一轮器械/计算机连接证据仍见 [testing/avatar-presenters.latest.md](testing/avatar-presenters.latest.md)，不作为本轮身份重验。3001/3193/3195保持；未部署、未改知识库和远端schema。E2/E3与全局入口仍另行推进。

## 最新知识库交接：九方向与医学扩充

入口 [KNOWLEDGE_BASE.md](KNOWLEDGE_BASE.md)、[本轮验收](testing/knowledge-expansion.latest.md)、[质量矩阵](testing/knowledge-expansion-quality.latest.json)。真实Supabase38来源127资料270事实，context迁移004已应用；pilot8保持独立，扩充119。九方向五类均有入口，医学平行路径含51目录/8详细科室；不等于全国完整、完整执业要求或个人资格。127tests、lint/tsc/build/51密钥文件、DB32/检索21/HTTP22/smoke5通过；真实模型本轮AI_NETWORK失败，未部署应用。

预览3192，隔离构建 `work/knowledge-expansion/build-app`，当前资料与源码副本一致，原3001/3187勿停。原文、导入SQL被Git忽略，管理者分批导入后有数据库SHA复验；切勿将7.6MB全量SQL再次一次提交触发413。PDF页标/章程导航误命中已修复并加实质规则测试。用户已统一授权公开站点访问下载，无需重复问下载确认。下一轮优先多校当年院系细则、不同企业岗位、医学逐科室招聘/执业规培证据；Match/数字人下一阶段另行推进。

## 最新交接：多方向体验 E1

本机实现10个方向、14个基础模板、项目/面试28条路径。医学首批按内科学、外科学、妇产科学、儿科学组织；医院带教岗位名与招生学科分开，具体代码按当年院校目录核验。模板选择与三次操作产生计算结果/结构清单，支持复盘、暂停恢复与导出，legacy/V2继续读取。实际验收见 [testing/multi-experience-E1.latest.md](testing/multi-experience-E1.latest.md)。

用户数据库工作并行，本聊天未执行迁移、未部署、未新增提供方；复用现有单行 `experiences` 与V3 JSONB，契约见 [EXPERIENCE_E1_CONTRACT.md](EXPERIENCE_E1_CONTRACT.md)。不要重复执行旧迁移、覆盖其他任务或停止3001。动态生成/实例历史(E2)和经许可的数字人成果同步(E3)未实现；本轮模板不等于实时生成身份/形象。后续按用户阶段指示扩展。

新增交接：医学AI产品经理中国知识库试点已真实入库7来源8记录，五类齐全。入口 `docs/KNOWLEDGE_BASE.md`、`docs/testing/knowledge-pilot.latest.md`。新API `/api/knowledge` 默认CN，R1/R2生成时读取Supabase核验证据；新应用代码未部署云端，既有UI不变。所有采集/匹配未知值保持未知，Match通过独立适配器衔接。禁止将本轮真实模型引用片段验收当完整用户主线重验；当前源码全量build和77tests通过，3001预览已恢复。

## 当前交接覆盖层 · V4 核心主线已实测

部署覆盖补充：用户已明确授权 Vercel 生产部署及八项服务端提供方配置写入 Production/Preview。已上线 https://limen-azure.vercel.app ，项目 `sakura-lzs-projects/limen`，状态 READY；数字人云端文字连接与结束实测通过。此授权覆盖历史正文中的“禁止生产部署”，不授权付费升级或其他项目变更。详见 `testing/VERCEL-cloud.latest.md` 与 `CURRENT_STATUS.md`。

以下为当前有效摘要；后文保留历史交接语境，不能以旧“干净工作区”“旧工作台已验收”“AI未配置”或旧Goal状态判断本轮现状。用户当前已授权持续完善项目、继续修改 UI，并移除旧工作台。当前运行目标与实际进展由主代理维护，不从历史工具状态推断。

- 首读 [CURRENT_STATUS.md](CURRENT_STATUS.md)、根 [CLAUDE_COORDINATION.md](../CLAUDE_COORDINATION.md) 与 [V4_PRODUCT_DESIGN.md](V4_PRODUCT_DESIGN.md)，再打开目标文件。工作区有多批未提交改动，禁止整文件回滚或同时构建/停止服务。
- 当前主线：画像 → 官方测评 → R1 → `/experience` 项目/面试三阶段体验 → 目标及周预算 → R2。方向手册独立；社区为登录后匿名发布。`/studio/ecg` 仅重定向，不恢复旧 UI。
- 本轮已修复画像选项/说明、重复开发文案、R2 三阶段成果证据、旧报告新鲜度与 R1 过期更新入口、服务端 Auth SDK session 恢复等代码问题。关键接口、隐私边界与旧数据兼容保留。
- 最新主线已通过隔离合成访客实测；最新 `npm run lint`、45/45 单测、TypeScript、生产构建和 47 文件客户端密钥扫描通过。七个关键路由已做三尺寸检查。数字人文字会话与社区迁移/合成权限有单独实测记录；麦克风/ASR、社区 OTP 邮件仍未验证。
- [testing/UI-flow.latest.md](testing/UI-flow.latest.md) 是旧 ECG 版本的一位合成访客完整验收证据，不能用于证明 V4 新体验/新版 UI 已通过。P0 合成探针仍是独立证据。
- 社区、数字人具体开放项和本轮改动见 [ISSUES.md](ISSUES.md)。后续每部分完成追加协作记录，实测后更新当前摘要；不复述凭据、不输出环境文件。

---

## 历史交接正文（保留追溯，现状以上方为准）

工作目录：`D:\医学生跨考平台\limen_project_files`；项目ID：`14dbbba7-47ae-4331-b8bb-ac4fbd5acb04`。
代码与真实联通基线：`d5ac8d4`；交接文档提交见`git log -1`。创建交接前工作区干净。

## 1. 最小阅读与授权

1. 先检查同目录是否有真实并发写入，读取根`AGENTS.md`、`README_FIRST.md`、本文件、`docs/PROGRESS.md`顶部状态和`git status --short`。
2. 读`docs/01_BUILD_PLAN.md`，只打开当前任务规格/源文件；不要重读完整聊天、整份PROGRESS历史、全部JSON或扫描node_modules/.next。
3. 用户已授权自主续建P0→P5，不等待逐阶段确认；常规修复、依赖、本地命令、测试和Git提交可自主进行。外部阻塞记录后继续独立任务。
4. 禁止付费、远程推送、生产部署、泄露Key、伪造结果/招生信息。需要人工处理的边界停止相关操作，不重复索要权限或密钥。
5. 用户明确要求换新对话续建；粘贴本项目启动提示词的新对话成为主开发对话。旧对话不再主动开发，不把历史“旧对话唯一主开发”的授权当作阻止移交的理由。

## 2. 历史基线（已被当前摘要更新，不作现状判断）

优先读[`CURRENT_STATUS.md`](CURRENT_STATUS.md)和`docs/testing/P0-live.latest.json`；本节原始摘要和后文带日期历史可能滞后。当前 P0 合成探针已通过，Supabase 匿名身份/RLS已实际验收，不能沿用本节历史中的关闭/未迁移状态。

| 范围 | 已完成 | 未验收 |
|---|---|---|
| P0 | O*NET四端点真实200；Supabase settings真实200 | Supabase匿名Auth、四表迁移/RLS/删除 |
| P1 | 多步画像、CSV/XLSX本地解析、30题分页与独立中文初译 | 当前访客真实保存/恢复及个人官方计分链路 |
| P2 | 三大九细分手册、双方向对比、R1规则证据与官方结果适配 | 真实个人R1、AI解释 |
| P3 | 一个可操作工作台：阈值/设备/取舍改变结果、反思、导出恢复；本地验收通过 | 本人体验云保存 |
| P4 | R2三升学路径任务、四阶段、课程依赖、预算、最多两个备选、成果导出 | 真实R1→体验→R2与AI |
| P5 | 响应式、隐私/删除入口、错误状态、测试和部署准备文档 | 真实完整主线及公开服务前条件 |

技术：Next.js16.4.2 App Router、React19、TypeScript strict、Tailwind4、Supabase、zod；Webpack构建。
这是一款医学生探索/规划工具，不判断天赋或录取概率；允许继续医学。招生库为空，显示待核验任务即可。

## 3. 历史凭据配置与旧阻塞（现状见 CURRENT_STATUS.md）

- `.env.local`已存在且被Git忽略。只在服务端使用`ONET_API_KEY`、`SUPABASE_URL`、`SUPABASE_ANON_KEY`；后者实际存publishable key。不改NEXT_PUBLIC，不用service_role，不打印文件或值。
- 用户已更换O*NET Key。新Key的`/about/`、`questions_30`、`results`、`careers`全部200：30题/30个合成答案/六维6/当前职业页20/总数923，API2.0.0、O*NET31.0。此前403属于旧配置历史，**不要继续声称当前Key不可用**。
- 官方计分探针不是用户测评，未灌入私有报告；原文/题号/维度/版本/答案码保持关联，中文仍为待人工复核独立译稿。
- Supabase公开设置`external.anonymous_users=false`；四表REST请求均404/PGRST205（schema缓存不可见）。未执行迁移，未创建探针身份，未验证RLS。
- `LLM_BASE_URL`、`LLM_MODEL`、`LLM_API_KEY`未配置，`LIMEN_ENABLE_LLM`关闭；不能把规则草案称为已生成AI报告，不擅自启用收费调用。
- 优先用已配置的云端Supabase。Docker缺启动ISO且官方下载中断，**修复Docker已不是必要前置**。

## 4. 当前交接补充与历史下一步

本轮合成访客已通过UI走完画像→官方测评→R1→工作台→R2及实际下载，详情见 testing/UI-flow.latest.md。AI仍有外部超时与语义局限；不要重做已通过的迁移或沿用下方未验收结论。优先改善AI可靠性并复核中文译稿/招生来源，不擅自部署。下方保留旧步骤供历史定位。

1. 对Supabase做改动前先核对最新`testing/Supabase-connectivity.latest.json`，避免重复执行已经验收的迁移。
2. 已完成的合成P0验收见`testing/P0-live.latest.json`。仅当服务状态确有变化时重跑`npm run verify:p0`；清理失败必须记录，禁止假报通过。
3. 继续逐项实测真实访客画像→官方问卷→R1→保存体验→R2。不得把P0合成计分写成用户个人结果；AI生成后逐条核对证据。
4. 每个实质里程碑更新`CURRENT_STATUS.md`与PROGRESS最新记录，保存脱敏实际结果；完成相应测试后本地提交。仅所有阶段与完整主线实际通过、无关键错误才标Goal完成。

## 5. 按需文件索引

| 当前任务 | 只读相关文件 |
|---|---|
| Supabase/P0 | `docs/03_ONET_AND_DATA.md`、`docs/LOCAL_SETUP.md`、`scripts/verify-p0.ts`、三份migration、`src/lib/server/supabase.ts`、`src/app/api/session/route.ts` |
| 画像/测评 | `src/lib/profile.ts`、`src/lib/assessment.ts`、`src/lib/onet/`、`src/app/profile/`、`src/app/assessment/` |
| R1/R2/AI | `docs/05_REPORT_ENGINE.md`、`data/report_contract.json`、`src/lib/reports.ts`、`src/lib/planning.ts`、`src/lib/ai.ts`、`src/app/api/reports/route.ts`、`src/components/ai-report.tsx` |
| 体验/UI | `docs/04_EXPERIENCE.md`、`docs/02_UI_SPEC.md`、`src/lib/experience.ts`、`src/app/studio/ecg/` |

R2规则v3显式保存本次年份/路径/预算/备选；读取会校验上下文；证据快照随解释导出。不要回退成使用画像旧计划。
体验数据始终simulation，至少三次状态改变；不据此推断技术能力分数。

## 6. 已有证据与运行注意

- 最近代码版本：38/38单测、lint0警告、build含TypeScript通过、5项占位HTTP smoke、42客户端文件密钥扫描通过。24项布局/实际截图是先前UI里程碑证据，不是每次重跑。
- 最新`npm run verify:p0`退出1：O*NET PASS，Supabase FAIL，整体NOT ACCEPTED。见`docs/testing/P0-live.latest.json`。
- 新配置细节：`ONET-connectivity.latest.json`、`Supabase-connectivity.latest.json`、`configured-preview.latest.json`（均在docs/testing，无Key）。详细历史仅必要时读`LOCAL-acceptance.md`或PROGRESS尾部。
- 3001曾运行真实配置预览，启动前先确认服务是否仍在；不要重复开或杀未知进程。构建与dev/start共用.next，重建前只停止确认属于本项目的服务，完成后恢复。
- `npm run test:smoke`只用于**独立占位配置服务**，预期缺凭据503；不能直接对已配置真实Key的3001套用该测试。
- 代码改动运行相应测试、lint/build；只改文档不重跑全套。源码查找用rg，限制工具输出；不变的绿色检查无需反复跑。
- Windows沙箱可能重定向LOCALAPPDATA，或对进程/网络返回EPERM/EACCES；区分沙箱限制与真实主机失败，用合法受审核执行路径验证，不能凭此断言服务坏了。

## 7. 对话、Goal和定时续建

- 旧对话ID：`01a15a01-03f2-7b23-a8ff-0e7067271980`，供必要时定向读摘要；不必导入全历史。
- 旧Goal最近工具状态为usageLimited，目标未达成；本次不标完成，也不假称Goal已转移。新对话的用户启动提示词可明确授权创建续建Goal。
- 既有自动任务`limen`／“LIMEN 自动续建”原为每6小时唤醒旧对话。为此次移交已通过工具设为**PAUSED**，名称、周期、原提示词保留。
- 新对话接管后，如工具支持，将同一自动任务改绑当前对话并恢复原周期；先核实绑定和并发情况。不能改绑则保持旧任务暂停并如实报告，不恢复旧绑定、不创建重复任务、不手改automation.toml冒充迁移。
- 新对话需持续维护本文件的“当前状态/下一步”，完整历史追加PROGRESS，避免交接摘要再次过时。
