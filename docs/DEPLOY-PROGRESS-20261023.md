# 前端部署进度（2026-10-23）

本文只记录**当前有效状态**，替代此前分散在 `CURRENT_STATUS.md` / `DEPLOYMENT.md` 里的历史段落。
历史过程不回删，但以本页为准。

## 1. 一句话现状

XENISO 手稿风重设计已经进入生产代码，并通过 Vercel 的 GitHub 集成**自动部署**；
剩下一项环境问题：本机所在网络的 `*.vercel.app` 域名被 DNS 污染，无法从这台机器验证线上页面。

## 2. 代码与仓库

| 项 | 值 |
|---|---|
| 仓库 | `github.com/sakura-LZ/XENISO`（`origin`） |
| 分支 | 本地 `master`，跟踪 `origin/main`，`main` 即生产分支 |
| 当前提交 | `da367de` feat(nav): 头部导航恢复「返回」入口 |
| 工程 | `limen_project_files`（Next.js 16.4.2 App Router，TypeScript strict） |

本轮三笔提交：

1. `f12da1a` feat(ui): 移植 XENISO 手稿风重设计到 Next.js 全站界面（78 文件 / +20974 −754）
2. `29aac06` fix(kb): 分页拉取知识库记录，修复宽泛关键词搜索一律 503
3. `da367de` feat(nav): 头部导航恢复「返回」入口

## 3. 部署链路：Git 集成，不是 CLI

**这一点很关键**：Vercel CLI 在本机是未登录状态（没有 `~/.vercel/auth.json`，也没有 `VERCEL_TOKEN`），
但项目 `sakura-lzs-projects/xeniso`（`prj_JXBSyBrHMyX43dVZ9kU4QtHU5Fcg`）已经接了 GitHub 集成，
**推送到 `main` 会自动触发构建并发布到生产域名**。所以不需要 token 也能发布。

| 提交 | Vercel 构建 | 部署 ID |
|---|---|---|
| `29aac06` | success | `CT6n3Ht698fYoCbk2NY419RGSo3z` |
| `da367de` | 已触发，待确认 | — |

生产域名：<https://xeniso-platform.vercel.app>

部署状态可无需登录、从 GitHub 公开接口核验：

```powershell
# 提交的 Vercel 门禁状态（pending / success / failure）
curl.exe -s "https://api.github.com/repos/sakura-LZ/XENISO/commits/<sha>/status"
```

## 4. 本机验证证据（生产构建）

| 检查 | 结果 |
|---|---|
| `npm run lint` | 通过，0 警告（`--max-warnings=0`） |
| `npm test` | 148 / 148 通过，0 失败 |
| `npm run build` | exit 0，26 条路由产物 |
| 页面路由 | `/` `/explore` `/assessment` `/profile` `/profile/basics` `/report/initial` `/report/plan` `/community` `/experience` `/account` `/match` `/setup` `/studio/ecg` **全部 200** |
| 移动端 390px | 7 个主视图整页截图宽度均为 390px，**无横向溢出** |
| 知识库 API | `/api/knowledge?q=医学`、`?q=考研`、`?direction_id=medicine`、`?category=admissions` 均 200 |
| 匿名访客 | `/api/community` 401、`/api/reports` 400、`/api/knowledge` 按方向 200 —— 符合预期 |

## 5. 本轮修掉的缺陷

1. **知识库关键词搜索一律 503**（真实用户可见）
   旧实现 `.limit(501)` + `>500` 直接抛 `KNOWLEDGE_CAPACITY`。知识库涨到 610 条后，
   任何宽泛词（「医学」「考研」）命中几乎所有角色都会触发；按方向检索因单角色记录少仍是 200，
   问题被掩盖。改为 `range` 分页（每页 1000，PostgREST 单次上限）+ 4000 条硬上限。
2. **印章对比度 4.19:1**（低于正文 4.5:1）
   `.atlas-stamp { opacity: .82 }` 把 `#593d0d` 压暗。赭色章单独提回 `opacity: 1`。
3. **头部缺少「返回」入口**
   设计稿内页头部有「← 回首页」，移植成全局 `NavShell` 后丢失，内页只能靠 logo 回首页。
   现在非首页渲染 `.site-back`：优先 `history.back()`；直接打开内页/外链进入时退回首页，
   避免点了没反应。560px 以下只留箭头，标签交给 `aria-label`。
4. **入场动效兜底**（上一轮已加，本轮确认有效）
   `xeniso-motion.tsx` 的 2.2s 无条件释放，保证整页截图、打印、无滚动抓取不会出现空白。
   整页截图在 1.2s 内抓会让下方元素停在 transparent，被误报成「对比度 1.5:1」；
   等 3.2s 或真实滚动后全部正常，已确认是抓图时序假警报。

## 6. 环境问题：本机无法访问 vercel.app（DNS 污染）

从这台机器解析生产域名，拿到的是 Facebook 的 IP 段，TCP 直接超时：

| 域名 | 解析结果 | 实际 |
|---|---|---|
| `xeniso-platform.vercel.app` | `31.13.112.9` / `69.63.176.59` | Facebook IP 段，超时 |
| `limen-azure.vercel.app` | `69.63.190.26` | 同上 |
| `api.vercel.com` | `76.76.21.112` | 正常，308，1.1s |
| `api.github.com` | `20.205.243.168` | 正常，200 |

所以此前文档里记的「终端直连正式域名超时」**不是站点挂了，是本地 DNS 被污染**：
站点本身 200、`X-Vercel-Cache: PRERENDER`，8:13 有两次侥幸解析到正常 IP 时抓取成功。
Git 推送链路不受影响，所以自动部署一直可用。

**影响与建议**：面向国内用户，`*.vercel.app` 的可用性不稳定。
建议绑定自有域名并前置国内可达的 CDN / 边缘节点，再把 `LIMEN_APP_ORIGIN` 改成新域名。

## 7. 仍然缺的东西

1. **Vercel 生产环境变量**：本机 `.env.local` 已配 18 项，但 Vercel 侧需要确认 Production 里也有
   `SUPABASE_URL` / `SUPABASE_ANON_KEY` / `ONET_API_KEY` / `LIMEN_APP_ORIGIN`（应为正式域名）
   以及四组 `XINGYUN_*`。缺 `LIMEN_APP_ORIGIN` 会让写操作的同源校验失效。
2. **路由级页面转场**：现无 `template.tsx`，页面切换是硬切。站内已有 21 个 `data-motion` 标记、
   29 个 keyframes、15 处 `prefers-reduced-motion` 兜底，缺的是跨路由的过渡。
3. **线上视觉核对**：本机 DNS 被污染，无法亲自核对生产页面，需要在能通的环境或真机上看一眼。
4. **平行会话在改的行**：`src/lib/match/*`、`src/lib/planning-stages.ts`、`src/app/report/report.css`、
   `tests/match.test.ts`、`tests/reports.test.ts`，以及 `report/plan/report.tsx` 里
   `load(true)` → `load(false)` 的一行改动（未提交）。后者的影响是：挂载时读 localStorage 的
   simulation 草稿，真实登录用户进 `/report/plan` 会看到「请先在个人画像保存合成演示草稿」，
   而不是自己的数据。是否保留需要确认。
