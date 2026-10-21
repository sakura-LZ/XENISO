# 本地启动与 P0 联调

## 应用

需要 Node.js 22+ 与 npm。运行 `npm install`，再运行 `npm run dev`，打开 http://127.0.0.1:3000 。

首页、3/9 方向手册和合成职业工作台不要求密钥。画像、问卷与报告页面已有实现；真实保存/官方计分/AI 的联调验收仍受外部配置阻塞。技术验证控制台默认关闭，不影响正式页面的 API。

## 开发服务配置

1. 从 `.env.example` 复制为根目录 `.env.local`；仅在本地填写，不发到聊天，不提交。
2. 将旧 O*NET key 撤销并轮换，填写新的 `ONET_API_KEY`。
3. 填写开发 Supabase 项目的 `SUPABASE_URL` 和 `SUPABASE_ANON_KEY`（anon 或 publishable key，**不要 service-role key**）。这些值只由服务端读取。旧规格的 `NEXT_PUBLIC_` 名称已改为服务端名称。
4. 在该开发项目启用 Anonymous Sign-Ins。按文件名顺序执行 `supabase/migrations/` 下三份 SQL：资料与本人删除 RPC、测评表、体验与报告表。所有表均按当前 Auth 用户做 RLS，删除账户后级联删除。应用不自动执行迁移。
5. 设置 `LIMEN_ENABLE_P0_CONSOLE=true` 并重新启动应用，然后可在 `/setup` 创建访客、保存/读取合成昵称、请求题目和删除访客。

AI 默认关闭（`LIMEN_ENABLE_LLM=false`）。实现支持带 JSON Schema 的 Chat Completions 服务；配置 `LLM_BASE_URL`（含 `/v1`）、`LLM_MODEL` 与服务端 `LLM_API_KEY` 后，只有明确设置启用才可能调用。不得未经用户具体授权启用收费服务。本轮未调用真实 LLM；可先使用规则草案。协议参考 [官方接口文档](https://developers.openai.com/api/reference/resources/chat/subresources/completions/methods/create)。

## 验证与结果解释

- `npm run lint`：ESLint，警告视为失败。
- `npm run build`：正式构建及 TypeScript 检查。
- `npm test`：标记 mock=true 的契约与错误处理单测，不能用作官方计分成功证据。
- `npm run verify:p0`：使用真实凭据请求官方接口，并在开发 Supabase 创建/删除两个合成访客。仅上传合成答案和合成昵称。写入 `docs/testing/P0-live.latest.json`，只保留状态、结构和计数，绝不保存 JWT/key/真实档案。缺配置或任一真实断言失败退出码 1。
- `npm run test:smoke`：服务启动、P0 console 开启且外部凭据缺失时，验证页面、跨站拒绝、未登录拒绝、配置缺失 503、no-store。此命令不适用于已有真实凭据的服务。

依据用户最新自主执行规则，P0 联调受阻时继续其他独立任务，但不标为阶段整体验收通过。联调失败时保留真实失败结果；不要修改为假分数或关闭 RLS。若清理临时身份失败，脚本会输出非敏感 probe run 标签，所有者可在 Auth 用户元数据中定位并删除。

## 当前局限

- 当前仅适合封闭本地演示；进程内限流不能代替公开服务的共享限流与匿名注册滥用防护。
- 完整画像、测评、体验和 R1/R2 报告表均已实现；迁移与跨身份 RLS 尚未真实验证，不能凭静态 SQL 声称隔离通过。
- 中文题目为独立初译稿，逐题原文完全匹配后才附译文；效度与公开发布条件尚未验证。文档快照不生成官方成绩。
- 详见 `docs/DEMO.md` 和 `docs/DEPLOYMENT.md`。
