# XENISO Next.js 迁移首批实施计划

**Goal:** 在现有 Next.js 项目迁移公共布局、导航和完整个人画像页，发布独立 Preview，由用户验收后迁移下一页。

**Architecture:** `public/previews/xeniso-pathways.html` 为只读参考。`/profile` 为双入口和报告栏，原表单保留在 `/profile/basics`。沿用现有 schema、Cookie、Supabase RLS、O*NET 与 R1 接口。

**Tech Stack:** Next.js 16 App Router / TypeScript strict / Tailwind 4 / CSS / zod / Supabase。无新增依赖或项目。

## 约束

- 本阶段仅公共布局、导航、画像与其表单/测评返回路径；其他页面等待验收。
- 官方测评仅接受 `onet_live`；正式报告必须通过既有 `readSavedExplanation` 的 `llm_live` 与证据校验。失败无模拟回退。
- 数据契约、后端权限、O*NET 版本与答案码不改。原 HTML、正式域名、Production 配置、数据库迁移不动。
- 使用新建合成身份验证真实接口并删除；不在证据记录中保存 Cookie、凭据或个人档案。

## 实施与验收

- [ ] `nav-shell.tsx`、`layout.tsx`、`xeniso.css`：四个主导航、四步探索导航、移动菜单与 XENISO 品牌。
- [ ] `profile-hub.tsx`、`profile/page.tsx`：两个“开始填写”入口，等宽对齐按钮，独立报告栏。
- [ ] `profile/basics/page.tsx`、`profile-form.tsx`：保留全部字段、成绩解析、校验和真实保存，确认后返回画像；云读取失败防止覆盖未知资料。
- [ ] `profile-overview.ts`：`readProfileOverview(fetcher,signal)` 验证真实画像/测评，401 为空身份，其他失败明确报错。单测覆盖未完成、快照拒绝、401/502、无效结构和成功契约。
- [ ] `profile-report.tsx`：GET 恢复、409 过期、POST 生成、私有保存确认、证据与导出。离页取消请求；不复用 HTML 本地报告。
- [ ] 测评仅改返回画像路径，保留官方题目加载与计分。
- [ ] lint、全量单测、隔离 build、密钥扫描；允许列表包含实际使用的 public/brand 素材。
- [ ] 发布同一 Vercel 项目 Preview；线上合成身份完成真实保存/恢复、O*NET、R1 和删除。接口失败如实记载。
- [ ] 浏览器 1440/820/390 检查页面、表单、导航，核对 Production 未切换，记录 Preview 地址并等待用户验收。

## 后续修改清单（本阶段不实施）

首页四入口去箭头；工作/面试采用各自独立且贴合主题的卡通/动态素材，不复用图片；行动规划删除多余说明；文库“继续医学”显示名改“临床工作”，保持 medicine 数据 ID，按已有资料展示岗位，恢复六主题柔和渐变；社区中性色背景、放大搜索区、调整标题。视频待用户提供。后续外观只改 Next.js 组件。
