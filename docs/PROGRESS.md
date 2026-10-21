# LIMEN 开发进度

更新时间：2026-10-20（America/Los_Angeles）

## 恢复入口

- 主对话：`01a15a01-03f2-7b23-a8ff-0e7067271980`。用户明确授权以此对话为准进行修改。
- 根目录已直接包含 V3 规格，无需 `LIMEN_Codex_V3/` 前缀。
- 当前阶段：P0 真实联调受阻；按用户授权继续 P1–P5 独立任务。问卷、方向库、R1/R2 规则草案、真实交互工作台已实现；不能将本地演示等同完整核心链路验收。
- 定时任务 `limen` / LIMEN 自动续建：每 6 小时续建本对话；不要创建同名重复任务。

| 阶段 | 状态 | 验收证据 |
| --- | --- | --- |
| P0 技术验证 | PARTIAL / BLOCKED | 真实 O*NET HTTP 403；Supabase 无配置/本地 Docker engine 不可用 |
| P1 画像与测评 | PARTIAL / BLOCKED | 多步画像、CSV/XLSX、独立中文译稿与文档演示；真实保存/官方计分未验收 |
| P2 知识库与 R1 | PARTIAL / BLOCKED | 3/9 手册、双方向对比、证据引用规则草案；官方兴趣与 AI 未验收 |
| P3 职业体验 | LOCAL_ACCEPTANCE_IN_PROGRESS | 数值单测、三次操作、反思、真实下载及刷新恢复通过；待响应式完整检查 |
| P4 R2 与规划 | PARTIAL / BLOCKED | 用户选方向、证据差距、依赖任务、预算与规则草案；正式 AI R2 未验收 |
| P5 集成与部署准备 | IN_PROGRESS | 22 项单测/lint/build 通过；响应式、真实全链路与部署准备待补 |

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

## 下一恢复任务（按优先级）

1. 实测画像 simulation 保存/刷新、CSV 与 XLSX 上传预览、30 题分页恢复、9 方向对比、R1→工作台→R2 草案及预算导出；检查 1440/820/390px 与错误/空状态。
2. 修复并重跑缺配置 HTTP smoke；之前同源校验因 localhost/127.0.0.1 内部 URL 不同失败，已改用实际 Host，修复后尚未复测。使用占位配置的独立端口，不覆盖真实 env。
3. 接入受 schema 与 evidence_ref 约束的可选 AI 解释入口（默认禁用，不发起付费调用），完善真实体验/报告私有存储与两身份验收脚本。
4. 更新部署/本地演示说明、客户端密钥扫描与实际 build/lint，创建明确检查点。不要把受阻阶段或 Goal 标为完成。
5. 只有外部状态变化时再尝试 O*NET 真实联调或 Supabase；当前 Key 已安全配置，不再索取。Supabase 未配置且 Docker engine 不可用，真实 RLS 与完整个人链路仍阻塞。
