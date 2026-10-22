# Supabase 初始化与本轮接口测试

2026-10-21（America/Los_Angeles）。只记录真实检查，不含密钥。

## 最新状态

三份既有业务迁移已完成核对与登记，社区迁移已应用，真实合成身份权限检查 22/22 通过。不要重复执行下面的历史初始化步骤。当前主线和服务状态见 [CURRENT_STATUS.md](CURRENT_STATUS.md)，社区过程与边界见下方“社区迁移与权限验收”。OTP 邮件送达和真实注册尚未验证。

## 迁移前只读审计（历史，后续已完成迁移）

- `anonymous_users=true` 已由用户在后台启用并记录于 `docs/testing/Supabase-connectivity.latest.json`。
- 历史 REST 检查曾返回 PGRST205；本轮 Supabase Management API 只读 catalog 查询确认 `profiles`、`assessments`、`experiences`、`reports` 均真实存在，列、约束、级联外键、强制 RLS、owner-only policies/grants 及 `delete_own_account()` 与本地三份迁移一致。历史 PGRST205 不作当前表状态判断；旧版本完整流程已有后续实际读写证据，本轮没有重跑该链路。
- `supabase migration list --linked` 的四个 remote 版本均为空；catalog 查询确认 `supabase_migrations.schema_migrations` 不存在。这与已存在的四张表相矛盾，最可能是这些迁移先前通过 Dashboard SQL Editor 执行而未登记 CLI 历史。未检查到社区表或 `community_*` RPC。
- 本轮只读检查；没有推送、修复/登记迁移历史、发送邮件或更改 Auth 设置。不要直接 `db push`，否则前三份非幂等迁移会尝试重建现有对象。

### 当时确认的迁移路径（已执行，勿重复）

先以 `npx supabase migration repair --linked --status applied 202610200001 202610200002 202610200003` 将已由 catalog 对照确认存在的三份旧迁移登记到 CLI 历史，再复核 `migration list --linked` 显示前三项一致且 dry-run 只包含 `202610210001_community.sql`。只有 dry-run 精确符合预期，才进入社区迁移应用及 RLS/RPC 双账号测试。迁移 repair 会写远端迁移历史，本轮未执行。

社区的 Supabase Auth 邮箱 OTP 交互尚未实际验证。`signInWithOtp({shouldCreateUser:false})` 和 `verifyOtp(type:'email')` 是否与当前项目模板、已验证邮箱及当前访客 email-link 行为兼容，需使用授权的测试邮箱端到端验证；本轮未发送邮件。

## 社区迁移与权限验收（2026-10-21，真实远端）

- 已用 `migration repair` 将 catalog 已确认的 `202610200001`、`202610200002`、`202610200003` 登记为 applied。执行前 `db push --dry-run` 精确显示只会应用 `202610210001_community.sql`，随后已成功应用该迁移。
- 迁移后 `migration list --linked` 显示四份版本均已登记。再次运行 `db push --dry-run` 未能连接临时数据库角色（本机没有配置 `SUPABASE_DB_PASSWORD`），未写入任何内容；该限制不影响已完成的迁移历史与 RPC 实测。
- `scripts/verify-community.ts` 通过真实 Supabase Auth/PostgREST 对合成身份完成 22 项验证：未登录及 anonymous Auth 拒绝访问；两个由管理 API 创建并标记邮箱已验证的合成账户登录后，通过普通用户 JWT 发布和互相查看匿名帖子；返回字段不含账户身份；跨用户删除返回 false，本人删除成功；举报及重复更新成功，anonymous 举报、直接读表、快速重复发布和对已删除帖子举报均被拒绝。
- 共创建 3 个临时合成账户（1 anonymous、2 个已验证合成用户），含本人帖子和举报记录均清理，远端复核账户均不存在。管理凭据只在验收进程内用于合成账户 provision/cleanup，所有授权断言均通过 anon/user JWT；未发送邮件、未访问或写入真实用户资料。
- 最新机器记录：`testing/community-live.latest.json`。脚本 ESLint 与 TypeScript 检查通过。Supabase 邮箱 OTP 的真实邮件验证仍未执行。

## 历史后台初始化记录（已由上方审计更新，不执行下列旧步骤）

历史状态（已由上面的远端 catalog 审计和下方迁移验收更新）：当时 REST 请求曾返回 PGRST205；不要以此作为当前表状态。后三节中的旧步骤只记录当时情况，当前迁移已应用。

1. 历史步骤：在项目 Authentication 登录提供方设置中启用 Anonymous Sign-Ins。
2. 在 SQL Editor 按顺序执行三份迁移，每份确认成功再继续；这些脚本不可直接重复执行，遇到已存在对象先检查实际数据库。
   - `supabase/migrations/202610200001_p0_profiles.sql`
   - `supabase/migrations/202610200002_assessments.sql`
   - `supabase/migrations/202610200003_experience_reports.sql`

迁移创建四张业务表并强制RLS，登录者只能读写本人行；delete_own_account仅删除当前JWT主体及级联资料。不使用service_role绕过访问控制。

上述历史配置后曾由代理执行 `npm run verify:p0`，用两个合成身份验证四表隔离、刷新、本人删除与级联清理。新版画像→官方测评→R1→体验→R2的独立合成访客证据见 `testing/V4-flow.latest.md`。

## 早期 AI 连接记录（历史）

本节记录早期 AI 接入状态。后续真实报告生成与读取证据见 `testing/V4-flow.latest.md`，本节密钥与旧联调限制描述不代表当前主线状态。

预览进程已重新启动并报告Ready，但HTTP复测超时，页面可用性尚未确认，正式报告仍依赖数据库初始化。浏览器管理页控制超时，未修改云端设置或执行SQL；本轮lint退出0、0警告，build未重跑。直接扫描现有.next/static共42文件，当前三个密钥原文匹配0处，未输出任何密钥。
