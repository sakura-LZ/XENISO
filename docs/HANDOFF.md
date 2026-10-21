# LIMEN 续建交接（2026-10-21，优先于旧进度历史）

工作目录：`D:\医学生跨考平台\limen_project_files`；项目ID：`14dbbba7-47ae-4331-b8bb-ac4fbd5acb04`。
代码与真实联通基线：`d5ac8d4`；交接文档提交见`git log -1`。创建交接前工作区干净。

## 1. 最小阅读与授权

1. 先检查同目录是否有真实并发写入，读取根`AGENTS.md`、`README_FIRST.md`、本文件、`docs/PROGRESS.md`顶部状态和`git status --short`。
2. 读`docs/01_BUILD_PLAN.md`，只打开当前任务规格/源文件；不要重读完整聊天、整份PROGRESS历史、全部JSON或扫描node_modules/.next。
3. 用户已授权自主续建P0→P5，不等待逐阶段确认；常规修复、依赖、本地命令、测试和Git提交可自主进行。外部阻塞记录后继续独立任务。
4. 禁止付费、远程推送、生产部署、泄露Key、伪造结果/招生信息。需要人工处理的边界停止相关操作，不重复索要权限或密钥。
5. 用户明确要求换新对话续建；粘贴本项目启动提示词的新对话成为主开发对话。旧对话不再主动开发，不把历史“旧对话唯一主开发”的授权当作阻止移交的理由。

## 2. 当前真实状态（不要重新从零做）

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

## 3. 凭据和已解决的旧阻塞

- `.env.local`已存在且被Git忽略。只在服务端使用`ONET_API_KEY`、`SUPABASE_URL`、`SUPABASE_ANON_KEY`；后者实际存publishable key。不改NEXT_PUBLIC，不用service_role，不打印文件或值。
- 用户已更换O*NET Key。新Key的`/about/`、`questions_30`、`results`、`careers`全部200：30题/30个合成答案/六维6/当前职业页20/总数923，API2.0.0、O*NET31.0。此前403属于旧配置历史，**不要继续声称当前Key不可用**。
- 官方计分探针不是用户测评，未灌入私有报告；原文/题号/维度/版本/答案码保持关联，中文仍为待人工复核独立译稿。
- Supabase公开设置`external.anonymous_users=false`；四表REST请求均404/PGRST205（schema缓存不可见）。未执行迁移，未创建探针身份，未验证RLS。
- `LLM_BASE_URL`、`LLM_MODEL`、`LLM_API_KEY`未配置，`LIMEN_ENABLE_LLM`关闭；不能把规则草案称为已生成AI报告，不擅自启用收费调用。
- 优先用已配置的云端Supabase。Docker缺启动ISO且官方下载中断，**修复Docker已不是必要前置**。

## 4. 下一步，只按此优先级推进

1. 重新检查Supabase匿名开关和表是否已由用户配置；只记录状态，不输出Key。当前publishable key可访问应用API，不能管理Auth配置或执行SQL。
2. 在开发Supabase启用匿名登录并按顺序应用`supabase/migrations/202610200001_p0_profiles.sql`、`202610200002_assessments.sql`、`202610200003_experience_reports.sql`；保留RLS及本人删除RPC。
3. 通过受支持的已授权管理入口操作。旧Edge页面控制报`Debugger unattached`；新对话可新检查连接，若复现就记录实际阻塞，勿循环开标签/读取登录令牌/索取service_role绕过。受权限边界阻塞的动作如实留待处理。
4. 前置满足后跑`npm run verify:p0`：两个合成匿名身份，四表CRUD/隔离、刷新、本人删除及级联/令牌失效。脚本会清理探针；清理失败必须记录，禁止假报通过。
5. 逐项实测真实画像→官方问卷→R1→保存体验→R2。AI仅在有可用配置及允许的调用条件下生成并核对证据；其他独立修复继续做。
6. 每个实质里程碑更新PROGRESS、真实结果和局限，完成相应测试后本地提交。仅所有阶段与完整主线实际通过、无关键错误才标Goal完成。

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
