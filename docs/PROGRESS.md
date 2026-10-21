# LIMEN 开发进度

更新时间：2026-10-20（America/Los_Angeles）

## 恢复入口

- 主对话：`01a15a01-03f2-7b23-a8ff-0e7067271980`。用户明确授权以此对话为准进行修改。
- 根目录已直接包含 V3 规格，无需 `LIMEN_Codex_V3/` 前缀。
- 当前阶段：P0 真实联调受阻；按用户授权继续 P1–P5 独立任务。问卷、方向库、R1/R2 规则草案、真实交互工作台已实现；不能将本地演示等同完整核心链路验收。
- 定时任务 `limen` / LIMEN 自动续建：每 6 小时续建本对话；不要创建同名重复任务。

| 阶段 | 状态 | 验收证据 |
| --- | --- | --- |
| P0 技术验证 | PARTIAL / BLOCKED | O*NET 最新真实请求仍 HTTP403；Supabase 无配置/本地 Docker engine 不可用 |
| P1 画像与测评 | PARTIAL / BLOCKED | 多步画像、CSV/XLSX、独立中文译稿与文档演示；真实保存/官方计分未验收 |
| P2 知识库与 R1 | PARTIAL / BLOCKED | 3/9 手册、双方向对比、证据引用规则草案；官方兴趣与 AI 未验收 |
| P3 职业体验 | LOCAL_ACCEPTANCE_PASS | 三次真实状态变化、数值重算、反思、下载恢复、390/820/1440px 布局通过；访客云保存仍待 Supabase 联调 |
| P4 R2 与规划 | PARTIAL / BLOCKED | 用户选方向、证据差距、依赖任务、预算与规则草案；正式 AI R2 未验收 |
| P5 集成与部署准备 | PARTIAL / BLOCKED | 28 项单测/lint/build 通过，本地 HTTP 与响应式已检查；真实全链路和截图视觉验收未完成 |

## 初始检查（历史记录，后续已初始化 Git 与配置 O*NET）

- `git status --short`：失败，目录尚不是 Git 仓库。
- Node `v25.9.0`、npm `11.16.0`、Git `2.54.0.windows.1` 可用。
- 仅检查环境变量是否存在：所需 O*NET / Supabase 均未设置，无 `.env.local`。未打印任何 key。
- `npm view next version --fetch-retries=0 --fetch-timeout=15000`：sandbox 网络 DNS ENOTFOUND，正在审核网络执行路径。

## 阻塞与下一步

- 编写并验证不依赖凭据的 P0 部分；记录实际 lint/build/测试结果。
- 由用户在本地 `.env.local` 配置轮换后的 O*NET key、Supabase 开发项目 URL 与 anon/publishable key，启用匿名 Auth，并执行 P0 migration 后再跑真实验收。
- 在真实验收通过前，不标记 P0 完成；依用户最新授权可继续独立 P1 工作，不标记 Goal 完成。

## 2026-10-20 P0 本地实现记录

- 已建立 Next.js 16.4.2 / TypeScript strict / Tailwind 应用，`/`、`/setup` 与 session/profile/onet API；匿名会话 HttpOnly cookie、固定官方主机、超时、输入验证、封闭入口限流、无缓存私有响应。
- 已提供 `supabase/migrations/202610200001_p0_profiles.sql`：本人资料 CRUD RLS 与仅删除本人的账户 RPC；尚未执行到真实数据库。
- `npm test`：8/8 通过，所有 fixture 标记 mock=true，不构成真实 API 验收。
- `npm run lint`：最终通过，0 警告。首次匿名默认导出警告已修复。
- `npm run build`：最终以 Webpack 完整构建通过，包含 TypeScript、页面生成与路由清单；先前 Turbopack 子进程崩溃、隐式 any、sandbox EPERM 的失败均已记录并修复/换用可执行路径，未跳过类型检查。
- `npm run verify:p0`：真实执行，退出 1。用户提供凭据已从其截图在本地 OCR 提取到被忽略的 `.env.local`，未在命令或日志中回显。O*NET `/about/` 返回 HTTP 403；有/无凭据两种请求、Node 与系统 curl 均返回同样 nginx 403 HTML，无法据此认定凭据无效。后续题目/计分请求尚未执行。
- Supabase live：BLOCKED，缺少配置，没有创建测试用户；Docker CLI 已安装，尝试启动现有 Docker Desktop 后 Linux engine pipe 仍不存在，尚不能用本地 Supabase 代替云端验收。
- 安装局限：Next 自带 React lint 插件 peer 范围尚不支持 ESLint 10，故固定兼容的 ESLint 9.39.5；npm 对该版本有 deprecated 提示。npm 还提示 esbuild/unrs-resolver 安装脚本未获 allowScripts；现有单测、lint、Webpack 构建已实际运行，未默认放开第三方安装脚本。
- `next dev` 曾自动追加根 AGENTS 规则，已通过 `agentRules:false` 禁用并恢复原始项目规则。
- 本机 HTTP 冒烟正在独立的 3001 端口执行，使用占位配置，不修改真实凭据。

## 最新执行约束（覆盖先前等待阶段指示）

- 用户明确要求本对话为主、自主修复、不要提问、默认继续；一个模块受阻时继续其他可独立完成任务。
- 因此 P1 的独立部分可先推进，但不得把 P0 标记通过或把缺少官方计分的报告当作正式结果。
- 不再索取权限/密钥；外部服务不可达时记录阻塞继续独立实现。原禁止付费、推送、生产部署规则保持有效。

## 2026-10-20 独立模块里程碑

- 已有本地检查点提交：`8dc2d4d`，明确标为 P0/P1 工作检查点，并非阶段验收通过。
- 修改：`src/app/profile/`、`src/components/transcript-preview.tsx`、`src/lib/profile.ts`、`src/lib/transcript.ts`：完整结构化画像，空 GPA/论文可继续；CSV/XLSX 仅浏览器解析、必要字段预览纠错。真实资料不进本机演示存储；simulation 草稿显式标记。
- 修改：`src/app/assessment/`、`src/lib/onet/translation.ts`、`src/app/api/onet/results/`、`src/app/api/assessment/`、`src/lib/assessment.ts`：30 题分页、进度、错误处理；2016 官方文档附录 A 快照与待人工复核中文译稿独立管理。文档模式不提交官方计分、不捏造 RIASEC。真实结果保存原始 answers、版本、题目快照、返回时间与职业页；测评表迁移尚未执行。
- 修改：`src/app/explore/`、`src/lib/directions.ts`：三大九细分目录、来源链接、最多两方向对比。
- 修改：`src/app/report/`、`src/lib/reports.ts`、`src/components/evidence-table.tsx`：R1/R2 分离，规则草案；技能原始引用、未知项、目录之外职业、课程任务依赖、主观备选、本人计划参数与预算、招生为空待核验。AI 未生成，不称正式 AI 报告。
- 修改：`src/app/studio/ecg/`、`src/lib/experience.ts`：100 条固定种子合成数据、实时阈值、设备验证、工程取舍、反思、导出与恢复；数据始终 simulation。
- 修改：首页、全局导航、账号删除页、CSS、`.gitattributes`；统一学术白蓝灰与触摸/减少动态效果支持。
- `npm test`：22/22 通过。首次新增证据索引测试 21/22，发现先过滤后编号偏移，已修正为保留原始数组位置并重跑通过。
- `npm run lint`：0 警告通过。
- `npm run build`：新增全部路由完整构建与类型检查通过。初次 `tsc` 发现 read-excel-file v9 返回多 sheet，已改用 `readSheet(file,1)`；未强制类型转换隐藏问题。
- 浏览器真实操作（本机 3000）：阈值从 0.50 改为 0.71、设备 A→B、选择 balance，三个待办均变为已完成；初始 A 的 TP/FP/TN/FN=12/9/24/5，当前 B=2/6/35/7；反思意愿 4/5 已保存。
- 浏览器导出真实生成 `model_evaluation_card.json`，已从下载文件检查 threshold=.71、device=B、seed=20261020、simulation=true 与上述数值一致；没有真实个人记录。刷新后点击恢复，已恢复所有参数与反思。第一次刷新后点过早未观察到恢复，重新点击及观察确认通过。
- 运行限制：一次浏览器下载操作等待了约 6 小时，后已恢复；不要使用长等待循环。检查无其他对话正在修改同目录。
- 定时任务已更新为最新自主规则：外部阻塞时继续独立模块，不再停在 P0；仍为每 6 小时唤醒本对话。

## 2026-10-20 最终本地验收里程碑（续）

- 已提交独立模块检查点 `0fd14e2`；该提交不代表 P0–P5 全部通过。
- 新增 `src/lib/ai.ts`、`src/components/ai-report.tsx`、`src/app/api/reports/`：默认关闭的真实 AI 适配器，受 JSON Schema、证据引用与类型、返回长度、超时、提供方 URL 和敏感信息裁剪约束。未知引用、虚构百分比、URL/HTML 等返回拒绝。4 项 mock 测试通过；没有真实 LLM 调用或收费操作，语义正确性仍需真实报告审查。
- 新增体验/报告私有 API 与第三份 migration，完善 `scripts/verify-p0.ts` 的两身份四表 CRUD/隔离、刷新与删除级联检查。仅完成代码，没有真实执行 SQL 或 RLS 通过证据。
- 修复 XLSX v9 的 sheet 读取、可选数字与计划校验、同源 Host 校验；R2 切换目标会重置 AI 展示组件，避免残留上一个方向的输出。R1 补充带原题来源的六维活动说明与学业科研自述摘要，未据此生成个人分数。
- 浏览器：XLSX 两行本地预览、88→91 修改后确认加入、保存/刷新恢复通过；R1 能追溯课程索引及 91/100。CSV 两行预览通过，CSV 确认加入未单独实测。合成成绩 fixture 含姓名/学号列，仅保留允许的课程字段。
- 浏览器：30 题五页全部作答、保存/刷新恢复至 30/30；文档模式正式提交按钮保持禁用。官方请求缺配置显示错误，不伪造结果。
- 浏览器：九个细分方向逐一打开成功，两个方向对比内容不同；R1 空状态与 simulation 证据均展示，缺少官方成绩不生成兴趣关联。
- 浏览器：3001 新工作台从 .50→.51、切设备 B、选工程取舍；TP/FP/TN/FN=6/20/21/3。反思已保存。先前 .71/B 成果真实下载文件已保存为 `docs/testing/P3-evaluation-card.simulation.json`，来源是浏览器下载，不是手写预期结果。
- 浏览器：R2 读取合成画像与体验、2028/每周4小时/统考、预算2/1/1时可导出，改为5/1/1时禁止导出；可选两个备选，选择继续医学不强推转型。真实下载文件保存在 `docs/testing/P4-action-draft.simulation.json`，7 个任务的工作量均为未知，没有虚构招生项目。
- 主页面与工作台在实际 CSS 390/820/1440px 检查无整页横向溢出；对比/证据表允许容器内滚动。工作台与 R2 的三宽详细读数见本地验收记录。浏览器截图 API 两种调用均返回 Unable to capture screenshot，没有保存或声称截图视觉验收通过。
- 最终 `npm run lint`：退出0、0警告。`npm test`：28/28通过，无跳过。`npm run build`：退出0，Webpack、TypeScript、10个静态页与动态 API 全部构建。
- 用户要求继续后复查报告读取，发现保存的 R2 可能属于其他目标方向；新增 `readSavedExplanation` 验证目标、R1/R2 类型、时间与证据，再允许展示。新增2项回归测试真实运行通过，包含换方向、无方向、错类型、无来源、无证据与无效时间。R1 六维说明与背景摘要已实际浏览器展开核对。
- 同源校验修复后的本机 HTTP smoke 已5/5通过；最终构建再次执行结果见 `docs/testing/LOCAL-acceptance.md`。使用独立端口占位配置，不修改真实 `.env.local`。
- 最新构建客户端密钥扫描42文件通过；`git diff --check`通过，`.env.local`仍被Git忽略，所有扫描只输出计数不输出值。
- `npm run verify:p0` 最新退出1：2026-10-21T00:16:01Z O*NET_NETWORK 超时，Supabase BLOCKED。此前403保留为历史事实。Docker再次检查仍缺 Linux engine pipe，无可用本地数据库。
- 部署、演示、启动与安全限制说明已写入 `docs/DEPLOYMENT.md`、`docs/DEMO.md`、`docs/LOCAL_SETUP.md`；未推送、部署、开通资源或发起付费调用。
- 定时任务 `limen` 经工具确认 ACTIVE，每6小时唤醒本对话并访问该本地项目；不是云端常驻进程，需要主机和应用可运行。2026-10-20 22:10 PDT按创建时间估算下次为2026-10-21 02:51 PDT（调度器可能延后，已有活跃开发时跳过重复开发）。
- 删除页实际确认/取消/未登录错误反馈通过，未声称真实删除成功。最终28项单测、lint/build、5项HTTP smoke与42客户端文件扫描均通过。暂存13文件密钥扫描通过；本轮本地提交包含P3本地验收证据和R1/R2修正，不代表全阶段通过。
- 已保存本地提交 `3bffed6`：P3本地验收、报告读取校验和实际合成下载证据。预览服务3001已从smoke占位配置切回真实项目环境文件，并展示首页；旧3000开发服务已停止，避免共享构建目录冲突。
- 用户再次要求继续后，隔数小时重跑真实 `npm run verify:p0`：退出1，O*NET返回HTTP403，Supabase依然缺配置且没有创建用户；Docker Linux engine pipe仍不存在。`P0-live.latest.json`已更新。这次结果覆盖先前“最新超时”的状态；不能据403断言Key无效。无进一步可执行的真实核心链路，等待外部环境变化后自动续建，不再循环发请求或索取授权。

## 下一恢复任务（按优先级，替代旧清单）

1. 先检查同目录是否真正有其他活跃写入任务、Git 状态与本文件；不要重复开发已通过的合成工作台或重建定时任务。当前 Goal 保持 active。
2. 当前不受外部服务影响的核心模块已有本地实现和验收记录。只有网络/环境状态发生变化时再重试 O*NET 和 Supabase；不得伪造官方返回、匿名身份或 RLS 成功。不要循环索取配置或权限。
3. Supabase 可用后顺序执行三份 migration、启用匿名 Auth，执行真实 `verify:p0`；确认四表两身份隔离、刷新及删除级联，再验收个人画像→官方30题→R1→私有体验→R2 的真实持久化。
4. 只有明确授权且配置了可用 AI 服务后才启用真实生成；逐条审查 R1/R2 的证据、未知与课程/招生边界。默认关闭状态不等于 AI 功能通过验收。
5. 浏览器截图能力恢复后补做三个屏幕尺寸的实际视觉检查；中文译稿仍需人工复核，公开服务限流/隐私与部署前检查仍未通过。禁止把 Goal 标为 complete。
