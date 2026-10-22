# Vercel 源码交付实际记录

后续更新：设备授权、邮箱验证和环境变量授权已完成，生产部署已成功。本文件记录打包时的历史状态；最新线上证据以 `VERCEL-cloud.latest.md` 为准，以下旧 token 失败不再是当前阻塞。

日期：2026-10-21（America/Los_Angeles）。交付用户当前工作区的完整应用源码，不回滚既有未提交改动。

## 变更

- 增加 `vercel.json`、`.vercelignore`、`scripts/package-vercel.ps1`；报告、数字人和账号接口声明120秒最长执行时限。更新 `docs/DEPLOYMENT.md` 环境变量和上线步骤。
- 数字人移除本机域名限制；通过 Supabase 持久化跨实例会话归属、并发和每用户创建频率。服务端 capability 与数据库哈希配合，拒绝跨身份及伪造记录操作。
- 重连先结束遗留连接；上游已创建但绑定失败时补偿清理；不确定失败保留记录供重试。账号删除先释放数字人，数据库也拒绝绕过释放的直接删除。
- 两份迁移均 dry-run 确认是各自唯一待执行项后实际应用：`202610220001_avatar_sessions.sql`、`202610220002_avatar_account_cleanup.sql`。未重复执行旧迁移。

## 实际命令与结果

| 检查 | 结果 |
|---|---|
| `vercel whoami` | 失败，平台返回当前 token 无效；未执行部署、未生成公网 URL |
| `npm run lint` | 退出0，零警告 |
| `npm test` | 45/45通过 |
| `node --conditions=react-server --import tsx scripts/verify-xingyun-proxy.ts` | 19项通过，mock数据库/供应商，不是真实数字人连接 |
| `node --conditions=react-server --import tsx scripts/verify-avatar-storage.ts` | 真实Supabase合成身份19项通过，临时身份清理失败0；未创建供应商会话 |
| `npm run build` | 沙箱内mkdir报EPERM；经批准在沙箱外重跑退出0，包含TypeScript检查及完整路由生成 |
| `npm run check:client-secrets` | 47个客户端文件通过，未输出凭据 |
| `LIMEN_TEST_ORIGIN=http://127.0.0.1:3002 npm run test:smoke` | 沙箱连接报EACCES；经批准重跑5组通过，含云端Host的数字人接口401、跨站写入403、私有接口不缓存及页面路由 |
| `powershell -ExecutionPolicy Bypass -File scripts/package-vercel.ps1` | 源码归档生成成功；按允许列表打包，排除真实环境文件及缓存，扫描本机配置的密钥值通过 |
| `git diff --check` | 退出0；仅已有文件CRLF/LF提示，未隐藏警告 |

本机生产预览：`http://127.0.0.1:3002`，绑定回环地址。ZIP 输出 `work/releases/limen-vercel.zip`，含本记录；不含 `.env.local`、`.git`、`node_modules`、`.next`、原始测试资料或本机工作目录。测试目录仅保留合成单测fixture。

## 证据边界

未完成 Vercel 线上发布，因本机 Vercel token 无效。部署者需在 Vercel 登录并填写服务端环境变量。当前已关联 Supabase 六份迁移均已应用；换库需自行应用并复验。

云端 HTTPS/WSS 的真实数字人连接、语音/ASR/音频口型与提供方域名白名单尚未验收，不能将19项mock或真实数据库检查当作供应商端到端成功。既有本机数字人真实文字会话记录仍只代表旧版本本机链路。社区OTP、译稿人工复核、招生来源和AI长期稳定性的既有限制保留。
