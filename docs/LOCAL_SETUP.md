# 本地启动与 P0 联调

## 应用

需要 Node.js 22+ 与 npm。运行 `npm install`，再运行 `npm run dev`，打开 http://127.0.0.1:3000 。

首页 `/` 与技术验证状态页 `/setup` 不要求密钥。交互验证入口默认关闭，正式画像、问卷、报告尚未实现。

## 开发服务配置

1. 从 `.env.example` 复制为根目录 `.env.local`；仅在本地填写，不发到聊天，不提交。
2. 将旧 O*NET key 撤销并轮换，填写新的 `ONET_API_KEY`。
3. 填写开发 Supabase 项目的 `SUPABASE_URL` 和 `SUPABASE_ANON_KEY`（anon 或 publishable key，**不要 service-role key**）。这些值只由服务端读取。旧规格的 `NEXT_PUBLIC_` 名称已改为服务端名称。
4. 在该开发项目启用 Anonymous Sign-Ins。在 SQL Editor 执行 `supabase/migrations/202610200001_p0_profiles.sql`。本脚本只创建 profiles 与删除本人账户的 RPC，不由应用自动执行。
5. 设置 `LIMEN_ENABLE_P0_CONSOLE=true` 并重新启动应用，然后可在 `/setup` 创建访客、保存/读取合成昵称、请求题目和删除访客。

不需要也不应配置收费 LLM。本阶段不部署生产环境。

## 验证与结果解释

- `npm run lint`：ESLint，警告视为失败。
- `npm run build`：正式构建及 TypeScript 检查。
- `npm test`：标记 mock=true 的契约与错误处理单测，不能用作官方计分成功证据。
- `npm run verify:p0`：使用真实凭据请求官方接口，并在开发 Supabase 创建/删除两个合成访客。仅上传合成答案和合成昵称。写入 `docs/testing/P0-live.latest.json`，只保留状态、结构和计数，绝不保存 JWT/key/真实档案。缺配置或任一真实断言失败退出码 1。
- `npm run test:smoke`：服务启动、P0 console 开启且外部凭据缺失时，验证页面、跨站拒绝、未登录拒绝、配置缺失 503、no-store。此命令不适用于已有真实凭据的服务。

P0 尚未通过前不进入 P1。联调失败时保留真实失败结果；不要修改为假分数或关闭 RLS。若清理临时身份失败，脚本会输出非敏感 probe run 标签，所有者可在 Auth 用户元数据中定位并删除。

## 当前局限

- 验证入口需显式开启，仅用于封闭开发；P5 前要补生产级共享限流、CAPTCHA、部署与隐私完整验收。
- 当前昵称不是完整画像；报告表和其 RLS 在对应阶段实现，不能用 profiles 隔离推断报告已验收。
- 中文问卷尚未加载。P1 保留英文原文并单独管理译文及人工审读状态；中文效度与公开发布条件尚未验证。
