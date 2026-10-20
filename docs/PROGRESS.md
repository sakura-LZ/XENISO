# LIMEN 开发进度

更新时间：2026-10-20（America/Los_Angeles）

## 恢复入口

- 主对话：`01a15a01-03f2-7b23-a8ff-0e7067271980`。用户明确授权以此对话为准进行修改。
- 根目录已直接包含 V3 规格，无需 `LIMEN_Codex_V3/` 前缀。
- 当前阶段：P0 真实联调受阻，本地基础检查通过；按用户新授权继续独立的 P1 任务，尚无阶段整体验收通过。
- 定时任务 `limen` / LIMEN 自动续建：每 6 小时续建本对话；不要创建同名重复任务。

| 阶段 | 状态 | 验收证据 |
| --- | --- | --- |
| P0 技术验证 | PARTIAL / BLOCKED | lint/build/8项 mock 单测通过；官方 API 403；Supabase 未配置 |
| P1 画像与测评 | IN_PROGRESS | 按用户新授权，先实现独立画像与本地成绩导入 |
| P2 知识库与 R1 | NOT_STARTED | 等待 P1 通过 |
| P3 职业体验 | NOT_STARTED | 等待 P2 通过 |
| P4 R2 与规划 | NOT_STARTED | 等待 P3 通过 |
| P5 集成与部署准备 | NOT_STARTED | 等待 P4 通过 |

## 本轮检查

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
